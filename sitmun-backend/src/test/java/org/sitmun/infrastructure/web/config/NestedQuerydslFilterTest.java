package org.sitmun.infrastructure.web.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.sitmun.test.BaseTest;
import org.springframework.security.test.context.support.WithMockUser;

/**
 * Spring Data REST 5 drops every Querydsl filter whose key is not a top-level JSON property, so
 * nested paths such as {@code type.id} were silently ignored (#372). The admin sends these filters.
 */
@DisplayName("Nested Querydsl filters on Data REST collections")
class NestedQuerydslFilterTest extends BaseTest {

  @ParameterizedTest(name = "{0}?{1} returns only rows whose {2} matches")
  @CsvSource({
    "tasks, type.id, typeId",
    "tasks, group.id, groupId",
    "tasks, cartography.id, cartographyId",
    "user-configurations, territory.id, territoryId",
    "user-configurations, role.id, roleId",
  })
  @WithMockUser(roles = "ADMIN")
  void filtersByNestedPath(String resource, String filter, String field) throws Exception {
    List<Object> all = values(resource, "", field);
    Map<Object, Long> counts = new TreeMap<>();
    all.stream().filter(Objects::nonNull).forEach(v -> counts.merge(v, 1L, Long::sum));
    Object value =
        counts.entrySet().stream()
            .filter(e -> e.getValue() < all.size())
            .map(Map.Entry::getKey)
            .findFirst()
            .orElseThrow(
                () -> new AssertionError("seed needs " + resource + " with several " + field));

    List<Object> filtered = values(resource, "&" + filter + "=" + value, field);

    assertThat(filtered).hasSize(counts.get(value).intValue()).allMatch(value::equals);
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("A nested filter combines with a top-level one")
  void combinesNestedAndTopLevelFilters() throws Exception {
    String body = page("tasks", "");
    Integer typeId = JsonPath.read(body, "$._embedded.tasks[0].typeId");
    String name = JsonPath.read(body, "$._embedded.tasks[0].name");
    long expected =
        JsonPath.<List<Map<String, Object>>>read(body, "$._embedded.tasks[*]").stream()
            .filter(t -> typeId.equals(t.get("typeId")) && name.equals(t.get("name")))
            .count();

    List<Object> ids =
        JsonPath.read(
            page("tasks", "&type.id=" + typeId + "&name=" + name), "$._embedded.tasks[*].id");

    assertThat(ids).hasSize((int) expected);
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("A nested path that is not allowed stays ignored")
  void ignoresNestedPathsThatAreNotAllowed() throws Exception {
    int total = values("user-configurations", "", "id").size();

    assertThat(values("user-configurations", "&user.password=x", "id")).hasSize(total);
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("A top-level filter still works")
  void keepsTopLevelFilters() throws Exception {
    assertThat(values("tasks", "&name=no-task-has-this-name", "id")).isEmpty();
  }

  private List<Object> values(String resource, String query, String field) throws Exception {
    return JsonPath.read(page(resource, query), "$._embedded['" + resource + "'][*]." + field);
  }

  private String page(String resource, String query) throws Exception {
    return mvc.perform(get("/api/" + resource + "?projection=view&size=10000" + query))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString();
  }
}
