package org.sitmun.administration.controller.dto;

import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class QueryTestRun {
  private String label;
  private String sql;
  private List<Object> values;
  private boolean ok;
  private List<Map<String, Object>> rows;
  private boolean truncated;
  private String error;
}
