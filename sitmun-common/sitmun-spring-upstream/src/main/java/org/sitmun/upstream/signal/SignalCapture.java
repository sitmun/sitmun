package org.sitmun.upstream.signal;

import java.util.Optional;

public interface SignalCapture {

  default boolean precondition(RequestContext context, Optional<ServiceStatus> current) {
    return true;
  }

  CaptureResult capture(RequestContext context, ExchangeSignals signals);
}
