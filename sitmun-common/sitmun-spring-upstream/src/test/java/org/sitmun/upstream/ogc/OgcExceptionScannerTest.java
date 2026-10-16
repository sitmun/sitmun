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
  void indentedServiceExceptionCollapsesWhitespace() {
    String xml =
        "<ServiceExceptionReport><ServiceException code=\"LayerNotDefined\">missing\n"
            + "    second</ServiceException></ServiceExceptionReport>";

    OgcExceptionScan scan = scan(xml, xml.length(), 40);

    assertThat(scan.code()).isEqualTo("LayerNotDefined");
    assertThat(scan.text()).isEqualTo("missing second");
  }

  @Test
  void serviceExceptionReportReadsCodeAndText() {
    String xml =
        "<ServiceExceptionReport><ServiceException code=\"LayerNotDefined\">missing</ServiceException></ServiceExceptionReport>";

    OgcExceptionScan scan = scan(xml, xml.length(), 40);

    assertThat(scan.code()).isEqualTo("LayerNotDefined");
    assertThat(scan.text()).isEqualTo("missing");
  }

  @Test
  void owsExceptionReportReadsCodeAndText() {
    String xml =
        "<ows:ExceptionReport xmlns:ows=\"http://www.opengis.net/ows/1.1\">"
            + "<ows:Exception exceptionCode=\"NoApplicableCode\">"
            + "<ows:ExceptionText>missing</ows:ExceptionText>"
            + "</ows:Exception>"
            + "</ows:ExceptionReport>";

    OgcExceptionScan scan = scan(xml, xml.length(), 40);

    assertThat(scan.code()).isEqualTo("NoApplicableCode");
    assertThat(scan.text()).isEqualTo("missing");
  }

  @Test
  void serviceExceptionRootReadsCodeAndText() {
    String xml = "<ServiceException code=\"LayerNotDefined\">missing</ServiceException>";

    OgcExceptionScan scan = scan(xml, xml.length(), 40);

    assertThat(scan.code()).isEqualTo("LayerNotDefined");
    assertThat(scan.text()).isEqualTo("missing");
  }

  @Test
  void capabilitiesDocumentIsNotAnException() {
    String xml =
        "<WMS_Capabilities><Service><Name>WMS</Name></Service>"
            + "<ServiceException code=\"LayerNotDefined\">missing</ServiceException>"
            + "</WMS_Capabilities>";

    OgcExceptionScan scan = scan(xml, xml.length(), 40);

    assertThat(scan).isEqualTo(OgcExceptionScan.none());
  }

  @Test
  void exceptionRootIsNotAnOgcError() {
    String xml = "<Exception><Format>XML</Format></Exception>";

    OgcExceptionScan scan = scan(xml, xml.length(), 40);

    assertThat(scan).isEqualTo(OgcExceptionScan.none());
  }

  @Test
  void partialScanKeepsACodeAlreadyRead() {
    String xml = "<ServiceExceptionReport><ServiceException code=\"LayerNotDefined\">missing";

    OgcExceptionScan scan = scan(xml, xml.length(), 40);

    assertThat(scan.code()).isEqualTo("LayerNotDefined");
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
