package org.sitmun.administration.service.extractor.featuretype;

import java.io.IOException;
import java.util.regex.Pattern;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.json.JSONObject;
import org.json.XML;
import org.sitmun.administration.service.extractor.HttpClientFactory;
import org.sitmun.administration.service.extractor.featuretype.ExtractedMetadata.ExtractedMetadataBuilder;
import org.springframework.stereotype.Service;

@Service
public class SimpleFeatureTypeExtractor implements FeatureTypeExtractor {

  private static final String XSD_NAMESPACE = "http://www.w3.org/2001/XMLSchema";
  private static final Pattern GML_NAMESPACE =
      Pattern.compile("^http://www\\.opengis\\.net/gml(?:/.*)?$");

  private final HttpClientFactory httpClientFactory;

  public SimpleFeatureTypeExtractor(HttpClientFactory httpClientFactory) {
    this.httpClientFactory = httpClientFactory;
  }

  @Override
  public ExtractedMetadata extract(String url) {
    ExtractedMetadataBuilder builder = new ExtractedMetadataBuilder();

    Request request = new Request.Builder().url(url).header("Accept", "*/*").build();
    try (Response response = httpClientFactory.executeRequest(request)) {
      processResponse(builder, response);
    } catch (IOException e) {
      builder.success(false).reason(e.getClass().getSimpleName() + ": " + e.getMessage());
    }
    return builder.build();
  }

  private void processResponse(ExtractedMetadataBuilder builder, Response response)
      throws IOException {
    builder.success(response.code() == 200 && response.body() != null);
    ResponseBody body = response.body();
    if (body != null) {
      String text = body.string();
      if (text.trim().isEmpty()) {
        builder.success(false).reason("Empty response");
      } else {
        builder.asText(text);
        JSONObject json;
        try {
          json = XML.toJSONObject(text);
        } catch (Exception ignored) {
          builder.success(false).reason("Not a well formed XML");
          return;
        }
        builder.asJson(json.toMap());
        acceptDocument(builder, json);
      }
    }
  }

  /** DescribeLayer is not a GML schema. The admin uses it to discover the WFS feature type. */
  static void acceptDocument(ExtractedMetadataBuilder builder, JSONObject json) {
    if (json.keySet().stream().anyMatch(key -> key.endsWith("DescribeLayerResponse"))) {
      builder.type("DescribeLayer").success(true);
      return;
    }
    // The XSD namespace may be the default one: INSPIRE servers send <schema xmlns="…XMLSchema">.
    json.keySet().stream()
        .filter(it -> "schema".equals(it) || it.endsWith(":schema"))
        .findFirst()
        .ifPresentOrElse(
            node -> processRootNode(builder, json, node),
            () -> builder.success(false).reason("Unmanaged XML response"));
  }

  private static void processRootNode(
      ExtractedMetadataBuilder builder, JSONObject json, String root) {
    JSONObject schema = json.getJSONObject(root);
    int colon = root.indexOf(':');
    String xmlnsKey = colon < 0 ? "xmlns" : "xmlns:" + root.substring(0, colon);
    if (!XSD_NAMESPACE.equals(schema.optString(xmlnsKey))) {
      builder.success(false).reason("Not a XML Schema");
    } else if (!declaresGml(schema)) {
      builder.success(false).reason("Not a DescribeFeatureType response");
    } else {
      builder.type("GML Schema").success(true);
    }
  }

  /** GML is recognised by its namespace URI, whatever prefix the schema binds it to. */
  private static boolean declaresGml(JSONObject schema) {
    return schema.keySet().stream()
        .filter(key -> "xmlns".equals(key) || key.startsWith("xmlns:"))
        .map(schema::optString)
        .anyMatch(uri -> GML_NAMESPACE.matcher(uri).matches());
  }
}
