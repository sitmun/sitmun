package org.sitmun.administration.service.access;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import okhttp3.Request;
import okhttp3.Response;
import org.junit.jupiter.api.Test;
import org.sitmun.administration.service.extractor.LocalTlsServer;
import org.sitmun.upstream.http.UpstreamHttpClient;
import org.sitmun.upstream.signal.Classification;
import org.sitmun.upstream.signal.ExchangeSignals;
import org.sitmun.upstream.signal.RequestContext;
import org.sitmun.upstream.signal.ServiceCheckClassifier;
import org.sitmun.upstream.signal.capture.TlsCapture;

class RejectedCertificateDetailTest {

  @Test
  void rejectedCertificateNamesTheSetting() throws Exception {
    try (LocalTlsServer tls = LocalTlsServer.start()) {
      UpstreamHttpClient client =
          new UpstreamHttpClient(
              List.of(), Duration.ofSeconds(5), Duration.ofSeconds(5), List.of());
      Request request = new Request.Builder().url(tls.url()).build();
      IOException error =
          assertThrows(
              IOException.class,
              () -> {
                try (Response ignored = client.execute(request)) {}
              });
      ExchangeSignals signals = ExchangeSignals.transport(error, 500);
      RequestContext context = new RequestContext("WMS", "GetCapabilities", true, tls.host(), "/");
      Classification classification =
          new ServiceCheckClassifier(List.of(new TlsCapture()))
              .classify(context, signals)
              .orElseThrow();
      String detail = ServiceAccessCheckExecutor.detail(context, classification.evidence(), 500);

      assertThat(detail).contains("certificate").contains("sitmun.client.unsafe-allowed-hosts");
    }
  }
}
