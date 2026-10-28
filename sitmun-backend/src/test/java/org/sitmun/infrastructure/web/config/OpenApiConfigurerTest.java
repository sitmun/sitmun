package org.sitmun.infrastructure.web.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Properties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.info.BuildProperties;

@DisplayName("OpenAPI version")
class OpenApiConfigurerTest {

  @Test
  @DisplayName("copies the build info version into the OpenAPI document")
  void copiesBuildInfoVersion() {
    Properties entries = new Properties();
    entries.setProperty("version", "1.2.9");
    OpenApiConfigurer configurer =
        new OpenApiConfigurer("SITMUN 3 Backend Core", new BuildProperties(entries));

    assertThat(configurer.customOpenAPI().getInfo().getVersion()).isEqualTo("1.2.9");
  }
}
