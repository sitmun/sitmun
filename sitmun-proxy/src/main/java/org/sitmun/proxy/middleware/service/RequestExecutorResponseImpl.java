package org.sitmun.proxy.middleware.service;

import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Data;
import org.springframework.http.ResponseEntity;

@Data
public class RequestExecutorResponseImpl<T> implements RequestExecutorResponse<T> {

  private String baseUrl;
  private int statusCode;
  private String contentType;
  private T body;
  private final Map<String, String> headers = new LinkedHashMap<>();

  public void addHeader(String name, String value) {
    headers.put(name, value);
  }

  public RequestExecutorResponseImpl(String baseUrl, int statusCode, String contentType, T body) {
    this.baseUrl = baseUrl;
    this.statusCode = statusCode;
    this.contentType = contentType;
    this.body = body;
  }

  @Override
  public ResponseEntity<T> asResponseEntity() {
    UpstreamContentType.remember(contentType);
    ResponseEntity.BodyBuilder builder = ResponseEntity.status(statusCode);
    headers.forEach(builder::header);
    return builder.body(body);
  }
}
