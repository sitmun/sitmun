package org.sitmun.administration.controller;

import org.sitmun.administration.dto.SetupFirstRunRequest;
import org.sitmun.administration.dto.SetupFirstRunResponse;
import org.sitmun.administration.service.FirstRunStartupGate;
import org.sitmun.administration.service.SetupConflictException;
import org.sitmun.administration.service.SetupService;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * First-run setup. {@code GET /status} always answers. {@code POST /first-run} is open only while
 * the built-in admin password is null or blank, and accepts anonymous callers only. Once that
 * password exists, {@code POST} returns 404.
 */
@RestController
@RequestMapping("/api/setup")
public class SetupController {

  private final SetupService setupService;
  private final FirstRunStartupGate gate;

  public SetupController(SetupService setupService, FirstRunStartupGate gate) {
    this.setupService = setupService;
    this.gate = gate;
  }

  @GetMapping("/status")
  public ResponseEntity<?> status() {
    if (!gate.isReady()) {
      return configuring();
    }
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(setupService.statusSnapshot());
  }

  @PostMapping("/first-run")
  public ResponseEntity<?> save(@RequestBody SetupFirstRunRequest request) {
    if (!gate.isReady()) {
      return configuring();
    }
    try {
      SetupFirstRunResponse response = setupService.apply(request);
      return ResponseEntity.ok(response);
    } catch (SetupConflictException exception) {
      return ResponseEntity.status(HttpStatus.CONFLICT)
          .body(new SetupConflictBody(exception.getMessage(), exception.preview()));
    }
  }

  private static ResponseEntity<SetupConfiguringResponse> configuring() {
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
        .header(HttpHeaders.RETRY_AFTER, "2")
        .body(new SetupConfiguringResponse("configuring"));
  }

  public record SetupConfiguringResponse(String status) {}

  public record SetupConflictBody(
      String message, org.sitmun.administration.dto.DefaultLanguageChangePreview preview) {}
}
