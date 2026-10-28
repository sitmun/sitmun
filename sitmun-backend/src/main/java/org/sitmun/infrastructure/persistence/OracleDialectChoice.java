package org.sitmun.infrastructure.persistence;

/**
 * Chooses the Hibernate dialect for SITMUN's own Oracle database. {@code 19} means Oracle 19 or
 * newer. {@code 11} is the opt-in for Oracle 11g.
 */
public final class OracleDialectChoice {

  static final String CURRENT = "org.hibernate.dialect.OracleDialect";

  static final String LEGACY = "org.hibernate.community.dialect.OracleLegacyDialect";

  private OracleDialectChoice() {}

  public static String dialectClass(String version) {
    if (version == null || version.isBlank() || "19".equals(version.trim())) {
      return CURRENT;
    }
    if ("11".equals(version.trim())) {
      return LEGACY;
    }
    throw new IllegalArgumentException("sitmun.db.oracle.version must be 19 or 11");
  }
}
