package org.sitmun.proxy.middleware.protocols.jdbc;

import java.util.List;
import org.sitmun.proxy.contract.JdbcParameter;
import org.sitmun.proxy.middleware.decorator.Context;

public interface JdbcContext extends Context {
  String getDriver();

  String getUri();

  String getUser();

  String getPassword();

  String getSql();

  List<JdbcParameter> getParameters();

  Integer getMaxRows();

  Integer getTimeoutSeconds();
}
