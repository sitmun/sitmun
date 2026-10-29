package org.sitmun.test;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.platform.engine.discovery.DiscoverySelectors;
import org.junit.platform.launcher.Launcher;
import org.junit.platform.launcher.LauncherDiscoveryRequest;
import org.junit.platform.launcher.core.LauncherDiscoveryRequestBuilder;
import org.junit.platform.launcher.core.LauncherFactory;
import org.junit.platform.launcher.listeners.SummaryGeneratingListener;
import org.junit.platform.launcher.listeners.TestExecutionSummary;

class EnabledOnDatabaseTest {

  @EnabledOnDatabase(product = DatabaseProduct.ORACLE, before = 19)
  private static class OracleBefore19 {}

  @Test
  void h2RunsNeitherRangeNorFullTest() {
    withoutDatabase(
        () -> {
          assertThat(enabled(EnabledOnOracleSince11.class)).isFalse();
          assertThat(EnabledOnFullTestCondition.evaluate().isDisabled()).isTrue();
        });
  }

  @Test
  void oracle11RunsSince11AndExact11() {
    withDatabase(
        "oracle",
        "11",
        () -> {
          assertThat(enabled(EnabledOnOracleSince11.class)).isTrue();
          assertThat(enabled(EnabledOnOracle11.class)).isTrue();
          assertThat(enabled(EnabledOnOracle19.class)).isFalse();
          assertThat(enabled(EnabledOnOracle.class)).isTrue();
          assertThat(enabled(OracleBefore19.class)).isTrue();
          assertThat(enabled(EnabledOnPostgres.class)).isFalse();
          assertThat(EnabledOnFullTestCondition.evaluate().isDisabled()).isFalse();
        });
  }

  @Test
  void oracle19RunsSince11AndNot11() {
    withDatabase(
        "oracle",
        "19",
        () -> {
          assertThat(enabled(EnabledOnOracleSince11.class)).isTrue();
          assertThat(enabled(EnabledOnOracle11.class)).isFalse();
          assertThat(enabled(EnabledOnOracle19.class)).isTrue();
          assertThat(enabled(OracleBefore19.class)).isFalse();
        });
  }

  @Test
  void postgres16RunsPostgres16Only() {
    withDatabase(
        "postgres",
        "16",
        () -> {
          assertThat(enabled(EnabledOnPostgres.class)).isTrue();
          assertThat(enabled(EnabledOnPostgres16.class)).isTrue();
          assertThat(enabled(EnabledOnPostgres12.class)).isFalse();
          assertThat(enabled(EnabledOnOracleSince11.class)).isFalse();
        });
  }

  @Test
  void postgres12RunsPostgres12Only() {
    withDatabase(
        "postgres",
        "12",
        () -> {
          assertThat(enabled(EnabledOnPostgres12.class)).isTrue();
          assertThat(enabled(EnabledOnPostgres16.class)).isFalse();
        });
  }

  @Test
  void aBoundWithoutAVersionStaysOff() {
    withDatabase("oracle", null, () -> assertThat(enabled(EnabledOnOracleSince11.class)).isFalse());
  }

  @Test
  void junitSkipsTheComposedAnnotationUnlessThatDatabaseIsRunning() {
    withoutDatabase(
        () -> {
          TestExecutionSummary summary = execute(Oracle11Fixture.class);
          assertThat(summary.getTestsFoundCount()).isEqualTo(1);
          assertThat(summary.getTestsSucceededCount()).isZero();
        });
    withDatabase(
        "oracle",
        "11",
        () -> assertThat(execute(Oracle11Fixture.class).getTestsSucceededCount()).isEqualTo(1));
    withDatabase(
        "oracle",
        "19",
        () -> assertThat(execute(Oracle11Fixture.class).getTestsSucceededCount()).isZero());
  }

  @EnabledOnOracle11
  static class Oracle11Fixture {
    @Test
    void runs() {}
  }

  private static boolean enabled(Class<?> type) {
    return !EnabledOnDatabaseCondition.evaluate(type).isDisabled();
  }

  private static TestExecutionSummary execute(Class<?> type) {
    SummaryGeneratingListener listener = new SummaryGeneratingListener();
    Launcher launcher = LauncherFactory.create();
    LauncherDiscoveryRequest request =
        LauncherDiscoveryRequestBuilder.request()
            .selectors(DiscoverySelectors.selectClass(type))
            .build();
    launcher.execute(request, listener);
    return listener.getSummary();
  }

  private static void withDatabase(String product, String version, Runnable check) {
    String enabled = System.getProperty(DatabaseTestProperties.ENABLED);
    String previousProduct = System.getProperty(DatabaseTestProperties.PRODUCT);
    String previousVersion = System.getProperty(DatabaseTestProperties.VERSION);
    System.setProperty(DatabaseTestProperties.ENABLED, "true");
    System.setProperty(DatabaseTestProperties.PRODUCT, product);
    if (version == null) {
      System.clearProperty(DatabaseTestProperties.VERSION);
    } else {
      System.setProperty(DatabaseTestProperties.VERSION, version);
    }
    try {
      check.run();
    } finally {
      restore(DatabaseTestProperties.ENABLED, enabled);
      restore(DatabaseTestProperties.PRODUCT, previousProduct);
      restore(DatabaseTestProperties.VERSION, previousVersion);
    }
  }

  private static void withoutDatabase(Runnable check) {
    String enabled = System.getProperty(DatabaseTestProperties.ENABLED);
    String product = System.getProperty(DatabaseTestProperties.PRODUCT);
    String version = System.getProperty(DatabaseTestProperties.VERSION);
    System.clearProperty(DatabaseTestProperties.ENABLED);
    System.clearProperty(DatabaseTestProperties.PRODUCT);
    System.clearProperty(DatabaseTestProperties.VERSION);
    try {
      check.run();
    } finally {
      restore(DatabaseTestProperties.ENABLED, enabled);
      restore(DatabaseTestProperties.PRODUCT, product);
      restore(DatabaseTestProperties.VERSION, version);
    }
  }

  private static void restore(String key, String value) {
    if (value == null) {
      System.clearProperty(key);
    } else {
      System.setProperty(key, value);
    }
  }
}
