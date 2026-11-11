package org.sitmun.administration.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Date;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.sitmun.SitmunConstants;
import org.sitmun.administration.dto.SetupFirstRunRequest;
import org.sitmun.administration.dto.SetupFirstRunResponse;
import org.sitmun.domain.configuration.ConfigurationParameterRepository;
import org.sitmun.domain.user.User;
import org.sitmun.domain.user.UserRepository;
import org.sitmun.infrastructure.security.core.SecurityConstants;
import org.sitmun.infrastructure.security.core.SecurityRole;
import org.sitmun.infrastructure.security.service.JsonWebTokenService;
import org.sitmun.test.BaseTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Transactional
class SetupServiceIntegrationTest extends BaseTest {

  @Autowired private SetupService setupService;
  @Autowired private ConfigurationParameterRepository configurationParameterRepository;
  @Autowired private UserRepository userRepository;
  @Autowired private JdbcTemplate jdbcTemplate;
  @Autowired private JsonWebTokenService jsonWebTokenService;
  @Autowired private UserDetailsService userDetailsService;

  @BeforeEach
  void setUp() {
    jdbcTemplate.update("UPDATE stm_user SET use_pwd = NULL WHERE use_user = 'admin'");
    authenticate(SecurityConstants.BUILT_IN_ADMIN_PRINCIPAL);
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void saveWithoutPasswordChangesNothing() {
    assertThatThrownBy(() -> setupService.apply(new SetupFirstRunRequest("ca", true, null)))
        .isInstanceOf(ResponseStatusException.class)
        .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
        .isEqualTo(org.springframework.http.HttpStatus.BAD_REQUEST);

    assertThat(configurationValue(SitmunConstants.LANGUAGE_DEFAULT_CONF_KEY)).isEqualTo("en");
    assertThat(adminPasswordHash()).isNull();
    assertThat(setupService.status().firstRun()).isTrue();
  }

  @Test
  void blankAdminPasswordKeepsFirstRunAvailable() {
    jdbcTemplate.update("UPDATE stm_user SET use_pwd = '   ' WHERE use_user = 'admin'");

    assertThat(setupService.status().firstRun()).isTrue();
  }

  @Test
  void storedAdminPasswordDisablesFirstRun() {
    jdbcTemplate.update("UPDATE stm_user SET use_pwd = 'stored-hash' WHERE use_user = 'admin'");

    assertThatThrownBy(() -> setupService.status())
        .isInstanceOf(ResponseStatusException.class)
        .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
        .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);
    assertThatThrownBy(
            () -> setupService.apply(new SetupFirstRunRequest("ca", true, "new-admin-pass")))
        .isInstanceOf(ResponseStatusException.class)
        .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
        .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);
    assertThat(configurationValue(SitmunConstants.LANGUAGE_DEFAULT_CONF_KEY)).isEqualTo("en");
    assertThat(adminPasswordHash()).isEqualTo("stored-hash");
  }

  @Test
  void anonymousCallerCanSetTheAdminPasswordAndEndFirstRun() {
    SecurityContextHolder.clearContext();
    assertThat(setupService.status().firstRun()).isTrue();

    SetupFirstRunResponse response =
        setupService.apply(new SetupFirstRunRequest("en", true, "new-admin-pass"));

    assertThat(response.passwordChanged()).isTrue();
    assertThat(response.firstRun()).isFalse();
    assertThatThrownBy(() -> setupService.status())
        .isInstanceOf(ResponseStatusException.class)
        .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
        .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);
    assertThat(adminPasswordHash()).isNotBlank();
  }

  @Test
  void secondSaveKeepsTheFirstPassword() {
    setupService.apply(new SetupFirstRunRequest("en", true, "first-admin-pass"));
    String firstHash = adminPasswordHash();

    assertThatThrownBy(
            () -> setupService.apply(new SetupFirstRunRequest("ca", true, "second-admin-pass")))
        .isInstanceOf(ResponseStatusException.class)
        .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
        .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);

    assertThat(adminPasswordHash()).isEqualTo(firstHash);
    assertThat(configurationValue(SitmunConstants.LANGUAGE_DEFAULT_CONF_KEY)).isEqualTo("en");
  }

  @Test
  void missingTranslationsWithoutContinueChangeNothing() {
    assertThatThrownBy(
            () -> setupService.apply(new SetupFirstRunRequest("ca", false, "new-admin-pass")))
        .isInstanceOf(SetupConflictException.class);

    assertThat(configurationValue(SitmunConstants.LANGUAGE_DEFAULT_CONF_KEY)).isEqualTo("en");
    assertThat(adminPasswordHash()).isNull();
    assertThat(setupService.status().firstRun()).isTrue();
  }

  @Test
  void invalidPasswordRollsBackTheLanguageChange() {
    String hashBefore = adminPasswordHash();

    assertThatThrownBy(() -> setupService.apply(new SetupFirstRunRequest("ca", true, "short")))
        .isInstanceOf(ResponseStatusException.class);

    assertThat(configurationValue(SitmunConstants.LANGUAGE_DEFAULT_CONF_KEY)).isEqualTo("en");
    assertThat(adminPasswordHash()).isNull();
    assertThat(hashBefore).isNull();
    assertThat(setupService.status().firstRun()).isTrue();
  }

  @Test
  void passwordChangeInvalidatesThePreviousToken() {
    UserDetails details = userDetailsService.loadUserByUsername("admin");
    String previousToken = jsonWebTokenService.generateToken(details);
    Date previousChange =
        userRepository.findByUsername("admin").orElseThrow().getLastPasswordChange();

    SetupFirstRunResponse response =
        setupService.apply(new SetupFirstRunRequest(null, false, "new-admin-pass"));

    User admin = userRepository.findByUsername("admin").orElseThrow();
    assertThat(response.passwordChanged()).isTrue();
    assertThat(response.firstRun()).isFalse();
    assertThatThrownBy(() -> setupService.status()).isInstanceOf(ResponseStatusException.class);
    assertThat(admin.getLastPasswordChange()).isNotNull();
    assertThat(admin.getLastPasswordChange()).isNotEqualTo(previousChange);
    assertThat(
            jsonWebTokenService.validateToken(
                previousToken, details, admin.getLastPasswordChange()))
        .isFalse();
  }

  private void authenticate(String username) {
    SecurityContextHolder.getContext()
        .setAuthentication(
            new UsernamePasswordAuthenticationToken(
                username, "n/a", SecurityRole.createAuthorityList(SecurityRole.ADMIN)));
  }

  private String configurationValue(String name) {
    return configurationParameterRepository
        .findByName(name)
        .map(parameter -> parameter.getValue())
        .orElse(null);
  }

  private String adminPasswordHash() {
    return jdbcTemplate.queryForObject(
        "SELECT use_pwd FROM stm_user WHERE use_user = 'admin'", String.class);
  }
}
