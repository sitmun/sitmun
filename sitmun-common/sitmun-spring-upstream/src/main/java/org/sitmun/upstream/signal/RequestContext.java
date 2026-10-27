package org.sitmun.upstream.signal;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.net.URI;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record RequestContext(
    String protocol, String request, boolean probe, String host, String path) {

  public static RequestContext from(
      String protocol, boolean probe, URI uri, String httpMethod, Map<String, String> query) {
    String path = uri.getRawPath() == null ? "" : uri.getRawPath();
    return new RequestContext(
        protocol, requestName(protocol, probe, httpMethod, query), probe, uri.getHost(), path);
  }

  static String requestName(
      String protocol, boolean probe, String httpMethod, Map<String, String> query) {
    if (isReachedProtocol(protocol)) {
      return "GET";
    }
    if (probe && isOgcProtocol(protocol)) {
      return "GetCapabilities";
    }
    String named = namedRequest(query);
    if (named != null) {
      return named;
    }
    return httpMethod == null ? "" : httpMethod;
  }

  public static boolean isOgcProtocol(String protocol) {
    return "WMS".equals(protocol) || "WMTS".equals(protocol) || "WFS".equals(protocol);
  }

  public static boolean isReachedProtocol(String protocol) {
    return "AIMS".equals(protocol) || "FME".equals(protocol) || "TC".equals(protocol);
  }

  private static String namedRequest(Map<String, String> query) {
    if (query == null) {
      return null;
    }
    for (Map.Entry<String, String> entry : query.entrySet()) {
      if (entry.getKey() != null && entry.getKey().equalsIgnoreCase("request")) {
        return canonical(entry.getValue());
      }
    }
    return null;
  }

  private static String canonical(String value) {
    if (value == null) {
      return null;
    }
    if (value.equalsIgnoreCase("GetMap")) {
      return "GetMap";
    }
    if (value.equalsIgnoreCase("GetTile")) {
      return "GetTile";
    }
    if (value.equalsIgnoreCase("GetFeatureInfo")) {
      return "GetFeatureInfo";
    }
    return null;
  }
}
