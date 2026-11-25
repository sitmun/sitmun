package org.sitmun.authorization.client.controller;

import static org.hamcrest.Matchers.hasItem;
import static org.sitmun.test.URIConstants.CONFIG_CLIENT_PROFILE_URI;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/** The removed {@code sitmun.proxy-middleware.force} setting must not proxy services (#389). */
@SpringBootTest(properties = "sitmun.proxy-middleware.force=true")
@AutoConfigureMockMvc
@DisplayName("API Authorization and Configuration - removed proxy force setting")
class ClientConfigurationProxyForceRemovedTest {

  @Autowired private MockMvc mvc;

  @Test
  @DisplayName("GET: A service without Usar proxy SITMUN keeps its own URL")
  void serviceKeepsItsOwnUrl() throws Exception {
    mvc.perform(get(CONFIG_CLIENT_PROFILE_URI, 10001, 10001))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath(
                "$.services[?(@.id=='service/10001')].url",
                hasItem("https://geoserveis.icgc.cat/icc_mapesmultibase/utm/wmts/service")))
        .andExpect(jsonPath("$.services[?(@.id=='service/10001')].isProxied", hasItem(false)));
  }
}
