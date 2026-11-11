package org.sitmun.administration.service.access;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.sitmun.upstream.http.UpstreamHttpClient;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class ServiceCheckConfigurationTest {

  private final ApplicationContextRunner contextRunner =
      new ApplicationContextRunner()
          .withUserConfiguration(ServiceCheckConfiguration.class)
          .withPropertyValues(
              "sitmun.service-check.enabled=true",
              "sitmun.service-check.interval=15m",
              "sitmun.service-check.dispatch-interval=1s",
              "sitmun.service-check.max-in-flight=4",
              "sitmun.service-check.max-per-host=1",
              "sitmun.service-check.timeout=10s",
              "sitmun.service-check.connect-timeout=10s",
              "sitmun.service-check.read-timeout=10s",
              "sitmun.service-check.sample-retention=24h",
              "sitmun.service-check.usage-retention=400d",
              "sitmun.service-check.retention-interval=1h",
              "sitmun.service-check.overdue-warn-factor=2",
              "sitmun.service-check.viewer-flush-interval=1m",
              "sitmun.service-check.detail-max-length=500",
              "sitmun.service-check.exception-text-max-length=200",
              "sitmun.service-check.scan-max-bytes=65536");

  @Test
  void defaultClientChecksCertificates() {
    contextRunner.run(
        context -> {
          UpstreamHttpClient client = context.getBean(UpstreamHttpClient.class);
          assertThat(client.clientFor("upstream.example")).isSameAs(client.safeClient());
        });
  }
}
