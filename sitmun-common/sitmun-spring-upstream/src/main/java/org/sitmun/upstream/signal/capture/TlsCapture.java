package org.sitmun.upstream.signal.capture;

import org.sitmun.upstream.signal.CaptureResult;
import org.sitmun.upstream.signal.ExchangeSignals;
import org.sitmun.upstream.signal.RequestContext;
import org.sitmun.upstream.signal.ServiceStatuses;
import org.sitmun.upstream.signal.SignalCapture;
import org.springframework.core.annotation.Order;

@Order(14)
public final class TlsCapture implements SignalCapture {

  @Override
  public CaptureResult capture(RequestContext context, ExchangeSignals signals) {
    String name = signals.transportError();
    if (name == null || !name.startsWith("SSL")) {
      return new CaptureResult.Undecided();
    }
    String message = signals.transportMessage();
    String evidence = message == null || message.isBlank() ? name : name + " " + message;
    return new CaptureResult.Definitive(ServiceStatuses.TLS_ERROR, evidence);
  }
}
