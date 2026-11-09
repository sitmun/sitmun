package org.sitmun.administration.controller.dto;

import java.util.List;
import lombok.Data;

@Data
public class QueryTestResult {
  private List<QueryTestRun> runs;
}
