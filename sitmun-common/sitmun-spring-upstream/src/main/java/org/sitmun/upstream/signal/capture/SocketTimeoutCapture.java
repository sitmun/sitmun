package org.sitmun.upstream.signal.capture;

import org.sitmun.upstream.signal.CaptureResult;
import org.sitmun.upstream.signal.ExchangeSignals;
import org.sitmun.upstream.signal.RequestContext;
import org.sitmun.upstream.signal.ServiceStatuses;
import org.sitmun.upstream.signal.SignalCapture;
import org.springframework.core.annotation.Order;

@Order(10)
public final class SocketTimeoutCapture implements SignalCapture {

  @Override
  public CaptureResult capture(RequestContext context, ExchangeSignals signals) {
    if (!"SocketTimeoutException".equals(signals.transportError())) {
      return new CaptureResult.Undecided();
    }
    return new CaptureResult.Definitive(ServiceStatuses.TIMEOUT, "SocketTimeoutException");
  }
}
