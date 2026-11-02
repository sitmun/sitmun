package org.sitmun.dictionary;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.sitmun.infrastructure.persistence.type.codelist.CodeList;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;

@SpringBootTest
class DataDictionaryConformanceTest {

  @Autowired private DataSource dataSource;

  @Test
  void writesTheDriftReport() throws Exception {
    Path dictionary = dictionaryPath();
    JsonNode document = new ObjectMapper().readTree(dictionary.toFile());
    List<String> rows = new ArrayList<>();
    rows.addAll(scanEntities(document));
    rows.addAll(scanFields(document));
    rows.addAll(scanH2(document));
    rows.addAll(scanOpenApi(document, Path.of("src/main/resources/static/v3")));
    Path out = Path.of("build/dictionary/java.drift");
    Files.createDirectories(out.getParent());
    Files.write(out, rows);
    if (Boolean.getBoolean("sitmun.dictionary.fail")) {
      assertTrue(rows.isEmpty(), String.join("\n", rows));
    }
  }

  private static Path dictionaryPath() {
    Path direct = Path.of("tools/dictionary/dictionary.json");
    if (Files.isRegularFile(direct)) {
      return direct;
    }
    return Path.of("..", "tools", "dictionary", "dictionary.json");
  }

  private static List<String> scanEntities(JsonNode document) throws Exception {
    List<String> rows = new ArrayList<>();
    var scanner = new ClassPathScanningCandidateComponentProvider(false);
    scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));
    for (BeanDefinition definition : scanner.findCandidateComponents("org.sitmun")) {
      Class<?> type = Class.forName(definition.getBeanClassName());
      Table table = type.getAnnotation(Table.class);
      if (table == null) {
        continue;
      }
      for (Field field : type.getDeclaredFields()) {
        Column column = field.getAnnotation(Column.class);
        if (column == null || column.name().isBlank()) {
          continue;
        }
        String key = table.name().toUpperCase() + "." + column.name().toUpperCase();
        JsonNode row = document.path("columns").path(key);
        if (row.isMissingNode() || !"decided".equals(row.path("status").asText())) {
          continue;
        }
        String consumer = type.getName() + "#" + field.getName();
        if ("string".equals(row.path("type").asText()) && row.hasNonNull("length")) {
          int expected = row.get("length").asInt();
          if (column.length() != expected) {
            rows.add(DictionaryComparison.line("length", key, consumer, expected, column.length()));
          }
          Size size = field.getAnnotation(Size.class);
          boolean reject = "reject".equals(row.path("enforcement").asText());
          if (reject && (size == null || size.max() != expected)) {
            rows.add(
                DictionaryComparison.line(
                    "length", key, consumer + "#size", expected, size == null ? null : size.max()));
          }
          if (!reject && size != null) {
            rows.add(DictionaryComparison.line("length", key, consumer + "#size", "", size.max()));
          }
        }
        boolean required = row.path("required").asBoolean(false);
        if (column.nullable() == required) {
          rows.add(
              DictionaryComparison.line("required", key, consumer, required, !column.nullable()));
        }
        boolean beanRequired =
            field.getAnnotation(NotNull.class) != null
                || field.getAnnotation(NotBlank.class) != null;
        if (required != beanRequired
            && column.insertable()
            && "string".equals(row.path("type").asText())) {
          rows.add(
              DictionaryComparison.line(
                  "required", key, consumer + "#bean", required, beanRequired));
        }
        CodeList codeList = field.getAnnotation(CodeList.class);
        if (codeList != null
            && row.hasNonNull("codelist")
            && !codeList.value().equals(row.get("codelist").asText())) {
          rows.add(
              DictionaryComparison.line(
                  "codelist", key, consumer, row.get("codelist").asText(), codeList.value()));
        }
      }
    }
    return rows;
  }

  private static List<String> scanFields(JsonNode document) throws Exception {
    List<String> rows = new ArrayList<>();
    var fields = document.path("fields").fields();
    while (fields.hasNext()) {
      var entry = fields.next();
      String[] parts = entry.getKey().split("#", 2);
      if (parts.length != 2) {
        continue;
      }
      String sameAs = entry.getValue().path("same_as").asText(null);
      JsonNode column = document.path("columns").path(sameAs == null ? "" : sameAs);
      if (column.isMissingNode() || !column.hasNonNull("length")) {
        continue;
      }
      Class<?> type = Class.forName(parts[0]);
      Field field = type.getDeclaredField(parts[1]);
      Size size = field.getAnnotation(Size.class);
      int expected = column.get("length").asInt();
      Integer observed = size == null ? null : size.max();
      if (observed == null || observed != expected) {
        rows.add(DictionaryComparison.line("length", sameAs, entry.getKey(), expected, observed));
      }
    }
    return rows;
  }

  private List<String> scanH2(JsonNode document) throws Exception {
    List<String> rows = new ArrayList<>();
    try (Connection connection = dataSource.getConnection()) {
      // INFORMATION_SCHEMA.COLUMNS is the H2 catalog. Oracle has no such view, and the
      // Oracle and PostgreSQL test jobs still run this class. Those catalogs are checked
      // from the fresh dump.
      if (!"H2".equalsIgnoreCase(connection.getMetaData().getDatabaseProductName())) {
        return rows;
      }
      try (var statement = connection.createStatement();
          var result =
              statement.executeQuery(
                  """
                  SELECT UPPER(TABLE_NAME), UPPER(COLUMN_NAME), DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
                  FROM INFORMATION_SCHEMA.COLUMNS
                  WHERE TABLE_SCHEMA = 'PUBLIC' AND UPPER(TABLE_NAME) LIKE 'STM_%'
                  """)) {
        while (result.next()) {
          String key = result.getString(1) + "." + result.getString(2);
          JsonNode row = document.path("columns").path(key);
          if (row.isMissingNode() || !"string".equals(row.path("type").asText())) {
            continue;
          }
          int observed = result.getInt(4);
          if (result.wasNull()) {
            continue;
          }
          if (row.hasNonNull("length") && row.get("length").asInt() != observed) {
            rows.add(
                DictionaryComparison.line(
                    "length", key, "h2", row.get("length").asInt(), observed));
          }
          boolean required = "NO".equalsIgnoreCase(result.getString(5));
          if (row.path("required").asBoolean(false) != required) {
            rows.add(
                DictionaryComparison.line(
                    "required", key, "h2", row.path("required").asBoolean(false), required));
          }
        }
      }
    }
    return rows;
  }

  private static List<String> scanOpenApi(JsonNode document, Path directory) throws Exception {
    List<String> rows = new ArrayList<>();
    if (!Files.isDirectory(directory)) {
      return rows;
    }
    try (var files = Files.list(directory)) {
      for (Path file :
          files.filter(path -> path.getFileName().toString().startsWith("api-docs-")).toList()) {
        rows.addAll(scanOpenApiFile(document, file));
      }
    }
    return rows;
  }

  private static List<String> scanOpenApiFile(JsonNode document, Path file) throws Exception {
    List<String> rows = new ArrayList<>();
    String schema = null;
    String property = null;
    boolean inProperties = false;
    Integer maxLength = null;
    boolean stringProperty = false;
    for (String line : Files.readAllLines(file)) {
      String header = line.trim();
      if (line.startsWith("    ")
          && !line.startsWith("     ")
          && header.endsWith(":")
          && !header.contains(" ")) {
        flushOpenApi(document, file, schema, property, stringProperty, maxLength, rows);
        schema = header.substring(0, header.length() - 1);
        inProperties = false;
        property = null;
        continue;
      }
      if (schema != null && line.equals("      properties:")) {
        inProperties = true;
        continue;
      }
      if (!inProperties || schema == null) {
        continue;
      }
      if (line.startsWith("        ") && !line.startsWith("         ") && line.endsWith(":")) {
        flushOpenApi(document, file, schema, property, stringProperty, maxLength, rows);
        property = line.trim().substring(0, line.trim().length() - 1);
        maxLength = null;
        stringProperty = false;
        continue;
      }
      String trimmed = line.trim();
      if (line.startsWith("          ")
          && !line.startsWith("           ")
          && "type: string".equals(trimmed)) {
        stringProperty = true;
      } else if (trimmed.startsWith("maxLength:")) {
        maxLength = Integer.valueOf(trimmed.substring("maxLength:".length()).trim());
      }
    }
    flushOpenApi(document, file, schema, property, stringProperty, maxLength, rows);
    return rows;
  }

  private static void flushOpenApi(
      JsonNode document,
      Path file,
      String schema,
      String property,
      boolean stringProperty,
      Integer maxLength,
      List<String> rows) {
    if (!stringProperty || schema == null || property == null) {
      return;
    }
    var columns = document.path("columns").fields();
    while (columns.hasNext()) {
      var entry = columns.next();
      String consumer = entry.getValue().path("consumers").path("jpa").asText("");
      int hash = consumer.lastIndexOf('#');
      int dot = consumer.lastIndexOf('.', hash < 0 ? consumer.length() : hash);
      if (hash < 0 || dot < 0) {
        continue;
      }
      String simple = consumer.substring(dot + 1, hash);
      String field = consumer.substring(hash + 1);
      if (!simple.equals(schema) || !field.equals(property)) {
        continue;
      }
      if (!entry.getValue().hasNonNull("length")) {
        return;
      }
      int expected = entry.getValue().get("length").asInt();
      if (maxLength == null || maxLength != expected) {
        rows.add(
            DictionaryComparison.line(
                "openapi",
                entry.getKey(),
                file.getFileName() + "#" + schema + "." + property,
                expected,
                maxLength));
      }
      return;
    }
  }
}
