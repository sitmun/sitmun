package org.sitmun.administration.service.i18n;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.sitmun.infrastructure.persistence.type.i18n.DatabaseDefaultLanguageResolver;
import org.sitmun.infrastructure.persistence.type.i18n.Language;
import org.sitmun.infrastructure.persistence.type.i18n.LanguageRepository;
import org.sitmun.infrastructure.persistence.type.i18n.LiteralTranslation;
import org.sitmun.infrastructure.persistence.type.i18n.LiteralTranslationRepository;
import org.sitmun.infrastructure.persistence.type.i18n.LiteralTranslationValue;
import org.sitmun.infrastructure.persistence.type.i18n.LiteralTranslationValueRepository;

@ExtendWith(MockitoExtension.class)
@DisplayName("LiteralTranslationEnsureService race")
class LiteralTranslationEnsureServiceRaceTest {

  @Mock private LiteralTranslationRepository literalTranslationRepository;
  @Mock private LiteralTranslationValueRepository literalTranslationValueRepository;
  @Mock private DatabaseDefaultLanguageResolver databaseDefaultLanguageResolver;
  @Mock private LiteralTranslationWriteLock literalTranslationWriteLock;
  @Mock private LanguageRepository languageRepository;

  private LiteralTranslationEnsureService service;
  private Language english;

  @BeforeEach
  void setUp() {
    service =
        new LiteralTranslationEnsureService(
            literalTranslationRepository,
            literalTranslationValueRepository,
            databaseDefaultLanguageResolver,
            literalTranslationWriteLock,
            languageRepository);
    english = Language.builder().id(1).shortname("en").name("English").build();
  }

  @Test
  @DisplayName("a sentence stored while this save waited is left as stored")
  void raceTreatsExistingRowAsSuccess() {
    String key = "race-key";
    LiteralTranslation existing =
        LiteralTranslation.builder().id(42).literal(key).sourceLanguage(english).build();

    when(literalTranslationRepository.findByLiteralIn(any()))
        .thenReturn(List.of())
        .thenReturn(List.of(existing));
    when(databaseDefaultLanguageResolver.requireLanguage()).thenReturn(english);
    when(literalTranslationValueRepository.findByLiteralTranslationIdAndLanguageShortname(42, "en"))
        .thenReturn(Optional.of(new LiteralTranslationValue()));

    assertThatCode(() -> service.ensureLiteralsFromTemplateHtml("<p><t>" + key + "</t></p>"))
        .doesNotThrowAnyException();

    verify(literalTranslationWriteLock).acquire();
    verify(literalTranslationRepository, never()).save(any());
    verify(literalTranslationValueRepository, never()).save(any());
    verify(languageRepository, never()).findAll();
  }
}
