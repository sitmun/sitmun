package org.sitmun.proxy.contract;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record OgcWmsPayload(
    List<String> vary,
    String uri,
    String method,
    Map<String, String> parameters,
    HttpSecurityDto security,
    String body)
    implements Payload {}
