package org.sitmun.upstream.signal;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.io.InputStream;
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
    return new ExchangeSignals(
        error.getClass().getSimpleName(), firstSentence(error.getMessage()), null, null, "");
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
    String line = message.substring(0, lineEnd);
    int dot = line.indexOf('.');
    if (dot >= 0) {
      line = line.substring(0, dot);
    }
    return line.strip();
  }
}
