package org.sitmun.upstream.ogc;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class OgcExceptionScannerTest {

  @Test
  void stopsAtFirstReportAndCutsTheFirstLine() {
    String xml =
        "<ServiceExceptionReport>"
            + "<ServiceException code=\"LayerNotDefined\">missing\nsecond</ServiceException>"
            + "</ServiceExceptionReport>"
            + "<ExceptionReport><ExceptionText>later</ExceptionText></ExceptionReport>";

    OgcExceptionScan scan = scan(xml, xml.length(), 4);

    assertThat(scan.code()).isEqualTo("LayerNotDefined");
    assertThat(scan.text()).isEqualTo("miss");
  }

  @Test
  void byteLimitDropsAnExceptionThatStartsPastTheCut() {
    String padding = "<!--" + "x".repeat(40) + "-->";
    String xml = padding + "<ServiceException code=\"X\">hi</ServiceException>";

    OgcExceptionScan scan = scan(xml, 12, 8);

    assertThat(scan.code()).isNull();
    assertThat(scan.text()).isEmpty();
  }

  @Test
  void nonXmlBytesAreNotAnException() {
    OgcExceptionScan scan =
        OgcExceptionScanner.scan(new ByteArrayInputStream(new byte[] {1, 2, 3, 4}), 4, 8);

    assertThat(scan.code()).isNull();
    assertThat(scan.text()).isEmpty();
  }

  private static OgcExceptionScan scan(String xml, int maxBytes, int textMaxLength) {
    return OgcExceptionScanner.scan(
        new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)), maxBytes, textMaxLength);
  }
}
