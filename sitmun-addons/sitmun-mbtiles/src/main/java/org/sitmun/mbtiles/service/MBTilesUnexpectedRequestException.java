package org.sitmun.mbtiles.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(value = HttpStatus.BAD_REQUEST)
public class MBTilesUnexpectedRequestException extends RuntimeException {
  public MBTilesUnexpectedRequestException() {}

  public MBTilesUnexpectedRequestException(String message) {
    super(message);
  }
}
