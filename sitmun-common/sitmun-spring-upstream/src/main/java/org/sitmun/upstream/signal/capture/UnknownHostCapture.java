package org.sitmun.upstream.signal.capture;

import org.sitmun.upstream.signal.CaptureResult;
import org.sitmun.upstream.signal.ExchangeSignals;
import org.sitmun.upstream.signal.RequestContext;
import org.sitmun.upstream.signal.ServiceStatuses;
import org.sitmun.upstream.signal.SignalCapture;
import org.springframework.core.annotation.Order;

@Order(12)
public final class UnknownHostCapture implements SignalCapture {

  @Override
  public CaptureResult capture(RequestContext context, ExchangeSignals signals) {
    if (!"UnknownHostException".equals(signals.transportError())) {
      return new CaptureResult.Undecided();
    }
    return new CaptureResult.Definitive(
        ServiceStatuses.UNREACHABLE, evidence(signals.transportError(), context.host()));
  }

  static String evidence(String className, String host) {
    if (host == null || host.isBlank()) {
      return className;
    }
    return className + " " + host;
  }
}
