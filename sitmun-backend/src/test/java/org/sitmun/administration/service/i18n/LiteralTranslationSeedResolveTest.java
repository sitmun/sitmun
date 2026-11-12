package org.sitmun.administration.service.i18n;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.sitmun.test.BaseTest;
import org.springframework.beans.factory.annotation.Autowired;

@DisplayName("Seeded template sentences")
class LiteralTranslationSeedResolveTest extends BaseTest {

  @Autowired private LiteralTranslationService literalTranslationService;

  @ParameterizedTest
  @CsvSource({
    "'No data','Cap de donades'",
    "'Error executing task','Error en executar era tasca'",
    "'Query','Consulta'",
    "'Invalid child task id','Identificador de tasca hilha non valid'",
    "'task not executed','Cau executar era tasca'",
    "'Binary content cannot be embedded: server authentication required','Contengut binari non incrustable: cau autenticacion deth servidor'",
    "'[binary content]','[contengut binari]'"
  })
  @DisplayName("oc-aranes resolves the shipped sentence")
  void araneseResolvesTheShippedSentence(String literal, String expected) {
    assertThat(literalTranslationService.resolve(literal, "oc-aranes")).isEqualTo(expected);
  }
}
