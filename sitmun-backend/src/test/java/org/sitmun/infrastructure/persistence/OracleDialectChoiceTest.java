package org.sitmun.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class OracleDialectChoiceTest {

  @ParameterizedTest
  @NullAndEmptySource
  @ValueSource(strings = {"19", " 19 "})
  @DisplayName("19 is the default and selects the current Oracle dialect")
  void nineteenUsesCurrentDialect(String version) {
    assertThat(OracleDialectChoice.dialectClass(version))
        .isEqualTo("org.hibernate.dialect.OracleDialect");
  }

  @Test
  @DisplayName("11 selects the legacy dialect")
  void elevenUsesLegacyDialect() {
    assertThat(OracleDialectChoice.dialectClass("11"))
        .isEqualTo("org.hibernate.community.dialect.OracleLegacyDialect");
  }

  @Test
  @DisplayName("any other value is rejected")
  void otherValuesAreRejected() {
    assertThatThrownBy(() -> OracleDialectChoice.dialectClass("12"))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
