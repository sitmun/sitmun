package org.sitmun.domain.cartography;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/** Rejects a static legend whose address is null, blank, or whitespace. */
public class StaticLegendUrlValidator
    implements ConstraintValidator<ValidStaticLegendUrl, Cartography> {

  static final String LEGEND_TYPE_LINK = "LINK";

  @Override
  public boolean isValid(Cartography cartography, ConstraintValidatorContext context) {
    if (cartography == null || !LEGEND_TYPE_LINK.equals(cartography.getLegendType())) {
      return true;
    }
    String url = cartography.getLegendURL();
    if (url != null && !url.isBlank()) {
      return true;
    }
    context.disableDefaultConstraintViolation();
    context
        .buildConstraintViolationWithTemplate(context.getDefaultConstraintMessageTemplate())
        .addPropertyNode("legendURL")
        .addConstraintViolation();
    return false;
  }
}
