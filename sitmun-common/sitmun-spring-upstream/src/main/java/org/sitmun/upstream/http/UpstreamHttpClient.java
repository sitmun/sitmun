package org.sitmun.upstream.http;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import okhttp3.Interceptor;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class UpstreamHttpClient {

  private static final Logger log = LoggerFactory.getLogger(UpstreamHttpClient.class);

  private final List<String> unsafeAllowedHosts;
  private final OkHttpClient safeClient;
  private final OkHttpClient unsafeClient;

  public UpstreamHttpClient(
      List<String> unsafeAllowedHosts,
      Duration connectTimeout,
      Duration readTimeout,
      List<Interceptor> interceptors) {
    this.unsafeAllowedHosts = List.copyOf(unsafeAllowedHosts);
    this.safeClient = base(connectTimeout, readTimeout, interceptors).build();
    this.unsafeClient = ignoreCertificate(base(connectTimeout, readTimeout, interceptors)).build();
  }

  public Response execute(Request request) throws IOException {
    return clientFor(request.url().host()).newCall(request).execute();
  }

  public OkHttpClient clientFor(String host) {
    if (unsafeAllowedHosts.contains("*") || unsafeAllowedHosts.contains(host)) {
      log.warn("Using Unsafe Client");
      return unsafeClient;
    }
    return safeClient;
  }

  public OkHttpClient safeClient() {
    return safeClient;
  }

  public OkHttpClient unsafeClient() {
    return unsafeClient;
  }

  private static OkHttpClient.Builder base(
      Duration connectTimeout, Duration readTimeout, List<Interceptor> interceptors) {
    OkHttpClient.Builder builder =
        new OkHttpClient.Builder().connectTimeout(connectTimeout).readTimeout(readTimeout);
    for (Interceptor interceptor : interceptors) {
      builder.addInterceptor(interceptor);
    }
    return builder;
  }

  private static OkHttpClient.Builder ignoreCertificate(OkHttpClient.Builder builder) {
    log.warn("Ignore SSL Certificate");
    try {
      final TrustManager[] trustAllCerts =
          new TrustManager[] {
            new X509TrustManager() {
              @Override
              public void checkClientTrusted(
                  java.security.cert.X509Certificate[] chain, String authType) {}

              @Override
              public void checkServerTrusted(
                  java.security.cert.X509Certificate[] chain, String authType) {}

              @Override
              public java.security.cert.X509Certificate[] getAcceptedIssuers() {
                return new java.security.cert.X509Certificate[] {};
              }
            }
          };
      final SSLContext sslContext = SSLContext.getInstance("SSL");
      sslContext.init(null, trustAllCerts, new java.security.SecureRandom());
      final SSLSocketFactory sslSocketFactory = sslContext.getSocketFactory();
      builder.sslSocketFactory(sslSocketFactory, (X509TrustManager) trustAllCerts[0]);
      builder.hostnameVerifier((hostname, session) -> true);
    } catch (Exception e) {
      log.warn("Exception while configuring IgnoreSslCertificate: {}", e.getMessage(), e);
    }
    return builder;
  }
}
