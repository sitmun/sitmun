package org.sitmun.test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sitmun.infrastructure.security.core.SecurityConstants.PUBLIC_PRINCIPAL;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.sitmun.domain.application.tree.ApplicationTreeRepository;
import org.sitmun.domain.cartography.Cartography;
import org.sitmun.domain.cartography.CartographyRepository;
import org.sitmun.domain.cartography.permission.CartographyPermission;
import org.sitmun.domain.cartography.permission.CartographyPermissionRepository;
import org.sitmun.domain.role.Role;
import org.sitmun.domain.role.RoleRepository;
import org.sitmun.domain.task.Task;
import org.sitmun.domain.task.TaskRepository;
import org.sitmun.domain.tree.OrderedTree;
import org.sitmun.domain.tree.Tree;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Read-only Liquibase seed canary for H2, PostgreSQL, and Oracle test profiles.
 *
 * <p>Asserts seed-row contracts and {@code STM_SEQUENCE} baselines. Wrong size, missing seed id, or
 * advanced {@code SEQ_COUNT} means seed pollution or changelog drift — fix the polluter; do not
 * weaken these asserts. Deleting rows does not rewind table-generator sequences.
 *
 * <p>Seed-row checks always run (suite-safe pollution oracle). Exact {@code STM_SEQUENCE} baselines
 * are opt-in — table generators advance on allocate even when rows are later deleted — via {@code
 * -Dsitmun.seed-canary.sequences=exact}:
 *
 * <pre>
 * ./gradlew test -x setupGitHooks \
 *   -Dsitmun.seed-canary.sequences=exact \
 *   --tests 'org.sitmun…SuspectedTest' \
 *   --tests 'org.sitmun.test.LiquibaseSeedCanaryTest'
 * </pre>
 *
 * <p>Never mutates data and never resets sequences.
 */
@SpringBootTest
@Tag("seed-canary")
@DisplayName("Liquibase seed canary")
class LiquibaseSeedCanaryTest {

  private static final String POLLUTION =
      "seed pollution or changelog drift — fix the polluter; do not weaken this canary";

  /**
   * Post-Liquibase {@code STM_SEQUENCE} baselines from a clean apply of the test changelog ({@code
   * 04_data} + overlays through {@code 19_mia_chrome_literals}). Shared across H2/Postgres/Oracle.
   * Update when seed changelogs intentionally change sequence watermarks.
   */
  private static final Map<String, Long> SEQUENCE_BASELINES =
      Map.ofEntries(
          Map.entry("ABC_ID", 8L),
          Map.entry("AGI_ID", 98010L),
          Map.entry("APP_ID", 6L),
          Map.entry("ATE_ID", 2L),
          Map.entry("ATR_ID", 5L),
          Map.entry("ATS_ID", 102L),
          Map.entry("BAC_ID", 1L),
          Map.entry("CNF_ID", 6L),
          Map.entry("COD_ID", 123L),
          Map.entry("CON_ID", 52L),
          Map.entry("GEO_ID", 1255L),
          Map.entry("GGI_ID", 3L),
          Map.entry("GTS_ID", 1L),
          Map.entry("GTT_ID", 4L),
          Map.entry("LAN_ID", 5L),
          Map.entry("LTR_ID", 8L),
          Map.entry("LTV_ID", 36L),
          Map.entry("PAP_ID", 22L),
          Map.entry("POS_ID", 1485L),
          Map.entry("PSE_ID", 533L),
          Map.entry("ROL_ID", 2L),
          Map.entry("SER_ID", 152L),
          Map.entry("SGI_ID", 3L),
          Map.entry("TAR_ID", 2L),
          Map.entry("TAS_ID", 44L),
          Map.entry("TER_ID", 3L),
          Map.entry("TET_ID", 8L),
          Map.entry("TNO_ID", 8463L),
          Map.entry("TRA_ID", 3020121L),
          Map.entry("TRE_ID", 4L),
          Map.entry("TTY_ID", 17L),
          Map.entry("TUI_ID", 38L),
          Map.entry("UCO_ID", 12L),
          Map.entry("USE_ID", 12L));

  @Autowired private JdbcTemplate jdbc;
  @Autowired private RoleRepository roleRepository;
  @Autowired private ApplicationTreeRepository applicationTreeRepository;
  @Autowired private CartographyRepository cartographyRepository;
  @Autowired private CartographyPermissionRepository cartographyPermissionRepository;
  @Autowired private TaskRepository taskRepository;

  @Test
  @DisplayName("Seed: STM_TREE_NOD rows and Municipal root id 10015")
  void treeNodeSeedIntact() {
    assertThat(count("SELECT COUNT(*) FROM STM_TREE_NOD"))
        .as(POLLUTION + " (STM_TREE_NOD total)")
        .isEqualTo(15);
    assertThat(count("SELECT COUNT(*) FROM STM_TREE_NOD WHERE TNO_TREEID = 10001"))
        .as(POLLUTION + " (tree 10001 nodes)")
        .isEqualTo(14);

    Map<String, Object> node15 =
        jdbc.queryForMap(
            "SELECT TNO_ID, TNO_NAME, TNO_TREEID FROM STM_TREE_NOD WHERE TNO_ID = 10015");
    assertThat(asInt(node15.get("TNO_ID")))
        .as(POLLUTION + " (node 10015 missing)")
        .isEqualTo(10015);
    assertThat(node15.get("TNO_NAME"))
        .as(POLLUTION + " (node 10015 name)")
        .isEqualTo("Municipal root");
    assertThat(asInt(node15.get("TNO_TREEID")))
        .as(POLLUTION + " (node 10015 tree)")
        .isEqualTo(10002);
  }

  @Test
  @DisplayName("Seed: public app/ter 1 trees, cartographies, tasks, permissions")
  void publicAppTerritorySeedIntact() {
    List<Role> roles =
        roleRepository.findRolesByApplicationAndUserAndTerritory(PUBLIC_PRINCIPAL, 10001, 10001);

    List<Tree> trees =
        applicationTreeRepository.findByAppAndRoles(10001, roles).stream()
            .map(OrderedTree::tree)
            .toList();
    assertThat(trees).as(POLLUTION + " (app/ter 1 trees)").hasSize(2);

    List<Cartography> cartographies = cartographyRepository.findByRolesAndTerritory(roles, 10001);
    assertThat(cartographies).as(POLLUTION + " (app/ter 1 cartographies)").hasSize(11);

    List<Task> tasks = taskRepository.findByRolesAndTerritory(roles, 10001);
    assertThat(tasks).as(POLLUTION + " (app/ter 10001 tasks)").hasSize(17);
    assertThat(tasks)
        .as(POLLUTION + " (MIA task ids 10042/10043)")
        .extracting(Task::getId)
        .contains(10042, 10043);

    List<CartographyPermission> permissions =
        cartographyPermissionRepository.findByRolesAndTerritory(roles, 10001);
    assertThat(permissions).as(POLLUTION + " (app/ter 1 permissions)").hasSize(3);
  }

  @Test
  @DisplayName("Seed: baseline task ids are 1 through 37")
  void baselineTaskIdsAreOneThroughThirtySeven() {
    // Fixture rows use ids 10000 through 19999. Every other id is shipped seed.
    List<Integer> ids =
        jdbc.query(
            "SELECT TAS_ID FROM STM_TASK WHERE TAS_ID NOT BETWEEN 10000 AND 19999 ORDER BY TAS_ID",
            (rs, rowNum) -> rs.getInt(1));
    assertThat(ids)
        .as(POLLUTION + " (baseline STM_TASK ids)")
        .containsExactlyElementsOf(IntStream.rangeClosed(1, 37).boxed().toList());
    String name =
        jdbc.queryForObject("SELECT TAS_NAME FROM STM_TASK WHERE TAS_ID = 37", String.class);
    assertThat(name).as(POLLUTION + " (task 37)").isEqualTo("More Info Advanced");
  }

  /**
   * Exact sequence watermarks. Enable with {@code -Dsitmun.seed-canary.sequences=exact} for
   * clean-DB checks and post-flake diagnosis. Disabled in the default suite because allocates
   * advance {@code SEQ_COUNT} even after fixture row deletes.
   */
  @Test
  @Tag("seed-canary-sequences")
  @EnabledIfSystemProperty(named = "sitmun.seed-canary.sequences", matches = "exact")
  @DisplayName("Seed: STM_SEQUENCE baselines (detects committed allocates)")
  void sequenceBaselinesIntact() {
    Map<String, Long> actual = loadSequences();

    assertThat(actual.keySet())
        .as(POLLUTION + " (STM_SEQUENCE key set)")
        .containsExactlyInAnyOrderElementsOf(SEQUENCE_BASELINES.keySet());

    for (Map.Entry<String, Long> entry : SEQUENCE_BASELINES.entrySet()) {
      assertThat(actual.get(entry.getKey()))
          .as(POLLUTION + " (SEQ_COUNT for " + entry.getKey() + ")")
          .isEqualTo(entry.getValue());
    }
  }

  private Map<String, Long> loadSequences() {
    return jdbc
        .query(
            "SELECT SEQ_NAME, SEQ_COUNT FROM STM_SEQUENCE ORDER BY SEQ_NAME",
            (rs, rowNum) -> Map.entry(rs.getString("SEQ_NAME"), rs.getLong("SEQ_COUNT")))
        .stream()
        .collect(
            Collectors.toMap(
                Map.Entry::getKey, Map.Entry::getValue, (a, b) -> a, LinkedHashMap::new));
  }

  /** Oracle returns NUMBER as {@link java.math.BigDecimal}; normalize counts/ids. */
  private long count(String sql) {
    Number value = jdbc.queryForObject(sql, Number.class);
    assertThat(value).as(POLLUTION + " (null count for " + sql + ")").isNotNull();
    return value.longValue();
  }

  private static int asInt(Object value) {
    assertThat(value).as(POLLUTION + " (null numeric column)").isInstanceOf(Number.class);
    return ((Number) value).intValue();
  }
}
