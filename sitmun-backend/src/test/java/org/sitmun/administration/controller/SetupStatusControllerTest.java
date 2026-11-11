package org.sitmun.administration.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.sitmun.administration.dto.SetupStatusLanguage;
import org.sitmun.administration.dto.SetupStatusResponse;
import org.sitmun.administration.service.FirstRunStartupGate;
import org.sitmun.administration.service.SetupService;
import org.sitmun.test.BaseTest;
import org.sitmun.test.UniqueContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@AutoConfigureMockMvc
@UniqueContext(
    "The setup service is mocked so the status payload stays independent of the database.")
class SetupStatusControllerTest extends BaseTest {

  @Autowired private MockMvc mockMvc;

  private final ObjectMapper objectMapper = new ObjectMapper();

  @MockitoBean private SetupService setupService;

  @Autowired private FirstRunStartupGate gate;

  @Test
  void anonymousAndAdminReceiveLeanLanguagesWithoutCaching() throws Exception {
    when(setupService.statusSnapshot())
        .thenReturn(
            new SetupStatusResponse(
                true, "en", List.of(new SetupStatusLanguage(1, "en", "English", 0))));

    assertLeanStatus(mockMvc.perform(get("/api/setup/status")), true);
    assertLeanStatus(
        mockMvc.perform(get("/api/setup/status").with(user("admin").roles("ADMIN"))), true);
  }

  @Test
  void configuringAnswers503UntilStartupOpensTheGate() throws Exception {
    gate.close();
    try {
      mockMvc
          .perform(get("/api/setup/status"))
          .andExpect(status().isServiceUnavailable())
          .andExpect(header().string(HttpHeaders.RETRY_AFTER, "2"))
          .andExpect(jsonPath("$.status").value("configuring"));
    } finally {
      gate.open();
    }
  }

  @Test
  void closedSetupStillReturns200() throws Exception {
    when(setupService.statusSnapshot()).thenReturn(new SetupStatusResponse(false, "es", List.of()));

    mockMvc
        .perform(get("/api/setup/status"))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
        .andExpect(jsonPath("$.firstRun").value(false))
        .andExpect(jsonPath("$.defaultLanguage").value("es"))
        .andExpect(jsonPath("$.password").doesNotExist())
        .andExpect(jsonPath("$.builtInAdmin").doesNotExist());
  }

  private void assertLeanStatus(ResultActions actions, boolean firstRun) throws Exception {
    String body =
        actions
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
            .andExpect(jsonPath("$.firstRun").value(firstRun))
            .andExpect(jsonPath("$.defaultLanguage").value("en"))
            .andExpect(jsonPath("$.password").doesNotExist())
            .andExpect(jsonPath("$.builtInAdmin").doesNotExist())
            .andExpect(jsonPath("$.languages[0].enabled").doesNotExist())
            .andExpect(jsonPath("$.languages[0].translatedName").doesNotExist())
            .andExpect(jsonPath("$.languages[0]._links").doesNotExist())
            .andReturn()
            .getResponse()
            .getContentAsString();
    JsonNode language = objectMapper.readTree(body).path("languages").path(0);
    assertThat(language.fieldNames())
        .toIterable()
        .containsExactlyInAnyOrder("id", "shortname", "name", "order");
  }
}
