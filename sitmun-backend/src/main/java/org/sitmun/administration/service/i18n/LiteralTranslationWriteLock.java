package org.sitmun.administration.service.i18n;

import org.sitmun.domain.configuration.ConfigurationParameterRepository;
import org.springframework.stereotype.Component;

/**
 * Mutex for creating or renaming a template sentence. A new sentence has no row to lock, so writers
 * share the existing {@code language.default} row. The database frees the lock when the caller's
 * transaction ends.
 */
@Component
public class LiteralTranslationWriteLock {

  static final String LANGUAGE_DEFAULT = "language.default";

  private final ConfigurationParameterRepository configurationParameterRepository;

  public LiteralTranslationWriteLock(
      ConfigurationParameterRepository configurationParameterRepository) {
    this.configurationParameterRepository = configurationParameterRepository;
  }

  public void acquire() {
    configurationParameterRepository
        .findByNameForUpdate(LANGUAGE_DEFAULT)
        .orElseThrow(() -> new IllegalStateException("language.default configuration not found"));
  }
}
