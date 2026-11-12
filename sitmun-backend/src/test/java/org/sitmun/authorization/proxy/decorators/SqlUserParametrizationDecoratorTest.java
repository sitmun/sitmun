package org.sitmun.authorization.proxy.decorators;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.sitmun.authorization.proxy.protocols.jdbc.JdbcPayloadDto;

class SqlUserParametrizationDecoratorTest {

  private SqlUserParametrizationDecorator decorator;

  @BeforeEach
  void setUp() {
    decorator = new SqlUserParametrizationDecorator();
  }

  @Test
  @DisplayName("accept returns true for JdbcPayloadDto")
  void acceptReturnsTrueForJdbcPayloadDto() {
    JdbcPayloadDto payload = JdbcPayloadDto.builder().sql("SELECT * FROM table").build();

    assertTrue(decorator.accept(Map.of(), payload));
  }

  @Test
  @DisplayName("addBehavior never extends the SQL")
  void addBehaviorNeverExtendsTheSql() {
    JdbcPayloadDto payload =
        JdbcPayloadDto.builder().sql("SELECT * FROM products WHERE user_id = ${userId}").build();
    String sql = payload.getSql();

    decorator.addBehavior(Map.of("userId", "123", "category", "electronics"), payload);

    assertEquals(sql, payload.getSql());
    assertTrue(payload.getParameters() == null || payload.getParameters().isEmpty());
  }
}
