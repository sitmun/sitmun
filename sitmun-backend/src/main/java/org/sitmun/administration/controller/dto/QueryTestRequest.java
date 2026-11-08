package org.sitmun.administration.controller.dto;

import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class QueryTestRequest {
  private Integer connectionId;
  private String sql;
  private List<Map<String, Object>> parameters;
  private Map<String, String> clientValues;
  private Map<String, String> systemValues;
  private Integer limit;
  private Integer offset;
}
