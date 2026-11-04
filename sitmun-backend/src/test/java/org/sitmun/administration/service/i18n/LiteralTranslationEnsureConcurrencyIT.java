package org.sitmun.administration.service.i18n;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.sitmun.infrastructure.persistence.type.i18n.LiteralTranslationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;

/**
 * Two saves at once. The pool is larger than the test default because each save holds its
 * connection while the id generator borrows another.
 */
@SpringBootTest
@TestPropertySource(properties = "spring.datasource.hikari.maximum-pool-size=8")
@DisplayName("Literal enrollment concurrency")
class LiteralTranslationEnsureConcurrencyIT {

  @Autowired private LiteralTranslationEnsureService literalTranslationEnsureService;
  @Autowired private LiteralTranslationRepository literalTranslationRepository;
  @Autowired private JdbcTemplate jdbcTemplate;

  @Test
  @DisplayName("two saves that add the same sentence keep one row")
  void twoEnsuresOfANewSentenceLeaveOneRow() throws Exception {
    String key = "concurrent-ensure-" + System.nanoTime();
    CountDownLatch start = new CountDownLatch(1);
    AtomicReference<Exception> firstFailure = new AtomicReference<>();
    AtomicReference<Exception> secondFailure = new AtomicReference<>();
    Thread first = ensureAfter(start, key, firstFailure);
    Thread second = ensureAfter(start, key, secondFailure);
    first.start();
    second.start();
    try {
      start.countDown();
      first.join(30_000);
      second.join(30_000);
      assertThat(first.isAlive()).isFalse();
      assertThat(second.isAlive()).isFalse();
      assertThat(firstFailure.get()).isNull();
      assertThat(secondFailure.get()).isNull();
      assertThat(literalTranslationRepository.findByLiteral(key)).isPresent();
      Integer sentences =
          jdbcTemplate.queryForObject(
              "SELECT COUNT(*) FROM STM_LITERAL_TRANSLATION WHERE LTR_LITERAL = ?",
              Integer.class,
              key);
      Integer values =
          jdbcTemplate.queryForObject(
              """
              SELECT COUNT(*) FROM STM_LITERAL_TRANSLATION_VALUE v
              JOIN STM_LITERAL_TRANSLATION t ON t.LTR_ID = v.LTV_LTRID
              WHERE t.LTR_LITERAL = ?
              """,
              Integer.class,
              key);
      Integer languages =
          jdbcTemplate.queryForObject("SELECT COUNT(*) FROM STM_LANGUAGE", Integer.class);
      assertThat(sentences).isEqualTo(1);
      assertThat(values).isEqualTo(languages);
    } finally {
      jdbcTemplate.update(
          """
          DELETE FROM STM_LITERAL_TRANSLATION_VALUE
          WHERE LTV_LTRID IN (
            SELECT LTR_ID FROM STM_LITERAL_TRANSLATION WHERE LTR_LITERAL = ?
          )
          """,
          key);
      jdbcTemplate.update("DELETE FROM STM_LITERAL_TRANSLATION WHERE LTR_LITERAL = ?", key);
    }
  }

  private Thread ensureAfter(CountDownLatch start, String key, AtomicReference<Exception> failure) {
    return new Thread(
        () -> {
          try {
            if (!start.await(20, TimeUnit.SECONDS)) {
              throw new IllegalStateException("start timed out");
            }
            literalTranslationEnsureService.ensureLiteralsFromTemplateHtml(
                "<p><t>" + key + "</t></p>");
          } catch (Exception ex) {
            failure.set(ex);
          }
        });
  }
}
