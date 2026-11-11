package org.sitmun.administration.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.sitmun.infrastructure.persistence.type.i18n.Language;
import org.sitmun.infrastructure.persistence.type.i18n.LanguageRepository;
import org.sitmun.test.BaseTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

@Transactional
class SetupStatusIntegrationTest extends BaseTest {

  @Autowired private SetupService setupService;
  @Autowired private LanguageRepository languageRepository;

  @Test
  void enabledLanguagesFollowOrderAndDisabledOnesAreLeftOut() {
    Language french = languageRepository.findByShortname("fr").orElseThrow();
    french.setEnabled(false);
    Language portuguese = languageRepository.findByShortname("pt-PT").orElseThrow();
    portuguese.setOrder(0);
    languageRepository.saveAndFlush(french);
    languageRepository.saveAndFlush(portuguese);

    assertThat(setupService.statusSnapshot().languages())
        .extracting(language -> language.shortname())
        .containsExactly("pt-PT", "ca", "es", "en", "oc-aranes");
  }
}
