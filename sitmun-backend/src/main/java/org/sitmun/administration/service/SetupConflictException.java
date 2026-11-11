package org.sitmun.administration.service;

import org.sitmun.administration.dto.DefaultLanguageChangePreview;

/**
 * The language change was refused because translations are missing and continuation was not set.
 */
public class SetupConflictException extends RuntimeException {

  private final DefaultLanguageChangePreview preview;

  public SetupConflictException(DefaultLanguageChangePreview preview) {
    super("Cannot change default language: missing translations");
    this.preview = preview;
  }

  public DefaultLanguageChangePreview preview() {
    return preview;
  }
}
