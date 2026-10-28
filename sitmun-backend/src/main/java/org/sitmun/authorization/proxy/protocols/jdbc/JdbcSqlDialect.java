package org.sitmun.authorization.proxy.protocols.jdbc;

/**
 * Appends a row limit to proxy SQL. PostgreSQL keeps {@code OFFSET}/{@code FETCH}. Every Oracle
 * connection, including 12 and later, uses a {@code ROWNUM} wrapper so the SQL stays valid on
 * Oracle 11g.
 */
public final class JdbcSqlDialect {

  private JdbcSqlDialect() {}

  /**
   * Appends pagination to {@code sql}. Null {@code limit} or {@code offset} omits that part. The
   * numbers are written as decimal digits. {@code jdbcUrl} selects the grammar.
   */
  public static String appendPagination(String sql, Integer limit, Integer offset, String jdbcUrl) {
    if (limit == null && offset == null) {
      return sql;
    }
    if (isOracle(jdbcUrl)) {
      return oracleRownum(sql, limit, offset);
    }
    return offsetFetch(sql, limit, offset);
  }

  private static boolean isOracle(String jdbcUrl) {
    return jdbcUrl != null && jdbcUrl.regionMatches(true, 0, "jdbc:oracle:", 0, 12);
  }

  private static String offsetFetch(String sql, Integer limit, Integer offset) {
    StringBuilder builder = new StringBuilder(sql);
    if (offset != null) {
      builder.append(" OFFSET ").append(offset.intValue()).append(" ROWS");
    }
    if (limit != null) {
      builder.append(" FETCH NEXT ").append(limit.intValue()).append(" ROWS ONLY");
    }
    return builder.toString();
  }

  private static String oracleRownum(String sql, Integer limit, Integer offset) {
    if (offset == null) {
      return "SELECT * FROM (" + sql + ") q WHERE ROWNUM <= " + limit.intValue();
    }
    if (limit == null) {
      return "SELECT * FROM (SELECT q.*, ROWNUM rn FROM ("
          + sql
          + ") q) WHERE rn > "
          + offset.intValue();
    }
    long end = (long) offset.intValue() + limit.intValue();
    return "SELECT * FROM (SELECT q.*, ROWNUM rn FROM ("
        + sql
        + ") q WHERE ROWNUM <= "
        + end
        + ") WHERE rn > "
        + offset.intValue();
  }
}
