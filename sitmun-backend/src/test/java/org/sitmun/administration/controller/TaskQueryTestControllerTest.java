package org.sitmun.administration.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.containsStringIgnoringCase;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.sitmun.administration.service.database.DatabaseConnectionService;
import org.sitmun.domain.database.DatabaseConnection;
import org.sitmun.domain.database.DatabaseConnectionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("POST /api/tasks/query/test")
class TaskQueryTestControllerTest {

  @Autowired private MockMvc mvc;
  @Autowired private DatabaseConnectionRepository databaseConnectionRepository;
  @Autowired private DatabaseConnectionService databaseConnectionService;

  private DatabaseConnection connection;
  private String jdbcUrl;

  @BeforeEach
  void connection() {
    jdbcUrl = "jdbc:h2:mem:query-test-" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1";
    DatabaseConnection created = new DatabaseConnection();
    created.setName("query-test-" + UUID.randomUUID());
    created.setDriver("org.h2.Driver");
    created.setUser("sa");
    created.setPassword("");
    created.setUrl(jdbcUrl);
    connection = databaseConnectionRepository.save(created);
  }

  @AfterEach
  void restoreCap() {
    ReflectionTestUtils.setField(databaseConnectionService, "maxRows", 1000);
  }

  @Test
  @WithMockUser(roles = "USER")
  @DisplayName("non-admin is forbidden")
  void nonAdminIsForbidden() throws Exception {
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(body("SELECT 1 AS n", "[]")))
        .andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("undeclared placeholder is 400 with the violation")
  void undeclaredPlaceholder() throws Exception {
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(body("SELECT ${x} AS echo", "[]")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].messageCode").value("UNDECLARED"))
        .andExpect(
            jsonPath("$.errors[0].message").value(org.hamcrest.Matchers.containsString("x")));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("both runs bind the client value")
  void bothRunsBindTheValue() throws Exception {
    String parameters =
        """
        [{"name":"p","label":"Echo","dataType":"string","value":""}]
        """;
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(body("SELECT ${p} AS echo", parameters, "{\"p\":\"hi\"}", "{}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.runs[0].ok").value(true))
        .andExpect(jsonPath("$.runs[0].sql").value("SELECT ? AS echo"))
        .andExpect(jsonPath("$.runs[0].values[0]").value("hi"))
        .andExpect(jsonPath("$.runs[1].ok").value(true))
        .andExpect(jsonPath("$.runs[1].label").value("Run 2 one page"))
        .andExpect(jsonPath("$.runs[1].values[0]").value("hi"));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("a provided value ignores the client")
  void providedIgnoresClient() throws Exception {
    String parameters =
        """
        [{"name":"p","label":"Echo","dataType":"string","provided":true,"value":"stored"}]
        """;
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(body("SELECT ${p} AS echo", parameters, "{\"p\":\"other\"}", "{}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.runs[0].values[0]").value("stored"));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("an operator system value binds as an integer")
  void systemValueBindsAsInteger() throws Exception {
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(body("SELECT #{TERR_ID} AS id", "[]", "{}", "{\"TERR_ID\":\"42\"}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.runs[0].values[0]").value(42));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("a paged run can fail while the written query passes")
  void pagedRunCanFail() throws Exception {
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(body("SELECT 1 AS n FETCH FIRST 5 ROWS ONLY", "[]")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.runs[0].ok").value(true))
        .andExpect(jsonPath("$.runs[1].ok").value(false))
        .andExpect(jsonPath("$.runs[1].error").isNotEmpty());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("extra rows set the truncation flag")
  void truncationFlag() throws Exception {
    try (Connection con = DriverManager.getConnection(jdbcUrl, "sa", "");
        Statement statement = con.createStatement()) {
      statement.execute("CREATE TABLE sample(id INT)");
      statement.execute("INSERT INTO sample VALUES (1), (2), (3)");
    }
    ReflectionTestUtils.setField(databaseConnectionService, "maxRows", 2);
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(body("SELECT id FROM sample", "[]")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.runs[0].truncated").value(true))
        .andExpect(jsonPath("$.runs[0].rows.length()").value(2));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("a negative limit is 400")
  void negativeLimit() throws Exception {
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(
                    """
                    {"connectionId":%d,"sql":"SELECT 1 AS n","parameters":[],"limit":-1}
                    """
                        .formatted(connection.getId())))
        .andExpect(status().isBadRequest());
  }

  @ParameterizedTest
  @CsvSource({
    "string,hola,hola",
    "integer,42,42",
    "number,3.5,3.5",
    "date,2026-11-08,",
    "timestamp,2026-11-08T21:00:00,",
    "boolean,true,true"
  })
  @WithMockUser(roles = "ADMIN")
  @DisplayName("each client data type binds")
  void eachClientDataTypeBinds(String dataType, String raw, String expected) throws Exception {
    String parameters =
        """
        [{"name":"value","label":"Value","dataType":"%s","value":""}]
        """
            .formatted(dataType);
    var result =
        mvc.perform(
                post("/api/tasks/query/test")
                    .contentType(APPLICATION_JSON)
                    .content(
                        body(
                            "SELECT ${value} AS bound",
                            parameters,
                            "{\"value\":\"" + raw + "\"}",
                            "{}")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.runs[0].ok").value(true))
            .andReturn();
    String bound =
        com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.runs[0].values[0]")
            .toString();
    if ("date".equals(dataType)) {
      org.junit.jupiter.api.Assertions.assertEquals(
          LocalDate.parse(raw).atStartOfDay(ZoneId.systemDefault()).toInstant(),
          Instant.parse(bound));
    } else if ("timestamp".equals(dataType)) {
      org.junit.jupiter.api.Assertions.assertEquals(
          LocalDateTime.parse(raw).atZone(ZoneId.systemDefault()).toInstant(),
          Instant.parse(bound));
    } else {
      org.junit.jupiter.api.Assertions.assertEquals(expected, bound);
    }
  }

  @ParameterizedTest
  @CsvSource({
    "integer,no,Invalid integer value",
    "date,08/11/2026,Invalid date value",
    "boolean,yes,Invalid boolean value"
  })
  @WithMockUser(roles = "ADMIN")
  @DisplayName("an invalid client value is 400")
  void invalidClientValue(String dataType, String raw, String detail) throws Exception {
    String parameters =
        """
        [{"name":"value","label":"Value","dataType":"%s","value":""}]
        """
            .formatted(dataType);
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(
                    body(
                        "SELECT ${value} AS value",
                        parameters,
                        "{\"value\":\"" + raw + "\"}",
                        "{}")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.detail").value(detail));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("a blank client value uses the stored value")
  void blankClientUsesStoredValue() throws Exception {
    String parameters =
        """
        [{"name":"p","label":"Echo","dataType":"string","value":"stored"}]
        """;
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(body("SELECT ${p} AS echo", parameters, "{}", "{}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.runs[0].values[0]").value("stored"));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("a missing required value is 400")
  void missingRequiredValue() throws Exception {
    String parameters =
        """
        [{"name":"p","label":"Echo","dataType":"string","value":""}]
        """;
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(body("SELECT ${p} AS echo", parameters, "{}", "{}")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.detail").value(containsString("Missing value")));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("an optional value binds null when missing")
  void optionalBindsNull() throws Exception {
    String parameters =
        """
        [{"name":"p","label":"Echo","dataType":"string","optional":true,"value":""}]
        """;
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(body("SELECT ${p} AS echo", parameters, "{}", "{}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.runs[0].ok").value(true))
        .andExpect(jsonPath("$.runs[0].values[0]").value(nullValue()));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("a territory code stays a string")
  void territoryCodeStaysAString() throws Exception {
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(
                    body("SELECT #{TERR_COD} AS code", "[]", "{}", "{\"TERR_COD\":\"60001\"}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.runs[0].values[0]").value("60001"));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("DATE binds an ISO timestamp and rejects a formatted one")
  void dateBindsIsoTimestamp() throws Exception {
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(
                    body(
                        "SELECT #{DATE} AS now", "[]", "{}", "{\"DATE\":\"2026-11-08T21:00:00\"}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.runs[0].ok").value(true))
        .andExpect(jsonPath("$.runs[0].values[0]", containsString("2026-11-08")));
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(
                    body(
                        "SELECT #{DATE} AS now", "[]", "{}", "{\"DATE\":\"08/11/2026 21:00:00\"}")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.detail").value("Invalid timestamp value"));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("MUN_INES expands to one placeholder per code and an empty list binds null")
  void munInesExpands() throws Exception {
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(
                    body(
                        "SELECT 'x' AS n WHERE 'a' IN (#{MUN_INES})",
                        "[]",
                        "{}",
                        "{\"MUN_INES\":\"a,b\"}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.runs[0].sql").value("SELECT 'x' AS n WHERE 'a' IN (?, ?)"))
        .andExpect(jsonPath("$.runs[0].values[0]").value("a"))
        .andExpect(jsonPath("$.runs[0].values[1]").value("b"));
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(
                    body(
                        "SELECT 'x' AS n WHERE 'a' IN (#{MUN_INES})",
                        "[]",
                        "{}",
                        "{\"MUN_INES\":\"\"}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.runs[0].sql").value("SELECT 'x' AS n WHERE 'a' IN (?)"))
        .andExpect(jsonPath("$.runs[0].values[0]").value(nullValue()));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("a client value and a system value bind together")
  void clientAndSystemBindTogether() throws Exception {
    String parameters =
        """
        [{"name":"name","label":"Name","dataType":"string","value":""}]
        """;
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(
                    body(
                        "SELECT ${name} AS name, #{APP_ID} AS app",
                        parameters,
                        "{\"name\":\"hi\"}",
                        "{\"APP_ID\":\"1\"}")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.runs[0].values[0]").value("hi"))
        .andExpect(jsonPath("$.runs[0].values[1]").value(1));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("the requested page is appended only to the second run")
  void requestedPageIsAppended() throws Exception {
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(body("SELECT 1 AS n", "[]", "{}", "{}", 2, 1)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.runs[0].sql", not(containsString("OFFSET"))))
        .andExpect(
            jsonPath("$.runs[1].sql").value("SELECT 1 AS n OFFSET 1 ROWS FETCH NEXT 2 ROWS ONLY"));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("an unknown table fails both runs with the database message")
  void unknownTableFailsBothRuns() throws Exception {
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(body("SELECT * FROM table_that_does_not_exist", "[]")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.runs[0].ok").value(false))
        .andExpect(jsonPath("$.runs[1].ok").value(false))
        .andExpect(
            jsonPath("$.runs[0].error", containsStringIgnoringCase("table_that_does_not_exist")));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("a missing connection is 404 without a stack trace")
  void missingConnection() throws Exception {
    mvc.perform(
            post("/api/tasks/query/test")
                .contentType(APPLICATION_JSON)
                .content(
                    """
                    {"connectionId":-1,"sql":"SELECT 1 AS n","parameters":[]}
                    """))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.detail").value("Connection not found"))
        .andExpect(jsonPath("$.trace").doesNotExist());
  }

  private String body(String sql, String parameters) {
    return body(sql, parameters, "{}", "{}");
  }

  private String body(String sql, String parameters, String clientValues, String systemValues) {
    return body(sql, parameters, clientValues, systemValues, null, null);
  }

  private String body(
      String sql,
      String parameters,
      String clientValues,
      String systemValues,
      Integer limit,
      Integer offset) {
    String paging = "";
    if (limit != null && offset != null) {
      paging = ",\"limit\":" + limit + ",\"offset\":" + offset;
    }
    return """
        {"connectionId":%d,"sql":"%s","parameters":%s,"clientValues":%s,"systemValues":%s%s}
        """
        .formatted(
            connection.getId(),
            sql.replace("\"", "\\\""),
            parameters,
            clientValues,
            systemValues,
            paging);
  }
}
