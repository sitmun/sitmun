package org.sitmun.authorization.client.controller;

import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.sitmun.test.URIConstants.CONFIG_CLIENT_APPLICATION_TERRITORIES_URI;
import static org.sitmun.test.URIConstants.CONFIG_CLIENT_PROFILE_URI;
import static org.sitmun.test.URIConstants.CONFIG_CLIENT_TERRITORY_APPLICATIONS_URI;
import static org.sitmun.test.URIConstants.CONFIG_CLIENT_TERRITORY_URI;
import static org.sitmun.test.URIConstants.CONFIG_PROXY_URI;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.sitmun.domain.territory.Territory;
import org.sitmun.domain.territory.TerritoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** #376: a blocked territory is left out of the client territory lists and of profile access. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("Client Configuration — blocked territory")
class ClientConfigurationBlockedTerritoryTest {

  private static final int APP_ID = 10001;
  private static final int BLOCKED_ID = 10002;
  private static final String BLOCKED_NAME = "Municipio B";
  private static final int OPEN_ID = 10001;

  @Autowired private MockMvc mvc;
  @Autowired private TerritoryRepository territoryRepository;

  private static final String DASHBOARD_APPLICATIONS_URI =
      "http://localhost/api/config/client/dashboard/applications?size=100";
  private static final String DASHBOARD_SUGGESTIONS_URI =
      "http://localhost/api/config/client/dashboard/suggestions";
  private static final String SHORT_URL_URI = "http://localhost/api/config/client/short-url";

  @BeforeEach
  void blockTerritory() {
    setBlocked(true);
  }

  private void setBlocked(boolean blocked) {
    Territory territory = territoryRepository.findById(BLOCKED_ID).orElseThrow();
    territory.setBlocked(blocked);
    territoryRepository.saveAndFlush(territory);
  }

  private int dashboardTerritoryCount() throws Exception {
    String body =
        mvc.perform(get(DASHBOARD_APPLICATIONS_URI).with(user("internal")))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    java.util.List<Integer> counts =
        com.jayway.jsonpath.JsonPath.read(
            body, "$.content[?(@.id == " + APP_ID + ")].territoryCount");
    return counts.get(0);
  }

  @Test
  @DisplayName("the territory list leaves it out")
  void territoryList() throws Exception {
    mvc.perform(get(CONFIG_CLIENT_TERRITORY_URI).with(user("internal")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[*].name", not(hasItem(BLOCKED_NAME))));
  }

  @Test
  @DisplayName("the territory list of an application leaves it out")
  void applicationTerritories() throws Exception {
    mvc.perform(get(CONFIG_CLIENT_APPLICATION_TERRITORIES_URI, APP_ID).with(user("internal")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[*].name", not(hasItem(BLOCKED_NAME))));
    mvc.perform(get(CONFIG_CLIENT_APPLICATION_TERRITORIES_URI, APP_ID))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[*].name", not(hasItem(BLOCKED_NAME))));
  }

  @Test
  @DisplayName("it lists no applications")
  void territoryApplications() throws Exception {
    mvc.perform(get(CONFIG_CLIENT_TERRITORY_APPLICATIONS_URI, BLOCKED_ID).with(user("internal")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content", empty()));
  }

  @Test
  @DisplayName("its profile is forbidden, and an unblocked territory's is not")
  void profile() throws Exception {
    mvc.perform(get(CONFIG_CLIENT_PROFILE_URI, APP_ID, BLOCKED_ID))
        .andExpect(status().isForbidden());
    mvc.perform(get(CONFIG_CLIENT_PROFILE_URI, APP_ID, BLOCKED_ID).with(user("internal")))
        .andExpect(status().isForbidden());
    mvc.perform(get(CONFIG_CLIENT_PROFILE_URI, APP_ID, OPEN_ID)).andExpect(status().isOk());
  }

  @Test
  @DisplayName("the dashboard counts one territory fewer for its application")
  void dashboardCount() throws Exception {
    int blocked = dashboardTerritoryCount();
    setBlocked(false);
    int open = dashboardTerritoryCount();
    org.assertj.core.api.Assertions.assertThat(blocked).isEqualTo(open - 1);
  }

  @Test
  @DisplayName("dashboard suggestions leave it out")
  void suggestions() throws Exception {
    mvc.perform(get(DASHBOARD_SUGGESTIONS_URI + "?keywords=Municipio").with(user("internal")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.territories[*].name", not(hasItem(BLOCKED_NAME))));
    setBlocked(false);
    mvc.perform(get(DASHBOARD_SUGGESTIONS_URI + "?keywords=Municipio").with(user("internal")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.territories[*].name", hasItem(BLOCKED_NAME)));
  }

  @Test
  @DisplayName("a short URL for its map is forbidden")
  void shortUrl() throws Exception {
    String body =
        "{\"url\":\"http://localhost/viewer/public/map/" + APP_ID + "/" + BLOCKED_ID + "\"}";
    mvc.perform(post(SHORT_URL_URI).contentType(APPLICATION_JSON).content(body))
        .andExpect(status().isForbidden());
    setBlocked(false);
    mvc.perform(post(SHORT_URL_URI).contentType(APPLICATION_JSON).content(body))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "PROXY")
  @DisplayName("the proxy denies its tasks")
  void proxyTask() throws Exception {
    String body =
        """
        {"appId": %d, "terId": %d, "type": "SQL", "typeId": 10023, "method": "GET"}
        """
            .formatted(APP_ID, OPEN_ID);
    mvc.perform(post(CONFIG_PROXY_URI).contentType(APPLICATION_JSON).content(body))
        .andExpect(status().isOk());
    Territory territory = territoryRepository.findById(OPEN_ID).orElseThrow();
    territory.setBlocked(true);
    territoryRepository.saveAndFlush(territory);
    mvc.perform(post(CONFIG_PROXY_URI).contentType(APPLICATION_JSON).content(body))
        .andExpect(status().isForbidden());
  }
}
