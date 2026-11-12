package org.sitmun.upstream.http;

import java.io.IOException;
import java.util.function.Function;
import okhttp3.HttpUrl;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

public final class ManualRedirects {

  static final int MAX_HOPS = 20;

  private ManualRedirects() {}

  public static Response execute(Request request, Function<String, OkHttpClient> clientFor)
      throws IOException {
    Request current = request;
    for (int hop = 0; hop <= MAX_HOPS; hop++) {
      OkHttpClient client = clientFor.apply(current.url().host());
      if (client.followRedirects()) {
        return client.newCall(current).execute();
      }
      Response response = client.newCall(current).execute();
      if (hop == MAX_HOPS || !follow(current, response)) {
        return response;
      }
      Request next = next(current, response);
      response.close();
      current = next;
    }
    throw new IllegalStateException("redirect loop did not finish");
  }

  private static boolean follow(Request current, Response response) {
    if (!response.isRedirect()) {
      return false;
    }
    String location = response.header("Location");
    if (location == null) {
      return false;
    }
    HttpUrl next = current.url().resolve(location);
    if (next == null) {
      return false;
    }
    return !("https".equals(current.url().scheme()) && "http".equals(next.scheme()));
  }

  private static Request next(Request current, Response response) {
    HttpUrl next = current.url().resolve(response.header("Location"));
    Request.Builder builder = current.newBuilder().url(next);
    int code = response.code();
    if (code == 301 || code == 302 || code == 303) {
      builder.method("GET", null);
    }
    HttpUrl from = current.url();
    if (!from.host().equals(next.host())
        || from.port() != next.port()
        || !from.scheme().equals(next.scheme())) {
      builder.removeHeader("Authorization");
    }
    return builder.build();
  }
}
