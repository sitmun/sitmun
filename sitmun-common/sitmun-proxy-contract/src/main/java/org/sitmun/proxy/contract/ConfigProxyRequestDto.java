package org.sitmun.proxy.contract;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ConfigProxyRequestDto(
    int appId,
    int terId,
    String type,
    int typeId,
    String method,
    Map<String, String> parameters,
    String requestBody) {}
