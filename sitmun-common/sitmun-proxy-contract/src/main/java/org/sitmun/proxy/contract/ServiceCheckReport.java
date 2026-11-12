package org.sitmun.proxy.contract;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import org.sitmun.upstream.signal.ExchangeSignals;
import org.sitmun.upstream.signal.RequestContext;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ServiceCheckReport(
    long serviceId,
    @NotNull RequestContext requestContext,
    @NotNull ExchangeSignals exchangeSignals,
    long elapsedMs,
    Instant observedAt) {}
