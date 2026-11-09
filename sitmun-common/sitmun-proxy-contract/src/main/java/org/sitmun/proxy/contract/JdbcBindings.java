package org.sitmun.proxy.contract;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;

/** Shared JDBC bind and limit rules for the backend and the proxy. */
public final class JdbcBindings {

  public static final int DEFAULT_MAX_ROWS = 1000;
  public static final int DEFAULT_TIMEOUT_SECONDS = 60;

  private JdbcBindings() {}

  public static int rowCap(Integer maxRows) {
    return maxRows == null || maxRows < 1 ? DEFAULT_MAX_ROWS : maxRows;
  }

  public static void applyLimits(Statement statement, Integer maxRows, Integer timeoutSeconds)
      throws SQLException {
    int timeout =
        timeoutSeconds == null || timeoutSeconds < 1 ? DEFAULT_TIMEOUT_SECONDS : timeoutSeconds;
    statement.setMaxRows(rowCap(maxRows) + 1);
    statement.setQueryTimeout(timeout);
  }

  public static String productName(Connection connection) {
    try {
      DatabaseMetaData meta = connection.getMetaData();
      if (meta == null || meta.getDatabaseProductName() == null) {
        return "";
      }
      return meta.getDatabaseProductName();
    } catch (SQLException exception) {
      return "";
    }
  }

  public static void bind(
      PreparedStatement statement, int index, JdbcParameter parameter, String product)
      throws SQLException {
    int sqlType = parameter.sqlType();
    Object value = parameter.value();
    if (sqlType == Types.BOOLEAN && isOracle(product)) {
      if (value == null) {
        statement.setNull(index, Types.NUMERIC);
      } else {
        statement.setObject(index, Boolean.TRUE.equals(value) ? 1 : 0, Types.NUMERIC);
      }
      return;
    }
    if (sqlType == Types.BOOLEAN && isSqlServer(product)) {
      if (value == null) {
        statement.setNull(index, Types.BIT);
      } else {
        statement.setObject(index, value, Types.BIT);
      }
      return;
    }
    if (value == null) {
      statement.setNull(index, sqlType);
    } else {
      statement.setObject(index, value, sqlType);
    }
  }

  private static boolean isOracle(String product) {
    return product != null && product.toLowerCase(java.util.Locale.ROOT).contains("oracle");
  }

  private static boolean isSqlServer(String product) {
    return product != null && product.toLowerCase(java.util.Locale.ROOT).contains("sql server");
  }
}
