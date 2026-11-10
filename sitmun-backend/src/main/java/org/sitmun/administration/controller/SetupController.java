package org.sitmun.administration.controller;

import org.sitmun.administration.dto.SetupFirstRunRequest;
import org.sitmun.administration.dto.SetupFirstRunResponse;
import org.sitmun.administration.dto.SetupFirstRunStatus;
import org.sitmun.administration.service.SetupConflictException;
import org.sitmun.administration.service.SetupService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * First-run setup. Open only while the built-in admin password is null or blank. Both methods
 * return 404 once that password exists. {@code POST} accepts anonymous callers only.
 */
@RestController
@RequestMapping("/api/setup/first-run")
public class SetupController {

  private final SetupService setupService;

  public SetupController(SetupService setupService) {
    this.setupService = setupService;
  }

  @GetMapping
  public SetupFirstRunStatus status() {
    return setupService.status();
  }

  @PostMapping
  public ResponseEntity<?> save(@RequestBody SetupFirstRunRequest request) {
    try {
      SetupFirstRunResponse response = setupService.apply(request);
      return ResponseEntity.ok(response);
    } catch (SetupConflictException exception) {
      return ResponseEntity.status(HttpStatus.CONFLICT)
          .body(new SetupConflictBody(exception.getMessage(), exception.preview()));
    }
  }

  public record SetupConflictBody(
      String message, org.sitmun.administration.dto.DefaultLanguageChangePreview preview) {}
}
