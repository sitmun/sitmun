package org.sitmun.infrastructure.persistence.dialect;

import org.hibernate.community.dialect.OracleLegacyDialect;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolutionInfo;

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
}
