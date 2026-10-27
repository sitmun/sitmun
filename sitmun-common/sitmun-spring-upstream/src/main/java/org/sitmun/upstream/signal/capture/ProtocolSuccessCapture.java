package org.sitmun.upstream.signal.capture;

import org.sitmun.upstream.signal.CaptureResult;
import org.sitmun.upstream.signal.ExchangeSignals;
import org.sitmun.upstream.signal.RequestContext;
import org.sitmun.upstream.signal.ServiceStatuses;
import org.sitmun.upstream.signal.SignalCapture;
import org.springframework.core.annotation.Order;

@Order(30)
public final class ProtocolSuccessCapture implements SignalCapture {

  @Override
  public CaptureResult capture(RequestContext context, ExchangeSignals signals) {
    Integer status = signals.httpStatus();
    if (status == null || status < 200 || status > 299) {
      return new CaptureResult.Undecided();
    }
    if (RequestContext.isOgcProtocol(context.protocol())) {
      return new CaptureResult.Provisional(ServiceStatuses.UP, "");
    }
    if (RequestContext.isReachedProtocol(context.protocol())) {
      return new CaptureResult.Provisional(ServiceStatuses.REACHED, "");
    }
    return new CaptureResult.Undecided();
  }
}
