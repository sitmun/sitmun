package org.sitmun.authorization.proxy.decorators;

import java.util.Map;
import org.sitmun.authorization.proxy.dto.PayloadDto;
import org.sitmun.authorization.proxy.protocols.jdbc.JdbcPayloadDto;
import org.springframework.stereotype.Component;

/**
 * JDBC tasks are bound by {@code SqlTaskBinder}. This decorator must not append client keys to the
 * SQL text.
 */
@Component
public class SqlUserParametrizationDecorator implements Decorator<Map<String, String>> {

  @Override
  public boolean accept(Map<String, String> target, PayloadDto payload) {
    return payload instanceof JdbcPayloadDto;
  }

  @Override
  public void addBehavior(Map<String, String> target, PayloadDto payload) {}
}
