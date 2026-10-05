package org.sitmun.upstream.signal;

public sealed interface CaptureResult
    permits CaptureResult.Definitive, CaptureResult.Provisional, CaptureResult.Undecided {

  record Definitive(ServiceStatus status, String evidence) implements CaptureResult {}

  record Provisional(ServiceStatus status, String evidence) implements CaptureResult {}

  record Undecided() implements CaptureResult {}
}
