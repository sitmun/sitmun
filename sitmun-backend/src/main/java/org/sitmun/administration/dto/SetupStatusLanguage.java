package org.sitmun.administration.dto;

/** Enabled language as the admin needs it before login. */
public record SetupStatusLanguage(Integer id, String shortname, String name, Integer order) {}
