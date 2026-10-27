package org.sitmun.upstream.ogc;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;

public final class OgcExceptionScanner {

  private OgcExceptionScanner() {}

  public static OgcExceptionScan scan(InputStream input, int maxBytes, int textMaxLength) {
    if (input == null || maxBytes <= 0) {
      return OgcExceptionScan.none();
    }
    try {
      byte[] bytes = readAtMost(input, maxBytes);
      if (bytes.length == 0) {
        return OgcExceptionScan.none();
      }
      return parse(bytes, textMaxLength);
    } catch (IOException | XMLStreamException e) {
      return OgcExceptionScan.none();
    }
  }

  private static byte[] readAtMost(InputStream input, int maxBytes) throws IOException {
    byte[] buffer = new byte[maxBytes];
    int offset = 0;
    while (offset < maxBytes) {
      int read = input.read(buffer, offset, maxBytes - offset);
      if (read < 0) {
        break;
      }
      offset += read;
    }
    if (offset == buffer.length) {
      return buffer;
    }
    byte[] copy = new byte[offset];
    System.arraycopy(buffer, 0, copy, 0, offset);
    return copy;
  }

  private static OgcExceptionScan parse(byte[] bytes, int textMaxLength) throws XMLStreamException {
    XMLInputFactory factory = XMLInputFactory.newFactory();
    factory.setProperty(XMLInputFactory.SUPPORT_DTD, false);
    factory.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, false);
    XMLStreamReader reader = factory.createXMLStreamReader(new ByteArrayInputStream(bytes));
    try {
      String code = null;
      String text = null;
      int depth = 0;
      boolean matched = false;
      while (reader.hasNext()) {
        int event = reader.next();
        if (event == XMLStreamConstants.START_ELEMENT) {
          String local = reader.getLocalName();
          if (!matched && isTarget(local)) {
            matched = true;
            depth = 1;
            code = readCode(reader);
            if ("ServiceException".equals(local)) {
              text = reader.getElementText();
              break;
            }
          } else if (matched) {
            if (code == null) {
              code = readCode(reader);
            }
            if ("ServiceException".equals(local) || "ExceptionText".equals(local)) {
              if (text == null) {
                text = reader.getElementText();
              } else {
                reader.getElementText();
              }
              continue;
            }
            depth++;
          }
        } else if (event == XMLStreamConstants.END_ELEMENT && matched) {
          depth--;
          if (depth == 0) {
            break;
          }
        }
      }
      return new OgcExceptionScan(code, cut(text, textMaxLength));
    } finally {
      reader.close();
    }
  }

  private static boolean isTarget(String localName) {
    return "ServiceException".equals(localName)
        || "ServiceExceptionReport".equals(localName)
        || "ExceptionReport".equals(localName);
  }

  private static String readCode(XMLStreamReader reader) {
    String code = reader.getAttributeValue(null, "code");
    if (code == null || code.isBlank()) {
      code = reader.getAttributeValue(null, "exceptionCode");
    }
    if (code == null || code.isBlank()) {
      return null;
    }
    return code;
  }

  private static String cut(String text, int textMaxLength) {
    if (text == null || textMaxLength <= 0) {
      return "";
    }
    int lineEnd = text.length();
    int newline = text.indexOf('\n');
    int carriage = text.indexOf('\r');
    if (newline >= 0) {
      lineEnd = newline;
    }
    if (carriage >= 0 && carriage < lineEnd) {
      lineEnd = carriage;
    }
    String line = text.substring(0, lineEnd).strip();
    if (line.length() > textMaxLength) {
      return line.substring(0, textMaxLength);
    }
    return line;
  }
}
