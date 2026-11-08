package org.sitmun.domain.task;

import static org.sitmun.domain.DomainConstants.Tasks.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.sitmun.authorization.proxy.sql.SqlPlaceholderScanner;
import org.sitmun.authorization.proxy.sql.SqlScan;
import org.sitmun.domain.task.parameter.TaskParameter;
import org.sitmun.domain.task.parameter.TaskParameterProcessor;
import org.sitmun.infrastructure.util.ParameterValidator;
import org.sitmun.infrastructure.variables.SystemVariableResolver;
import org.springframework.data.rest.core.RepositoryConstraintViolationException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.validation.Errors;

@Component
@RequiredArgsConstructor
public class TaskQueryValidator implements TaskValidator {

  private static final Pattern PARAMETER_NAME = Pattern.compile("[A-Za-z_][A-Za-z0-9_]*");
  private static final Set<String> DATA_TYPES =
      Set.of("string", "integer", "number", "date", "timestamp", "boolean");
  private static final Set<String> RESERVED = Set.of("limit", "offset");

  private final TaskParameterProcessor taskParameterProcessor;
  private final SystemVariableResolver systemVariableResolver;

  private static final String ERRORS_PROPERTIES_FIELD = "properties";
  private static final String ERROR_CODE_DIRECT_EXECUTION =
      "directExecution.backendFeaturesNotAllowed";

  private static final String DIRECT_EXECUTION_VIOLATION_MESSAGE_FORMAT =
      "Direct execution tasks (%s) cannot use backend-only features: %s";

  /**
   * Applies only when {@link org.sitmun.domain.DomainConstants.Tasks#isQueryTask(Task)} is true.
   */
  @Override
  public boolean accept(Task task) {
    return isQueryTask(task);
  }

  @Override
  public void validate(Task task) throws RepositoryConstraintViolationException {
    if (task == null) {
      return;
    }
    Map<String, Object> properties = task.getProperties();
    if (properties == null) {
      return;
    }
    Object scopeObj = properties.get(PROPERTY_SCOPE);
    String scope = String.valueOf(scopeObj);

    if (isSqlQueryTask(task)) {
      validateSqlQuery(task, properties);
      return;
    }
    if (SCOPE_WEB_API_QUERY_NO_PROXY.equalsIgnoreCase(scope)
        || SCOPE_URL_QUERY.equalsIgnoreCase(scope)) {
      validateDirectExecutionScope(task, properties, scope);
    }
  }

  private void validateSqlQuery(Task task, Map<String, Object> properties) {
    Errors errors = init(task);
    List<Map<String, Object>> parameters = parameterMaps(properties);
    Set<String> declared = new LinkedHashSet<>();
    Set<String> systemNames = systemNames();
    for (Map<String, Object> parameter : parameters) {
      String name = parameterName(parameter);
      if (!PARAMETER_NAME.matcher(name).matches()) {
        errors.rejectValue(
            ERRORS_PROPERTIES_FIELD, "parameter.name", "Invalid parameter name '" + name + "'");
      } else if (RESERVED.contains(name.toLowerCase(java.util.Locale.ROOT))) {
        errors.rejectValue(
            ERRORS_PROPERTIES_FIELD,
            "parameter.reserved",
            "Parameter name '" + name + "' is reserved");
      } else if (systemNames.contains(name)) {
        errors.rejectValue(
            ERRORS_PROPERTIES_FIELD,
            "parameter.system",
            "Parameter name '" + name + "' is a system variable");
      } else if (!declared.add(name)) {
        errors.rejectValue(
            ERRORS_PROPERTIES_FIELD,
            "parameter.duplicate",
            "Duplicate parameter name '" + name + "'");
      }
      String value = parameter.get("value") == null ? "" : String.valueOf(parameter.get("value"));
      boolean provided = truth(parameter.get("provided"));
      boolean optional =
          parameter.containsKey("optional")
              ? truth(parameter.get("optional"))
              : Boolean.FALSE.equals(parameter.get("required"));
      if (provided && !StringUtils.hasText(value)) {
        errors.rejectValue(
            ERRORS_PROPERTIES_FIELD,
            "parameter.provided",
            "Provided parameter '" + name + "' needs a value");
      }
      if (value.contains("#{")) {
        errors.rejectValue(
            ERRORS_PROPERTIES_FIELD,
            "parameter.systemExpression",
            "Parameter '" + name + "' must not contain #{");
      }
      if (optional && StringUtils.hasText(value)) {
        errors.rejectValue(
            ERRORS_PROPERTIES_FIELD,
            "parameter.optionalValue",
            "Parameter '" + name + "' cannot be optional and have a value");
      }
      Object dataType = parameter.get("dataType");
      if (dataType != null
          && StringUtils.hasText(String.valueOf(dataType))
          && !DATA_TYPES.contains(String.valueOf(dataType))) {
        errors.rejectValue(
            ERRORS_PROPERTIES_FIELD, "parameter.dataType", "Unknown data type '" + dataType + "'");
      }
      parameter.put("required", !provided && !StringUtils.hasText(value) && !optional);
    }
    Object command = properties.get(PROPERTY_COMMAND);
    String sql = command == null ? "" : String.valueOf(command);
    SqlScan scan = SqlPlaceholderScanner.scan(sql, declared, systemNames);
    for (SqlScan.Violation violation : scan.violations()) {
      String where =
          violation.name() == null
              ? violation.code()
              : violation.code() + " " + violation.name() + " at " + violation.start();
      errors.rejectValue(ERRORS_PROPERTIES_FIELD, violation.code(), "Rejected SQL: " + where);
    }
    if (errors.hasErrors()) {
      throw new RepositoryConstraintViolationException(errors);
    }
  }

  private Set<String> systemNames() {
    Map<String, String> variables = systemVariableResolver.getAvailableVariables();
    return variables == null ? Set.of() : variables.keySet();
  }

  private static List<Map<String, Object>> parameterMaps(Map<String, Object> properties) {
    Object raw = properties.get(PROPERTY_PARAMETERS);
    if (!(raw instanceof List<?> list)) {
      return List.of();
    }
    List<Map<String, Object>> maps = new ArrayList<>();
    for (Object item : list) {
      if (item instanceof Map<?, ?> map) {
        @SuppressWarnings("unchecked")
        Map<String, Object> parameter = (Map<String, Object>) map;
        maps.add(parameter);
      }
    }
    return maps;
  }

  private static String parameterName(Map<String, Object> parameter) {
    for (String key : List.of("variable", "name", "label")) {
      Object value = parameter.get(key);
      if (value != null && StringUtils.hasText(String.valueOf(value))) {
        return String.valueOf(value).trim();
      }
    }
    return "";
  }

  private static boolean truth(Object value) {
    return Boolean.TRUE.equals(value) || "true".equalsIgnoreCase(String.valueOf(value));
  }

  /**
   * Validates that direct execution tasks (no-proxy and external-link) do not contain any
   * backend-only features that require proxy execution.
   */
  private void validateDirectExecutionScope(
      Task task, Map<String, Object> properties, String scope) {
    List<String> violations = new ArrayList<>();

    List<TaskParameter> parameters = taskParameterProcessor.parse(task);

    if (ParameterValidator.hasProvidedVariables(parameters)) {
      violations.add("Tasks with direct execution cannot have provided parameters");
    }

    Object commandObj = properties.get(PROPERTY_COMMAND);
    if (commandObj != null
        && ParameterValidator.containsSystemVariables(String.valueOf(commandObj))) {
      violations.add("Command URL cannot contain system variables #{...}");
    }

    if (ParameterValidator.containsSystemVariablesInParameters(parameters)) {
      violations.add("Parameter values cannot contain system variables #{...}");
    }

    @SuppressWarnings("unchecked")
    Map<String, Object> headers =
        (Map<String, Object>) properties.getOrDefault(PROPERTY_HEADERS, Collections.emptyMap());
    if (!headers.isEmpty()) {
      violations.add("Headers are not supported (requires proxy execution)");
      if (ParameterValidator.containsSystemVariablesInMapValues(headers)) {
        violations.add("Header values cannot contain system variables #{...}");
      }
    }

    @SuppressWarnings("unchecked")
    Map<String, Object> queryParams =
        (Map<String, Object>)
            properties.getOrDefault(PROPERTY_QUERY_PARAMS, Collections.emptyMap());
    if (!queryParams.isEmpty()) {
      violations.add("Query parameters are not supported (requires proxy execution)");
      if (ParameterValidator.containsSystemVariablesInMapValues(queryParams)) {
        violations.add("Query parameter values cannot contain system variables #{...}");
      }
    }

    Object authModeObj = properties.get(PROPERTY_AUTHENTICATION_MODE);
    if (authModeObj != null
        && !AUTHENTICATION_MODE_NONE.equalsIgnoreCase(String.valueOf(authModeObj))
        && !String.valueOf(authModeObj).trim().isEmpty()) {
      violations.add("Authentication is not supported (requires proxy execution)");
    }

    if (!violations.isEmpty()) {
      var errors = init(task);
      String message =
          String.format(
              DIRECT_EXECUTION_VIOLATION_MESSAGE_FORMAT, scope, String.join("; ", violations));
      errors.rejectValue(ERRORS_PROPERTIES_FIELD, ERROR_CODE_DIRECT_EXECUTION, message);
      throw new RepositoryConstraintViolationException(errors);
    }
  }
}
