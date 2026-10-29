package org.sitmun.infrastructure.persistence.dialect;

import org.hibernate.dialect.OracleDialect;

/**
 * Oracle {@code CURRENT_DATE} includes the time of day. JPA {@code current_date} is a calendar
 * date.
 */
public class SitmunOracleDialect extends OracleDialect {

  @Override
  public String currentDate() {
    return "trunc(current_date)";
  }
}
