package org.sitmun.upstream.signal;

public enum TransportError {
  CONNECT("ConnectException"),
  UNKNOWN_HOST("UnknownHostException"),
  NO_ROUTE("NoRouteToHostException"),
  PORT_UNREACHABLE("PortUnreachableException"),
  SOCKET_TIMEOUT("SocketTimeoutException"),
  INTERRUPTED_IO("InterruptedIOException"),
  CLOSED_BY_INTERRUPT("ClosedByInterruptException"),
  SSL_HANDSHAKE("SSLHandshakeException"),
  SSL_GENERIC("SSLException"),
  SSL_PEER_UNVERIFIED("SSLPeerUnverifiedException"),
  CERTIFICATE("CertificateException"),
  CERT_PATH_VALIDATOR("CertPathValidatorException"),
  SUN_CERT_PATH_BUILDER("SunCertPathBuilderException"),
  OTHER(null);

  private final String simpleName;

  TransportError(String simpleName) {
    this.simpleName = simpleName;
  }

  public String simpleName() {
    return simpleName;
  }

  public static TransportError parse(String simpleName) {
    if (simpleName == null || simpleName.isBlank()) {
      return OTHER;
    }
    for (TransportError value : values()) {
      if (simpleName.equals(value.simpleName)) {
        return value;
      }
    }
    return OTHER;
  }
}
