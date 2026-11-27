package org.sitmun.mbtiles.tilesources.wmts;

import java.util.List;
import lombok.*;

@Builder
@Value
@With
public class WMTSLayerCapabilities {
  String layerIdentifier;

  /** Identifier of the Web Mercator tile matrix set chosen for this layer. */
  String tileMatrixSet;

  /** Tile range of each matrix that lines up with the XYZ pyramid, one per zoom level. */
  @Builder.Default List<WMTSTileMatrix> tileMatrices = List.of();

  Double minLon;
  Double minLat;
  Double maxLon;
  Double maxLat;

  public WMTSTileMatrix getTileMatrixByZoom(int zoom) {
    return tileMatrices.stream().filter(m -> m.getZoomLevel() == zoom).findFirst().orElse(null);
  }
}
