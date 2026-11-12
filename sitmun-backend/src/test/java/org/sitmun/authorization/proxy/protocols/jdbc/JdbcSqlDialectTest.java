package org.sitmun.authorization.proxy.protocols.jdbc;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class JdbcSqlDialectTest {

  @ParameterizedTest
  @CsvSource(
      nullValues = "NULL",
      value = {
        "10,20,SELECT 1 OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY",
        "10,NULL,SELECT 1 FETCH NEXT 10 ROWS ONLY",
        "NULL,5,SELECT 1 OFFSET 5 ROWS",
        "NULL,NULL,SELECT 1"
      })
  @DisplayName("PostgreSQL keeps OFFSET and FETCH")
  void postgresqlKeepsOffsetFetch(Integer limit, Integer offset, String expected) {
    assertThat(
            JdbcSqlDialect.appendPagination(
                "SELECT 1", limit, offset, "jdbc:postgresql://localhost/sitmun"))
        .isEqualTo(expected);
  }

  @ParameterizedTest
  @CsvSource(
      delimiter = '|',
      nullValues = "NULL",
      value = {
        "10|20|SELECT * FROM (SELECT q.*, ROWNUM rn FROM (SELECT 1) q WHERE ROWNUM <= 30) WHERE rn > 20",
        "10|NULL|SELECT * FROM (SELECT 1) q WHERE ROWNUM <= 10",
        "NULL|5|SELECT * FROM (SELECT q.*, ROWNUM rn FROM (SELECT 1) q) WHERE rn > 5",
        "NULL|NULL|SELECT 1"
      })
  @DisplayName("every Oracle connection uses a ROWNUM wrapper")
  void oracleUsesRownum(Integer limit, Integer offset, String expected) {
    assertThat(
            JdbcSqlDialect.appendPagination(
                "SELECT 1", limit, offset, "jdbc:oracle:thin:@//localhost:1521/xe"))
        .isEqualTo(expected);
    assertThat(
            JdbcSqlDialect.appendPagination(
                "SELECT 1", limit, offset, "jdbc:oracle:thin:@//db.example:1521/orcl19"))
        .isEqualTo(expected);
  }
}
