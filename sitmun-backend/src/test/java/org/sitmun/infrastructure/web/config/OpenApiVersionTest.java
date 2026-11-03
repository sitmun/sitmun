package org.sitmun.infrastructure.web.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("OpenAPI documented version")
class OpenApiVersionTest {

  @Autowired private MockMvc mvc;

  @Test
  @DisplayName("GET /v3/api-docs info.version is the platform version")
  void documentedVersionMatchesPlatformVersion() throws Exception {
    String platformVersion = System.getProperty("sitmun.platform.version");
    assertThat(platformVersion).isNotBlank();

    mvc.perform(get("/v3/api-docs"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.info.version").value(platformVersion));
  }
}
