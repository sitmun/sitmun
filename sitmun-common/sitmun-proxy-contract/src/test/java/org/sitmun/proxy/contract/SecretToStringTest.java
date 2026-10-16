package org.sitmun.proxy.contract;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SecretToStringTest {

  private final ObjectMapper json = new ObjectMapper();

  @Test
  void httpSecurityToStringOmitsSecrets() {
    HttpSecurityDto security =
        new HttpSecurityDto(
            "basic",
            "Bearer",
            "alice",
            "s3cret",
            Map.of("Authorization", "Bearer tok"),
            Map.of("access_token", "tok"));

    assertThat(security.toString())
        .isEqualTo("HttpSecurityDto[type=basic, scheme=Bearer, username=alice]");
  }

  @Test
  void datasourceToStringOmitsSecretsAndPrintsParameterCount() {
    DatasourcePayload payload =
        new DatasourcePayload(
            List.of("param1"),
            "jdbc:postgresql://localhost:5432/testdb",
            "dbuser",
            "dbpass",
            "org.postgresql.Driver",
            "SELECT * FROM test_table",
            List.of("1"));

    assertThat(payload.toString())
        .isEqualTo(
            "DatasourcePayload[vary=[param1], uri=jdbc:postgresql://localhost:5432/testdb, driver=org.postgresql.Driver, parameterCount=1]");
  }

  @Test
  void jacksonStillWritesThePassword() throws JsonProcessingException {
    HttpSecurityDto security =
        new HttpSecurityDto("basic", "Bearer", "alice", "s3cret", Map.of(), Map.of());
    DatasourcePayload payload =
        new DatasourcePayload(
            List.of(), "jdbc:example", "dbuser", "dbpass", "driver", "select 1", List.of());

    assertThat(json.writeValueAsString(security)).contains("s3cret");
    assertThat(json.writeValueAsString(payload)).contains("dbpass");
  }
}
