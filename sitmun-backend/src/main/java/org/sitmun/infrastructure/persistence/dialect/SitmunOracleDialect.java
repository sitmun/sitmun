package org.sitmun.infrastructure.persistence.dialect;

import org.hibernate.dialect.OracleDialect;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolutionInfo;

/**
 * Oracle {@code CURRENT_DATE} includes the time of day. JPA {@code current_date} is a calendar
 * date.
 *
 * <p>Without the {@link DialectResolutionInfo} constructor, Hibernate uses the no-argument one and
 * the dialect assumes the minimum Oracle version instead of the connected one.
 */
public class SitmunOracleDialect extends OracleDialect {

  public SitmunOracleDialect() {
    super();
  }

  public SitmunOracleDialect(DialectResolutionInfo info) {
    super(info);
  }

  @Override
  public String currentDate() {
    return "trunc(current_date)";
  }
}
