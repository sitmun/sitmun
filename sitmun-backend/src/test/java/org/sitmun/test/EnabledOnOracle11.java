package org.sitmun.test;

import java.lang.annotation.ElementType;
import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Inherited
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
@EnabledOnDatabase(product = DatabaseProduct.ORACLE, atLeast = 11, before = 12)
public @interface EnabledOnOracle11 {}
