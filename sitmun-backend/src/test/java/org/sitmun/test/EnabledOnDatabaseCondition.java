package org.sitmun.test;

import java.lang.reflect.AnnotatedElement;
import java.util.Optional;
import org.junit.jupiter.api.extension.ConditionEvaluationResult;
import org.junit.jupiter.api.extension.ExecutionCondition;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.springframework.core.annotation.MergedAnnotation;
import org.springframework.core.annotation.MergedAnnotations;
import org.springframework.core.annotation.MergedAnnotations.SearchStrategy;

public class EnabledOnDatabaseCondition implements ExecutionCondition {

  @Override
  public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
    return context
        .getElement()
        .map(EnabledOnDatabaseCondition::evaluate)
        .orElseGet(() -> ConditionEvaluationResult.enabled("no test element"));
  }

  static ConditionEvaluationResult evaluate(AnnotatedElement element) {
    MergedAnnotations annotations = MergedAnnotations.from(element, SearchStrategy.TYPE_HIERARCHY);
    Optional<MergedAnnotation<EnabledOnDatabase>> marker =
        Optional.of(annotations.get(EnabledOnDatabase.class)).filter(MergedAnnotation::isPresent);
    if (marker.isEmpty()) {
      return ConditionEvaluationResult.enabled("no database range");
    }
    return matches(marker.get().synthesize());
  }

  static ConditionEvaluationResult matches(EnabledOnDatabase marker) {
    if (!DatabaseTestProperties.enabled()) {
      return ConditionEvaluationResult.disabled("sitmun.test.database.enabled is not true");
    }
    String product = System.getProperty(DatabaseTestProperties.PRODUCT);
    if (!marker.product().propertyValue().equals(product)) {
      return ConditionEvaluationResult.disabled("database product is " + product);
    }
    if (marker.atLeast() == EnabledOnDatabase.UNSET && marker.before() == EnabledOnDatabase.UNSET) {
      return ConditionEvaluationResult.enabled("any " + product + " version");
    }
    String versionValue = System.getProperty(DatabaseTestProperties.VERSION);
    if (versionValue == null) {
      return ConditionEvaluationResult.disabled("database version is missing");
    }
    int version;
    try {
      version = Integer.parseInt(versionValue);
    } catch (NumberFormatException ex) {
      return ConditionEvaluationResult.disabled("database version is missing");
    }
    if (marker.atLeast() != EnabledOnDatabase.UNSET && version < marker.atLeast()) {
      return ConditionEvaluationResult.disabled(
          "version " + version + " is below " + marker.atLeast());
    }
    if (marker.before() != EnabledOnDatabase.UNSET && version >= marker.before()) {
      return ConditionEvaluationResult.disabled(
          "version " + version + " is not before " + marker.before());
    }
    return ConditionEvaluationResult.enabled("version " + version);
  }
}
