package org.sitmun.upstream.signal.capture;

import org.sitmun.upstream.signal.CaptureResult;
import org.sitmun.upstream.signal.ExchangeSignals;
import org.sitmun.upstream.signal.RequestContext;
import org.sitmun.upstream.signal.ServiceStatuses;
import org.sitmun.upstream.signal.SignalCapture;
import org.springframework.core.annotation.Order;

@Order(20)
public final class AuthFailedCapture implements SignalCapture {

  @Override
  public CaptureResult capture(RequestContext context, ExchangeSignals signals) {
    Integer status = signals.httpStatus();
    if (status == null || (status != 401 && status != 403)) {
      return new CaptureResult.Undecided();
    }
    return new CaptureResult.Definitive(ServiceStatuses.AUTH_FAILED, "HTTP " + status);
  }
}
