package org.sitmun.upstream.signal.capture;

import org.sitmun.upstream.signal.CaptureResult;
import org.sitmun.upstream.signal.ExchangeSignals;
import org.sitmun.upstream.signal.RequestContext;
import org.sitmun.upstream.signal.ServiceStatuses;
import org.sitmun.upstream.signal.SignalCapture;
import org.springframework.core.annotation.Order;

@Order(32)
public final class ServerErrorCapture implements SignalCapture {

  @Override
  public CaptureResult capture(RequestContext context, ExchangeSignals signals) {
    Integer status = signals.httpStatus();
    if (status == null || status < 500 || status > 599) {
      return new CaptureResult.Undecided();
    }
    return new CaptureResult.Provisional(ServiceStatuses.SERVER_ERROR, "HTTP " + status);
  }
}
