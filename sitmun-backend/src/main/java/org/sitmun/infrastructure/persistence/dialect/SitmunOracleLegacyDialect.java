package org.sitmun.infrastructure.persistence.dialect;

import org.hibernate.community.dialect.OracleLegacyDialect;

/**
 * Oracle {@code CURRENT_DATE} includes the time of day. JPA {@code current_date} is a calendar
 * date.
 */
public class SitmunOracleLegacyDialect extends OracleLegacyDialect {

  @Override
  public String currentDate() {
    return "trunc(current_date)";
  }
}
