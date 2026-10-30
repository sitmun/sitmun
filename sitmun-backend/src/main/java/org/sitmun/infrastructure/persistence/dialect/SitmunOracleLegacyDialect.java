package org.sitmun.infrastructure.persistence.dialect;

import org.hibernate.community.dialect.OracleLegacyDialect;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolutionInfo;
import org.hibernate.query.sqm.CastType;

/**
 * Oracle {@code CURRENT_DATE} includes the time of day. JPA {@code current_date} is a calendar
 * date.
 *
 * <p>Without the {@link DialectResolutionInfo} constructor, Hibernate uses the no-argument one and
 * the dialect assumes Oracle 8, which generates SQL that Oracle 11 handles differently.
 */
public class SitmunOracleLegacyDialect extends OracleLegacyDialect {

  public SitmunOracleLegacyDialect() {
    super();
  }

  public SitmunOracleLegacyDialect(DialectResolutionInfo info) {
    super(info);
  }

  @Override
  public String currentDate() {
    return "trunc(current_date)";
  }

  /** An Oracle {@code DATE} keeps the time of day, so a cast to date truncates it. */
  @Override
  public String castPattern(CastType from, CastType to) {
    String pattern = super.castPattern(from, to);
    return to == CastType.DATE ? "trunc(" + pattern + ")" : pattern;
  }
}
