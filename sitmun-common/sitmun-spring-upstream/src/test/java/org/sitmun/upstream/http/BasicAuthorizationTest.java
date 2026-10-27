package org.sitmun.upstream.http;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class BasicAuthorizationTest {

  @Test
  void headerIsPresentOnlyWhenPasswordIsPresent() {
    assertThat(BasicAuthorization.headerValue("user", "secret")).contains("Basic dXNlcjpzZWNyZXQ=");
    assertThat(BasicAuthorization.headerValue("user", null)).isEmpty();
    assertThat(BasicAuthorization.headerValue("user", "  ")).isEmpty();
  }
}
