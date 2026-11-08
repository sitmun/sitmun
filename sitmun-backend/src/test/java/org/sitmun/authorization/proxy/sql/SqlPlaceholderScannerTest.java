package org.sitmun.authorization.proxy.sql;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class SqlPlaceholderScannerTest {

  private static final JsonMapper MAPPER = new JsonMapper();

  @Test
  void matchesSharedCases() throws Exception {
    JsonNode cases =
        MAPPER.readTree(
            SqlPlaceholderScannerTest.class.getResourceAsStream("/sql/placeholder-cases.json"));
    assertThat(cases.isArray()).isTrue();
    assertThat(cases.size()).isEqualTo(7);
    for (JsonNode item : cases) {
      SqlScan scan =
          SqlPlaceholderScanner.scan(
              item.get("sql").asString(), names(item.get("declared")), names(item.get("system")));
      assertThat(placements(scan)).isEqualTo(nodes(item.get("placements")));
      assertThat(violations(scan)).isEqualTo(nodes(item.get("violations")));
    }
  }

  private static Set<String> names(JsonNode array) {
    Set<String> names = new LinkedHashSet<>();
    array.forEach(node -> names.add(node.asString()));
    return names;
  }

  private static java.util.List<String> placements(SqlScan scan) {
    java.util.List<String> lines = new ArrayList<>();
    for (SqlScan.Placement placement : scan.placements()) {
      lines.add(
          placement.kind()
              + " "
              + placement.name()
              + " "
              + placement.start()
              + " "
              + placement.end()
              + " "
              + placement.context());
    }
    return lines;
  }

  private static java.util.List<String> violations(SqlScan scan) {
    java.util.List<String> lines = new ArrayList<>();
    for (SqlScan.Violation violation : scan.violations()) {
      lines.add(
          violation.code()
              + " "
              + violation.name()
              + " "
              + violation.start()
              + " "
              + violation.end());
    }
    return lines;
  }

  private static java.util.List<String> nodes(JsonNode array) {
    java.util.List<String> lines = new ArrayList<>();
    for (JsonNode node : array) {
      if (node.has("kind")) {
        lines.add(
            node.get("kind").asString()
                + " "
                + node.get("name").asString()
                + " "
                + node.get("start").asInt()
                + " "
                + node.get("end").asInt()
                + " "
                + node.get("context").asString());
      } else {
        lines.add(
            node.get("code").asString()
                + " "
                + textOrNull(node.get("name"))
                + " "
                + node.get("start").asInt()
                + " "
                + node.get("end").asInt());
      }
    }
    return lines;
  }

  private static String textOrNull(JsonNode node) {
    return node == null || node.isNull() ? "null" : node.asString();
  }
}
