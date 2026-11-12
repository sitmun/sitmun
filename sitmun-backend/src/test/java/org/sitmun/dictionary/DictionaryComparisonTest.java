package org.sitmun.dictionary;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class DictionaryComparisonTest {

  @Test
  void columnLengthTenAgainstDictionaryTwentyIsADrift() {
    var rows = DictionaryComparison.length("STM_APP.APP_NAME", "fixture", 20, 10);
    assertEquals(1, rows.size());
    assertTrue(rows.get(0).startsWith("length|STM_APP.APP_NAME|fixture|20|10"));
  }

  @Test
  void equalLengthsAreQuiet() {
    assertTrue(DictionaryComparison.length("STM_APP.APP_NAME", "fixture", 20, 20).isEmpty());
  }
}
