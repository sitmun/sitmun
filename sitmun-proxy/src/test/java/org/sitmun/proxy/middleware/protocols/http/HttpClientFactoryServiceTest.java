package org.sitmun.proxy.middleware.protocols.http;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.fail;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.List;
import javax.net.ssl.SSLHandshakeException;
import javax.net.ssl.X509TrustManager;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.assertj.core.util.Lists;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

@DisplayName("HttpClientFactory tests")
class HttpClientFactoryServiceTest {

  @Test
  @DisplayName("Without unsafe-allowed-hosts the factory checks the certificate")
  void defaultChecksTheCertificate() {
    new ApplicationContextRunner()
        .withBean(HttpClientFactoryService.class)
        .run(
            context -> {
              HttpClientFactoryService client = context.getBean(HttpClientFactoryService.class);
              OkHttpClient http = client.getClient("upstream.example");
              X509TrustManager trustManager = http.x509TrustManager();
              assertThat(trustManager.getAcceptedIssuers()).isNotEmpty();
            });
  }

  @Test
  @DisplayName("Fail with SSLHandshakeException")
  void failWithSSLHandshakeException() {
    String url = "https://self-signed.badssl.com";
    List<String> unsafeAllowedHosts = Lists.list();
    HttpClient client = new HttpClientFactoryService(unsafeAllowedHosts);

    Request request = new Request.Builder().url(url).header("Accept", "*/*").build();

    assertThatThrownBy(
            () -> {
              try (Response ignored = client.executeRequest(request)) {
                fail(
                    "Expected IOException when using safe client against self-signed certificate,"
                        + " but request completed");
              }
            })
        .isInstanceOf(SSLHandshakeException.class);
  }

  @Test
  @DisplayName("Any request use the unsafe client")
  void anyRequestUseTheUnsafeClient() {
    String url = "https://self-signed.badssl.com";
    List<String> unsafeAllowedHosts = Lists.list("*");

    HttpClient client = new HttpClientFactoryService(unsafeAllowedHosts);

    Request request = new Request.Builder().url(url).header("Accept", "*/*").build();
    assertConnectsToSelfSignedHost(
        client, request, "TLS to self-signed host with wildcard allow list");
  }

  @Test
  @DisplayName("A star allow list is logged at warn")
  void starAllowListIsLoggedAtWarn() {
    Logger logger = (Logger) LoggerFactory.getLogger(HttpClientFactoryService.class);
    ListAppender<ILoggingEvent> appender = new ListAppender<>();
    appender.start();
    logger.addAppender(appender);
    Level previous = logger.getLevel();
    logger.setLevel(Level.DEBUG);
    try {
      HttpClientFactoryService client = new HttpClientFactoryService(Lists.list("*"));
      assertThat(appender.list)
          .anyMatch(
              event ->
                  event.getLevel() == Level.WARN
                      && event.getFormattedMessage().contains("sitmun.client.unsafe-allowed-hosts")
                      && event.getFormattedMessage().contains("*"));
      appender.list.clear();
      client.getClient("upstream.example");
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

  @Test
  @DisplayName("A mixed-case host still uses the unsafe client")
  void mixedCaseHostUsesTheUnsafeClient() {
    HttpClientFactoryService client = new HttpClientFactoryService(Lists.list("UpStream.Example"));
    OkHttpClient http = client.getClient("upstream.example");
    assertThat(http.x509TrustManager().getAcceptedIssuers()).isEmpty();
  }

  @Test
  @DisplayName("Use unsafe client when domain matches")
  void useUnsafeClientWhenDomainMatches() {
    String url = "https://self-signed.badssl.com";
    List<String> unsafeAllowedHosts = Lists.list("self-signed.badssl.com");

    HttpClient client = new HttpClientFactoryService(unsafeAllowedHosts);

    Request request = new Request.Builder().url(url).header("Accept", "*/*").build();
    assertConnectsToSelfSignedHost(
        client, request, "TLS to self-signed host with explicit host allow list");
  }

  private static void assertConnectsToSelfSignedHost(
      HttpClient client, Request request, String context) {
    assertThatCode(
            () -> {
              try (Response response = client.executeRequest(request)) {
                assertThat(response.isSuccessful()).as(context).isTrue();
              }
            })
        .as(context)
        .doesNotThrowAnyException();
  }
}
