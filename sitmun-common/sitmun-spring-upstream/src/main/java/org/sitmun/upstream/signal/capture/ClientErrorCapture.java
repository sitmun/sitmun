package org.sitmun.upstream.signal.capture;

import java.util.Optional;
import org.sitmun.upstream.signal.CaptureResult;
import org.sitmun.upstream.signal.ExchangeSignals;
import org.sitmun.upstream.signal.RequestContext;
import org.sitmun.upstream.signal.ServiceStatus;
import org.sitmun.upstream.signal.ServiceStatuses;
import org.sitmun.upstream.signal.SignalCapture;
import org.springframework.core.annotation.Order;

@Order(31)
public final class ClientErrorCapture implements SignalCapture {

  @Override
  public boolean precondition(RequestContext context, Optional<ServiceStatus> current) {
    return context.probe();
  }

  @Override
  public CaptureResult capture(RequestContext context, ExchangeSignals signals) {
    Integer status = signals.httpStatus();
    if (status == null || status < 400 || status > 499) {
      return new CaptureResult.Undecided();
    }
    return new CaptureResult.Provisional(ServiceStatuses.CLIENT_ERROR, "HTTP " + status);
  }
}
