package org.sitmun.proxy.contract;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
  @JsonSubTypes.Type(value = OgcWmsPayload.class, name = "OgcWmsPayload"),
  @JsonSubTypes.Type(value = DatasourcePayload.class, name = "DatasourcePayload")
})
public sealed interface Payload permits OgcWmsPayload, DatasourcePayload {

  List<String> vary();
}
