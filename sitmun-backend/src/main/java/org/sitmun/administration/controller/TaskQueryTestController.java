package org.sitmun.administration.controller;

import lombok.RequiredArgsConstructor;
import org.sitmun.administration.controller.dto.QueryTestRequest;
import org.sitmun.administration.controller.dto.QueryTestResult;
import org.sitmun.administration.service.database.TaskQueryTestService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasks/query")
@RequiredArgsConstructor
public class TaskQueryTestController {

  private final TaskQueryTestService taskQueryTestService;

  @PostMapping("/test")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<QueryTestResult> test(@RequestBody QueryTestRequest request) {
    return ResponseEntity.ok(taskQueryTestService.test(request));
  }
}
