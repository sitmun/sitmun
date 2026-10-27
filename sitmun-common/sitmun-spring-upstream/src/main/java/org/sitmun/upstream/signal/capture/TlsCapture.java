package org.sitmun.upstream.signal.capture;

import org.sitmun.upstream.signal.CaptureResult;
import org.sitmun.upstream.signal.ExchangeSignals;
import org.sitmun.upstream.signal.RequestContext;
import org.sitmun.upstream.signal.ServiceStatuses;
import org.sitmun.upstream.signal.SignalCapture;
import org.sitmun.upstream.signal.TransportError;
import org.springframework.core.annotation.Order;

@Order(14)
public final class TlsCapture implements SignalCapture {

  @Override
  public CaptureResult capture(RequestContext context, ExchangeSignals signals) {
    TransportError error = TransportError.parse(signals.transportError());
    if (error != TransportError.SSL_HANDSHAKE
        && error != TransportError.SSL_GENERIC
        && error != TransportError.SSL_PEER_UNVERIFIED
        && error != TransportError.CERTIFICATE
        && error != TransportError.CERT_PATH_VALIDATOR
        && error != TransportError.SUN_CERT_PATH_BUILDER) {
      return new CaptureResult.Undecided();
    }
    String name = signals.transportError();
    String message = signals.transportMessage();
    String evidence = message == null || message.isBlank() ? name : name + " " + message;
    return new CaptureResult.Definitive(ServiceStatuses.TLS_ERROR, evidence);
  }
}
