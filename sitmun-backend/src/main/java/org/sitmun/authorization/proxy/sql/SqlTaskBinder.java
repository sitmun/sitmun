package org.sitmun.authorization.proxy.sql;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import org.sitmun.authorization.proxy.exception.BadRequestException;
import org.sitmun.authorization.proxy.service.RequestCoordinates;
import org.sitmun.domain.task.parameter.TaskParameter;
import org.sitmun.infrastructure.variables.SystemVariableResolver;
import org.sitmun.proxy.contract.JdbcParameter;
import org.springframework.util.StringUtils;

/**
 * Replaces {@code ${name}} and {@code #{VAR}} with typed {@code ?} parameters. Never appends SQL.
 */
public class SqlTaskBinder {

  private static final Set<String> DATA_TYPES =
      Set.of("string", "integer", "number", "date", "timestamp", "boolean");

  private static final Set<String> INTEGER_SYSTEM =
      Set.of("USER_ID", "TERR_ID", "APP_ID", "APP_CODIGO", "TER_CODIGO", "USU_CODIGO");

  private final SystemVariableResolver systemVariableResolver;

  public SqlTaskBinder(SystemVariableResolver systemVariableResolver) {
    this.systemVariableResolver = systemVariableResolver;
  }

  public BoundSql bind(
      String sql,
      List<TaskParameter> declared,
      Map<String, String> clientValues,
      RequestCoordinates coordinates) {
    return bind(sql, declared, clientValues, name -> resolve(name, coordinates));
  }

  /** Binds {@code #{VAR}} from operator-supplied values instead of the request session. */
  public BoundSql bindWithSystemValues(
      String sql,
      List<TaskParameter> declared,
      Map<String, String> clientValues,
      Map<String, String> systemValues) {
    return bind(sql, declared, clientValues, name -> operatorSystem(name, systemValues));
  }

  private BoundSql bind(
      String sql,
      List<TaskParameter> declared,
      Map<String, String> clientValues,
      Function<String, Object> systemValues) {
    if (!StringUtils.hasText(sql)) {
      return new BoundSql(sql, List.of());
    }
    Set<String> declaredNames = new LinkedHashSet<>();
    for (TaskParameter parameter : declared) {
      declaredNames.add(parameter.name());
    }
    Map<String, String> system = systemVariableResolver.getAvailableVariables();
    Set<String> systemNames = system == null ? Set.of() : system.keySet();
    SqlScan scan = SqlPlaceholderScanner.scan(sql, declaredNames, systemNames);
    List<String> blocking = new ArrayList<>();
    for (SqlScan.Violation violation : scan.violations()) {
      if (!SqlPlaceholderScanner.UNUSED.equals(violation.code())) {
        blocking.add(violation.code() + (violation.name() == null ? "" : " " + violation.name()));
      }
    }
    if (!blocking.isEmpty()) {
      throw new BadRequestException("Rejected SQL: " + String.join(", ", blocking));
    }

    StringBuilder rewritten = new StringBuilder();
    List<JdbcParameter> parameters = new ArrayList<>();
    int cursor = 0;
    for (SqlScan.Placement placement : scan.placements()) {
      rewritten.append(sql, cursor, placement.start());
      if (placement.context() == SqlScan.Context.IN_LIST) {
        appendInList(parameters, rewritten, systemValues.apply(SqlPlaceholderScanner.MUN_INES));
      } else if (placement.kind() == SqlScan.Kind.CLIENT) {
        parameters.add(bindClient(placement.name(), declared, clientValues));
        rewritten.append('?');
      } else {
        parameters.add(jdbcOf(systemValues.apply(placement.name())));
        rewritten.append('?');
      }
      cursor = placement.end();
    }
    rewritten.append(sql.substring(cursor));
    return new BoundSql(rewritten.toString(), List.copyOf(parameters));
  }

  private void appendInList(
      List<JdbcParameter> parameters, StringBuilder rewritten, Object resolved) {
    String raw = resolved == null ? "" : String.valueOf(resolved);
    List<String> codes = new ArrayList<>();
    if (!raw.isBlank()) {
      for (String token : raw.split(",")) {
        String code = token.trim();
        if (!code.isEmpty()) {
          codes.add(code);
        }
      }
    }
    if (codes.isEmpty()) {
      rewritten.append('?');
      parameters.add(new JdbcParameter(Types.VARCHAR, null));
      return;
    }
    for (int i = 0; i < codes.size(); i++) {
      if (i > 0) {
        rewritten.append(", ");
      }
      rewritten.append('?');
      parameters.add(new JdbcParameter(Types.VARCHAR, codes.get(i)));
    }
  }

  private JdbcParameter bindClient(
      String name, List<TaskParameter> declared, Map<String, String> clientValues) {
    TaskParameter parameter = null;
    for (TaskParameter candidate : declared) {
      if (name.equals(candidate.name())) {
        parameter = candidate;
        break;
      }
    }
    if (parameter == null) {
      throw new BadRequestException("Undeclared parameter '" + name + "'");
    }
    String dataType = dataType(parameter);
    if (parameter.providedFlag()) {
      String stored = parameter.rawValue();
      if (!StringUtils.hasText(stored)) {
        throw new BadRequestException("Provided parameter '" + name + "' needs a value");
      }
      rejectSystemExpression(name, stored);
      return parse(dataType, stored);
    }
    String client = clientValues == null ? null : clientValues.get(name);
    if (StringUtils.hasText(client)) {
      rejectSystemExpression(name, client);
      return parse(dataType, client);
    }
    if (StringUtils.hasText(parameter.rawValue())) {
      rejectSystemExpression(name, parameter.rawValue());
      return parse(dataType, parameter.rawValue());
    }
    if (optional(parameter)) {
      return new JdbcParameter(sqlType(dataType), null);
    }
    throw new BadRequestException("Missing value for parameter '" + name + "'");
  }

  private Object operatorSystem(String name, Map<String, String> systemValues) {
    String raw = systemValues == null ? null : systemValues.get(name);
    if (SqlPlaceholderScanner.MUN_INES.equals(name)) {
      return raw == null ? "" : raw;
    }
    if (!StringUtils.hasText(raw)) {
      throw new BadRequestException("Missing value for system variable '" + name + "'");
    }
    rejectSystemExpression(name, raw);
    if ("DATE".equals(name)) {
      try {
        return timestamp(raw.trim()).toLocalDateTime();
      } catch (RuntimeException exception) {
        throw new BadRequestException("Invalid timestamp value");
      }
    }
    if (INTEGER_SYSTEM.contains(name)) {
      try {
        return Integer.valueOf(raw.trim());
      } catch (NumberFormatException exception) {
        throw new BadRequestException("Invalid integer value");
      }
    }
    return raw;
  }

  private Object resolve(String name, RequestCoordinates coordinates) {
    try {
      return systemVariableResolver.resolveValue(name, coordinates);
    } catch (RuntimeException exception) {
      throw new BadRequestException("System variable '" + name + "' could not be resolved");
    }
  }

  private static void rejectSystemExpression(String name, String value) {
    if (value != null && value.contains("#{")) {
      throw new BadRequestException("Parameter '" + name + "' must not contain #{");
    }
  }

  private static boolean optional(TaskParameter parameter) {
    Object flag = parameter.raw().get("optional");
    if (Boolean.TRUE.equals(flag) || "true".equalsIgnoreCase(String.valueOf(flag))) {
      return true;
    }
    return Boolean.FALSE.equals(parameter.required());
  }

  private static String dataType(TaskParameter parameter) {
    Object explicit = parameter.raw().get("dataType");
    if (explicit != null && DATA_TYPES.contains(String.valueOf(explicit))) {
      return String.valueOf(explicit);
    }
    if (parameter.type() != null && DATA_TYPES.contains(parameter.type())) {
      return parameter.type();
    }
    return "string";
  }

  private static int sqlType(String dataType) {
    return switch (dataType) {
      case "integer" -> Types.INTEGER;
      case "number" -> Types.DOUBLE;
      case "date" -> Types.DATE;
      case "timestamp" -> Types.TIMESTAMP;
      case "boolean" -> Types.BOOLEAN;
      default -> Types.VARCHAR;
    };
  }

  private static JdbcParameter parse(String dataType, String raw) {
    try {
      return switch (dataType) {
        case "integer" -> new JdbcParameter(Types.INTEGER, Integer.valueOf(raw.trim()));
        case "number" -> new JdbcParameter(Types.DOUBLE, Double.valueOf(raw.trim()));
        case "date" ->
            new JdbcParameter(Types.DATE, java.sql.Date.valueOf(LocalDate.parse(raw.trim())));
        case "timestamp" -> new JdbcParameter(Types.TIMESTAMP, timestamp(raw.trim()));
        case "boolean" -> new JdbcParameter(Types.BOOLEAN, bool(raw.trim()));
        case "string" -> new JdbcParameter(Types.VARCHAR, raw);
        default -> throw new BadRequestException("Unknown data type '" + dataType + "'");
      };
    } catch (BadRequestException exception) {
      throw exception;
    } catch (RuntimeException exception) {
      throw new BadRequestException("Invalid " + dataType + " value");
    }
  }

  private static boolean bool(String raw) {
    if ("true".equalsIgnoreCase(raw)) {
      return true;
    }
    if ("false".equalsIgnoreCase(raw)) {
      return false;
    }
    throw new BadRequestException("Invalid boolean value");
  }

  private static Timestamp timestamp(String raw) {
    try {
      return Timestamp.from(Instant.parse(raw));
    } catch (DateTimeParseException ignored) {
      try {
        return Timestamp.from(OffsetDateTime.parse(raw).toInstant());
      } catch (DateTimeParseException ignoredAgain) {
        return Timestamp.valueOf(LocalDateTime.parse(raw));
      }
    }
  }

  private static JdbcParameter jdbcOf(Object value) {
    if (value == null) {
      return new JdbcParameter(Types.VARCHAR, null);
    }
    if (value instanceof Integer || value instanceof Short || value instanceof Byte) {
      return new JdbcParameter(Types.INTEGER, ((Number) value).intValue());
    }
    if (value instanceof Long number) {
      return new JdbcParameter(Types.BIGINT, number);
    }
    if (value instanceof Float || value instanceof Double) {
      return new JdbcParameter(Types.DOUBLE, ((Number) value).doubleValue());
    }
    if (value instanceof BigDecimal number) {
      return new JdbcParameter(Types.NUMERIC, number);
    }
    if (value instanceof Boolean flag) {
      return new JdbcParameter(Types.BOOLEAN, flag);
    }
    if (value instanceof LocalDate date) {
      return new JdbcParameter(Types.DATE, java.sql.Date.valueOf(date));
    }
    if (value instanceof LocalDateTime dateTime) {
      return new JdbcParameter(Types.TIMESTAMP, Timestamp.valueOf(dateTime));
    }
    if (value instanceof Instant instant) {
      return new JdbcParameter(Types.TIMESTAMP, Timestamp.from(instant));
    }
    if (value instanceof OffsetDateTime offsetDateTime) {
      return new JdbcParameter(Types.TIMESTAMP, Timestamp.from(offsetDateTime.toInstant()));
    }
    if (value instanceof String text) {
      return new JdbcParameter(Types.VARCHAR, text);
    }
    throw new BadRequestException(
        "Unsupported system variable type " + value.getClass().getSimpleName());
  }
}
