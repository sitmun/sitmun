package org.sitmun.infrastructure.startup;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.sitmun.SitmunConstants;
import org.sitmun.administration.service.SetupService;
import org.sitmun.domain.configuration.ConfigurationParameterRepository;
import org.sitmun.domain.user.UserRepository;
import org.sitmun.infrastructure.persistence.type.i18n.LanguageRepository;
import org.sitmun.infrastructure.security.core.SecurityConstants;
import org.sitmun.test.BaseTest;
import org.sitmun.test.LogTestUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@Transactional
class FirstRunStartupApplierIntegrationTest extends BaseTest {

  @Autowired private FirstRunStartupApplier applier;
  @Autowired private FirstRunStartupProperties properties;
  @Autowired private SetupService setupService;
  @Autowired private UserRepository userRepository;
  @Autowired private ConfigurationParameterRepository configurationParameterRepository;
  @Autowired private LanguageRepository languageRepository;
  @Autowired private JdbcTemplate jdbcTemplate;

  private LogTestUtils logs;

  @BeforeEach
  void openSetup() {
    logs = new LogTestUtils("org.sitmun.infrastructure.startup.FirstRunStartupApplier");
    logs.startCapturing();
    var admin =
        userRepository.findByUsername(SecurityConstants.BUILT_IN_ADMIN_PRINCIPAL).orElseThrow();
    admin.setPassword(null);
    userRepository.saveAndFlush(admin);
    properties.setAdminPassword(null);
    properties.setLanguage(null);
  }

  @AfterEach
  void clearBootstrap() {
    properties.setAdminPassword(null);
    properties.setLanguage(null);
    if (logs != null) {
      logs.stopCapturing();
    }
  }

  @Test
  void spanishBootstrapSwapsMainColumnsAndClosesFirstRun() throws Exception {
    Map<String, Object> before = spanishBackground();
    properties.setAdminPassword("new-admin-pass");
    properties.setLanguage("es");
    applier.run(new DefaultApplicationArguments());

    assertThat(adminPassword()).isNotBlank().isNotEqualTo("new-admin-pass");
    assertThat(defaultLanguage()).isEqualTo("es");
    assertThat(setupService.isFirstRun()).isFalse();
    assertThat(mainName(before.get("id"))).isEqualTo(before.get("spanish"));
    assertThat(englishTerritoryName(before.get("id"))).isEqualTo(before.get("english"));
    mvc.perform(get("/api/setup/status"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.firstRun").value(false));
  }

  @Test
  void sameUnknownOrDisabledLanguageSetsThePasswordWithoutASwap() {
    Map<String, Object> before = spanishBackground();
    properties.setAdminPassword("new-admin-pass");
    properties.setLanguage("en");
    applier.run(new DefaultApplicationArguments());
    assertUnchanged(before);

    clearPassword();
    properties.setLanguage("zz");
    applier.run(new DefaultApplicationArguments());
    assertUnchanged(before);
    assertThat(logs.getLogMessagesContaining("zz")).isNotEmpty();

    clearPassword();
    languageRepository.findByShortname("fr").orElseThrow().setEnabled(false);
    languageRepository.flush();
    properties.setLanguage("fr");
    applier.run(new DefaultApplicationArguments());
    assertUnchanged(before);
    assertThat(logs.getLogMessagesContaining("fr")).isNotEmpty();
  }

  @Test
  void languageWithoutAPasswordChangesNothing() {
    properties.setLanguage("es");

    applier.run(new DefaultApplicationArguments());

    assertThat(adminPassword()).isNull();
    assertThat(defaultLanguage()).isEqualTo("en");
    assertThat(setupService.isFirstRun()).isTrue();
  }

  @Test
  void missingTranslationsStillSelectTheLanguage() {
    properties.setAdminPassword("new-admin-pass");
    properties.setLanguage("ca");
    applier.run(new DefaultApplicationArguments());

    assertThat(adminPassword()).isNotBlank();
    assertThat(defaultLanguage()).isEqualTo("ca");
    assertThat(setupService.isFirstRun()).isFalse();
  }

  private void assertUnchanged(Map<String, Object> before) {
    assertThat(adminPassword()).isNotBlank();
    assertThat(defaultLanguage()).isEqualTo("en");
    assertThat(setupService.isFirstRun()).isFalse();
    assertThat(mainName(before.get("id"))).isEqualTo(before.get("english"));
  }

  private void clearPassword() {
    var admin =
        userRepository.findByUsername(SecurityConstants.BUILT_IN_ADMIN_PRINCIPAL).orElseThrow();
    admin.setPassword(null);
    userRepository.saveAndFlush(admin);
  }

  private Map<String, Object> spanishBackground() {
    List<Map<String, Object>> rows =
        jdbcTemplate.queryForList(
            """
            SELECT t.bac_id AS id, t.bac_name AS english, tr.tra_name AS spanish
            FROM stm_backgrd t
            JOIN stm_translation tr
              ON tr.tra_eleid = t.bac_id AND tr.tra_column = 'Background.name'
            JOIN stm_language l ON l.lan_id = tr.tra_lanid AND l.lan_shortname = 'es'
            WHERE t.bac_name <> tr.tra_name
            """);
    assertThat(rows).isNotEmpty();
    return rows.get(0);
  }

  private String mainName(Object id) {
    return jdbcTemplate.queryForObject(
        "SELECT bac_name FROM stm_backgrd WHERE bac_id = ?", String.class, id);
  }

  private String englishTerritoryName(Object id) {
    return jdbcTemplate.queryForObject(
        """
        SELECT tr.tra_name
        FROM stm_translation tr
        JOIN stm_language l ON l.lan_id = tr.tra_lanid AND l.lan_shortname = 'en'
        WHERE tr.tra_eleid = ? AND tr.tra_column = 'Background.name'
        """,
        String.class,
        id);
  }

  private String adminPassword() {
    return userRepository
        .findByUsername(SecurityConstants.BUILT_IN_ADMIN_PRINCIPAL)
        .orElseThrow()
        .getPassword();
  }

  private String defaultLanguage() {
    return configurationParameterRepository
        .findByName(SitmunConstants.LANGUAGE_DEFAULT_CONF_KEY)
        .orElseThrow()
        .getValue();
  }
}
