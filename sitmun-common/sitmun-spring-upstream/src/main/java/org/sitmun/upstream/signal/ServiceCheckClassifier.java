package org.sitmun.upstream.signal;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.core.annotation.AnnotationAwareOrderComparator;

public final class ServiceCheckClassifier {

  private final List<SignalCapture> captures;

  public ServiceCheckClassifier(List<SignalCapture> captures) {
    this.captures = List.copyOf(captures);
  }

  public Optional<Classification> classify(RequestContext context, ExchangeSignals signals) {
    List<SignalCapture> ordered = new ArrayList<>(captures);
    AnnotationAwareOrderComparator.sort(ordered);
    Optional<ServiceStatus> running = Optional.empty();
    String evidence = "";
    for (SignalCapture capture : ordered) {
      if (!capture.precondition(context, running)) {
        continue;
      }
      CaptureResult result = capture.capture(context, signals);
      if (result instanceof CaptureResult.Definitive definitive) {
        return Optional.of(new Classification(definitive.status(), definitive.evidence()));
      }
      if (result instanceof CaptureResult.Provisional provisional) {
        running = Optional.of(provisional.status());
        evidence = provisional.evidence();
      }
    }
    String detail = evidence;
    return running.map(status -> new Classification(status, detail));
  }
}
