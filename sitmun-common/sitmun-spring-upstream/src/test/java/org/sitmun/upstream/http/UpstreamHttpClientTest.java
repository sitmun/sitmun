package org.sitmun.upstream.http;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.List;
import okhttp3.Interceptor;
import org.junit.jupiter.api.Test;

class UpstreamHttpClientTest {

  @Test
  void allowlistedHostUsesUnsafeClientAndAnotherHostUsesSafeClient() {
    UpstreamHttpClient client =
        new UpstreamHttpClient(
            List.of("maps.example"), Duration.ofSeconds(2), Duration.ofSeconds(3), List.of());

    assertThat(client.clientFor("maps.example")).isSameAs(client.unsafeClient());
    assertThat(client.clientFor("other.example")).isSameAs(client.safeClient());
    assertThat(client.safeClient().connectTimeoutMillis()).isEqualTo(2_000);
    assertThat(client.unsafeClient().readTimeoutMillis()).isEqualTo(3_000);
  }

  @Test
  void starAllowlistUsesUnsafeClient() {
    UpstreamHttpClient client =
        new UpstreamHttpClient(
            List.of("*"), Duration.ofMillis(5), Duration.ofMillis(6), List.of());

    assertThat(client.clientFor("other.example")).isSameAs(client.unsafeClient());
    assertThat(client.clientFor("maps.example")).isSameAs(client.unsafeClient());
  }

  @Test
  void callerInterceptorsAreInstalledOnBothClients() {
    Interceptor interceptor = chain -> chain.proceed(chain.request());
    UpstreamHttpClient client =
        new UpstreamHttpClient(
            List.of(), Duration.ofMillis(5), Duration.ofMillis(6), List.of(interceptor));

    assertThat(client.safeClient().interceptors()).contains(interceptor);
    assertThat(client.unsafeClient().interceptors()).contains(interceptor);
  }
}
