package org.sitmun.domain.task;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.sitmun.domain.DomainConstants.Tasks.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.sitmun.domain.database.DatabaseConnection;
import org.sitmun.domain.task.parameter.TaskParameter;
import org.sitmun.domain.task.parameter.TaskParameterProcessor;
import org.sitmun.domain.task.type.TaskType;
import org.sitmun.infrastructure.variables.SystemVariableResolver;
import org.springframework.data.rest.core.RepositoryConstraintViolationException;
import org.springframework.validation.Errors;
import org.springframework.validation.FieldError;

@ExtendWith(MockitoExtension.class)
@DisplayName("TaskQueryValidator unit tests")
class TaskQueryValidatorTest {

  @Mock private TaskParameterProcessor taskParameterProcessor;
  @Mock private SystemVariableResolver systemVariableResolver;

  private TaskQueryValidator validator;

  @BeforeEach
  void setUp() {
    lenient()
        .when(systemVariableResolver.getAvailableVariables())
        .thenReturn(
            Map.of(
                "TERR_ID",
                "#{#territory.id}",
                "USER_NAME",
                "#{#user.username}",
                "MUN_INES",
                "#{T(org.sitmun.infrastructure.variables.SystemVariableSupport).munInes(#application, #territory)}"));
    validator = new TaskQueryValidator(taskParameterProcessor, systemVariableResolver);
  }

  /**
   * Helper method to set up mocks for task.getProperties() and taskParameterProcessor.parse().
   *
   * @param task mocked task
   * @param properties task properties containing parameters
   */
  @SuppressWarnings("unchecked")
  private void mockTaskParameterParsing(Task task, Map<String, Object> properties) {
    when(task.getProperties()).thenReturn(properties);

    List<Map<String, Object>> paramList =
        (List<Map<String, Object>>) properties.getOrDefault(PROPERTY_PARAMETERS, List.of());
    List<TaskParameter> taskParameters =
        paramList.stream()
            .map(
                param -> {
                  String name = (String) param.getOrDefault("variable", "unknown");
                  String rawValue = (String) param.get("value");
                  Boolean provided = (Boolean) param.get("provided");
                  boolean providedFlag = Boolean.TRUE.equals(provided);
                  return new TaskParameter(
                      name, rawValue, null, null, null, providedFlag, null, null, param);
                })
            .toList();
    when(taskParameterProcessor.parse(task)).thenReturn(taskParameters);
  }

  @Test
  @DisplayName("accept returns true when task type id matches Query (seed TASK_TYPE_ID_QUERY)")
  void acceptReturnsTrueForQueryTaskType() {
    // Given
    Task task = mock(Task.class);
    TaskType taskType = mock(TaskType.class);
    when(taskType.getId()).thenReturn(TASK_TYPE_ID_QUERY);
    when(task.getType()).thenReturn(taskType);

    // When
    boolean result = validator.accept(task);

    // Then
    assertTrue(result);
  }

  @Test
  @DisplayName(
      "accept returns true for Query id even when localized title differs from English \"Query\"")
  void acceptReturnsTrueForQueryTypeIdRegardlessOfTranslatedTitle() {
    Task task = mock(Task.class);
    TaskType taskType = mock(TaskType.class);
    when(taskType.getId()).thenReturn(TASK_TYPE_ID_QUERY);
    lenient().when(taskType.getTitle()).thenReturn("Consulta");
    when(task.getType()).thenReturn(taskType);

    assertTrue(validator.accept(task));
  }

  @Test
  @DisplayName("accept returns false for non-Query task type id")
  void acceptReturnsFalseForNonQueryTaskType() {
    // Given
    Task task = mock(Task.class);
    TaskType taskType = mock(TaskType.class);
    when(taskType.getId()).thenReturn(TASK_TYPE_ID_MORE_INFO);
    when(task.getType()).thenReturn(taskType);

    // When
    boolean result = validator.accept(task);

    // Then
    assertFalse(result);
  }

  @Test
  @DisplayName("accept returns false when task type id is null")
  void acceptReturnsFalseWhenTaskTypeIdIsNull() {
    // Given
    Task task = mock(Task.class);
    TaskType taskType = mock(TaskType.class);
    when(taskType.getId()).thenReturn(null);
    when(task.getType()).thenReturn(taskType);

    // When
    boolean result = validator.accept(task);

    // Then
    assertFalse(result);
  }

  @Test
  @DisplayName(
      "accept returns false when task type id is not TASK_TYPE_ID_QUERY (id wins over title)")
  void acceptReturnsFalseWhenTaskTypeIdIsNotQuery() {
    Task task = mock(Task.class);
    TaskType taskType = mock(TaskType.class);
    when(taskType.getId()).thenReturn(TASK_TYPE_ID_BASIC);
    when(task.getType()).thenReturn(taskType);

    assertFalse(validator.accept(task));
  }

  @Test
  @DisplayName("accept returns false for null task type")
  void acceptReturnsFalseForNullTaskType() {
    // Given
    Task task = mock(Task.class);
    when(task.getType()).thenReturn(null);

    // When
    boolean result = validator.accept(task);

    // Then
    assertFalse(result);
  }

  @Test
  @DisplayName("accept returns false for null task")
  void acceptReturnsFalseForNullTask() {
    // When
    boolean result = validator.accept(null);

    // Then
    assertFalse(result);
  }

  @Test
  @DisplayName("validate is a no-op when task is null")
  void validateIsNoOpWhenTaskIsNull() {
    assertDoesNotThrow(() -> validator.validate(null));
  }

  @Test
  @DisplayName("validate is a no-op when properties is null")
  void validateIsNoOpWhenPropertiesIsNull() {
    // Given
    Task task = mock(Task.class);
    when(task.getProperties()).thenReturn(null);

    // When/Then - no exception thrown
    assertDoesNotThrow(() -> validator.validate(task));
  }

  @Test
  @DisplayName(
      "validate is a no-op for web-api-query scope (proxied) even with provided parameters")
  void validateIsNoOpForProxiedWebApiQuery() {
    // Given
    Task task = mock(Task.class);
    Map<String, Object> properties = new HashMap<>();
    properties.put(PROPERTY_SCOPE, SCOPE_WEB_API_QUERY);

    Map<String, Object> param = new HashMap<>();
    param.put("variable", "apiKey");
    param.put("provided", true);
    properties.put(PROPERTY_PARAMETERS, List.of(param));

    when(task.getProperties()).thenReturn(properties);

    // When/Then - no exception thrown
    assertDoesNotThrow(() -> validator.validate(task));
  }

  @Test
  @DisplayName("validate throws exception for web-api-query-no-proxy with provided parameters")
  void validateThrowsExceptionForNoProxyWithProvidedParameters() {
    // Given
    Task task = mock(Task.class);

    Map<String, Object> properties = new HashMap<>();
    properties.put(PROPERTY_SCOPE, SCOPE_WEB_API_QUERY_NO_PROXY);

    Map<String, Object> param = new HashMap<>();
    param.put("variable", "apiKey");
    param.put("provided", true);
    properties.put(PROPERTY_PARAMETERS, List.of(param));

    when(task.getProperties()).thenReturn(properties);
    mockTaskParameterParsing(task, properties);

    // When
    RepositoryConstraintViolationException exception =
        assertThrows(RepositoryConstraintViolationException.class, () -> validator.validate(task));

    // Then
    Errors errors = exception.getErrors();
    assertNotNull(errors);
    assertTrue(errors.hasFieldErrors("properties"));
    FieldError propertiesError = errors.getFieldError("properties");
    assertNotNull(propertiesError);
    assertEquals("directExecution.backendFeaturesNotAllowed", propertiesError.getCode());
  }

  @Test
  @DisplayName("validate throws exception for web-api-query-no-proxy with #{...} in command")
  void validateThrowsExceptionForNoProxyWithSystemVariablesInCommand() {
    // Given
    Task task = mock(Task.class);

    Map<String, Object> properties = new HashMap<>();
    properties.put(PROPERTY_SCOPE, SCOPE_WEB_API_QUERY_NO_PROXY);
    properties.put(PROPERTY_COMMAND, "https://api.example.com?app=#{APP_ID}");

    mockTaskParameterParsing(task, properties);

    // When
    RepositoryConstraintViolationException exception =
        assertThrows(RepositoryConstraintViolationException.class, () -> validator.validate(task));

    // Then
    Errors errors = exception.getErrors();
    assertNotNull(errors);
    assertTrue(errors.hasFieldErrors("properties"));
    FieldError propertiesError = errors.getFieldError("properties");
    assertNotNull(propertiesError);
    String message = propertiesError.getDefaultMessage();
    assertNotNull(message);
    assertTrue(message.contains("system variables"));
  }

  @Test
  @DisplayName("validate throws exception for web-api-query-no-proxy with authentication")
  void validateThrowsExceptionForNoProxyWithAuthentication() {
    // Given
    Task task = mock(Task.class);

    Map<String, Object> properties = new HashMap<>();
    properties.put(PROPERTY_SCOPE, SCOPE_WEB_API_QUERY_NO_PROXY);
    properties.put(PROPERTY_AUTHENTICATION_MODE, "Basic");
    properties.put(PROPERTY_COMMAND, "https://api.example.com/data");

    mockTaskParameterParsing(task, properties);

    // When
    RepositoryConstraintViolationException exception =
        assertThrows(RepositoryConstraintViolationException.class, () -> validator.validate(task));

    // Then
    Errors errors = exception.getErrors();
    assertNotNull(errors);
    assertTrue(errors.hasFieldErrors("properties"));
    FieldError propertiesError = errors.getFieldError("properties");
    assertNotNull(propertiesError);
    String message = propertiesError.getDefaultMessage();
    assertNotNull(message);
    assertTrue(message.contains("Authentication"));
  }

  @Test
  @DisplayName("validate throws exception for web-api-query-no-proxy with headers")
  void validateThrowsExceptionForNoProxyWithHeaders() {
    // Given
    Task task = mock(Task.class);

    Map<String, Object> properties = new HashMap<>();
    properties.put(PROPERTY_SCOPE, SCOPE_WEB_API_QUERY_NO_PROXY);
    properties.put(PROPERTY_COMMAND, "https://api.example.com/data");
    properties.put(PROPERTY_HEADERS, Map.of("X-Custom", "value"));

    mockTaskParameterParsing(task, properties);

    // When
    RepositoryConstraintViolationException exception =
        assertThrows(RepositoryConstraintViolationException.class, () -> validator.validate(task));

    // Then
    Errors errors = exception.getErrors();
    assertNotNull(errors);
    assertTrue(errors.hasFieldErrors("properties"));
    FieldError propertiesError = errors.getFieldError("properties");
    assertNotNull(propertiesError);
    String message = propertiesError.getDefaultMessage();
    assertNotNull(message);
    assertTrue(message.contains("Headers"));
  }

  @Test
  @DisplayName("validate throws exception for external-link with provided parameters")
  void validateThrowsExceptionForExternalLinkWithProvidedParameters() {
    // Given
    Task task = mock(Task.class);

    Map<String, Object> properties = new HashMap<>();
    properties.put(PROPERTY_SCOPE, SCOPE_URL_QUERY);

    Map<String, Object> param = new HashMap<>();
    param.put("variable", "apiKey");
    param.put("provided", true);
    properties.put(PROPERTY_PARAMETERS, List.of(param));

    mockTaskParameterParsing(task, properties);

    // When
    RepositoryConstraintViolationException exception =
        assertThrows(RepositoryConstraintViolationException.class, () -> validator.validate(task));

    // Then
    Errors errors = exception.getErrors();
    assertNotNull(errors);
    assertTrue(errors.hasFieldErrors("properties"));
    FieldError propertiesError = errors.getFieldError("properties");
    assertNotNull(propertiesError);
    String message = propertiesError.getDefaultMessage();
    assertNotNull(message);
    assertTrue(message.contains(SCOPE_URL_QUERY));
  }

  @Test
  @DisplayName("validate allows web-api-query-no-proxy with plain public parameters")
  void validateAllowsNoProxyWithPlainParameters() {
    // Given
    Task task = mock(Task.class);
    Map<String, Object> properties = new HashMap<>();
    properties.put(PROPERTY_SCOPE, SCOPE_WEB_API_QUERY_NO_PROXY);
    properties.put(PROPERTY_COMMAND, "https://public-api.example.com/data");

    Map<String, Object> param = new HashMap<>();
    param.put("variable", "format");
    param.put("value", "json");
    param.put("provided", false);
    properties.put(PROPERTY_PARAMETERS, List.of(param));

    mockTaskParameterParsing(task, properties);

    // When/Then - no exception thrown
    assertDoesNotThrow(() -> validator.validate(task));
  }

  @Test
  @DisplayName("validate allows external-link with plain command and no backend features")
  void validateAllowsExternalLinkWithPlainCommand() {
    // Given
    Task task = mock(Task.class);
    Map<String, Object> properties = new HashMap<>();
    properties.put(PROPERTY_SCOPE, SCOPE_URL_QUERY);
    properties.put(PROPERTY_COMMAND, "https://www.example.com/document.pdf");

    mockTaskParameterParsing(task, properties);

    // When/Then - no exception thrown
    assertDoesNotThrow(() -> validator.validate(task));
  }

  @Test
  @DisplayName("sql-query derives required and accepts a bound placeholder")
  void sqlQueryDerivesRequired() {
    Map<String, Object> parameter = new HashMap<>();
    parameter.put("name", "p");
    parameter.put("label", "Echo");
    parameter.put("dataType", "string");
    Task task = sqlTask("SELECT ${p} AS echo", List.of(parameter));

    validator.validate(task);

    assertEquals(Boolean.TRUE, parameter.get("required"));
  }

  @Test
  @DisplayName("sql-query accepts its own saved provided and default parameters again")
  void sqlQueryRevalidatesSavedParameters() {
    Map<String, Object> provided = new HashMap<>();
    provided.put("name", "p");
    provided.put("provided", true);
    provided.put("value", "stored");
    Map<String, Object> withDefault = new HashMap<>();
    withDefault.put("name", "q");
    withDefault.put("value", "kept");
    Task task = sqlTask("SELECT ${p} AS a, ${q} AS b", List.of(provided, withDefault));

    validator.validate(task);
    assertEquals(Boolean.FALSE, provided.get("required"));
    assertEquals(Boolean.FALSE, withDefault.get("required"));

    assertDoesNotThrow(() -> validator.validate(task));
  }

  @Test
  @DisplayName("sql-query rejects a name-part placeholder")
  void sqlQueryRejectsNamePart() {
    RepositoryConstraintViolationException exception =
        assertThrows(
            RepositoryConstraintViolationException.class,
            () -> validator.validate(sqlTask("SELECT * FROM parcels_${x}", List.of())));
    assertTrue(messages(exception).stream().anyMatch(message -> message.contains("NAME_PART")));
  }

  @Test
  @DisplayName("sql-query rejects a partial literal, undeclared and unused parameters")
  void sqlQueryRejectsPlaceholderRules() {
    assertTrue(
        messages(
                assertThrows(
                    RepositoryConstraintViolationException.class,
                    () ->
                        validator.validate(
                            sqlTask("SELECT * FROM t WHERE a = 'x${p}'", List.of()))))
            .stream()
            .anyMatch(message -> message.contains("PARTIAL_LITERAL")));
    assertTrue(
        messages(
                assertThrows(
                    RepositoryConstraintViolationException.class,
                    () -> validator.validate(sqlTask("SELECT ${x} FROM t", List.of()))))
            .stream()
            .anyMatch(message -> message.contains("UNDECLARED")));
    Map<String, Object> unused = new HashMap<>();
    unused.put("name", "extra");
    assertTrue(
        messages(
                assertThrows(
                    RepositoryConstraintViolationException.class,
                    () -> validator.validate(sqlTask("SELECT 1", List.of(unused)))))
            .stream()
            .anyMatch(message -> message.contains("UNUSED")));
  }

  @Test
  @DisplayName("sql-query rejects MUN_INES outside IN and unsafe SQL shapes")
  void sqlQueryRejectsShape() {
    assertTrue(
        messages(
                assertThrows(
                    RepositoryConstraintViolationException.class,
                    () ->
                        validator.validate(
                            sqlTask("SELECT * FROM t WHERE m = #{MUN_INES}", List.of()))))
            .stream()
            .anyMatch(message -> message.contains("LIST_OUTSIDE_IN")));
    for (String sql :
        List.of(
            "WITH cte AS (SELECT 1) SELECT * FROM cte", "SELECT 1; SELECT 2", "SELECT 1 -- tail")) {
      assertThrows(
          RepositoryConstraintViolationException.class,
          () -> validator.validate(sqlTask(sql, List.of())));
    }
  }

  @Test
  @DisplayName("sql-query rejects reserved, system and invalid parameter names")
  void sqlQueryRejectsParameterNames() {
    for (String name : List.of("limit", "TERR_ID", "a b")) {
      Map<String, Object> parameter = new HashMap<>();
      parameter.put("name", name);
      assertThrows(
          RepositoryConstraintViolationException.class,
          () -> validator.validate(sqlTask("SELECT 1", List.of(parameter))));
    }
  }

  @Test
  @DisplayName("sql-query rejects blank provided, system expressions and optional values")
  void sqlQueryRejectsParameterValues() {
    Map<String, Object> provided = new HashMap<>();
    provided.put("name", "p");
    provided.put("provided", true);
    provided.put("value", " ");
    Map<String, Object> expression = new HashMap<>();
    expression.put("name", "p");
    expression.put("value", "x#{USER_ID}");
    Map<String, Object> optional = new HashMap<>();
    optional.put("name", "p");
    optional.put("optional", true);
    optional.put("value", "kept");
    Map<String, Object> dataType = new HashMap<>();
    dataType.put("name", "p");
    dataType.put("dataType", "uuid");
    for (Map<String, Object> parameter : List.of(provided, expression, optional, dataType)) {
      assertThrows(
          RepositoryConstraintViolationException.class,
          () -> validator.validate(sqlTask("SELECT ${p} AS echo", List.of(parameter))));
    }
  }

  private Task sqlTask(String sql, List<Map<String, Object>> parameters) {
    Task task = mock(Task.class);
    TaskType type = mock(TaskType.class);
    when(type.getId()).thenReturn(TASK_TYPE_ID_QUERY);
    when(task.getType()).thenReturn(type);
    when(task.getConnection()).thenReturn(mock(DatabaseConnection.class));
    Map<String, Object> properties = new HashMap<>();
    properties.put(PROPERTY_SCOPE, SCOPE_SQL_QUERY);
    properties.put(PROPERTY_COMMAND, sql);
    properties.put(PROPERTY_PARAMETERS, parameters);
    when(task.getProperties()).thenReturn(properties);
    return task;
  }

  private static List<String> messages(RepositoryConstraintViolationException exception) {
    return exception.getErrors().getAllErrors().stream()
        .map(error -> error.getDefaultMessage())
        .toList();
  }
}
