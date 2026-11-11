package org.sitmun.administration.service.extractor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.io.IOException;
import java.util.List;
import javax.net.ssl.SSLHandshakeException;
import okhttp3.Request;
import okhttp3.Response;
import org.assertj.core.util.Lists;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

@DisplayName("HttpClientFactory tests")
class HttpClientFactoryTest {

  private static LocalTlsServer tls;

  @BeforeAll
  static void startTls() throws Exception {
    tls = LocalTlsServer.start();
  }

  @AfterAll
  static void stopTls() throws IOException {
    tls.close();
  }

  @Test
  @DisplayName("HTTPS request without a trust store throws SSLHandshakeException")
  void httpsRequestWithoutTrustStoreThrowsSslHandshakeException() {
    HttpClientFactory client = new HttpClientFactory(Lists.list());

    Request request = new Request.Builder().url(tls.url()).header("Accept", "*/*").build();

    assertThrows(
        SSLHandshakeException.class,
        () -> {
          //noinspection EmptyTryBlock
          try (Response ignored = client.executeRequest(request)) {}
        });
  }

  @Test
  @DisplayName("Without unsafe-allowed-hosts the factory checks the certificate")
  void defaultChecksTheCertificate() {
    new ApplicationContextRunner()
        .withBean(HttpClientFactory.class)
        .run(
            context -> {
              HttpClientFactory client = context.getBean(HttpClientFactory.class);
              Request request =
                  new Request.Builder().url(tls.url()).header("Accept", "*/*").build();
              assertThrows(
                  SSLHandshakeException.class,
                  () -> {
                    //noinspection EmptyTryBlock
                    try (Response ignored = client.executeRequest(request)) {}
                  });
            });
  }

  @Test
  @DisplayName("Host * completes the TLS request")
  void starHostCompletesTlsRequest() {
    assertCompletes(Lists.list("*"));
  }

  @Test
  @DisplayName("Use unsafe client when domain matches")
  void useUnsafeClientWhenDomainMatches() {
    assertCompletes(Lists.list(tls.host()));
  }

  @Test
  @DisplayName("A mixed-case host still skips the certificate check")
  void mixedCaseHostSkipsTheCertificateCheck() throws Exception {
    try (LocalTlsServer localhost = LocalTlsServer.start("::1", "localhost")) {
      HttpClientFactory client = new HttpClientFactory(Lists.list("LocalHost"));
      Request request = new Request.Builder().url(localhost.url()).header("Accept", "*/*").build();
      try (Response response = client.executeRequest(request)) {
        assertTrue(response.isSuccessful());
      } catch (IOException e) {
        fail(e);
      }
    }
  }

  @Test
  @DisplayName("A redirect to a host that is not allowed checks the certificate")
  void redirectToAHostThatIsNotAllowedChecksTheCertificate() throws Exception {
    try (LocalTlsServer target = LocalTlsServer.start("::1", "localhost")) {
      tls.redirectTo("https://localhost:" + target.port() + "/");
      HttpClientFactory client = new HttpClientFactory(Lists.list(tls.host()));
      Request request = new Request.Builder().url(tls.url()).header("Accept", "*/*").build();
      assertThrows(
          SSLHandshakeException.class,
          () -> {
            //noinspection EmptyTryBlock
            try (Response ignored = client.executeRequest(request)) {}
          });
    } finally {
      tls.redirectTo(null);
    }
  }

  @Test
  @DisplayName("A star allow list is logged once at warn, and a request is not")
  void starAllowListIsLoggedAtWarn() throws IOException {
    Logger logger = (Logger) LoggerFactory.getLogger(HttpClientFactory.class);
    ListAppender<ILoggingEvent> appender = new ListAppender<>();
    appender.start();
    logger.addAppender(appender);
    Level previous = logger.getLevel();
    logger.setLevel(Level.DEBUG);
    try {
      HttpClientFactory client = new HttpClientFactory(Lists.list("*"));
      assertThat(appender.list)
          .anyMatch(
              event ->
                  event.getLevel() == Level.WARN
                      && event.getFormattedMessage().contains("sitmun.client.unsafe-allowed-hosts")
                      && event.getFormattedMessage().contains("*"));
      appender.list.clear();
      try (Response response =
          client.executeRequest(new Request.Builder().url(tls.url()).build())) {
        assertTrue(response.isSuccessful());
      }
      assertThat(appender.list)
          .noneMatch(
              event ->
                  event.getLevel() == Level.WARN
                      && event.getFormattedMessage().contains("Using Unsafe Client"));
    } finally {
      logger.detachAppender(appender);
      logger.setLevel(previous);
    }
  }

  private static void assertCompletes(List<String> unsafeAllowedHosts) {
    HttpClientFactory client = new HttpClientFactory(unsafeAllowedHosts);
    Request request = new Request.Builder().url(tls.url()).header("Accept", "*/*").build();

    try (Response response = client.executeRequest(request)) {
      assertTrue(response.isSuccessful());
    } catch (IOException e) {
      fail(e);
    }
  }
}
