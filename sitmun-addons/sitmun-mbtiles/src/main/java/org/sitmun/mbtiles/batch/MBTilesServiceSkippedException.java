package org.sitmun.mbtiles.batch;

/** A map service that cannot be written to MBTiles; the job goes on with the other services. */
public class MBTilesServiceSkippedException extends RuntimeException {
  public MBTilesServiceSkippedException(String reason) {
    super(reason);
  }
}
