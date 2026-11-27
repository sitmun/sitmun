package org.sitmun.mbtiles.tilesources.wmts;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.sitmun.mbtiles.dto.TileServiceDto;

@DisplayName("WMTS tile range")
class WMTSCoordinatesUtilsTest {

  // Around Maó, in EPSG:3857; no edge falls on a tile boundary at zoom 12.
  private static final double[] BOUNDS = {470000, 4845000, 480000, 4855000};

  @Test
  @DisplayName("A matrix without limits is clipped to the requested bbox")
  void fullMatrixClippedToBbox() {
    WMTSLayerCapabilities layer =
        WMTSLayerCapabilities.builder()
            .layerIdentifier("orto_wm")
            .tileMatrixSet("GoogleMapsCompatible")
            .tileMatrices(List.of(fullMatrix("12", 12), fullMatrix("13", 13)))
            .build();

    List<WMTSTileCoordinate> coordinates =
        WMTSCoordinatesUtils.calculateCoordinates(service(12, 12), layer, BOUNDS);

    assertThat(coordinates)
        .containsExactlyInAnyOrder(
            tile(2096, 1551, 12), tile(2096, 1552, 12), tile(2097, 1551, 12), tile(2097, 1552, 12));
  }

  @Test
  @DisplayName("A zoom with no tile matrix yields no tiles")
  void zoomWithoutMatrix() {
    WMTSLayerCapabilities layer =
        WMTSLayerCapabilities.builder()
            .layerIdentifier("orto_wm")
            .tileMatrixSet("GoogleMapsCompatible")
            .tileMatrices(List.of(fullMatrix("12", 12)))
            .build();

    assertThat(WMTSCoordinatesUtils.calculateCoordinates(service(12, 14), layer, BOUNDS))
        .hasSize(4)
        .allMatch(c -> c.getZ() == 12);
  }

  private static WMTSTileMatrix fullMatrix(String id, int zoom) {
    int max = (1 << zoom) - 1;
    return WMTSTileMatrix.builder()
        .matrix(id)
        .zoomLevel(zoom)
        .minRow(0)
        .maxRow(max)
        .minCol(0)
        .maxCol(max)
        .build();
  }

  private static WMTSTileCoordinate tile(int x, int y, int z) {
    return WMTSTileCoordinate.builder().x(x).y(y).z(z).zId(String.valueOf(z)).build();
  }

  private static TileServiceDto service(int minZoom, int maxZoom) {
    return TileServiceDto.builder().minZoom(minZoom).maxZoom(maxZoom).build();
  }
}
