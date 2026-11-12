package org.sitmun.upstream.http;

import javax.net.ssl.SSLHandshakeException;
import javax.net.ssl.SSLPeerUnverifiedException;

public final class CertificateRejection {

  public static final String DETAIL =
      "certificate check failed; set sitmun.client.unsafe-allowed-hosts for this host if that"
          + " certificate is intentional";

  private CertificateRejection() {}

  public static boolean matches(Throwable error) {
    Throwable current = error;
    while (current != null) {
      if (current instanceof SSLHandshakeException
          || current instanceof SSLPeerUnverifiedException) {
        return true;
      }
      current = current.getCause();
    }
    return false;
  }
}
