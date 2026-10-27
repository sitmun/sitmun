package org.sitmun.upstream.http;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.net.ConnectException;
import java.net.ServerSocket;
import java.security.KeyStore;
import java.security.cert.Certificate;
import java.time.Duration;
import java.util.List;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLHandshakeException;
import okhttp3.HttpUrl;
import okhttp3.Interceptor;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import okhttp3.tls.HeldCertificate;
import org.junit.jupiter.api.Test;
import org.sitmun.upstream.signal.ExchangeSignals;

class UpstreamHttpClientTest {

  @Test
  void allowlistedHostUsesUnsafeClientAndAnotherHostUsesSafeClient() {
    UpstreamHttpClient client =
        new UpstreamHttpClient(
            List.of("maps.example"), Duration.ofSeconds(2), Duration.ofSeconds(3), List.of());

    assertThat(client.clientFor("maps.example")).isSameAs(client.unsafeClient());
    assertThat(client.clientFor("other.example")).isSameAs(client.safeClient());
    assertThat(client.safeClient().connectTimeoutMillis()).isEqualTo(2_000);
    assertThat(client.unsafeClient().readTimeoutMillis()).isEqualTo(3_000);
  }

  @Test
  void starAllowlistUsesUnsafeClient() {
    UpstreamHttpClient client =
        new UpstreamHttpClient(List.of("*"), Duration.ofMillis(5), Duration.ofMillis(6), List.of());

    assertThat(client.clientFor("other.example")).isSameAs(client.unsafeClient());
    assertThat(client.clientFor("maps.example")).isSameAs(client.unsafeClient());
  }

  @Test
  void callerInterceptorsAreInstalledOnBothClients() {
    Interceptor interceptor = chain -> chain.proceed(chain.request());
    UpstreamHttpClient client =
        new UpstreamHttpClient(
            List.of(), Duration.ofMillis(5), Duration.ofMillis(6), List.of(interceptor));

    assertThat(client.safeClient().interceptors()).contains(interceptor);
    assertThat(client.unsafeClient().interceptors()).contains(interceptor);
  }

  @Test
  void closedPortSurfacesAsConnectException() throws Exception {
    int port;
    try (ServerSocket socket = new ServerSocket(0)) {
      port = socket.getLocalPort();
    }
    UpstreamHttpClient client = client(List.of());
    Request request = new Request.Builder().url("http://127.0.0.1:" + port + "/").build();

    try {
      client.execute(request);
      throw new AssertionError("closed port accepted a connection");
    } catch (IOException ex) {
      assertThat(ExchangeSignals.transport(ex, 200).transportError()).isEqualTo("ConnectException");
      assertThat(ex).isInstanceOf(ConnectException.class);
    }
  }

  @Test
  void allowlistedHostRedirectsToAnotherHostOnTheSafeClient() throws Exception {
    HeldCertificate certificate = certificate();
    try (MockWebServer first = new MockWebServer();
        MockWebServer second = https(certificate)) {
      first.start();
      second.start();
      second.enqueue(new MockResponse().setBody("secret"));
      first.enqueue(redirect(302, second.url("/next").newBuilder().host("127.0.0.1").build()));

      UpstreamHttpClient client = client(List.of(first.getHostName()));
      Request request = get(first.url("/start")).header("Authorization", "Basic aaa").build();

      assertThatThrownBy(() -> client.execute(request)).isInstanceOf(SSLHandshakeException.class);
    }
  }

  @Test
  void sameAllowlistedHostKeepsTheUnsafeClient() throws Exception {
    try (MockWebServer server = new MockWebServer()) {
      server.start();
      server.enqueue(redirect(302, server.url("/next")));
      server.enqueue(new MockResponse().setBody("final"));

      UpstreamHttpClient client = client(List.of(server.getHostName()));
      Request request = get(server.url("/start")).header("Authorization", "Basic aaa").build();

      try (Response response = client.execute(request)) {
        assertThat(response.body().string()).isEqualTo("final");
      }
      server.takeRequest();
      assertThat(server.takeRequest().getHeader("Authorization")).isEqualTo("Basic aaa");
    }
  }

  @Test
  void httpToHttpsOnTheSameHostStaysUnsafeAndDropsAuthorization() throws Exception {
    HeldCertificate certificate = certificate();
    try (MockWebServer http = new MockWebServer();
        MockWebServer https = https(certificate)) {
      http.start();
      https.start();
      https.enqueue(new MockResponse().setBody("upgraded"));
      http.enqueue(redirect(302, https.url("/next")));

      UpstreamHttpClient client = client(List.of(http.getHostName()));
      Request request = get(http.url("/start")).header("Authorization", "Basic aaa").build();

      try (Response response = client.execute(request)) {
        assertThat(response.body().string()).isEqualTo("upgraded");
      }
      RecordedRequest upgraded = https.takeRequest();
      assertThat(upgraded.getHeader("Authorization")).isNull();
    }
  }

  @Test
  void httpsToHttpIsNotFollowed() throws Exception {
    HeldCertificate certificate = certificate();
    try (MockWebServer https = https(certificate);
        MockWebServer http = new MockWebServer()) {
      https.start();
      http.start();
      http.enqueue(new MockResponse().setBody("clear"));
      https.enqueue(redirect(302, http.url("/next")));

      UpstreamHttpClient client = client(List.of(https.getHostName()));
      Request request = get(https.url("/start")).build();

      try (Response response = client.execute(request)) {
        assertThat(response.code()).isEqualTo(302);
      }
      assertThat(http.getRequestCount()).isZero();
    }
  }

  @Test
  void starAllowlistFollowsARedirectToAnotherHost() throws Exception {
    HeldCertificate certificate = certificate();
    try (MockWebServer first = new MockWebServer();
        MockWebServer second = https(certificate)) {
      first.start();
      second.start();
      second.enqueue(new MockResponse().setBody("other"));
      first.enqueue(redirect(302, second.url("/next").newBuilder().host("127.0.0.1").build()));

      UpstreamHttpClient client = client(List.of("*"));
      Request request = get(first.url("/start")).header("Authorization", "Basic aaa").build();

      try (Response response = client.execute(request)) {
        assertThat(response.body().string()).isEqualTo("other");
      }
      assertThat(second.takeRequest().getHeader("Authorization")).isNull();
    }
  }

  @Test
  void crossHostRedirectDropsAuthorization() throws Exception {
    try (MockWebServer first = new MockWebServer();
        MockWebServer second = new MockWebServer()) {
      first.start();
      second.start();
      second.enqueue(new MockResponse().setBody("there"));
      first.enqueue(redirect(302, second.url("/next").newBuilder().host("127.0.0.1").build()));

      UpstreamHttpClient client = client(List.of("*"));
      Request request = get(first.url("/start")).header("Authorization", "Basic aaa").build();

      try (Response response = client.execute(request)) {
        assertThat(response.body().string()).isEqualTo("there");
      }
      assertThat(second.takeRequest().getHeader("Authorization")).isNull();
    }
  }

  private static UpstreamHttpClient client(List<String> allowlist) {
    return new UpstreamHttpClient(
        allowlist, Duration.ofSeconds(2), Duration.ofSeconds(2), List.of());
  }

  private static Request.Builder get(HttpUrl url) {
    return new Request.Builder().url(url);
  }

  private static MockResponse redirect(int code, HttpUrl location) {
    return new MockResponse().setResponseCode(code).setHeader("Location", location);
  }

  private static HeldCertificate certificate() {
    return new HeldCertificate.Builder()
        .addSubjectAlternativeName("localhost")
        .addSubjectAlternativeName("127.0.0.1")
        .build();
  }

  private static MockWebServer https(HeldCertificate certificate) throws Exception {
    KeyStore store = KeyStore.getInstance(KeyStore.getDefaultType());
    store.load(null, null);
    store.setKeyEntry(
        "key",
        certificate.keyPair().getPrivate(),
        new char[0],
        new Certificate[] {certificate.certificate()});
    KeyManagerFactory keys = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
    keys.init(store, new char[0]);
    SSLContext context = SSLContext.getInstance("TLS");
    context.init(keys.getKeyManagers(), null, null);
    MockWebServer server = new MockWebServer();
    server.useHttps(context.getSocketFactory(), false);
    return server;
  }
}
