package org.sitmun.infrastructure.startup;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.sitmun.administration.dto.DefaultLanguageChangePreview;
import org.sitmun.administration.dto.SetupFirstRunRequest;
import org.sitmun.administration.service.FirstRunStartupGate;
import org.sitmun.administration.service.SetupConflictException;
import org.sitmun.administration.service.SetupService;
import org.sitmun.infrastructure.persistence.type.i18n.Language;
import org.sitmun.infrastructure.persistence.type.i18n.LanguageRepository;
import org.sitmun.test.LogTestUtils;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class FirstRunStartupApplierTest {

  @Mock private SetupService setupService;
  @Mock private LanguageRepository languageRepository;

  private FirstRunStartupProperties properties;
  private FirstRunStartupGate gate;
  private FirstRunStartupApplier applier;
  private final LogTestUtils logs =
      new LogTestUtils("org.sitmun.infrastructure.startup.FirstRunStartupApplier");

  @BeforeEach
  void setUp() {
    properties = new FirstRunStartupProperties();
    gate = new FirstRunStartupGate();
    applier = new FirstRunStartupApplier(setupService, properties, languageRepository, gate);
    logs.startCapturing();
  }

  @org.junit.jupiter.api.AfterEach
  void stopLogs() {
    logs.stopCapturing();
  }

  @Test
  void variablesBecomeTheWizardRequest() {
    properties.setAdminPassword("new-admin-pass");
    properties.setLanguage("es");
    when(setupService.isFirstRun()).thenReturn(true);
    when(languageRepository.findByShortname("es"))
        .thenReturn(
            Optional.of(
                Language.builder().shortname("es").name("Castellano").enabled(true).build()));

    applier.run(new DefaultApplicationArguments());

    verify(setupService).apply(new SetupFirstRunRequest("es", "new-admin-pass"));
    assertThat(gate.isReady()).isTrue();
    assertThat(logs.getLogMessagesContaining("new-admin-pass")).isEmpty();
  }

  @Test
  void unknownOrDisabledLanguageDropsTheLanguageAndKeepsThePassword() {
    properties.setAdminPassword("new-admin-pass");
    properties.setLanguage("zz");
    when(setupService.isFirstRun()).thenReturn(true);
    when(languageRepository.findByShortname("zz")).thenReturn(Optional.empty());

    applier.run(new DefaultApplicationArguments());

    verify(setupService).apply(new SetupFirstRunRequest(null, "new-admin-pass"));
    assertThat(logs.getLogMessagesContaining("zz")).isNotEmpty();
    assertThat(logs.getLogMessagesContaining("new-admin-pass")).isEmpty();
    assertThat(gate.isReady()).isTrue();

    gate.close();
    properties.setLanguage("fr");
    when(languageRepository.findByShortname("fr"))
        .thenReturn(
            Optional.of(
                Language.builder().shortname("fr").name("Français").enabled(false).build()));
    applier.run(new DefaultApplicationArguments());
    verify(setupService, org.mockito.Mockito.times(2))
        .apply(new SetupFirstRunRequest(null, "new-admin-pass"));
  }

  @Test
  void closedSetupAndMissingVariablesDoNothing() {
    properties.setAdminPassword("new-admin-pass");
    properties.setLanguage("es");
    when(setupService.isFirstRun()).thenReturn(false);

    applier.run(new DefaultApplicationArguments());

    verify(setupService, never()).apply(any());
    assertThat(gate.isReady()).isTrue();

    gate.close();
    properties.setAdminPassword(null);
    properties.setLanguage(null);
    when(setupService.isFirstRun()).thenReturn(true);
    applier.run(new DefaultApplicationArguments());
    verify(setupService, never()).apply(any());
    assertThat(gate.isReady()).isTrue();
  }

  @Test
  void rejectedSetupIsLoggedWithoutThePasswordAndTheGateOpens() {
    properties.setAdminPassword("new-admin-pass");
    when(setupService.isFirstRun()).thenReturn(true);
    doThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a password"))
        .when(setupService)
        .apply(any());

    assertThatCode(() -> applier.run(new DefaultApplicationArguments())).doesNotThrowAnyException();
    assertThat(logs.getLogMessagesContaining("new-admin-pass")).isEmpty();
    assertThat(gate.isReady()).isTrue();

    gate.close();
    doThrow(
            new SetupConflictException(
                new DefaultLanguageChangePreview("en", "ca", 1, 1, 0, 1, List.of(), 0)))
        .when(setupService)
        .apply(any());
    assertThatCode(() -> applier.run(new DefaultApplicationArguments())).doesNotThrowAnyException();
    assertThat(gate.isReady()).isTrue();
  }

  @Test
  void unexpectedFailureStillOpensTheGate() {
    properties.setAdminPassword("new-admin-pass");
    when(setupService.isFirstRun()).thenThrow(new RuntimeException("db down"));

    assertThatCode(() -> applier.run(new DefaultApplicationArguments())).doesNotThrowAnyException();

    verify(setupService, never()).apply(any());
    assertThat(gate.isReady()).isTrue();
    assertThat(logs.getLogMessagesContaining("new-admin-pass")).isEmpty();
  }
}
