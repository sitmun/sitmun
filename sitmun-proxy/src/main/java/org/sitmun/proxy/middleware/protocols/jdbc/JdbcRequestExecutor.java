package org.sitmun.proxy.middleware.protocols.jdbc;

import java.sql.*;
import java.util.*;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.sitmun.proxy.contract.JdbcBindings;
import org.sitmun.proxy.contract.JdbcParameter;
import org.sitmun.proxy.contract.ProxyHeaders;
import org.sitmun.proxy.middleware.dto.ProblemDetail;
import org.sitmun.proxy.middleware.dto.ProblemTypes;
import org.sitmun.proxy.middleware.service.RequestExecutor;
import org.sitmun.proxy.middleware.service.RequestExecutorResponse;
import org.sitmun.proxy.middleware.service.RequestExecutorResponseImpl;

@Setter
@Slf4j
public class JdbcRequestExecutor implements RequestExecutor {

  private Connection connection;
  private String sql;
  private List<JdbcParameter> parameters;
  private Integer maxRows;
  private Integer timeoutSeconds;

  @SuppressWarnings("unchecked")
  @Override
  public RequestExecutorResponse<?> execute() {
    List<Map<String, Object>> result = new ArrayList<>();
    boolean truncated = false;
    if (connection == null) {
      return sqlError();
    }
    try (Connection connectionUsed = connection) {
      boolean autoCommit = connectionUsed.getAutoCommit();
      connectionUsed.setAutoCommit(false);
      connectionUsed.setReadOnly(true);
      try {
        truncated = executeStatement(connectionUsed, result);
      } finally {
        connectionUsed.rollback();
        connectionUsed.setReadOnly(false);
        connectionUsed.setAutoCommit(autoCommit);
      }
    } catch (SQLException e) {
      log.error("JDBC request failed with exception type {}", e.getClass().getSimpleName());
      return sqlError();
    }
    RequestExecutorResponseImpl<List<Map<String, Object>>> response =
        new RequestExecutorResponseImpl<>(null, 200, "application/json", result);
    if (truncated) {
      response.addHeader(ProxyHeaders.TRUNCATED, "true");
    }
    return response;
  }

  private static RequestExecutorResponse<ProblemDetail> sqlError() {
    ProblemDetail problem =
        ProblemDetail.builder()
            .type(ProblemTypes.PROXY_SERVICE_ERROR)
            .status(500)
            .title("SQL Error")
            .detail("The JDBC service request failed")
            .instance("/proxy")
            .properties(Map.of("origin", "upstream-service"))
            .build();
    return new RequestExecutorResponseImpl<>(null, 500, "application/problem+json", problem);
  }

  private boolean executeStatement(Connection connection, List<Map<String, Object>> result)
      throws SQLException {
    if (parameters == null || parameters.isEmpty()) {
      try (Statement stmt = connection.createStatement()) {
        JdbcBindings.applyLimits(stmt, maxRows, timeoutSeconds);
        try (ResultSet resultSet = stmt.executeQuery(sql)) {
          return retrieveResultSetMetadata(resultSet, result);
        }
      }
    }

    String product = JdbcBindings.productName(connection);
    try (PreparedStatement stmt = connection.prepareStatement(sql)) {
      JdbcBindings.applyLimits(stmt, maxRows, timeoutSeconds);
      for (int i = 0; i < parameters.size(); i++) {
        JdbcBindings.bind(stmt, i + 1, parameters.get(i), product);
      }
      try (ResultSet resultSet = stmt.executeQuery()) {
        return retrieveResultSetMetadata(resultSet, result);
      }
    }
  }

  private boolean retrieveResultSetMetadata(ResultSet resultSet, List<Map<String, Object>> result)
      throws SQLException {
    int cap = JdbcBindings.rowCap(maxRows);
    ResultSetMetaData metadata = resultSet.getMetaData();
    boolean truncated = false;
    while (resultSet.next()) {
      if (result.size() == cap) {
        truncated = true;
        break;
      }
      Map<String, Object> row = new HashMap<>();
      for (int i = 1; i <= metadata.getColumnCount(); i++) {
        Object value = resultSet.getObject(i);
        row.put(metadata.getColumnLabel(i), value);
      }
      result.add(row);
    }
    return truncated;
  }

  public String describe() {
    return "JdbcRequest{"
        + "connectionPresent="
        + (connection != null)
        + ", sqlPresent="
        + (sql != null && !sql.isBlank())
        + ", parameterCount="
        + (parameters != null ? parameters.size() : 0)
        + '}';
  }
}
