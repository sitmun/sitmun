package org.sitmun.domain.cartography;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.sitmun.domain.service.Service;

@DisplayName("Static legend URL")
class StaticLegendUrlValidatorTest {

  private static final String STATIC_LEGEND = "LINK";
  private static final String MESSAGE = "A static legend requires an address";

  private static Validator validator;

  @BeforeAll
  static void setUpValidator() {
    validator = Validation.buildDefaultValidatorFactory().getValidator();
  }

  @ParameterizedTest
  @NullAndEmptySource
  @ValueSource(strings = {" ", "   ", "\t"})
  @DisplayName("LINK with a null, blank, or whitespace legend URL is rejected")
  void linkWithBlankLegendUrlIsRejected(String legendUrl) {
    Cartography cartography = cartography(STATIC_LEGEND, legendUrl);

    Set<ConstraintViolation<Cartography>> violations = validator.validate(cartography);

    assertThat(violations)
        .anyMatch(
            violation ->
                "legendURL".equals(violation.getPropertyPath().toString())
                    && MESSAGE.equals(violation.getMessage()));
  }

  @Test
  @DisplayName("a non-LINK legend with a null URL is accepted")
  void nonLinkWithNullLegendUrlIsAccepted() {
    Cartography cartography = cartography("LEGENDGRAPHIC", null);

    assertThat(validator.validate(cartography)).isEmpty();
  }

  @Test
  @DisplayName("LINK with an http legend URL is accepted")
  void linkWithAddressIsAccepted() {
    Cartography cartography = cartography(STATIC_LEGEND, "http://example.com/legend.png");

    assertThat(validator.validate(cartography)).isEmpty();
  }

  private static Cartography cartography(String legendType, String legendUrl) {
    return Cartography.builder()
        .name("Layer")
        .layers(List.of("layer"))
        .queryableFeatureAvailable(false)
        .queryableFeatureEnabled(false)
        .service(Service.builder().name("Service").build())
        .blocked(false)
        .legendType(legendType)
        .legendURL(legendUrl)
        .build();
  }
}
