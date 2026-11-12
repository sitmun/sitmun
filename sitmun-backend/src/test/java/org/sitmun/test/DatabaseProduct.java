package org.sitmun.test;

/** A database that can be used in production. H2 is not one of these. */
public enum DatabaseProduct {
  ORACLE("oracle"),
  POSTGRES("postgres");

  private final String propertyValue;

  DatabaseProduct(String propertyValue) {
    this.propertyValue = propertyValue;
  }

  public String propertyValue() {
    return propertyValue;
  }
}
