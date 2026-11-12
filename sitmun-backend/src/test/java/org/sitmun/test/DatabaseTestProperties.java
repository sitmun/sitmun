package org.sitmun.test;

/** System properties set by a production-database Gradle test task. */
final class DatabaseTestProperties {

  static final String ENABLED = "sitmun.test.database.enabled";
  static final String PRODUCT = "sitmun.test.database.product";
  static final String VERSION = "sitmun.test.database.version";

  private DatabaseTestProperties() {}

  static boolean enabled() {
    return Boolean.parseBoolean(System.getProperty(ENABLED));
  }
}
