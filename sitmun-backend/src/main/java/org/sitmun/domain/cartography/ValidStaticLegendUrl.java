package org.sitmun.domain.cartography;

import static java.lang.annotation.ElementType.TYPE;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

/** Requires a non-blank legend URL when the legend type is the static link. */
@Target(TYPE)
@Retention(RUNTIME)
@Constraint(validatedBy = StaticLegendUrlValidator.class)
public @interface ValidStaticLegendUrl {

  String message() default "A static legend requires an address";

  Class<?>[] groups() default {};

  Class<? extends Payload>[] payload() default {};
}
