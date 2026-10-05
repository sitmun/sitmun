package org.sitmun.upstream;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.sitmun.upstream.signal.ServiceCheckClassifier;
import org.sitmun.upstream.signal.SignalCapture;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class UpstreamSignalAutoConfigurationTest {

  private final ApplicationContextRunner runner =
      new ApplicationContextRunner()
          .withConfiguration(AutoConfigurations.of(UpstreamSignalAutoConfiguration.class));

  @Test
  void importsFileRegistersTheAutoConfiguration() throws Exception {
    String imports;
    try (var in =
        UpstreamSignalAutoConfiguration.class.getResourceAsStream(
            "/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports")) {
      imports = new String(in.readAllBytes(), StandardCharsets.UTF_8);
    }

    assertThat(imports).contains("org.sitmun.upstream.UpstreamSignalAutoConfiguration");
    runner.run(
        context -> {
          assertThat(context).hasSingleBean(ServiceCheckClassifier.class);
          assertThat(context).getBeans(SignalCapture.class).hasSize(11);
        });
  }
}
