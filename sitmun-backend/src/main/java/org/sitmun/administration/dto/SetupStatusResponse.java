package org.sitmun.administration.dto;

import java.util.List;

/** Public setup snapshot. Closed setup is {@code firstRun: false}, not a 404. */
public record SetupStatusResponse(
    boolean firstRun, String defaultLanguage, List<SetupStatusLanguage> languages) {}
