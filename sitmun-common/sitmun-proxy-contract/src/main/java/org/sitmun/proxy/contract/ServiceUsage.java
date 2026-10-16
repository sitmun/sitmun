package org.sitmun.proxy.contract;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ServiceUsage(
    @NotNull Long serviceId,
    @NotNull Long applicationId,
    @NotNull Instant hourStart,
    String operation,
    long requests,
    long failed) {}
