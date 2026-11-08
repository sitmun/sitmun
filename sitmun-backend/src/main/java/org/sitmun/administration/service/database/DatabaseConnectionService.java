package org.sitmun.administration.service.database;

import jakarta.validation.constraints.NotNull;
import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.sitmun.administration.service.database.tester.DatabaseSQLException;
import org.sitmun.domain.database.DatabaseConnection;
import org.sitmun.proxy.contract.JdbcBindings;
import org.sitmun.proxy.contract.JdbcParameter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class DatabaseConnectionService {

  @Value("${sitmun.jdbc.max-rows:1000}")
  private int maxRows = JdbcBindings.DEFAULT_MAX_ROWS;

  @Value("${sitmun.jdbc.query-timeout-seconds:60}")
  private int queryTimeoutSeconds = JdbcBindings.DEFAULT_TIMEOUT_SECONDS;

  public List<Map<String, Object>> executeQuery(
      @NotNull DatabaseConnection connection, @NotNull String query) throws DatabaseSQLException {
    return executeQuery(connection, query, List.of());
  }

  /** Rows plus whether the row cap cut the result. */
  public record BoundedQuery(List<Map<String, Object>> rows, boolean truncated) {}

  /** Execute a query binding positional parameters when the SQL contains '?' placeholders. */
  public List<Map<String, Object>> executeQuery(
      @NotNull DatabaseConnection connection,
      @NotNull String query,
      @NotNull List<JdbcParameter> parameters)
      throws DatabaseSQLException {
    return executeBounded(connection, query, parameters).rows();
  }

  public BoundedQuery executeBounded(
      @NotNull DatabaseConnection connection,
      @NotNull String query,
      @NotNull List<JdbcParameter> parameters)
      throws DatabaseSQLException {
    List<Map<String, Object>> result = new ArrayList<>();
    boolean[] truncated = {false};
    try (Connection con = openConnection(connection)) {
      boolean autoCommit = con.getAutoCommit();
      con.setAutoCommit(false);
      con.setReadOnly(true);
      try {
        if (parameters.isEmpty()) {
          executeStatement(con, query, result, truncated);
        } else {
          executePreparedStatement(con, query, parameters, result, truncated);
        }
      } finally {
        con.rollback();
        con.setReadOnly(false);
        con.setAutoCommit(autoCommit);
      }
    } catch (SQLException | ClassNotFoundException e) {
      log.error("Error getting connection: {}", e.getMessage(), e);
      if (e instanceof SQLException sqlException) {
        throw new DatabaseSQLException(sqlException);
      }
      throw new IllegalStateException(e);
    }
    return new BoundedQuery(result, truncated[0]);
  }

  private Connection openConnection(DatabaseConnection connection)
      throws SQLException, ClassNotFoundException {
    Class.forName(connection.getDriver());
    return DriverManager.getConnection(
        connection.getUrl(), connection.getUser(), connection.getPassword());
  }

  private void executeStatement(
      Connection connection, String query, List<Map<String, Object>> result, boolean[] truncated)
      throws DatabaseSQLException {
    try (Statement stmt = connection.createStatement()) {
      JdbcBindings.applyLimits(stmt, maxRows, queryTimeoutSeconds);
      retrieveResultSetMetadata(stmt, query, result, truncated);
    } catch (SQLException e) {
      log.error("Error in connection: {}", e.getMessage(), e);
      throw new DatabaseSQLException(e);
    }
  }

  private void executePreparedStatement(
      Connection connection,
      String query,
      List<JdbcParameter> parameters,
      List<Map<String, Object>> result,
      boolean[] truncated)
      throws DatabaseSQLException {
    try (PreparedStatement stmt = connection.prepareStatement(query)) {
      JdbcBindings.applyLimits(stmt, maxRows, queryTimeoutSeconds);
      String product = JdbcBindings.productName(connection);
      for (int index = 0; index < parameters.size(); index++) {
        JdbcBindings.bind(stmt, index + 1, parameters.get(index), product);
      }
      retrieveResultSetMetadata(stmt, result, truncated);
    } catch (SQLException e) {
      log.error("Error in prepared statement: {}", e.getMessage(), e);
      throw new DatabaseSQLException(e);
    }
  }

  private void retrieveResultSetMetadata(
      Statement stmt, String query, List<Map<String, Object>> result, boolean[] truncated)
      throws SQLException {
    try (ResultSet resultSet = stmt.executeQuery(query)) {
      appendRows(resultSet, result, truncated);
    }
  }

  private void retrieveResultSetMetadata(
      PreparedStatement stmt, List<Map<String, Object>> result, boolean[] truncated)
      throws SQLException {
    try (ResultSet resultSet = stmt.executeQuery()) {
      appendRows(resultSet, result, truncated);
    }
  }

  private void appendRows(
      ResultSet resultSet, List<Map<String, Object>> result, boolean[] truncated)
      throws SQLException {
    ResultSetMetaData metadata = resultSet.getMetaData();
    int cap = JdbcBindings.rowCap(maxRows);
    while (resultSet.next()) {
      if (result.size() == cap) {
        truncated[0] = true;
        break;
      }
      Map<String, Object> row = new HashMap<>();
      for (int i = 1; i <= metadata.getColumnCount(); i++) {
        Object value = resultSet.getObject(i);
        // H2/Oracle uppercase unquoted aliases; Plantilla templates use lowercase keys (Postgres).
        String label = metadata.getColumnLabel(i);
        row.put(label == null ? null : label.toLowerCase(Locale.ROOT), value);
      }
      result.add(row);
    }
  }
}
