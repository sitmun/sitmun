package org.sitmun.infrastructure.persistence.type.codelist;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.SoftAssertions.assertSoftly;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.StreamSupport;
import javax.sql.DataSource;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.yaml.snakeyaml.Yaml;

@SpringBootTest
@EnabledIfSystemProperty(named = "sitmun.test.required-codelists", matches = "true")
@DisplayName("Required code lists on the production master")
class RequiredCodeListsTest {

  @DynamicPropertySource
  static void productionMaster(DynamicPropertyRegistry registry) {
    Path master;
    if ("shipped".equals(System.getProperty("sitmun.test.changelog"))) {
      master =
          repoRoot()
              .resolve("sitmun-backend/src/main/resources/db/changelog/db.changelog-master.yaml");
    } else {
      String product = System.getProperty("sitmun.test.database.product", "postgres");
      String profile = "oracle".equals(product) ? "oracle" : "postgres";
      master =
          repoRoot()
              .resolve("profiles")
              .resolve(profile)
              .resolve("liquibase")
              .resolve("master.xml");
    }
    registry.add("spring.liquibase.change-log", () -> "file:" + master.toAbsolutePath());
  }

  private static final List<SequenceCounter> COUNTERS =
      List.of(
          new SequenceCounter("ABC_ID", "STM_APP_BCKG", "ABC_ID"),
          new SequenceCounter("AGI_ID", "STM_AVAIL_GI", "AGI_ID"),
          new SequenceCounter("APP_ID", "STM_APP", "APP_ID"),
          new SequenceCounter("ATE_ID", "STM_APP_TER", "ATE_ID"),
          new SequenceCounter("ATR_ID", "STM_APP_TREE", "ATR_ID"),
          new SequenceCounter("ATS_ID", "STM_AVAIL_TSK", "ATS_ID"),
          new SequenceCounter("BAC_ID", "STM_BACKGRD", "BAC_ID"),
          new SequenceCounter("CNF_ID", "STM_CONF", "CNF_ID"),
          new SequenceCounter("COD_ID", "STM_CODELIST", "COD_ID"),
          new SequenceCounter("COM_ID", "STM_COMMENT", "COM_ID"),
          new SequenceCounter("CON_ID", "STM_CONNECT", "CON_ID"),
          new SequenceCounter("FGI_ID", "STM_FIL_GI", "FGI_ID"),
          new SequenceCounter("GEO_ID", "STM_GEOINFO", "GEO_ID"),
          new SequenceCounter("GGI_ID", "STM_GRP_GI", "GGI_ID"),
          new SequenceCounter("GS_ID", "STM_PAR_GS", "GS_ID"),
          new SequenceCounter("GTS_ID", "STM_GRP_TSK", "GTS_ID"),
          new SequenceCounter("GTT_ID", "STM_GTER_TYP", "GTT_ID"),
          new SequenceCounter("LAN_ID", "STM_LANGUAGE", "LAN_ID"),
          new SequenceCounter("LOG_ID", "STM_LOG", "LOG_ID"),
          new SequenceCounter("LTR_ID", "STM_LITERAL_TRANSLATION", "LTR_ID"),
          new SequenceCounter("LTV_ID", "STM_LITERAL_TRANSLATION_VALUE", "LTV_ID"),
          new SequenceCounter("PAP_ID", "STM_PAR_APP", "PAP_ID"),
          new SequenceCounter("PGI_ID", "STM_PAR_GI", "PGI_ID"),
          new SequenceCounter("POS_ID", "STM_POST", "POS_ID"),
          new SequenceCounter("PSE_ID", "STM_PAR_SER", "PSE_ID"),
          new SequenceCounter("PSG_ID", "STM_PAR_SGI", "PSG_ID"),
          new SequenceCounter("ROL_ID", "STM_ROLE", "ROL_ID"),
          new SequenceCounter("SCS_ID", "STM_SERVICE_CHECK_SAMPLE", "SCS_ID"),
          new SequenceCounter("SEC_ID", "STM_SERVICE_CHECK", "SEC_ID"),
          new SequenceCounter("SER_ID", "STM_SERVICE", "SER_ID"),
          new SequenceCounter("SGI_ID", "STM_STY_GI", "SGI_ID"),
          new SequenceCounter("TAR_ID", "STM_TASKREL", "TAR_ID"),
          new SequenceCounter("TAS_ID", "STM_TASK", "TAS_ID"),
          new SequenceCounter("TER_ID", "STM_TERRITORY", "TER_ID"),
          new SequenceCounter("TET_ID", "STM_TER_TYP", "TET_ID"),
          new SequenceCounter("TNO_ID", "STM_TREE_NOD", "TNO_ID"),
          new SequenceCounter("TRA_ID", "STM_TRANSLATION", "TRA_ID"),
          new SequenceCounter("TRE_ID", "STM_TREE", "TRE_ID"),
          new SequenceCounter("TUI_ID", "STM_TSK_UI", "TUI_ID"),
          new SequenceCounter("TTY_ID", "STM_TSK_TYP", "TTY_ID"),
          new SequenceCounter("UCO_ID", "STM_USR_CONF", "UCO_ID"),
          new SequenceCounter("USE_ID", "STM_USER", "USE_ID"),
          new SequenceCounter("USER_TOKEN_ID", "STM_TOKEN_USER", "USER_TOKEN_ID"));

  @Autowired private CodeListValueRepository codeListValueRepository;
  @Autowired private DataSource dataSource;

  @Test
  @DisplayName("every value the code reads is a system row")
  void requiredValuesAreSystemRows() throws Exception {
    List<String> missing = new ArrayList<>();
    for (Map<String, Object> row : manifestValues()) {
      String list = String.valueOf(row.get("list"));
      String value = String.valueOf(row.get("value"));
      boolean present =
          StreamSupport.stream(
                  codeListValueRepository.findAllByCodeListName(list).spliterator(), false)
              .anyMatch(
                  item -> value.equals(item.getValue()) && Boolean.TRUE.equals(item.getSystem()));
      if (!present) {
        missing.add(list + "=" + value);
      }
    }
    assertThat(missing).isEmpty();
  }

  @Test
  @DisplayName("a fresh install sets each counter to one past the highest id")
  void freshInstallSetsEveryCounterOnePastTheHighestId() throws Exception {
    Assumptions.assumeTrue(
        "shipped".equals(System.getProperty("sitmun.test.changelog"))
            && !"false".equals(System.getProperty("sitmun.test.sequence-counters", "true")),
        "sequence counters are checked on a fresh shipped install");
    try (Connection connection = dataSource.getConnection()) {
      assertSoftly(
          softly ->
              COUNTERS.forEach(
                  counter -> {
                    try {
                      long nextId = selectNextId(connection, counter);
                      Long stored = selectSequenceCount(connection, counter.sequenceName());
                      softly
                          .assertThat(stored)
                          .as("%s counter", counter.sequenceName())
                          .isEqualTo(nextId);
                    } catch (SQLException exception) {
                      throw new AssertionError(counter.sequenceName(), exception);
                    }
                  }));
    }
  }

  private static long selectNextId(Connection connection, SequenceCounter counter)
      throws SQLException {
    try (var statement = connection.createStatement();
        var result =
            statement.executeQuery(
                "SELECT COALESCE(MAX("
                    + counter.idColumn()
                    + "), 0) + 1 FROM "
                    + counter.tableName())) {
      assertThat(result.next()).isTrue();
      return result.getLong(1);
    }
  }

  private static Long selectSequenceCount(Connection connection, String sequenceName)
      throws SQLException {
    try (var statement =
        connection.prepareStatement("SELECT SEQ_COUNT FROM STM_SEQUENCE WHERE SEQ_NAME = ?")) {
      statement.setString(1, sequenceName);
      try (var result = statement.executeQuery()) {
        return result.next() ? result.getLong(1) : null;
      }
    }
  }

  private record SequenceCounter(String sequenceName, String tableName, String idColumn) {}

  @SuppressWarnings("unchecked")
  private static List<Map<String, Object>> manifestValues() throws Exception {
    Path manifest = repoRoot().resolve("sitmun-backend/src/test/resources/required-codelists.yaml");
    try (InputStream in = Files.newInputStream(manifest)) {
      Map<String, Object> document = new Yaml().load(in);
      return (List<Map<String, Object>>) document.get("values");
    }
  }

  private static Path repoRoot() {
    Path dir = Path.of("").toAbsolutePath();
    while (dir != null) {
      if (Files.isRegularFile(dir.resolve("profiles/postgres/liquibase/master.xml"))) {
        return dir;
      }
      dir = dir.getParent();
    }
    throw new IllegalStateException(
        "repository root not found from " + Path.of("").toAbsolutePath());
  }
}
