package org.sitmun.proxy.contract;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Instant;
import org.sitmun.upstream.signal.ExchangeSignals;
import org.sitmun.upstream.signal.RequestContext;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ServiceCheckReport(
    long serviceId,
    RequestContext requestContext,
    ExchangeSignals exchangeSignals,
    long elapsedMs,
    Instant observedAt) {}
