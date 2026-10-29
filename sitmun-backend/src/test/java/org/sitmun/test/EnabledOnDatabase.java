package org.sitmun.test;

import java.lang.annotation.ElementType;
import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.junit.jupiter.api.extension.ExtendWith;

/**
 * Runs this test only when the Gradle task is a production database whose {@code product} matches
 * and whose {@code version} is inside the range.
 *
 * <p>{@code atLeast} and {@code before} are optional. Leave a bound at {@link #UNSET} to omit it.
 * {@code atLeast} is inclusive. {@code before} is exclusive. With both unset, every version of
 * {@code product} runs. The H2 dev tasks do not set {@code sitmun.test.database.enabled}, so the
 * test stays off.
 */
@Inherited
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
@ExtendWith(EnabledOnDatabaseCondition.class)
public @interface EnabledOnDatabase {

  int UNSET = -1;

  DatabaseProduct product();

  int atLeast() default UNSET;

  int before() default UNSET;
}
