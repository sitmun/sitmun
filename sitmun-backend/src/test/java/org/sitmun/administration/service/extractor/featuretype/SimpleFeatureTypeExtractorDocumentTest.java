package org.sitmun.administration.service.extractor.featuretype;

import static org.assertj.core.api.Assertions.assertThat;

import org.json.XML;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.sitmun.administration.service.extractor.featuretype.ExtractedMetadata.ExtractedMetadataBuilder;

@DisplayName("Feature type document classification")
class SimpleFeatureTypeExtractorDocumentTest {

  @Test
  @DisplayName("A DescribeLayer response is a successful document")
  void acceptsDescribeLayer() {
    ExtractedMetadata metadata =
        classify(
            """
            <sld:DescribeLayerResponse>
              <sld:LayerDescription name="roads" owsURL="https://example.com/wfs" owsType="WFS">
                <sld:Query typeName="app:roads"/>
              </sld:LayerDescription>
            </sld:DescribeLayerResponse>
            """);

    assertThat(metadata.getSuccess()).isTrue();
    assertThat(metadata.getType()).isEqualTo("DescribeLayer");
  }

  @Test
  @DisplayName("A service exception stays an unmanaged response")
  void rejectsServiceException() {
    ExtractedMetadata metadata =
        classify(
            """
            <ows:ExceptionReport>
              <ows:Exception exceptionCode="OperationNotSupported"/>
            </ows:ExceptionReport>
            """);

    assertThat(metadata.getSuccess()).isFalse();
    assertThat(metadata.getReason()).isEqualTo("Unmanaged XML response");
  }

  @Test
  @DisplayName("A schema with the xsd: prefix is a GML schema")
  void acceptsPrefixedSchema() {
    ExtractedMetadata metadata =
        classify(
            """
            <xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                xmlns:gml="http://www.opengis.net/gml/3.2">
              <xsd:element name="roads"/>
            </xsd:schema>
            """);

    assertThat(metadata.getSuccess()).isTrue();
    assertThat(metadata.getType()).isEqualTo("GML Schema");
  }

  @Test
  @DisplayName("A schema in the default XSD namespace is a GML schema (#419)")
  void acceptsUnprefixedSchema() {
    ExtractedMetadata metadata =
        classify(
            """
            <schema xmlns="http://www.w3.org/2001/XMLSchema"
                xmlns:gml="http://www.opengis.net/gml/3.2">
              <element name="AdministrativeUnit"/>
            </schema>
            """);

    assertThat(metadata.getSuccess()).isTrue();
    assertThat(metadata.getType()).isEqualTo("GML Schema");
  }

  @Test
  @DisplayName("GML bound to another prefix is recognised by its namespace (#419)")
  void acceptsGmlUnderAnotherPrefix() {
    ExtractedMetadata metadata =
        classify(
            """
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:gml32="http://www.opengis.net/gml/3.2">
              <xs:element name="roads"/>
            </xs:schema>
            """);

    assertThat(metadata.getSuccess()).isTrue();
    assertThat(metadata.getType()).isEqualTo("GML Schema");
  }

  @Test
  @DisplayName("A schema root outside the XSD namespace is not an XML Schema")
  void rejectsSchemaOutsideXsdNamespace() {
    ExtractedMetadata metadata =
        classify(
            """
            <schema xmlns="http://example.com/not-xsd" xmlns:gml="http://www.opengis.net/gml">
              <element name="roads"/>
            </schema>
            """);

    assertThat(metadata.getSuccess()).isFalse();
    assertThat(metadata.getReason()).isEqualTo("Not a XML Schema");
  }

  @Test
  @DisplayName("An XML Schema without a GML namespace is not a DescribeFeatureType response")
  void rejectsSchemaWithoutGml() {
    ExtractedMetadata metadata =
        classify(
            """
            <schema xmlns="http://www.w3.org/2001/XMLSchema">
              <element name="roads"/>
            </schema>
            """);

    assertThat(metadata.getSuccess()).isFalse();
    assertThat(metadata.getReason()).isEqualTo("Not a DescribeFeatureType response");
  }

  private static ExtractedMetadata classify(String xml) {
    ExtractedMetadataBuilder builder = ExtractedMetadata.builder().success(false);
    SimpleFeatureTypeExtractor.acceptDocument(builder, XML.toJSONObject(xml));
    return builder.build();
  }
}
