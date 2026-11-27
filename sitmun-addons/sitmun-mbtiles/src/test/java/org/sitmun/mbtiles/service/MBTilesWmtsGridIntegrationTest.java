package org.sitmun.mbtiles.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.sun.net.httpserver.HttpServer;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.TimeUnit;
import javax.imageio.ImageIO;
import org.awaitility.Awaitility;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.sitmun.mbtiles.dto.BoundingBoxDto;
import org.sitmun.mbtiles.dto.MBTilesEstimateDto;
import org.sitmun.mbtiles.dto.MapServiceDto;
import org.sitmun.mbtiles.dto.TileRequestDto;
import org.springframework.batch.core.BatchStatus;
import org.springframework.batch.core.job.JobExecution;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Runs the MBTiles job and the estimate against a local WMTS stub that serves the saved
 * capabilities documents (#321).
 */
@SpringBootTest
@DisplayName("MBTiles: WMTS grid choice and skipped services")
class MBTilesWmtsGridIntegrationTest {

  private static HttpServer server;
  private static String baseUrl;
  private static final Queue<String> tileRequests = new ConcurrentLinkedQueue<>();

  @Autowired private MBTilesJobService jobService;
  @Autowired private MBTilesEstimateService estimateService;
  @Autowired private JobRepository jobRepository;

  @BeforeAll
  static void startStub() throws IOException {
    byte[] png = png();
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    serve("/arcgis", "arcgis-epsg25831-default028mm.xml", png);
    serve("/webmercator", "webmercator-other-name-without-limits.xml", png);
    server.start();
    baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();
  }

  @AfterAll
  static void stopStub() {
    server.stop(0);
  }

  @BeforeEach
  void clearRequests() {
    tileRequests.clear();
  }

  @Test
  @DisplayName("A job completes with the usable service and skips the UTM-only one")
  void jobSkipsUnusableServiceAndCompletes() {
    JobExecution execution = run(request("/arcgis", "imatges_GOIB_Orto_IB"), request());

    assertThat(execution.getStatus()).isEqualTo(BatchStatus.COMPLETED);
    assertThat(tileRequests)
        .hasSize(4)
        .allMatch(q -> q.contains("LAYER=orto_wm"))
        .allMatch(q -> q.contains("TILEMATRIXSET=GoogleMapsCompatible"))
        .allMatch(q -> q.contains("TILEMATRIX=12&"));
  }

  @Test
  @DisplayName("A job with no usable service fails and lists why")
  void jobWithOnlyUnusableServicesFails() {
    JobExecution execution = run(request("/arcgis", "imatges_GOIB_Orto_IB"));

    assertThat(execution.getStatus()).isEqualTo(BatchStatus.FAILED);
    assertThat(execution.getExitStatus().getExitDescription())
        .contains(baseUrl + "/arcgis")
        .contains("imatges_GOIB_Orto_IB")
        .contains("default028mm");
    assertThat(tileRequests).isEmpty();
  }

  @Test
  @DisplayName("The estimate counts only the tiles the job will download")
  void estimateSkipsUnusableService() {
    MBTilesEstimateDto estimate =
        estimateService.estimateSize(
            tileRequest(request("/arcgis", "imatges_GOIB_Orto_IB"), request()));

    assertThat(estimate.getTileCount()).isEqualTo(4);
    assertThat(tileRequests).allMatch(q -> q.contains("TILEMATRIXSET=GoogleMapsCompatible"));
  }

  @Test
  @DisplayName("The estimate rejects a request with no usable service and says why")
  void estimateWithOnlyUnusableServicesIsRejected() {
    TileRequestDto onlyUtm = tileRequest(request("/arcgis", "imatges_GOIB_Orto_IB"));

    assertThatThrownBy(() -> estimateService.estimateSize(onlyUtm))
        .isInstanceOf(MBTilesUnexpectedRequestException.class)
        .hasMessageContaining("imatges_GOIB_Orto_IB")
        .hasMessageContaining("default028mm");
  }

  private JobExecution run(MapServiceDto... services) {
    long jobId = jobService.startJob(tileRequest(services));
    Awaitility.await()
        .atMost(30, TimeUnit.SECONDS)
        .until(() -> !jobRepository.getJobExecution(jobId).isRunning());
    return jobRepository.getJobExecution(jobId);
  }

  private static MapServiceDto request() {
    return request("/webmercator", "orto_wm");
  }

  private static MapServiceDto request(String path, String layer) {
    return MapServiceDto.builder().url(baseUrl + path).type("WMTS").layers(List.of(layer)).build();
  }

  private static TileRequestDto tileRequest(MapServiceDto... services) {
    // Around Maó; 2 x 2 tiles at zoom 12.
    BoundingBoxDto bbox =
        BoundingBoxDto.builder()
            .minX(470000)
            .minY(4845000)
            .maxX(480000)
            .maxY(4855000)
            .srs("EPSG:3857")
            .build();
    return TileRequestDto.builder()
        .bbox(bbox)
        .minZoom(12)
        .maxZoom(12)
        .mapServices(List.of(services))
        .build();
  }

  private static void serve(String path, String fixture, byte[] png) {
    server.createContext(
        path,
        exchange -> {
          String query = exchange.getRequestURI().getRawQuery();
          byte[] body;
          String type;
          if (query != null && query.contains("REQUEST=GetTile")) {
            tileRequests.add(query);
            body = png;
            type = "image/png";
          } else {
            try (InputStream in =
                MBTilesWmtsGridIntegrationTest.class.getResourceAsStream("/wmts/" + fixture)) {
              body = in.readAllBytes();
            }
            type = "application/xml";
          }
          exchange.getResponseHeaders().add("Content-Type", type);
          exchange.sendResponseHeaders(200, body.length);
          try (OutputStream out = exchange.getResponseBody()) {
            out.write(body);
          }
        });
  }

  private static byte[] png() throws IOException {
    try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      ImageIO.write(new BufferedImage(256, 256, BufferedImage.TYPE_INT_ARGB), "png", out);
      return out.toByteArray();
    }
  }
}
