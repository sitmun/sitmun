package org.sitmun.administration.service.database;

import jakarta.persistence.EntityNotFoundException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.sitmun.administration.controller.dto.QueryTestRequest;
import org.sitmun.administration.controller.dto.QueryTestResult;
import org.sitmun.administration.controller.dto.QueryTestRun;
import org.sitmun.administration.service.database.DatabaseConnectionService.BoundedQuery;
import org.sitmun.administration.service.database.tester.DatabaseSQLException;
import org.sitmun.authorization.proxy.exception.BadRequestException;
import org.sitmun.authorization.proxy.protocols.jdbc.JdbcSqlDialect;
import org.sitmun.authorization.proxy.sql.BoundSql;
import org.sitmun.authorization.proxy.sql.SqlTaskBinder;
import org.sitmun.domain.DomainConstants;
import org.sitmun.domain.database.DatabaseConnection;
import org.sitmun.domain.database.DatabaseConnectionRepository;
import org.sitmun.domain.task.Task;
import org.sitmun.domain.task.TaskQueryValidator;
import org.sitmun.domain.task.parameter.TaskParameter;
import org.sitmun.domain.task.type.TaskType;
import org.sitmun.infrastructure.variables.SystemVariableResolver;
import org.sitmun.proxy.contract.JdbcParameter;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TaskQueryTestService {

  private final DatabaseConnectionRepository databaseConnectionRepository;
  private final DatabaseConnectionService databaseConnectionService;
  private final TaskQueryValidator taskQueryValidator;
  private final SystemVariableResolver systemVariableResolver;

  public QueryTestResult test(QueryTestRequest request) {
    int limit = request.getLimit() == null ? 10 : request.getLimit();
    int offset = request.getOffset() == null ? 0 : request.getOffset();
    if (limit < 0 || offset < 0) {
      throw new BadRequestException("LIMIT and OFFSET must be non-negative integers");
    }
    DatabaseConnection connection =
        databaseConnectionRepository
            .findById(request.getConnectionId() == null ? -1 : request.getConnectionId())
            .orElseThrow(() -> new EntityNotFoundException("Connection not found"));
    taskQueryValidator.validate(probe(request, connection));

    SqlTaskBinder binder = new SqlTaskBinder(systemVariableResolver);
    List<TaskParameter> declared = declared(request.getParameters());
    Map<String, String> clientValues =
        request.getClientValues() == null ? Map.of() : request.getClientValues();
    Map<String, String> systemValues =
        request.getSystemValues() == null ? Map.of() : request.getSystemValues();
    BoundSql asWritten =
        binder.bindWithSystemValues(request.getSql(), declared, clientValues, systemValues);
    String paged =
        JdbcSqlDialect.appendPagination(asWritten.sql(), limit, offset, connection.getUrl());

    QueryTestResult result = new QueryTestResult();
    result.setRuns(
        List.of(
            execute(connection, asWritten.sql(), asWritten.parameters(), "Run 1 as written"),
            execute(connection, paged, asWritten.parameters(), "Run 2 one page")));
    return result;
  }

  private Task probe(QueryTestRequest request, DatabaseConnection connection) {
    TaskType type = new TaskType();
    type.setId(DomainConstants.Tasks.TASK_TYPE_ID_QUERY);
    Map<String, Object> properties = new HashMap<>();
    properties.put(DomainConstants.Tasks.PROPERTY_SCOPE, DomainConstants.Tasks.SCOPE_SQL_QUERY);
    properties.put(DomainConstants.Tasks.PROPERTY_COMMAND, request.getSql());
    properties.put(
        DomainConstants.Tasks.PROPERTY_PARAMETERS,
        request.getParameters() == null ? List.of() : request.getParameters());
    Task task = new Task();
    task.setType(type);
    task.setConnection(connection);
    task.setProperties(properties);
    return task;
  }

  private static List<TaskParameter> declared(List<Map<String, Object>> rawParameters) {
    List<TaskParameter> declared = new ArrayList<>();
    if (rawParameters == null) {
      return declared;
    }
    for (Map<String, Object> raw : rawParameters) {
      String name = nameOf(raw);
      Object value = raw.get("value");
      Object required = raw.get("required");
      declared.add(
          new TaskParameter(
              name,
              value == null ? null : String.valueOf(value),
              null,
              raw.get("dataType") == null ? null : String.valueOf(raw.get("dataType")),
              required instanceof Boolean flag ? flag : null,
              Boolean.TRUE.equals(raw.get("provided"))
                  || "true".equalsIgnoreCase(String.valueOf(raw.get("provided"))),
              null,
              null,
              raw));
    }
    return declared;
  }

  private static String nameOf(Map<String, Object> raw) {
    for (String key : List.of("variable", "name", "label")) {
      Object value = raw.get(key);
      if (value != null && !String.valueOf(value).isBlank()) {
        return String.valueOf(value).trim();
      }
    }
    return "";
  }

  private QueryTestRun execute(
      DatabaseConnection connection, String sql, List<JdbcParameter> parameters, String label) {
    QueryTestRun run = new QueryTestRun();
    run.setLabel(label);
    run.setSql(sql);
    run.setValues(parameters.stream().map(JdbcParameter::value).toList());
    try {
      BoundedQuery query = databaseConnectionService.executeBounded(connection, sql, parameters);
      run.setOk(true);
      run.setRows(query.rows());
      run.setTruncated(query.truncated());
    } catch (DatabaseSQLException exception) {
      fail(run, exception);
    }
    return run;
  }

  private static void fail(QueryTestRun run, RuntimeException exception) {
    run.setOk(false);
    run.setRows(List.of());
    run.setTruncated(false);
    Throwable cause = exception.getCause() == null ? exception : exception.getCause();
    run.setError(cause.getMessage());
  }
}
