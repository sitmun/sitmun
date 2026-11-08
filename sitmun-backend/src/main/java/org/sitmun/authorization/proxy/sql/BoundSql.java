package org.sitmun.authorization.proxy.sql;

import java.util.List;
import org.sitmun.proxy.contract.JdbcParameter;

/** SQL with every placeholder replaced by {@code ?}, plus the values in that order. */
public record BoundSql(String sql, List<JdbcParameter> parameters) {}
