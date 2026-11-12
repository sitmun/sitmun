package org.sitmun.authorization.proxy.sql;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * One pass over SQL query text. Placeholders in comments are ignored. A placeholder that is part of
 * a name, inside a longer string, or a bare {@code {name}} is a violation and is not bound.
 */
public final class SqlPlaceholderScanner {

  public static final String NAME_PART = "NAME_PART";
  public static final String PARTIAL_LITERAL = "PARTIAL_LITERAL";
  public static final String BARE_BRACES = "BARE_BRACES";
  public static final String UNKNOWN_SYSTEM = "UNKNOWN_SYSTEM";
  public static final String UNDECLARED = "UNDECLARED";
  public static final String UNUSED = "UNUSED";
  public static final String LIST_OUTSIDE_IN = "LIST_OUTSIDE_IN";
  public static final String NOT_SELECT = "NOT_SELECT";
  public static final String WITH = "WITH";
  public static final String SEMICOLON = "SEMICOLON";
  public static final String TRAILING_COMMENT = "TRAILING_COMMENT";
  public static final String MUN_INES = "MUN_INES";

  private SqlPlaceholderScanner() {}

  public static SqlScan scan(String sql, Set<String> declaredNames, Set<String> systemNames) {
    String text = stripTrailingWhitespace(sql == null ? "" : sql);
    List<SqlScan.Placement> placements = new ArrayList<>();
    List<SqlScan.Violation> violations = new ArrayList<>();
    Set<String> used = new LinkedHashSet<>();
    boolean withReported = false;
    boolean sawWord = false;
    int i = 0;
    int n = text.length();
    boolean lineComment = false;
    boolean blockComment = false;
    while (i < n) {
      char c = text.charAt(i);
      if (lineComment) {
        if (c == '\n') {
          lineComment = false;
        }
        i++;
        continue;
      }
      if (blockComment) {
        if (c == '*' && i + 1 < n && text.charAt(i + 1) == '/') {
          blockComment = false;
          i += 2;
        } else {
          i++;
        }
        continue;
      }
      if (c == '-' && i + 1 < n && text.charAt(i + 1) == '-') {
        lineComment = true;
        i += 2;
        continue;
      }
      if (c == '/' && i + 1 < n && text.charAt(i + 1) == '*') {
        blockComment = true;
        i += 2;
        continue;
      }
      if (c == '\'') {
        i = readSingleQuote(text, i, placements, violations, used, declaredNames, systemNames);
        continue;
      }
      if (c == '"') {
        i = readDoubleQuote(text, i, violations);
        continue;
      }
      if (c == ';') {
        violations.add(new SqlScan.Violation(SEMICOLON, null, i, i + 1));
        i++;
        continue;
      }
      Placeholder placeholder = readPlaceholder(text, i);
      if (placeholder != null && placeholder.bare()) {
        violations.add(
            new SqlScan.Violation(
                BARE_BRACES, placeholder.name(), placeholder.start(), placeholder.end()));
        i = placeholder.end();
        continue;
      }
      if (placeholder != null) {
        classifyCodePlaceholder(
            text, placeholder, placements, violations, used, declaredNames, systemNames);
        i = placeholder.end();
        continue;
      }
      if (isWordStart(c)) {
        int start = i;
        i++;
        while (i < n && isWordPart(text.charAt(i))) {
          i++;
        }
        String word = text.substring(start, i);
        if (!sawWord) {
          sawWord = true;
          if (!word.equalsIgnoreCase("SELECT")) {
            violations.add(new SqlScan.Violation(NOT_SELECT, word, start, i));
          }
        }
        if (word.equalsIgnoreCase("WITH") && !withReported) {
          withReported = true;
          violations.add(new SqlScan.Violation(WITH, word, start, i));
        }
        continue;
      }
      i++;
    }
    if (lineComment || blockComment) {
      violations.add(new SqlScan.Violation(TRAILING_COMMENT, null, 0, text.length()));
    }
    for (String declared : declaredNames) {
      if (!used.contains(declared)) {
        violations.add(new SqlScan.Violation(UNUSED, declared, -1, -1));
      }
    }
    return new SqlScan(List.copyOf(placements), List.copyOf(violations));
  }

  private static int readSingleQuote(
      String text,
      int open,
      List<SqlScan.Placement> placements,
      List<SqlScan.Violation> violations,
      Set<String> used,
      Set<String> declaredNames,
      Set<String> systemNames) {
    int i = open + 1;
    int n = text.length();
    while (i < n) {
      if (text.charAt(i) == '\'' && i + 1 < n && text.charAt(i + 1) == '\'') {
        i += 2;
        continue;
      }
      if (text.charAt(i) == '\'') {
        String inner = text.substring(open + 1, i);
        Placeholder whole = wholePlaceholder(inner, open);
        if (whole != null) {
          classifyLiteral(
              whole, open, i + 1, placements, violations, used, declaredNames, systemNames);
        } else {
          scanInner(text, open + 1, i, PARTIAL_LITERAL, violations);
        }
        return i + 1;
      }
      i++;
    }
    scanInner(text, open + 1, n, PARTIAL_LITERAL, violations);
    return n;
  }

  private static int readDoubleQuote(String text, int open, List<SqlScan.Violation> violations) {
    int i = open + 1;
    int n = text.length();
    while (i < n) {
      if (text.charAt(i) == '"') {
        scanInner(text, open + 1, i, NAME_PART, violations);
        return i + 1;
      }
      i++;
    }
    scanInner(text, open + 1, n, NAME_PART, violations);
    return n;
  }

  private static void scanInner(
      String text, int from, int to, String code, List<SqlScan.Violation> violations) {
    int i = from;
    while (i < to) {
      Placeholder placeholder = readPlaceholder(text, i);
      if (placeholder != null && placeholder.end() <= to) {
        String violation = placeholder.bare() ? BARE_BRACES : code;
        violations.add(
            new SqlScan.Violation(
                violation, placeholder.name(), placeholder.start(), placeholder.end()));
        i = placeholder.end();
        continue;
      }
      i++;
    }
  }

  private static void classifyLiteral(
      Placeholder placeholder,
      int start,
      int end,
      List<SqlScan.Placement> placements,
      List<SqlScan.Violation> violations,
      Set<String> used,
      Set<String> declaredNames,
      Set<String> systemNames) {
    if (placeholder.system() && MUN_INES.equals(placeholder.name())) {
      violations.add(new SqlScan.Violation(LIST_OUTSIDE_IN, MUN_INES, start, end));
      return;
    }
    if (!acceptName(placeholder, violations, declaredNames, systemNames)) {
      return;
    }
    placements.add(
        new SqlScan.Placement(
            placeholder.system() ? SqlScan.Kind.SYSTEM : SqlScan.Kind.CLIENT,
            placeholder.name(),
            start,
            end,
            SqlScan.Context.WHOLE_LITERAL));
    if (!placeholder.system()) {
      used.add(placeholder.name());
    }
  }

  private static void classifyCodePlaceholder(
      String text,
      Placeholder placeholder,
      List<SqlScan.Placement> placements,
      List<SqlScan.Violation> violations,
      Set<String> used,
      Set<String> declaredNames,
      Set<String> systemNames) {
    if (touchesWord(text, placeholder)) {
      violations.add(
          new SqlScan.Violation(
              NAME_PART, placeholder.name(), placeholder.start(), placeholder.end()));
      return;
    }
    if (placeholder.system() && MUN_INES.equals(placeholder.name())) {
      if (!isWholeInList(text, placeholder.start(), placeholder.end())) {
        violations.add(
            new SqlScan.Violation(
                LIST_OUTSIDE_IN, MUN_INES, placeholder.start(), placeholder.end()));
        return;
      }
      if (!systemNames.contains(MUN_INES)) {
        violations.add(
            new SqlScan.Violation(
                UNKNOWN_SYSTEM, MUN_INES, placeholder.start(), placeholder.end()));
        return;
      }
      placements.add(
          new SqlScan.Placement(
              SqlScan.Kind.SYSTEM,
              MUN_INES,
              placeholder.start(),
              placeholder.end(),
              SqlScan.Context.IN_LIST));
      return;
    }
    if (!acceptName(placeholder, violations, declaredNames, systemNames)) {
      return;
    }
    placements.add(
        new SqlScan.Placement(
            placeholder.system() ? SqlScan.Kind.SYSTEM : SqlScan.Kind.CLIENT,
            placeholder.name(),
            placeholder.start(),
            placeholder.end(),
            SqlScan.Context.VALUE));
    if (!placeholder.system()) {
      used.add(placeholder.name());
    }
  }

  private static boolean acceptName(
      Placeholder placeholder,
      List<SqlScan.Violation> violations,
      Set<String> declaredNames,
      Set<String> systemNames) {
    if (placeholder.name().isEmpty()) {
      violations.add(new SqlScan.Violation(NAME_PART, "", placeholder.start(), placeholder.end()));
      return false;
    }
    if (placeholder.system()) {
      if (!systemNames.contains(placeholder.name())) {
        violations.add(
            new SqlScan.Violation(
                UNKNOWN_SYSTEM, placeholder.name(), placeholder.start(), placeholder.end()));
        return false;
      }
      return true;
    }
    if (!declaredNames.contains(placeholder.name())) {
      violations.add(
          new SqlScan.Violation(
              UNDECLARED, placeholder.name(), placeholder.start(), placeholder.end()));
      return false;
    }
    return true;
  }

  private static boolean touchesWord(String text, Placeholder placeholder) {
    int before = placeholder.start() - 1;
    int after = placeholder.end();
    boolean left = before >= 0 && isWordPart(text.charAt(before));
    boolean right = after < text.length() && isWordPart(text.charAt(after));
    return left || right;
  }

  private static boolean isWholeInList(String text, int start, int end) {
    int i = start - 1;
    while (i >= 0 && Character.isWhitespace(text.charAt(i))) {
      i--;
    }
    if (i < 0 || text.charAt(i) != '(') {
      return false;
    }
    i--;
    while (i >= 0 && Character.isWhitespace(text.charAt(i))) {
      i--;
    }
    int wordEnd = i;
    while (i >= 0 && isWordPart(text.charAt(i))) {
      i--;
    }
    if (wordEnd < 0 || !text.substring(i + 1, wordEnd + 1).equalsIgnoreCase("IN")) {
      return false;
    }
    int j = end;
    while (j < text.length() && Character.isWhitespace(text.charAt(j))) {
      j++;
    }
    return j < text.length() && text.charAt(j) == ')';
  }

  private static Placeholder wholePlaceholder(String inner, int openQuote) {
    Placeholder placeholder = readPlaceholder(inner, 0);
    if (placeholder == null || placeholder.bare() || placeholder.start() != 0) {
      return null;
    }
    if (placeholder.end() != inner.length()) {
      return null;
    }
    return new Placeholder(
        placeholder.system(),
        false,
        placeholder.name(),
        openQuote,
        openQuote + 1 + inner.length() + 1);
  }

  private static Placeholder readPlaceholder(String text, int i) {
    int n = text.length();
    if (i >= n) {
      return null;
    }
    char c = text.charAt(i);
    if ((c == '$' || c == '#') && i + 1 < n && text.charAt(i + 1) == '{') {
      int j = i + 2;
      while (j < n && isWordPart(text.charAt(j))) {
        j++;
      }
      if (j < n && text.charAt(j) == '}') {
        return new Placeholder(c == '#', false, text.substring(i + 2, j), i, j + 1);
      }
      return null;
    }
    if (c == '{' && (i == 0 || (text.charAt(i - 1) != '$' && text.charAt(i - 1) != '#'))) {
      int j = i + 1;
      while (j < n && isWordPart(text.charAt(j))) {
        j++;
      }
      if (j > i + 1 && j < n && text.charAt(j) == '}') {
        return new Placeholder(false, true, text.substring(i + 1, j), i, j + 1);
      }
    }
    return null;
  }

  private static boolean isWordStart(char c) {
    return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c == '_';
  }

  private static boolean isWordPart(char c) {
    return isWordStart(c) || (c >= '0' && c <= '9');
  }

  /**
   * Spaces and tabs only. A newline after {@code --} keeps the following paging clause outside the
   * comment.
   */
  private static String stripTrailingWhitespace(String sql) {
    int end = sql.length();
    while (end > 0) {
      char c = sql.charAt(end - 1);
      if (c != ' ' && c != '\t' && c != '\r') {
        break;
      }
      end--;
    }
    return sql.substring(0, end);
  }

  private record Placeholder(boolean system, boolean bare, String name, int start, int end) {}
}
