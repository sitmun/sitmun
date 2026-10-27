package org.sitmun.upstream.http;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Optional;

public final class BasicAuthorization {

  public static final String HEADER = "Authorization";

  private BasicAuthorization() {}

  public static Optional<String> headerValue(String username, String password) {
    if (password == null || password.isBlank()) {
      return Optional.empty();
    }
    String user = username == null ? "" : username;
    String token =
        Base64.getEncoder()
            .encodeToString((user + ":" + password).getBytes(StandardCharsets.UTF_8));
    return Optional.of("Basic " + token);
  }
}
