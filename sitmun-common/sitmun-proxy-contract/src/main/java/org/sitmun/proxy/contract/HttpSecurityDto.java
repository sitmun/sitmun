package org.sitmun.proxy.contract;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record HttpSecurityDto(
    String type,
    String scheme,
    String username,
    String password,
    Map<String, String> headers,
    Map<String, String> queryParams) {}
