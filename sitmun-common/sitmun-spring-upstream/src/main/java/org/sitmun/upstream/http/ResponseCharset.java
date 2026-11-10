package org.sitmun.upstream.http;

public final class ResponseCharset {

  private ResponseCharset() {}

  public static String named(String contentType) {
    if (contentType == null || contentType.isBlank()) {
      return null;
    }
    for (String part : contentType.split(";")) {
      String item = part.trim();
      int eq = item.indexOf('=');
      if (eq <= 0) {
        continue;
      }
      if (!item.substring(0, eq).trim().equalsIgnoreCase("charset")) {
        continue;
      }
      String value = unquote(item.substring(eq + 1).trim());
      return value.isEmpty() ? null : value;
    }
    return null;
  }

  private static String unquote(String value) {
    if (value.length() >= 2 && value.charAt(0) == '"' && value.charAt(value.length() - 1) == '"') {
      return value.substring(1, value.length() - 1).trim();
    }
    return value;
  }
}
