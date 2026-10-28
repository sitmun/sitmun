package org.sitmun.infrastructure.web.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.info.BuildProperties;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Build info version")
class BuildInfoVersionTest {

  @Autowired private BuildProperties buildProperties;
  @Autowired private MockMvc mvc;

  @Test
  @DisplayName("GET /api/dashboard/info returns the build version")
  @WithMockUser(roles = "ADMIN")
  void infoReturnsBuildVersion() throws Exception {
    assertThat(buildProperties.getVersion()).isNotBlank();
    mvc.perform(get("/api/dashboard/info"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.build.version").value(buildProperties.getVersion()));
  }
}
