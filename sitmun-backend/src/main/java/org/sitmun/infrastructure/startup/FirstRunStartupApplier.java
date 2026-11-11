package org.sitmun.infrastructure.startup;

import lombok.extern.slf4j.Slf4j;
import org.sitmun.administration.dto.SetupFirstRunRequest;
import org.sitmun.administration.service.FirstRunStartupGate;
import org.sitmun.administration.service.SetupService;
import org.sitmun.infrastructure.persistence.type.i18n.LanguageRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Runs the first-run wizard from environment variables after the built-in users exist. Never aborts
 * startup. Opens the setup gate even when setup is skipped or rejected.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 30)
@Slf4j
public class FirstRunStartupApplier implements ApplicationRunner {

  private final SetupService setupService;
  private final FirstRunStartupProperties properties;
  private final LanguageRepository languageRepository;
  private final FirstRunStartupGate gate;

  public FirstRunStartupApplier(
      SetupService setupService,
      FirstRunStartupProperties properties,
      LanguageRepository languageRepository,
      FirstRunStartupGate gate) {
    this.setupService = setupService;
    this.properties = properties;
    this.languageRepository = languageRepository;
    this.gate = gate;
  }

  @Override
  public void run(ApplicationArguments args) {
    try {
      applyIfNeeded();
    } catch (RuntimeException exception) {
      log.error("First-run bootstrap failed", exception);
    } finally {
      gate.open();
    }
  }

  private void applyIfNeeded() {
    if (!setupService.isFirstRun()) {
      if (properties.isConfigured()) {
        log.info("First-run bootstrap ignored because the admin password is already set");
      }
      return;
    }
    if (!properties.isConfigured()) {
      return;
    }
    if (properties.normalizedAdminPassword().isEmpty()) {
      log.warn("First-run bootstrap language was ignored because no admin password was set");
      return;
    }

    String language = properties.normalizedLanguage().orElse(null);
    if (language != null && !usable(language)) {
      log.warn(
          "First-run bootstrap language {} is unknown or disabled; the default language stays unchanged",
          language);
      language = null;
    }

    try {
      setupService.apply(
          new SetupFirstRunRequest(language, properties.normalizedAdminPassword().orElse(null)));
      log.info("First-run bootstrap applied");
    } catch (ResponseStatusException exception) {
      log.error("First-run bootstrap was not applied: {}", exception.getMessage());
    }
  }

  private boolean usable(String shortname) {
    return languageRepository
        .findByShortname(shortname)
        .filter(language -> !Boolean.FALSE.equals(language.getEnabled()))
        .isPresent();
  }
}
