package org.sitmun.proxy.contract;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public final class ServiceUsageReport {

  private final List<ServiceUsage> usages;

  @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
  public ServiceUsageReport(List<ServiceUsage> usages) {
    this.usages = usages == null ? List.of() : List.copyOf(usages);
  }

  @JsonValue
  public List<ServiceUsage> usages() {
    return usages;
  }
}
