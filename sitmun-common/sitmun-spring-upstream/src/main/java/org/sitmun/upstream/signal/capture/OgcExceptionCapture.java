package org.sitmun.upstream.signal.capture;

import java.util.Optional;
import org.sitmun.upstream.signal.CaptureResult;
import org.sitmun.upstream.signal.ExchangeSignals;
import org.sitmun.upstream.signal.RequestContext;
import org.sitmun.upstream.signal.ServiceStatus;
import org.sitmun.upstream.signal.ServiceStatuses;
import org.sitmun.upstream.signal.SignalCapture;
import org.springframework.core.annotation.Order;

@Order(40)
public final class OgcExceptionCapture implements SignalCapture {

  @Override
  public boolean precondition(RequestContext context, Optional<ServiceStatus> current) {
    return current
        .map(ServiceStatus::code)
        .filter(
            code ->
                ServiceStatuses.UP.code().equals(code)
                    || ServiceStatuses.CLIENT_ERROR.code().equals(code)
                    || ServiceStatuses.SERVER_ERROR.code().equals(code))
        .isPresent();
  }

  @Override
  public CaptureResult capture(RequestContext context, ExchangeSignals signals) {
    String text = signals.ogcExceptionText();
    if (text == null || text.isBlank()) {
      return new CaptureResult.Undecided();
    }
    StringBuilder evidence = new StringBuilder();
    if (signals.httpStatus() != null) {
      evidence.append("HTTP ").append(signals.httpStatus());
    }
    String code = signals.ogcExceptionCode();
    if (code != null && !code.isBlank()) {
      if (!evidence.isEmpty()) {
        evidence.append(", ");
      }
      evidence.append(code);
    }
    if (!evidence.isEmpty()) {
      evidence.append(", ");
    }
    evidence.append(text);
    return new CaptureResult.Definitive(ServiceStatuses.OGC_EXCEPTION, evidence.toString());
  }
}
