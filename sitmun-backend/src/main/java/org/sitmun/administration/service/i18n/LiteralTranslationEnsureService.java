package org.sitmun.administration.service.i18n;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.sitmun.infrastructure.persistence.type.i18n.DatabaseDefaultLanguageResolver;
import org.sitmun.infrastructure.persistence.type.i18n.Language;
import org.sitmun.infrastructure.persistence.type.i18n.LanguageRepository;
import org.sitmun.infrastructure.persistence.type.i18n.LiteralTranslation;
import org.sitmun.infrastructure.persistence.type.i18n.LiteralTranslationRepository;
import org.sitmun.infrastructure.persistence.type.i18n.LiteralTranslationValue;
import org.sitmun.infrastructure.persistence.type.i18n.LiteralTranslationValueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class LiteralTranslationEnsureService {

  private static final Pattern TAG_PATTERN = Pattern.compile("<t>(.*?)</t>", Pattern.DOTALL);

  private final LiteralTranslationRepository literalTranslationRepository;
  private final LiteralTranslationValueRepository literalTranslationValueRepository;
  private final DatabaseDefaultLanguageResolver databaseDefaultLanguageResolver;
  private final LiteralTranslationWriteLock literalTranslationWriteLock;
  private final LanguageRepository languageRepository;

  public LiteralTranslationEnsureService(
      LiteralTranslationRepository literalTranslationRepository,
      LiteralTranslationValueRepository literalTranslationValueRepository,
      DatabaseDefaultLanguageResolver databaseDefaultLanguageResolver,
      LiteralTranslationWriteLock literalTranslationWriteLock,
      LanguageRepository languageRepository) {
    this.literalTranslationRepository = literalTranslationRepository;
    this.literalTranslationValueRepository = literalTranslationValueRepository;
    this.databaseDefaultLanguageResolver = databaseDefaultLanguageResolver;
    this.literalTranslationWriteLock = literalTranslationWriteLock;
    this.languageRepository = languageRepository;
  }

  public static Set<String> extractLiteralKeys(String html) {
    Set<String> keys = new LinkedHashSet<>();
    if (!StringUtils.hasText(html) || !html.contains("<t>")) {
      return keys;
    }
    Matcher matcher = TAG_PATTERN.matcher(html);
    while (matcher.find()) {
      String key = matcher.group(1);
      if (StringUtils.hasText(key)) {
        keys.add(key);
      }
    }
    return keys;
  }

  @Transactional
  public void ensureLiteralsFromTemplateHtml(String templateHtml) {
    Set<String> keys = extractLiteralKeys(templateHtml);
    if (keys.isEmpty() || ready(keys)) {
      return;
    }
    literalTranslationWriteLock.acquire();
    Language sourceLanguage = databaseDefaultLanguageResolver.requireLanguage();
    List<LiteralTranslation> stored = literalTranslationRepository.findByLiteralIn(keys);
    for (String key : keys) {
      Optional<LiteralTranslation> existing =
          stored.stream().filter(row -> key.equals(row.getLiteral())).findFirst();
      if (existing.isEmpty()) {
        insertLiteral(key, sourceLanguage);
      } else {
        syncSourceValueIfMissing(existing.get(), key);
      }
    }
  }

  private boolean ready(Set<String> keys) {
    List<LiteralTranslation> rows = literalTranslationRepository.findByLiteralIn(keys);
    if (rows.size() != keys.size()) {
      return false;
    }
    for (LiteralTranslation row : rows) {
      if (sourceValue(row).isEmpty()) {
        return false;
      }
    }
    return true;
  }

  private void insertLiteral(String literal, Language sourceLanguage) {
    LiteralTranslation saved =
        literalTranslationRepository.saveAndFlush(
            LiteralTranslation.builder().literal(literal).sourceLanguage(sourceLanguage).build());
    for (Language language : languageRepository.findAll()) {
      LiteralTranslationValue row = new LiteralTranslationValue();
      row.setLiteralTranslation(saved);
      row.setLanguage(language);
      row.setValue(literal);
      literalTranslationValueRepository.save(row);
    }
  }

  private void syncSourceValueIfMissing(LiteralTranslation literalTranslation, String literal) {
    Language source = literalTranslation.getSourceLanguage();
    if (source == null || !StringUtils.hasText(source.getShortname())) {
      return;
    }
    if (sourceValue(literalTranslation).isEmpty()) {
      upsertValue(literalTranslation, source, literal);
    }
  }

  private Optional<LiteralTranslationValue> sourceValue(LiteralTranslation literalTranslation) {
    Language source = literalTranslation.getSourceLanguage();
    if (source == null || !StringUtils.hasText(source.getShortname())) {
      return Optional.empty();
    }
    return literalTranslationValueRepository.findByLiteralTranslationIdAndLanguageShortname(
        literalTranslation.getId(), source.getShortname());
  }

  private void upsertValue(LiteralTranslation literalTranslation, Language language, String value) {
    LiteralTranslationValue row =
        literalTranslationValueRepository
            .findByLiteralTranslationIdAndLanguageShortname(
                literalTranslation.getId(), language.getShortname())
            .orElseGet(LiteralTranslationValue::new);
    row.setLiteralTranslation(literalTranslation);
    row.setLanguage(language);
    row.setValue(value);
    literalTranslationValueRepository.save(row);
  }
}
