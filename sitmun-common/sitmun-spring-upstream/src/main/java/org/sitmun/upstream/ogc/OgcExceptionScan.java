package org.sitmun.upstream.ogc;

public record OgcExceptionScan(String code, String text) {

  public static OgcExceptionScan none() {
    return new OgcExceptionScan(null, "");
  }
}
