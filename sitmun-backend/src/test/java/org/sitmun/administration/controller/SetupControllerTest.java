package org.sitmun.administration.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.sitmun.administration.dto.DefaultLanguageChangePreview;
import org.sitmun.administration.dto.MissingTranslationDto;
import org.sitmun.administration.dto.SetupFirstRunResponse;
import org.sitmun.administration.service.FirstRunStartupGate;
import org.sitmun.administration.service.SetupConflictException;
import org.sitmun.administration.service.SetupService;
import org.sitmun.test.BaseTest;
import org.sitmun.test.UniqueContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

@AutoConfigureMockMvc
@UniqueContext(
    "The setup service is mocked so the controller status mapping stays independent of the database.")
class SetupControllerTest extends BaseTest {

  @Autowired private MockMvc mockMvc;

  @MockitoBean private SetupService setupService;

  @Autowired private FirstRunStartupGate gate;

  @Test
  void setupAnswersConfiguringUntilStartupFinishes() throws Exception {
    gate.close();
    try {
      mockMvc
          .perform(get("/api/setup/status"))
          .andExpect(status().isServiceUnavailable())
          .andExpect(header().string(HttpHeaders.RETRY_AFTER, "2"))
          .andExpect(jsonPath("$.status").value("configuring"));
      mockMvc
          .perform(
              post("/api/setup/first-run")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"password\":\"new-admin-pass\"}"))
          .andExpect(status().isServiceUnavailable())
          .andExpect(header().string(HttpHeaders.RETRY_AFTER, "2"))
          .andExpect(jsonPath("$.status").value("configuring"));
      mockMvc
          .perform(
              post("/api/language-default/change-preview")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"from\":\"en\",\"to\":\"es\"}"))
          .andExpect(status().isServiceUnavailable())
          .andExpect(header().string(HttpHeaders.RETRY_AFTER, "2"))
          .andExpect(jsonPath("$.status").value("configuring"));
    } finally {
      gate.open();
    }
  }

  @Test
  void anonymousCallerCanSaveDuringFirstRun() throws Exception {
    when(setupService.apply(any())).thenReturn(new SetupFirstRunResponse(false, true));

    mockMvc.perform(get("/api/setup/first-run")).andExpect(status().isMethodNotAllowed());
    mockMvc
        .perform(
            post("/api/setup/first-run")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"language\":\"ca\",\"password\":\"new-admin-pass\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.passwordChanged").value(true));
  }

  @Test
  void signedInCallerCannotSaveWhileSetupIsOpen() throws Exception {
    mockMvc
        .perform(
            post("/api/setup/first-run")
                .with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"language\":\"ca\",\"password\":\"new-admin-pass\"}"))
        .andExpect(status().isForbidden());
  }

  @Test
  void closedSetupReturns404() throws Exception {
    when(setupService.apply(any()))
        .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "First-run is not available"));

    mockMvc.perform(get("/api/setup/first-run")).andExpect(status().isMethodNotAllowed());
    mockMvc
        .perform(
            post("/api/setup/first-run")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"language\":\"ca\",\"password\":\"new-admin-pass\"}"))
        .andExpect(status().isNotFound());
  }

  @Test
  void missingTranslationsReturn409WithThePreview() throws Exception {
    var preview =
        new DefaultLanguageChangePreview(
            "en",
            "ca",
            1,
            1,
            0,
            1,
            List.of(new MissingTranslationDto("Language", 1, "Language.name", "English")),
            0);
    when(setupService.apply(any())).thenThrow(new SetupConflictException(preview));

    mockMvc
        .perform(
            post("/api/setup/first-run")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"language\":\"ca\",\"continueOnMissingTranslations\":false}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.preview.missingTranslations").value(1));
  }

  @Test
  void saveReturnsTheResult() throws Exception {
    when(setupService.apply(any())).thenReturn(new SetupFirstRunResponse(false, true));

    mockMvc
        .perform(
            post("/api/setup/first-run")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"language\":\"ca\",\"password\":\"new-admin-pass\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.firstRun").value(false))
        .andExpect(jsonPath("$.passwordChanged").value(true));
  }
}
