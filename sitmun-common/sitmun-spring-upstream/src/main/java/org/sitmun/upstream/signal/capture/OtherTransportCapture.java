package org.sitmun.upstream.signal.capture;

import org.sitmun.upstream.signal.CaptureResult;
import org.sitmun.upstream.signal.ExchangeSignals;
import org.sitmun.upstream.signal.RequestContext;
import org.sitmun.upstream.signal.ServiceStatuses;
import org.sitmun.upstream.signal.SignalCapture;
import org.springframework.core.annotation.Order;

@Order(50)
public final class OtherTransportCapture implements SignalCapture {

  @Override
  public CaptureResult capture(RequestContext context, ExchangeSignals signals) {
    String name = signals.transportError();
    if (name == null || name.isBlank()) {
      return new CaptureResult.Undecided();
    }
    return new CaptureResult.Provisional(ServiceStatuses.TRANSPORT_ERROR, name);
  }
}
