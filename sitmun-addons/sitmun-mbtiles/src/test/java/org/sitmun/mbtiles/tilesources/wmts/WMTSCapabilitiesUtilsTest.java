package org.sitmun.mbtiles.tilesources.wmts;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.InputStream;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.sitmun.mbtiles.batch.MBTilesServiceSkippedException;
import org.sitmun.mbtiles.dto.BoundingBoxDto;
import org.sitmun.mbtiles.dto.TileServiceDto;

@DisplayName("WMTS capabilities: Web Mercator grid choice")
class WMTSCapabilitiesUtilsTest {

  private static final String URL = "https://example.org/wmts";

  @Test
  @DisplayName("GeoServer EPSG:3857 with TileMatrixLimits keeps the limits")
  void geoServerWithLimits() {
    WMTSCapabilities capabilities =
        parse("geoserver-epsg3857-with-limits.xml", "base_referencia:base_referencia");

    assertThat(capabilities.getLayers()).hasSize(1);
    WMTSLayerCapabilities layer = capabilities.getLayers().get(0);
    assertThat(layer.getTileMatrixSet()).isEqualTo("EPSG:3857");
    assertThat(layer.getTileMatrixByZoom(15))
        .isEqualTo(
            WMTSTileMatrix.builder()
                .matrix("EPSG:3857:15")
                .zoomLevel(15)
                .minRow(11695)
                .maxRow(14091)
                .minCol(13377)
                .maxCol(17065)
                .build());
  }

  @Test
  @DisplayName("Web Mercator grid under another name without limits uses the full matrix")
  void webMercatorUnderOtherNameWithoutLimits() {
    WMTSCapabilities capabilities = parse("webmercator-other-name-without-limits.xml", "orto_wm");

    WMTSLayerCapabilities layer = capabilities.getLayers().get(0);
    assertThat(layer.getTileMatrixSet()).isEqualTo("GoogleMapsCompatible");
    assertThat(layer.getTileMatrixByZoom(2))
        .isEqualTo(
            WMTSTileMatrix.builder()
                .matrix("2")
                .zoomLevel(2)
                .minRow(0)
                .maxRow(3)
                .minCol(0)
                .maxCol(3)
                .build());
    assertThat(layer.getTileMatrixByZoom(21)).isNull();
  }

  @Test
  @DisplayName("ArcGIS default028mm in EPSG:25831 skips the service and says why")
  void arcGisUtmGridIsSkipped() {
    assertThatThrownBy(() -> parse("arcgis-epsg25831-default028mm.xml", "imatges_GOIB_Orto_IB"))
        .isInstanceOf(MBTilesServiceSkippedException.class)
        .hasMessageContaining(URL)
        .hasMessageContaining("imatges_GOIB_Orto_IB")
        .hasMessageContaining("default028mm")
        .hasMessageContaining("urn:ogc:def:crs:EPSG::25831");
  }

  @Test
  @DisplayName("A layer without a Web Mercator grid is dropped when another layer has one")
  void unusableLayerIsDroppedFromUsableService() {
    WMTSCapabilities capabilities =
        parse("webmercator-other-name-without-limits.xml", "orto_utm", "orto_wm");

    assertThat(capabilities.getLayers())
        .extracting(WMTSLayerCapabilities::getLayerIdentifier)
        .containsExactly("orto_wm");
  }

  @Test
  @DisplayName("A layer missing from the capabilities skips the service")
  void missingLayerIsSkipped() {
    assertThatThrownBy(() -> parse("webmercator-other-name-without-limits.xml", "nope"))
        .isInstanceOf(MBTilesServiceSkippedException.class)
        .hasMessageContaining("nope")
        .hasMessageContaining("not in the capabilities");
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "EPSG:3857",
        "EPSG:900913",
        "EPSG:102100",
        "EPSG:102113",
        "urn:ogc:def:crs:EPSG::3857",
        "urn:ogc:def:crs:EPSG:6.18.3:3857",
        "urn:ogc:def:crs:EPSG::900913",
        "urn:ogc:def:crs:EPSG::102100",
        "urn:ogc:def:crs:EPSG::102113",
        "http://www.opengis.net/def/crs/EPSG/0/3857"
      })
  void webMercatorCrs(String crs) {
    assertThat(WMTSCapabilitiesUtils.isWebMercator(crs)).isTrue();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {"EPSG:25831", "urn:ogc:def:crs:EPSG::25831", "EPSG:4326", "EPSG:38570", ""})
  void otherCrs(String crs) {
    assertThat(WMTSCapabilitiesUtils.isWebMercator(crs)).isFalse();
  }

  private static WMTSCapabilities parse(String fixture, String... layers) {
    TileServiceDto service =
        TileServiceDto.builder()
            .url(URL)
            .type("WMTS")
            .layers(List.of(layers))
            .bbox(BoundingBoxDto.builder().minX(0).minY(0).maxX(1).maxY(1).srs("EPSG:3857").build())
            .minZoom(0)
            .maxZoom(1)
            .build();
    try (InputStream in = WMTSCapabilitiesUtilsTest.class.getResourceAsStream("/wmts/" + fixture)) {
      return WMTSCapabilitiesUtils.parseWMTSCapabilities(service, in);
    } catch (java.io.IOException e) {
      throw new IllegalStateException(e);
    }
  }
}
