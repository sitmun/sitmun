package org.sitmun.upstream.signal;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.sitmun.upstream.signal.capture.AuthFailedCapture;
import org.sitmun.upstream.signal.capture.ClientErrorCapture;
import org.sitmun.upstream.signal.capture.ConnectCapture;
import org.sitmun.upstream.signal.capture.InterruptedReadCapture;
import org.sitmun.upstream.signal.capture.OgcExceptionCapture;
import org.sitmun.upstream.signal.capture.OtherTransportCapture;
import org.sitmun.upstream.signal.capture.ProtocolSuccessCapture;
import org.sitmun.upstream.signal.capture.ServerErrorCapture;
import org.sitmun.upstream.signal.capture.SocketTimeoutCapture;
import org.sitmun.upstream.signal.capture.TlsCapture;
import org.sitmun.upstream.signal.capture.UnknownHostCapture;
import org.springframework.core.annotation.Order;

class ServiceCheckClassifierTest {

  private static final int SCAN_BYTES = 128;
  private static final int TEXT_CUT = 40;

  @Test
  void capabilities200IsUp() {
    assertThat(classify(probe("WMS"), ExchangeSignals.http(200)))
        .contains(new Classification(ServiceStatuses.UP, ""));
  }

  @Test
  void aims200IsReached() {
    ExchangeSignals signals =
        ExchangeSignals.http(200).scan(xml(serviceException("LayerNotDefined", "missing")), SCAN_BYTES, TEXT_CUT);

    assertThat(classify(probe("AIMS"), signals))
        .contains(new Classification(ServiceStatuses.REACHED, ""));
  }

  @Test
  void status401IsAuthFailed() {
    ExchangeSignals signals =
        ExchangeSignals.http(401).scan(xml(serviceException("NotAuthorized", "no")), SCAN_BYTES, TEXT_CUT);

    assertThat(classify(probe("WMS"), signals))
        .contains(new Classification(ServiceStatuses.AUTH_FAILED, "HTTP 401"));
  }

  @Test
  void serviceExceptionReport200IsOgcException() {
    ExchangeSignals signals =
        ExchangeSignals.http(200)
            .scan(xml(serviceException("LayerNotDefined", "missing")), SCAN_BYTES, TEXT_CUT);

    assertThat(classify(probe("WMS"), signals))
        .contains(new Classification(ServiceStatuses.OGC_EXCEPTION, "HTTP 200, LayerNotDefined, missing"));
  }

  @Test
  void exceptionReport500IsOgcException() {
    ExchangeSignals signals =
        ExchangeSignals.http(500).scan(xml(exceptionReport("NoApplicableCode", "boom")), SCAN_BYTES, TEXT_CUT);

    assertThat(classify(probe("WMS"), signals))
        .contains(new Classification(ServiceStatuses.OGC_EXCEPTION, "HTTP 500, NoApplicableCode, boom"));
  }

  @Test
  void exceptionReport400OnProbeIsOgcException() {
    ExchangeSignals signals =
        ExchangeSignals.http(400).scan(xml(exceptionReport("InvalidParameter", "bad")), SCAN_BYTES, TEXT_CUT);

    assertThat(classify(probe("WMTS"), signals))
        .contains(new Classification(ServiceStatuses.OGC_EXCEPTION, "HTTP 400, InvalidParameter, bad"));
  }

  @Test
  void viewerGetMap400WithExceptionReportIsEmpty() {
    ExchangeSignals signals =
        ExchangeSignals.http(400).scan(xml(exceptionReport("InvalidParameter", "bad")), SCAN_BYTES, TEXT_CUT);

    assertThat(signals.ogcExceptionText()).isEqualTo("bad");
    assertThat(classify(forward("WMS", "GetMap"), signals)).isEmpty();
  }

  @Test
  void probe404IsClientError() {
    assertThat(classify(probe("WFS"), ExchangeSignals.http(404)))
        .contains(new Classification(ServiceStatuses.CLIENT_ERROR, "HTTP 404"));
  }

  @Test
  void status500IsServerError() {
    assertThat(classify(probe("WMS"), ExchangeSignals.http(500)))
        .contains(new Classification(ServiceStatuses.SERVER_ERROR, "HTTP 500"));
  }

  @Test
  void socketTimeoutStaysTimeoutAgainstALaterCapture() {
    ExchangeSignals signals = new ExchangeSignals("SocketTimeoutException", "", null, null, "");

    assertThat(classify(probe("WMS"), signals, new LaterCapture()))
        .contains(new Classification(ServiceStatuses.TIMEOUT, "SocketTimeoutException"));
  }

  @Test
  void interruptedReadIsTimeoutWithThatClassName() {
    ExchangeSignals signals = new ExchangeSignals("InterruptedIOException", "", null, null, "");

    assertThat(classify(probe("WMS"), signals))
        .contains(new Classification(ServiceStatuses.TIMEOUT, "InterruptedIOException"));
  }

  @Test
  void unknownHostAndConnectAreUnreachableWithDifferentEvidence() {
    Classification unknown =
        classify(host("a.example"), new ExchangeSignals("UnknownHostException", "", null, null, ""))
            .orElseThrow();
    Classification connect =
        classify(host("b.example"), new ExchangeSignals("ConnectException", "", null, null, ""))
            .orElseThrow();

    assertThat(unknown.status()).isEqualTo(ServiceStatuses.UNREACHABLE);
    assertThat(connect.status()).isEqualTo(ServiceStatuses.UNREACHABLE);
    assertThat(unknown.evidence()).isEqualTo("UnknownHostException a.example");
    assertThat(connect.evidence()).isEqualTo("ConnectException b.example");
  }

  @Test
  void sslHandshakeIsTlsError() {
    ExchangeSignals signals =
        new ExchangeSignals("SSLHandshakeException", "PKIX path building failed", null, null, "");

    assertThat(classify(probe("WMS"), signals))
        .contains(
            new Classification(
                ServiceStatuses.TLS_ERROR, "SSLHandshakeException PKIX path building failed"));
  }

  @Test
  void otherIoExceptionIsReversedByOrder60Capture() {
    ExchangeSignals signals = new ExchangeSignals("IOException", "reset", null, null, "");

    assertThat(classify(probe("WMS"), signals, new ReverseTransportCapture()))
        .contains(new Classification(new ServiceStatus("recovered", 15), "reversed"));
  }

  @Test
  void extraCaptureMaintenanceIsTheWalkResult() {
    assertThat(classify(probe("WMS"), ExchangeSignals.http(200), new MaintenanceCapture()).orElseThrow().status())
        .isEqualTo(new ServiceStatus("maintenance", 55));
  }

  @Test
  void emptyWalkIsEmpty() {
    RequestContext context = probe("WMS");
    ExchangeSignals signals = new ExchangeSignals(null, "", null, null, "");

    assertThat(new ServiceCheckClassifier(List.of()).classify(context, signals)).isEmpty();
    assertThat(classify(context, signals)).isEmpty();
  }

  @Test
  void protocolSuccessDoesNotReadExceptionText() {
    ExchangeSignals signals =
        new ExchangeSignals(null, "", 200, "LayerNotDefined", "missing");
    CaptureResult result = new ProtocolSuccessCapture().capture(probe("WMS"), signals);

    assertThat(result).isEqualTo(new CaptureResult.Provisional(ServiceStatuses.UP, ""));
  }

  private static Optional<Classification> classify(
      RequestContext context, ExchangeSignals signals, SignalCapture... extra) {
    return new ServiceCheckClassifier(captures(extra)).classify(context, signals);
  }

  private static List<SignalCapture> captures(SignalCapture... extra) {
    List<SignalCapture> all = new ArrayList<>();
    all.add(new SocketTimeoutCapture());
    all.add(new InterruptedReadCapture());
    all.add(new UnknownHostCapture());
    all.add(new ConnectCapture());
    all.add(new TlsCapture());
    all.add(new AuthFailedCapture());
    all.add(new ProtocolSuccessCapture());
    all.add(new ClientErrorCapture());
    all.add(new ServerErrorCapture());
    all.add(new OgcExceptionCapture());
    all.add(new OtherTransportCapture());
    all.addAll(List.of(extra));
    return all;
  }

  private static RequestContext probe(String protocol) {
    return new RequestContext(protocol, "GetCapabilities", true, "maps.example", "/service");
  }

  private static RequestContext forward(String protocol, String request) {
    return new RequestContext(protocol, request, false, "maps.example", "/service");
  }

  private static RequestContext host(String host) {
    return new RequestContext("WMS", "GetCapabilities", true, host, "/service");
  }

  private static ByteArrayInputStream xml(String body) {
    return new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8));
  }

  private static String serviceException(String code, String text) {
    return "<ServiceExceptionReport><ServiceException code=\""
        + code
        + "\">"
        + text
        + "</ServiceException></ServiceExceptionReport>";
  }

  private static String exceptionReport(String code, String text) {
    return "<ExceptionReport><Exception exceptionCode=\""
        + code
        + "\"><ExceptionText>"
        + text
        + "</ExceptionText></Exception></ExceptionReport>";
  }

  @Order(60)
  static final class LaterCapture implements SignalCapture {
    @Override
    public CaptureResult capture(RequestContext context, ExchangeSignals signals) {
      throw new AssertionError("later capture ran");
    }
  }

  @Order(60)
  static final class ReverseTransportCapture implements SignalCapture {
    @Override
    public boolean precondition(RequestContext context, Optional<ServiceStatus> current) {
      return current.map(ServiceStatus::code).filter("transport_error"::equals).isPresent();
    }

    @Override
    public CaptureResult capture(RequestContext context, ExchangeSignals signals) {
      return new CaptureResult.Definitive(new ServiceStatus("recovered", 15), "reversed");
    }
  }

  static final class MaintenanceCapture implements SignalCapture {
    @Override
    public CaptureResult capture(RequestContext context, ExchangeSignals signals) {
      return new CaptureResult.Definitive(new ServiceStatus("maintenance", 55), "window");
    }
  }
}
