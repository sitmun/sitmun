package org.sitmun.proxy.contract;

public final class ProxyHeaders {

  public static final String PROXY_KEY = "X-SITMUN-Proxy-Key";

  /** Present with value {@code true} when a JDBC result was cut at the row cap. */
  public static final String TRUNCATED = "X-SITMUN-Truncated";

  private ProxyHeaders() {}
}
