package org.sitmun.administration.service.database;

import jakarta.persistence.EntityNotFoundException;
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
import org.sitmun.domain.task.Task;
import org.sitmun.domain.task.TaskQueryValidator;
import org.sitmun.domain.task.TaskRepository;
import org.sitmun.domain.task.parameter.TaskParameter;
import org.sitmun.domain.task.parameter.TaskParameterProcessor;
import org.sitmun.infrastructure.variables.SystemVariableResolver;
import org.sitmun.proxy.contract.JdbcParameter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TaskQueryTestService {

  private final TaskRepository taskRepository;
  private final TaskParameterProcessor taskParameterProcessor;
  private final DatabaseConnectionService databaseConnectionService;
  private final TaskQueryValidator taskQueryValidator;
  private final SystemVariableResolver systemVariableResolver;

  @Transactional(readOnly = true)
  public QueryTestResult test(QueryTestRequest request) {
    int limit = request.getLimit() == null ? 10 : request.getLimit();
    int offset = request.getOffset() == null ? 0 : request.getOffset();
    if (limit < 0 || offset < 0) {
      throw new BadRequestException("LIMIT and OFFSET must be non-negative integers");
    }
    Task task =
        taskRepository
            .findById(request.getTaskId() == null ? -1 : request.getTaskId())
            .orElseThrow(() -> new EntityNotFoundException("Task not found"));
    if (!DomainConstants.Tasks.isSqlQueryTask(task)) {
      throw new BadRequestException("Task is not a SQL query task");
    }
    DatabaseConnection connection = task.getConnection();
    taskQueryValidator.validate(task);

    SqlTaskBinder binder = new SqlTaskBinder(systemVariableResolver);
    List<TaskParameter> declared = taskParameterProcessor.parse(task);
    String sql = String.valueOf(task.getProperties().get(DomainConstants.Tasks.PROPERTY_COMMAND));
    Map<String, String> clientValues =
        request.getClientValues() == null ? Map.of() : request.getClientValues();
    Map<String, String> systemValues =
        request.getSystemValues() == null ? Map.of() : request.getSystemValues();
    BoundSql asWritten = binder.bindWithSystemValues(sql, declared, clientValues, systemValues);
    String paged =
        JdbcSqlDialect.appendPagination(asWritten.sql(), limit, offset, connection.getUrl());

    QueryTestResult result = new QueryTestResult();
    result.setRuns(
        List.of(
            execute(connection, asWritten.sql(), asWritten.parameters(), "Run 1 as written"),
            execute(connection, paged, asWritten.parameters(), "Run 2 one page")));
    return result;
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
