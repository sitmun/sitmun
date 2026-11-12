package org.sitmun.test;

import org.junit.jupiter.api.extension.ConditionEvaluationResult;
import org.junit.jupiter.api.extension.ExecutionCondition;
import org.junit.jupiter.api.extension.ExtensionContext;

public class EnabledOnFullTestCondition implements ExecutionCondition {

  @Override
  public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
    return evaluate();
  }

  static ConditionEvaluationResult evaluate() {
    if (DatabaseTestProperties.enabled()) {
      return ConditionEvaluationResult.enabled("production database run");
    }
    return ConditionEvaluationResult.disabled("sitmun.test.database.enabled is not true");
  }
}
