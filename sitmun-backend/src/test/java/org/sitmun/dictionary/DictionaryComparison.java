package org.sitmun.dictionary;

import java.util.ArrayList;
import java.util.List;

/** Drift rows shared with the Python and TypeScript checkers. */
final class DictionaryComparison {

  private DictionaryComparison() {}

  static List<String> length(String key, String consumer, Integer expected, Integer observed) {
    List<String> rows = new ArrayList<>();
    if (expected != null && observed != null && !expected.equals(observed)) {
      rows.add(line("length", key, consumer, expected, observed));
    }
    return rows;
  }

  static String line(String kind, String key, String consumer, Object expected, Object observed) {
    return kind + "|" + key + "|" + consumer + "|" + text(expected) + "|" + text(observed);
  }

  private static String text(Object value) {
    return value == null ? "" : String.valueOf(value);
  }
}
