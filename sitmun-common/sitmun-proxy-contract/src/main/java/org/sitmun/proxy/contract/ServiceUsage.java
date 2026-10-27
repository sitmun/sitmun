package org.sitmun.proxy.contract;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Instant;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ServiceUsage(
    long serviceId,
    long applicationId,
    Instant hourStart,
    String operation,
    long requests,
    long failed) {}
