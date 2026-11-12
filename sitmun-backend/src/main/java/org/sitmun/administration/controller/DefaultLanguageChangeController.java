package org.sitmun.administration.controller;

import lombok.extern.slf4j.Slf4j;
import org.sitmun.administration.dto.DefaultLanguageChangePreview;
import org.sitmun.administration.dto.DefaultLanguageChangeRequest;
import org.sitmun.administration.dto.DefaultLanguageChangeResult;
import org.sitmun.administration.service.DefaultLanguageChangeService;
import org.sitmun.administration.service.FirstRunStartupGate;
import org.sitmun.administration.service.SetupService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for managing database default language changes.
 *
 * <p>Provides endpoints for previewing and applying lossless language migrations. Admin-only access
 * through existing /api/** security rules.
 */
@RestController
@RequestMapping("/api/language-default")
@Slf4j
public class DefaultLanguageChangeController {

  private final DefaultLanguageChangeService service;
  private final SetupService setupService;
  private final FirstRunStartupGate gate;

  public DefaultLanguageChangeController(
      DefaultLanguageChangeService service, SetupService setupService, FirstRunStartupGate gate) {
    this.service = service;
    this.setupService = setupService;
    this.gate = gate;
  }

  /**
   * Preview a default language change without modifying data.
   *
   * @param request Preview request with from/to language tags
   * @return Preview with affected counts and missing translations
   */
  @PostMapping("/change-preview")
  public ResponseEntity<?> preview(@RequestBody PreviewRequest request) {
    if (!gate.isReady()) {
      return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
          .header(HttpHeaders.RETRY_AFTER, "2")
          .body(new SetupController.SetupConfiguringResponse("configuring"));
    }
    if (!mayPreview()) {
      return ResponseEntity.notFound().build();
    }
    try {
      DefaultLanguageChangePreview preview = service.preview(request.from(), request.to());
      return ResponseEntity.ok(preview);
    } catch (IllegalArgumentException e) {
      log.warn("Preview validation failed: {}", e.getMessage());
      return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
    } catch (Exception e) {
      log.error("Preview failed unexpectedly", e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .body(new ErrorResponse("Preview failed: " + e.getMessage()));
    }
  }

  /**
   * Apply a default language change with lossless translation migration.
   *
   * @param request Change request with from/to languages and continuation flag
   * @return Result with backup, restore, and preserve counts
   */
  @PostMapping("/change")
  public ResponseEntity<?> apply(@RequestBody DefaultLanguageChangeRequest request) {
    try {
      DefaultLanguageChangeResult result = service.apply(request);
      log.info(
          "Successfully changed default language from {} to {}: backup={}, restored={}, preserved={}",
          result.previousDefault(),
          result.currentDefault(),
          result.backupUpserts(),
          result.restoredValues(),
          result.preservedValues());
      return ResponseEntity.ok(result);
    } catch (IllegalStateException e) {
      log.warn("Change blocked by missing translations: {}", e.getMessage());
      return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse(e.getMessage()));
    } catch (IllegalArgumentException e) {
      log.warn("Change validation failed: {}", e.getMessage());
      return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
    } catch (Exception e) {
      log.error("Change failed unexpectedly", e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .body(new ErrorResponse("Change failed: " + e.getMessage()));
    }
  }

  /** Administrators can always preview. Anonymous callers can preview only during first-run. */
  private boolean mayPreview() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    boolean admin =
        authentication != null
            && authentication.getAuthorities().stream()
                .anyMatch(granted -> "ROLE_ADMIN".equals(granted.getAuthority()));
    if (admin) {
      return true;
    }
    boolean anonymous =
        authentication == null
            || !authentication.isAuthenticated()
            || authentication instanceof AnonymousAuthenticationToken;
    return anonymous && setupService.isFirstRun();
  }

  /** Preview request DTO for simpler endpoint binding. */
  record PreviewRequest(String from, String to) {}

  /** Error response DTO for consistent error formatting. */
  record ErrorResponse(String message) {}
}
