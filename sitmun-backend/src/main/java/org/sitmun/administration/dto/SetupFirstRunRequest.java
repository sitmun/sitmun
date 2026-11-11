package org.sitmun.administration.dto;

/**
 * First-run setup. The password is required and always belongs to the built-in admin user. A blank
 * language leaves {@code language.default} unchanged.
 *
 * @param language database language to save, or null to leave {@code language.default} unchanged
 * @param continueOnMissingTranslations required when the preview reports missing translations
 * @param password new built-in admin password
 */
public record SetupFirstRunRequest(
    String language, Boolean continueOnMissingTranslations, String password) {}
