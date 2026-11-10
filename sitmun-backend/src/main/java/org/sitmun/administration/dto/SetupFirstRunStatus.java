package org.sitmun.administration.dto;

/** Open first-run. Closed setup answers 404 and does not use this body. */
public record SetupFirstRunStatus(boolean firstRun, String currentDefault) {}
