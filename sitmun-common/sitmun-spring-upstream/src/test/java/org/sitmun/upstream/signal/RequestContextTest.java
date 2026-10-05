package org.sitmun.upstream.signal;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.util.Map;
import org.junit.jupiter.api.Test;

class RequestContextTest {

  @Test
  void stripsUserinfoQueryAndFragmentAndNamesTheForwardRequest() {
    URI uri = URI.create("https://user:secret@maps.example/wms/path?REQUEST=GetMap#frag");

    RequestContext context = RequestContext.from("WMS", false, uri, "POST", Map.of("request", "getmap"));

    assertThat(context.host()).isEqualTo("maps.example");
    assertThat(context.path()).isEqualTo("/wms/path");
    assertThat(context.request()).isEqualTo("GetMap");
    assertThat(context.probe()).isFalse();
    assertThat(context.host()).doesNotContain("secret");
  }

  @Test
  void ogcProbeAsksForCapabilitiesAndAimsUsesGet() {
    URI uri = URI.create("https://maps.example/service");

    assertThat(RequestContext.from("WMS", true, uri, "POST", Map.of()).request())
        .isEqualTo("GetCapabilities");
    assertThat(RequestContext.from("AIMS", false, uri, "POST", Map.of()).request()).isEqualTo("GET");
  }
}
