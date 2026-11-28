package org.sitmun.authorization.client.controller;

import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.sitmun.test.URIConstants.CONFIG_CLIENT_APPLICATION_TERRITORIES_URI;
import static org.sitmun.test.URIConstants.CONFIG_CLIENT_PROFILE_URI;
import static org.sitmun.test.URIConstants.CONFIG_CLIENT_TERRITORY_APPLICATIONS_URI;
import static org.sitmun.test.URIConstants.CONFIG_CLIENT_TERRITORY_URI;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

  @BeforeEach
  void blockTerritory() {
    Territory territory = territoryRepository.findById(BLOCKED_ID).orElseThrow();
    territory.setBlocked(true);
    territoryRepository.saveAndFlush(territory);
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
}
