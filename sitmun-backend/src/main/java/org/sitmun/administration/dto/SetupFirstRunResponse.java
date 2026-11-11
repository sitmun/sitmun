package org.sitmun.administration.dto;

/** Result of a first-run save. {@code passwordChanged} means every existing session is invalid. */
public record SetupFirstRunResponse(boolean firstRun, boolean passwordChanged) {}
