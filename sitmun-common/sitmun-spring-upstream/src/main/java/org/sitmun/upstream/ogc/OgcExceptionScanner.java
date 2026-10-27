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
      if (!advanceToFirstStart(reader)) {
        return OgcExceptionScan.none();
      }
      String root = reader.getLocalName();
      if ("ServiceExceptionReport".equals(root)) {
        return serviceExceptionReport(reader, textMaxLength);
      }
      if ("ExceptionReport".equals(root)) {
        return exceptionReport(reader, textMaxLength);
      }
      if ("ServiceException".equals(root)) {
        return serviceException(reader, textMaxLength);
      }
      return OgcExceptionScan.none();
    } finally {
      reader.close();
    }
  }

  private static boolean advanceToFirstStart(XMLStreamReader reader) throws XMLStreamException {
    while (reader.hasNext()) {
      int event = reader.next();
      if (event == XMLStreamConstants.START_ELEMENT) {
        return true;
      }
    }
    return false;
  }

  private static OgcExceptionScan serviceExceptionReport(XMLStreamReader reader, int textMaxLength)
      throws XMLStreamException {
    String code = null;
    String text = null;
    try {
      while (reader.hasNext()) {
        int event = reader.next();
        if (event == XMLStreamConstants.START_ELEMENT
            && "ServiceException".equals(reader.getLocalName())) {
          code = readAttribute(reader, "code");
          text = reader.getElementText();
          break;
        }
      }
    } catch (XMLStreamException ex) {
      return partial(code, text, textMaxLength, ex);
    }
    return finish(code, text, textMaxLength);
  }

  private static OgcExceptionScan exceptionReport(XMLStreamReader reader, int textMaxLength)
      throws XMLStreamException {
    String code = null;
    String text = null;
    try {
      while (reader.hasNext()) {
        int event = reader.next();
        if (event != XMLStreamConstants.START_ELEMENT) {
          continue;
        }
        String local = reader.getLocalName();
        if ("Exception".equals(local) && code == null) {
          code = readAttribute(reader, "exceptionCode");
        }
        if ("ExceptionText".equals(local)) {
          text = reader.getElementText();
          break;
        }
      }
    } catch (XMLStreamException ex) {
      return partial(code, text, textMaxLength, ex);
    }
    return finish(code, text, textMaxLength);
  }

  private static OgcExceptionScan serviceException(XMLStreamReader reader, int textMaxLength)
      throws XMLStreamException {
    String code = readAttribute(reader, "code");
    String text = null;
    try {
      text = reader.getElementText();
    } catch (XMLStreamException ex) {
      return partial(code, text, textMaxLength, ex);
    }
    return finish(code, text, textMaxLength);
  }

  private static OgcExceptionScan partial(
      String code, String text, int textMaxLength, XMLStreamException ex)
      throws XMLStreamException {
    if (blank(code) && blank(text)) {
      throw ex;
    }
    return finish(code, text, textMaxLength);
  }

  private static OgcExceptionScan finish(String code, String text, int textMaxLength) {
    if (blank(code) && blank(text)) {
      return OgcExceptionScan.none();
    }
    return new OgcExceptionScan(blank(code) ? null : code, cut(collapse(text), textMaxLength));
  }

  private static String readAttribute(XMLStreamReader reader, String name) {
    String value = reader.getAttributeValue(null, name);
    if (value == null || value.isBlank()) {
      return null;
    }
    return value;
  }

  private static String collapse(String text) {
    if (text == null) {
      return null;
    }
    return text.replaceAll("\\s+", " ").strip();
  }

  private static boolean blank(String value) {
    return value == null || value.isBlank();
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
