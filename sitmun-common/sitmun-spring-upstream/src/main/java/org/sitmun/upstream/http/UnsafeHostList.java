package org.sitmun.upstream.http;

import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;

public final class UnsafeHostList {

  private UnsafeHostList() {}

  public static List<String> normalize(Logger log, List<String> hosts) {
    List<String> normalized = hosts.stream().map(host -> host.toLowerCase(Locale.ROOT)).toList();
    if (normalized.contains("*")) {
      log.warn(
          "sitmun.client.unsafe-allowed-hosts is *; certificate and hostname checks are off for"
              + " every upstream host");
    } else {
      log.info("sitmun.client.unsafe-allowed-hosts={}", normalized);
    }
    return List.copyOf(normalized);
  }
}
