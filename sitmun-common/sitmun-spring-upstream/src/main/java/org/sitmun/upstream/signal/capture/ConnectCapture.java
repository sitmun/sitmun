package org.sitmun.upstream.signal.capture;

import org.sitmun.upstream.signal.CaptureResult;
import org.sitmun.upstream.signal.ExchangeSignals;
import org.sitmun.upstream.signal.RequestContext;
import org.sitmun.upstream.signal.ServiceStatuses;
import org.sitmun.upstream.signal.SignalCapture;
import org.sitmun.upstream.signal.TransportError;
import org.springframework.core.annotation.Order;

@Order(13)
public final class ConnectCapture implements SignalCapture {

  @Override
  public CaptureResult capture(RequestContext context, ExchangeSignals signals) {
    TransportError error = TransportError.parse(signals.transportError());
    if (error != TransportError.CONNECT
        && error != TransportError.NO_ROUTE
        && error != TransportError.PORT_UNREACHABLE) {
      return new CaptureResult.Undecided();
    }
    return new CaptureResult.Definitive(
        ServiceStatuses.UNREACHABLE,
        UnknownHostCapture.evidence(signals.transportError(), context.host()));
  }
}
