package org.sitmun.mbtiles.tilesources.wmts;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.dom4j.Document;
import org.dom4j.DocumentException;
import org.dom4j.Node;
import org.dom4j.io.SAXReader;
import org.jetbrains.annotations.NotNull;
import org.sitmun.mbtiles.batch.MBTilesServiceSkippedException;
import org.sitmun.mbtiles.dto.TileServiceDto;
import org.xml.sax.SAXException;

@Slf4j
public class WMTSCapabilitiesUtils {

  /** EPSG:3857 and the codes older servers publish for the same CRS. */
  private static final Set<String> WEB_MERCATOR_CODES =
      Set.of("3857", "900913", "102100", "102113");

  /** OGC standardized rendering pixel size, in metres. */
  private static final double PIXEL_SIZE = 0.00028;

  private static final int TILE_SIZE = 256;

  /** Tolerance, in metres, for a matrix top-left corner on the Web Mercator origin. */
  private static final double ORIGIN_TOLERANCE = 1.0;

  private static final double ZOOM_TOLERANCE = 0.01;

  private WMTSCapabilitiesUtils() {
    // Private constructor to prevent instantiation
  }

  public static WMTSCapabilities parseWMTSCapabilities(TileServiceDto service) {
    String capabilitiesUrl =
        service.getUrl() + "?SERVICE=" + service.getType() + "&REQUEST=GetCapabilities";
    try (InputStream in = new URL(capabilitiesUrl).openStream()) {
      return parseWMTSCapabilities(service, in);
    } catch (IOException e) {
      log.error("Error reading WMTS capabilities from {}", capabilitiesUrl, e);
      throw new WMTSCapabilitiesException(e);
    }
  }

  /**
   * Keeps each requested layer that offers a Web Mercator tile matrix set, whatever its name.
   *
   * @throws MBTilesServiceSkippedException when no requested layer can be used
   */
  static WMTSCapabilities parseWMTSCapabilities(TileServiceDto service, InputStream in) {
    Document doc = read(in);
    Map<String, Node> matrixSets =
        byIdentifier(
            doc.selectNodes("//*[local-name()='Contents']/*[local-name()='TileMatrixSet']"));
    Map<String, Node> capLayers = byIdentifier(doc.selectNodes("//*[local-name()='Layer']"));

    List<WMTSLayerCapabilities> layers = new ArrayList<>();
    List<String> reasons = new ArrayList<>();
    for (String name : service.getLayers()) {
      Node capLayer = capLayers.get(name);
      if (capLayer == null) {
        reasons.add("layer " + name + " is not in the capabilities");
        continue;
      }
      webMercatorLayer(name, capLayer, matrixSets)
          .ifPresentOrElse(
              layers::add,
              () ->
                  reasons.add(
                      "layer "
                          + name
                          + " has no Web Mercator tile matrix set; it offers "
                          + offeredSets(capLayer, matrixSets)));
    }
    if (layers.isEmpty()) {
      throw new MBTilesServiceSkippedException(
          "WMTS service " + service.getUrl() + " skipped: " + String.join("; ", reasons));
    }
    reasons.forEach(r -> log.warn("WMTS service {}: {}, skipped", service.getUrl(), r));
    return WMTSCapabilities.builder().layers(layers).build();
  }

  static boolean isWebMercator(String crs) {
    String code = crs.substring(Math.max(crs.lastIndexOf(':'), crs.lastIndexOf('/')) + 1).trim();
    return WEB_MERCATOR_CODES.contains(code);
  }

  private static Document read(InputStream in) {
    try {
      SAXReader reader = new SAXReader();
      reader.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
      reader.setFeature("http://xml.org/sax/features/external-general-entities", false);
      reader.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
      return reader.read(in);
    } catch (DocumentException | SAXException e) {
      log.error("Error parsing WMTS capabilities", e);
      throw new WMTSCapabilitiesException(e);
    }
  }

  private static Map<String, Node> byIdentifier(List<Node> nodes) {
    Map<String, Node> map = new HashMap<>();
    for (Node node : nodes) {
      Node identifier = node.selectSingleNode("*[local-name()='Identifier']");
      if (identifier != null) {
        map.putIfAbsent(identifier.getStringValue().trim(), node);
      }
    }
    return map;
  }

  private static List<String> linkedSets(Node capLayer) {
    return capLayer
        .selectNodes("*[local-name()='TileMatrixSetLink']/*[local-name()='TileMatrixSet']")
        .stream()
        .map(n -> n.getStringValue().trim())
        .toList();
  }

  private static String supportedCrs(Node matrixSet) {
    Node crs = matrixSet.selectSingleNode("*[local-name()='SupportedCRS']");
    return crs == null ? "" : crs.getStringValue().trim();
  }

  private static String offeredSets(Node capLayer, Map<String, Node> matrixSets) {
    List<String> offered =
        linkedSets(capLayer).stream()
            .map(
                id ->
                    Optional.ofNullable(matrixSets.get(id))
                        .map(set -> id + " (" + supportedCrs(set) + ")")
                        .orElse(id + " (undeclared)"))
            .toList();
    return offered.isEmpty() ? "none" : String.join(", ", offered);
  }

  private static Optional<WMTSLayerCapabilities> webMercatorLayer(
      String name, Node capLayer, Map<String, Node> matrixSets) {
    for (Node link : capLayer.selectNodes("*[local-name()='TileMatrixSetLink']")) {
      String setId =
          link.selectSingleNode("*[local-name()='TileMatrixSet']").getStringValue().trim();
      Node set = matrixSets.get(setId);
      if (set == null || !isWebMercator(supportedCrs(set))) {
        continue;
      }
      List<WMTSTileMatrix> matrices = pyramidMatrices(set, limits(link));
      if (!matrices.isEmpty()) {
        return Optional.of(
            extractLayerCapabilities(name, capLayer)
                .withTileMatrixSet(setId)
                .withTileMatrices(matrices));
      }
    }
    return Optional.empty();
  }

  /**
   * The matrices that line up with the XYZ pyramid the MBTiles file uses: 256-pixel tiles, top-left
   * corner on the Web Mercator origin, and a scale that is a power-of-two zoom level. A matrix with
   * no {@code TileMatrixLimits} spans its whole {@code MatrixWidth} x {@code MatrixHeight}.
   */
  private static List<WMTSTileMatrix> pyramidMatrices(
      Node matrixSet, Map<String, WMTSTileMatrix> limits) {
    List<WMTSTileMatrix> matrices = new ArrayList<>();
    for (Node tm : matrixSet.selectNodes("*[local-name()='TileMatrix']")) {
      String id = text(tm, "Identifier");
      String[] topLeft = text(tm, "TopLeftCorner").split("\\s+");
      double resolution = Double.parseDouble(text(tm, "ScaleDenominator")) * PIXEL_SIZE;
      double zoom =
          Math.log(WMTSConstants.GLOBAL_SIZE_3857 / (TILE_SIZE * resolution)) / Math.log(2);
      long z = Math.round(zoom);
      boolean aligned =
          Integer.parseInt(text(tm, "TileWidth")) == TILE_SIZE
              && Integer.parseInt(text(tm, "TileHeight")) == TILE_SIZE
              && Math.abs(Double.parseDouble(topLeft[0]) - WMTSConstants.ORIGIN_X_3857)
                  < ORIGIN_TOLERANCE
              && Math.abs(Double.parseDouble(topLeft[1]) - WMTSConstants.ORIGIN_Y_3857)
                  < ORIGIN_TOLERANCE
              && z >= 0
              && Math.abs(zoom - z) < ZOOM_TOLERANCE;
      if (!aligned) {
        log.debug("Tile matrix {} is not on the Web Mercator XYZ pyramid, ignored", id);
        continue;
      }
      WMTSTileMatrix full =
          WMTSTileMatrix.builder()
              .matrix(id)
              .zoomLevel((int) z)
              .minRow(0)
              .maxRow(Integer.parseInt(text(tm, "MatrixHeight")) - 1)
              .minCol(0)
              .maxCol(Integer.parseInt(text(tm, "MatrixWidth")) - 1)
              .build();
      matrices.add(
          Optional.ofNullable(limits.get(id)).map(l -> l.withZoomLevel((int) z)).orElse(full));
    }
    return matrices;
  }

  private static Map<String, WMTSTileMatrix> limits(Node link) {
    return link.selectNodes("descendant::*[local-name()='TileMatrixLimits']").stream()
        .map(
            limit ->
                WMTSTileMatrix.builder()
                    .matrix(text(limit, "TileMatrix"))
                    .minRow(Integer.parseInt(text(limit, "MinTileRow")))
                    .maxRow(Integer.parseInt(text(limit, "MaxTileRow")))
                    .minCol(Integer.parseInt(text(limit, "MinTileCol")))
                    .maxCol(Integer.parseInt(text(limit, "MaxTileCol")))
                    .build())
        .collect(Collectors.toMap(WMTSTileMatrix::getMatrix, Function.identity(), (a, b) -> a));
  }

  private static String text(Node node, String localName) {
    return node.selectSingleNode("*[local-name()='" + localName + "']").getStringValue().trim();
  }

  private static @NotNull WMTSLayerCapabilities extractLayerCapabilities(
      String identifier, Node layer) {
    Node lowerCornerElements = layer.selectSingleNode("descendant::*[local-name()='LowerCorner']");
    Node upperCornerElements = layer.selectSingleNode("descendant::*[local-name()='UpperCorner']");
    if (lowerCornerElements != null && upperCornerElements != null) {
      String[] lowerCorner = lowerCornerElements.getStringValue().trim().split("\\s+");
      String[] upperCorner = upperCornerElements.getStringValue().trim().split("\\s+");
      return WMTSLayerCapabilities.builder()
          .layerIdentifier(identifier)
          .minLon(Double.parseDouble(lowerCorner[0]))
          .minLat(Double.parseDouble(lowerCorner[1]))
          .maxLon(Double.parseDouble(upperCorner[0]))
          .maxLat(Double.parseDouble(upperCorner[1]))
          .build();
    }
    return WMTSLayerCapabilities.builder()
        .layerIdentifier(identifier)
        .minLon(-180.0)
        .minLat(-90.0)
        .maxLon(180.0)
        .maxLat(90.0)
        .build();
  }
}
