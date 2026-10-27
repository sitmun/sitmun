package org.sitmun.upstream.signal;

public final class ServiceStatuses {

  public static final ServiceStatus UNREACHABLE = new ServiceStatus("unreachable", 90);
  public static final ServiceStatus TLS_ERROR = new ServiceStatus("tls_error", 80);
  public static final ServiceStatus TIMEOUT = new ServiceStatus("timeout", 70);
  public static final ServiceStatus TRANSPORT_ERROR = new ServiceStatus("transport_error", 60);
  public static final ServiceStatus SERVER_ERROR = new ServiceStatus("server_error", 50);
  public static final ServiceStatus AUTH_FAILED = new ServiceStatus("auth_failed", 40);
  public static final ServiceStatus OGC_EXCEPTION = new ServiceStatus("ogc_exception", 30);
  public static final ServiceStatus CLIENT_ERROR = new ServiceStatus("client_error", 20);
  public static final ServiceStatus REACHED = new ServiceStatus("reached", 10);
  public static final ServiceStatus UP = new ServiceStatus("up", 0);

  private ServiceStatuses() {}
}
