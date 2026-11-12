package org.sitmun.proxy.middleware.protocols.jdbc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.sitmun.proxy.contract.JdbcParameter;
import org.sitmun.proxy.contract.ProxyHeaders;
import org.sitmun.proxy.middleware.dto.ProblemDetail;
import org.slf4j.LoggerFactory;

@ExtendWith(MockitoExtension.class)
class JdbcRequestExecutorTest {

  @Mock private Connection connection;
  @Mock private Statement statement;

  @Test
  void executionFailureOmitsConnectionSqlParametersAndDatabaseError() throws SQLException {
    var executor = new JdbcRequestExecutor();
    executor.setConnection(connection);
    executor.setSql("select secret_value from private_table where tenant = ?");
    executor.setParameters(List.of(new JdbcParameter(Types.VARCHAR, "tenant-secret")));
    when(connection.prepareStatement(executorSql())).thenThrow(hostileFailure());

    List<ILoggingEvent> events = captureLogs(() -> assertSanitizedFailure(executor));

    assertThat(events)
        .extracting(ILoggingEvent::getFormattedMessage)
        .anySatisfy(
            message ->
                assertThat(message)
                    .contains("SQLException")
                    .doesNotContain(
                        "internal.example",
                        "database-secret",
                        "select secret_value",
                        "tenant-secret"));
    assertThat(events)
        .allSatisfy(event -> assertThat(event.getThrowableProxy()).as("stack trace").isNull());
  }

  @Test
  void descriptionRetainsPresenceAndCountWithoutSensitiveValues() {
    var executor = new JdbcRequestExecutor();
    executor.setConnection(connection);
    executor.setSql("select password from users");
    executor.setParameters(
        List.of(
            new JdbcParameter(Types.VARCHAR, "first-secret"),
            new JdbcParameter(Types.VARCHAR, "second-secret")));

    assertThat(executor.describe())
        .contains("connectionPresent=true", "sqlPresent=true", "parameterCount=2")
        .doesNotContain("internal.example", "select password", "first-secret", "second-secret");
  }

  private String executorSql() {
    return "select secret_value from private_table where tenant = ?";
  }

  private SQLException hostileFailure() {
    return new SQLException(
        "Connection jdbc:postgresql://internal.example/private failed for database-secret");
  }

  private static void assertSanitizedFailure(JdbcRequestExecutor executor) {
    var response = executor.execute().asResponseEntity();

    assertThat(response.getStatusCode().value()).isEqualTo(500);
    assertThat(response.getBody()).isInstanceOf(ProblemDetail.class);
    var problem = (ProblemDetail) response.getBody();
    assertThat(problem.getDetail()).isEqualTo("The JDBC service request failed");
    assertThat(problem.getInstance()).isEqualTo("/proxy");
    assertThat(problem.getProperties()).containsEntry("origin", "upstream-service");
    assertThat(problem.toString())
        .doesNotContain(
            "internal.example", "database-secret", "select secret_value", "tenant-secret");
  }

  private static List<ILoggingEvent> captureLogs(Runnable action) {
    Logger logger = (Logger) LoggerFactory.getLogger(JdbcRequestExecutor.class);
    var appender = new ListAppender<ILoggingEvent>();
    appender.start();
    logger.addAppender(appender);
    Level previousLevel = logger.getLevel();
    logger.setLevel(Level.DEBUG);
    try {
      action.run();
      return List.copyOf(appender.list);
    } finally {
      logger.setLevel(previousLevel);
      logger.detachAppender(appender);
      appender.stop();
    }
  }

  @Test
  @DisplayName("execute uses Statement fallback when parameters are absent")
  void executeUsesStatementFallbackWhenParametersAbsent() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    ResultSetMetaData metadata = mock(ResultSetMetaData.class);

    when(connection.createStatement()).thenReturn(statement);
    when(statement.executeQuery("SELECT 1")).thenReturn(resultSet);
    when(resultSet.getMetaData()).thenReturn(metadata);
    when(metadata.getColumnCount()).thenReturn(1);
    when(metadata.getColumnLabel(1)).thenReturn("value");
    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getObject(1)).thenReturn(1);

    JdbcRequestExecutor executor = new JdbcRequestExecutor();
    executor.setConnection(connection);
    executor.setSql("SELECT 1");

    var responseEntity = executor.execute().asResponseEntity();

    assertThat(responseEntity.getStatusCode().value()).isEqualTo(200);
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> body = (List<Map<String, Object>>) responseEntity.getBody();
    assertThat(body).hasSize(1);
    assertThat(body.get(0)).containsEntry("value", 1);

    verify(connection).createStatement();
    verify(statement).executeQuery("SELECT 1");
    verify(connection, never()).prepareStatement(anyString());
  }

  @Test
  @DisplayName("execute uses PreparedStatement when parameters are present")
  void executeUsesPreparedStatementWhenParametersPresent() throws Exception {
    PreparedStatement preparedStatement = mock(PreparedStatement.class);
    ResultSet resultSet = mock(ResultSet.class);
    ResultSetMetaData metadata = mock(ResultSetMetaData.class);

    when(connection.prepareStatement("SELECT * FROM test WHERE a=? AND b=?"))
        .thenReturn(preparedStatement);
    when(preparedStatement.executeQuery()).thenReturn(resultSet);
    when(resultSet.getMetaData()).thenReturn(metadata);
    when(metadata.getColumnCount()).thenReturn(1);
    when(metadata.getColumnLabel(1)).thenReturn("value");
    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getObject(1)).thenReturn("ok");

    JdbcRequestExecutor executor = new JdbcRequestExecutor();
    executor.setConnection(connection);
    executor.setSql("SELECT * FROM test WHERE a=? AND b=?");
    executor.setParameters(
        List.of(new JdbcParameter(Types.VARCHAR, "x"), new JdbcParameter(Types.VARCHAR, "y")));

    var responseEntity = executor.execute().asResponseEntity();

    assertThat(responseEntity.getStatusCode().value()).isEqualTo(200);
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> body = (List<Map<String, Object>>) responseEntity.getBody();
    assertThat(body).hasSize(1);
    assertThat(body.get(0)).containsEntry("value", "ok");

    verify(connection).prepareStatement("SELECT * FROM test WHERE a=? AND b=?");
    verify(preparedStatement).setObject(1, "x", Types.VARCHAR);
    verify(preparedStatement).setObject(2, "y", Types.VARCHAR);
    verify(preparedStatement).executeQuery();
    verify(connection, never()).createStatement();
  }

  @Test
  @DisplayName("execute is read-only, times out, and flags a truncated page")
  void executeIsReadOnlyAndTruncates() throws Exception {
    PreparedStatement preparedStatement = mock(PreparedStatement.class);
    ResultSet resultSet = mock(ResultSet.class);
    ResultSetMetaData metadata = mock(ResultSetMetaData.class);
    when(connection.prepareStatement("SELECT id FROM t")).thenReturn(preparedStatement);
    when(preparedStatement.executeQuery()).thenReturn(resultSet);
    when(resultSet.getMetaData()).thenReturn(metadata);
    when(metadata.getColumnCount()).thenReturn(1);
    when(metadata.getColumnLabel(1)).thenReturn("id");
    when(resultSet.next()).thenReturn(true, true, true, false);
    when(resultSet.getObject(1)).thenReturn(1, 2, 3);

    JdbcRequestExecutor executor = new JdbcRequestExecutor();
    executor.setConnection(connection);
    executor.setSql("SELECT id FROM t");
    executor.setParameters(List.of(new JdbcParameter(Types.INTEGER, 1)));
    executor.setMaxRows(2);
    executor.setTimeoutSeconds(60);

    var response = executor.execute().asResponseEntity();

    @SuppressWarnings("unchecked")
    List<Map<String, Object>> body = (List<Map<String, Object>>) response.getBody();
    assertThat(body).hasSize(2);
    assertThat(response.getHeaders().getFirst(ProxyHeaders.TRUNCATED)).isEqualTo("true");
    verify(connection).setReadOnly(true);
    verify(connection).rollback();
    verify(preparedStatement).setQueryTimeout(60);
    verify(preparedStatement).setMaxRows(3);
    verify(preparedStatement).setObject(1, 1, Types.INTEGER);
  }

  @Test
  @DisplayName("Oracle boolean binds as 1 or 0")
  void oracleBooleanBindsAsNumber() throws Exception {
    PreparedStatement preparedStatement = mock(PreparedStatement.class);
    ResultSet resultSet = mock(ResultSet.class);
    ResultSetMetaData metadata = mock(ResultSetMetaData.class);
    DatabaseMetaData databaseMetaData = mock(DatabaseMetaData.class);
    when(connection.getMetaData()).thenReturn(databaseMetaData);
    when(databaseMetaData.getDatabaseProductName()).thenReturn("Oracle");
    when(connection.prepareStatement("SELECT ?")).thenReturn(preparedStatement);
    when(preparedStatement.executeQuery()).thenReturn(resultSet);
    when(resultSet.getMetaData()).thenReturn(metadata);
    when(resultSet.next()).thenReturn(false);

    JdbcRequestExecutor executor = new JdbcRequestExecutor();
    executor.setConnection(connection);
    executor.setSql("SELECT ?");
    executor.setParameters(List.of(new JdbcParameter(Types.BOOLEAN, true)));

    executor.execute();

    verify(preparedStatement).setObject(1, 1, Types.NUMERIC);
  }

  @Test
  @DisplayName("a missing connection is a SQL error, not a null pointer")
  void missingConnectionIsASqlError() {
    JdbcRequestExecutor executor = new JdbcRequestExecutor();
    executor.setSql("SELECT 1");

    var response = executor.execute().asResponseEntity();

    assertThat(response.getStatusCode().value()).isEqualTo(500);
    assertThat(response.getBody()).isInstanceOf(ProblemDetail.class);
    assertThat(((ProblemDetail) response.getBody()).getDetail())
        .isEqualTo("The JDBC service request failed");
  }
}
