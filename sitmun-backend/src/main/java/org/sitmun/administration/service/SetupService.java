package org.sitmun.administration.service;

import java.time.Clock;
import java.util.Date;
import org.sitmun.SitmunConstants;
import org.sitmun.administration.dto.DefaultLanguageChangePreview;
import org.sitmun.administration.dto.DefaultLanguageChangeRequest;
import org.sitmun.administration.dto.SetupFirstRunRequest;
import org.sitmun.administration.dto.SetupFirstRunResponse;
import org.sitmun.administration.dto.SetupFirstRunStatus;
import org.sitmun.domain.configuration.ConfigurationParameter;
import org.sitmun.domain.configuration.ConfigurationParameterRepository;
import org.sitmun.domain.user.UserRepository;
import org.sitmun.infrastructure.security.core.SecurityConstants;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

/** First-run database language and built-in admin password. */
@Service
public class SetupService {

  static final int PASSWORD_MIN = 8;
  static final int PASSWORD_MAX = 50;

  private final ConfigurationParameterRepository configurationParameterRepository;
  private final DefaultLanguageChangeService defaultLanguageChangeService;
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final Clock clock;

  public SetupService(
      ConfigurationParameterRepository configurationParameterRepository,
      DefaultLanguageChangeService defaultLanguageChangeService,
      UserRepository userRepository,
      PasswordEncoder passwordEncoder,
      Clock clock) {
    this.configurationParameterRepository = configurationParameterRepository;
    this.defaultLanguageChangeService = defaultLanguageChangeService;
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.clock = clock;
  }

  public SetupFirstRunStatus status() {
    if (!isFirstRun()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "First-run is not available");
    }
    return new SetupFirstRunStatus(true, currentDefault());
  }

  /** True while the built-in admin password is null or blank. */
  public boolean isFirstRun() {
    return userRepository
        .findByUsername(SecurityConstants.BUILT_IN_ADMIN_PRINCIPAL)
        .map(user -> !StringUtils.hasText(user.getPassword()))
        .orElse(true);
  }

  @Transactional
  public SetupFirstRunResponse apply(SetupFirstRunRequest request) {
    if (!isFirstRun()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "First-run is not available");
    }
    String language = normalize(request.language());
    String password = normalize(request.password());
    if (password == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Choose a password for the admin user");
    }
    validatePassword(password, SecurityConstants.BUILT_IN_ADMIN_PRINCIPAL);

    if (language != null) {
      String current = currentDefault();
      if (!language.equals(current)) {
        DefaultLanguageChangePreview preview =
            defaultLanguageChangeService.preview(current, language);
        boolean continueOnMissing = Boolean.TRUE.equals(request.continueOnMissingTranslations());
        if (preview.missingTranslations() > 0 && !continueOnMissing) {
          throw new SetupConflictException(preview);
        }
        defaultLanguageChangeService.apply(
            new DefaultLanguageChangeRequest(current, language, continueOnMissing));
      }
    }

    int updated =
        userRepository.setPasswordIfAbsent(
            SecurityConstants.BUILT_IN_ADMIN_PRINCIPAL,
            passwordEncoder.encode(password),
            Date.from(clock.instant()));
    if (updated == 0) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "First-run is not available");
    }
    return new SetupFirstRunResponse(false, true);
  }

  private void validatePassword(String password, String username) {
    if (password.length() < PASSWORD_MIN || password.length() > PASSWORD_MAX) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Password must be between " + PASSWORD_MIN + " and " + PASSWORD_MAX + " characters");
    }
    if (password.equalsIgnoreCase(username)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Password must differ from the username");
    }
  }

  private String currentDefault() {
    return configurationParameterRepository
        .findByName(SitmunConstants.LANGUAGE_DEFAULT_CONF_KEY)
        .map(ConfigurationParameter::getValue)
        .orElse("en");
  }

  private static String normalize(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    return value.trim();
  }
}
