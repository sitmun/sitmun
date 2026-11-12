package org.sitmun.authorization.proxy.sql;

import java.util.List;

/** Result of one scan of a SQL query task. */
public record SqlScan(List<Placement> placements, List<Violation> violations) {

  public enum Kind {
    CLIENT,
    SYSTEM
  }

  public enum Context {
    VALUE,
    WHOLE_LITERAL,
    IN_LIST
  }

  public record Placement(Kind kind, String name, int start, int end, Context context) {}

  public record Violation(String code, String name, int start, int end) {}
}
