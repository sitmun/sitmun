package org.sitmun.proxy.contract;

/**
 * One bound JDBC value. {@code sqlType} is a {@link java.sql.Types} code. {@code value} is null for
 * a typed NULL.
 */
public record JdbcParameter(int sqlType, Object value) {}
