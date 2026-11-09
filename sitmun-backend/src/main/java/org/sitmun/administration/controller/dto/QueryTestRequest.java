package org.sitmun.administration.controller.dto;

import java.util.Map;
import lombok.Data;

/** Runs a saved SQL query task. The command, parameters, and connection come from the task. */
@Data
public class QueryTestRequest {
  private Integer taskId;
  private Map<String, String> clientValues;
  private Map<String, String> systemValues;
  private Integer limit;
  private Integer offset;
}
