package org.sitmun.test;

import java.lang.annotation.ElementType;
import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.junit.jupiter.api.extension.ExtendWith;

/**
 * Runs this test on every production-database task. The H2 dev tasks leave {@code
 * sitmun.test.database.enabled} unset, so the test stays off.
 */
@Inherited
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
@ExtendWith(EnabledOnFullTestCondition.class)
public @interface EnabledOnFullTest {}
