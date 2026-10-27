package org.sitmun.upstream.signal;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Set;
import org.sitmun.upstream.ogc.OgcExceptionScan;
import org.sitmun.upstream.ogc.OgcExceptionScanner;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ExchangeSignals(
    String transportError,
    String transportMessage,
    Integer httpStatus,
    String ogcExceptionCode,
    String ogcExceptionText) {

  public static ExchangeSignals http(int status) {
    return new ExchangeSignals(null, "", status, null, "");
  }

  public static ExchangeSignals transport(Throwable error) {
    return transport(error, 200);
  }

  public static ExchangeSignals transport(Throwable error, int maxLength) {
    List<Throwable> links = chain(error);
    int selected = 0;
    for (int i = 0; i < links.size(); i++) {
      if (TransportError.parse(links.get(i).getClass().getSimpleName()) != TransportError.OTHER) {
        selected = i;
        break;
      }
    }
    Throwable kept = links.get(selected);
    return new ExchangeSignals(
        kept.getClass().getSimpleName(), message(links, selected, maxLength), null, null, "");
  }

  public ExchangeSignals scan(InputStream body, int maxBytes, int textMaxLength) {
    OgcExceptionScan scanned = OgcExceptionScanner.scan(body, maxBytes, textMaxLength);
    return new ExchangeSignals(
        transportError, transportMessage, httpStatus, scanned.code(), scanned.text());
  }

  public static String firstSentence(String message) {
    if (message == null || message.isBlank()) {
      return "";
    }
    int lineEnd = message.length();
    int newline = message.indexOf('\n');
    int carriage = message.indexOf('\r');
    if (newline >= 0) {
      lineEnd = newline;
    }
    if (carriage >= 0 && carriage < lineEnd) {
      lineEnd = carriage;
    }
    return message.substring(0, lineEnd).strip();
  }

  private static List<Throwable> chain(Throwable error) {
    List<Throwable> links = new ArrayList<>();
    Set<Throwable> seen = Collections.newSetFromMap(new IdentityHashMap<>());
    Throwable current = error;
    while (current != null && links.size() < 8 && seen.add(current)) {
      links.add(current);
      current = current.getCause();
    }
    return links;
  }

  private static String message(List<Throwable> links, int selected, int maxLength) {
    StringBuilder text = new StringBuilder();
    for (int i = 0; i < links.size(); i++) {
      Throwable link = links.get(i);
      String line = firstSentence(link.getMessage());
      if (!text.isEmpty() && text.toString().contains(line) && !line.isEmpty()) {
        continue;
      }
      String piece = i == selected ? line : link.getClass().getSimpleName() + ": " + line;
      if (piece.isBlank()) {
        continue;
      }
      if (!text.isEmpty()) {
        text.append(" <- ");
      }
      text.append(piece);
    }
    if (maxLength <= 0 || text.length() <= maxLength) {
      return text.toString();
    }
    return text.substring(0, maxLength);
  }
}
