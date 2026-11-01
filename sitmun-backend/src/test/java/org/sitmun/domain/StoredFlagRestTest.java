package org.sitmun.domain;

import static org.sitmun.test.URIConstants.APPLICATIONS_URI;
import static org.sitmun.test.URIConstants.APPLICATION_URI;
import static org.sitmun.test.URIConstants.CODELIST_VALUES_URI;
import static org.sitmun.test.URIConstants.SERVICES_URI;
import static org.sitmun.test.URIConstants.SERVICE_URI;
import static org.sitmun.test.URIConstants.TREE_NODES_URI;
import static org.sitmun.test.URIConstants.TREE_NODE_URI;
import static org.sitmun.test.URIConstants.USER_URI;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Stored flag and length REST contract")
class StoredFlagRestTest {

  @Autowired private MockMvc mvc;

  private String applicationUri;
  private String serviceUri;
  private String treeNodeUri;
  private String codeListUri;
  private String userUri;

  @AfterEach
  @WithMockUser(roles = "ADMIN")
  void cleanup() throws Exception {
    deleteIfPresent(applicationUri);
    deleteIfPresent(serviceUri);
    deleteIfPresent(treeNodeUri);
    deleteIfPresent(codeListUri);
    deleteIfPresent(userUri);
  }

  @Test
  @DisplayName("POST application stores isUnavailable null as false")
  @WithMockUser(roles = "ADMIN")
  void unavailableNullIsStoredFalse() throws Exception {
    MvcResult result =
        mvc.perform(
                post(APPLICATIONS_URI)
                    .contentType(APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name": "null-flag-app",
                          "type": "I",
                          "isUnavailable": null
                        }"""))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.isUnavailable").value(false))
            .andReturn();
    Integer id =
        JsonPath.parse(result.getResponse().getContentAsString()).read("$.id", Integer.class);
    applicationUri = APPLICATION_URI.replace("{0}", id.toString());
    mvc.perform(get(applicationUri))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.isUnavailable").value(false));
  }

  @Test
  @DisplayName("POST service stores isProxied null as false")
  @WithMockUser(roles = "ADMIN")
  void proxiedNullIsStoredFalse() throws Exception {
    MvcResult result =
        mvc.perform(
                post(SERVICES_URI)
                    .contentType(APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name": "null-flag-service",
                          "type": "WMS",
                          "serviceURL": "https://www.example.com",
                          "blocked": false,
                          "isProxied": null
                        }"""))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.isProxied").value(false))
            .andReturn();
    Integer id =
        JsonPath.parse(result.getResponse().getContentAsString()).read("$.id", Integer.class);
    serviceUri = SERVICE_URI.replace("{0}", id.toString());
  }

  @Test
  @DisplayName("POST code list stores system null as false")
  @WithMockUser(roles = "ADMIN")
  void systemNullIsStoredFalse() throws Exception {
    MvcResult result =
        mvc.perform(
                post(CODELIST_VALUES_URI)
                    .contentType(APPLICATION_JSON)
                    .content(
                        """
                        {
                        "codeListName": "storedFlag.list",
                        "value": "A",
                        "description": "flag",
                        "system": null,
                        "defaultCode": false
                        }"""))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.system").value(false))
            .andReturn();
    Integer id =
        JsonPath.parse(result.getResponse().getContentAsString()).read("$.id", Integer.class);
    codeListUri = CODELIST_VALUES_URI + "/" + id;
  }

  @Test
  @DisplayName("POST tree node stores filterGetMap null as false")
  @WithMockUser(roles = "ADMIN")
  void filterGetMapNullIsStoredFalse() throws Exception {
    MvcResult result =
        mvc.perform(
                post(TREE_NODES_URI)
                    .contentType(APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name": "null-filter",
                          "tree": "http://localhost/api/trees/10001",
                          "filterGetMap": null
                        }"""))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.filterGetMap").value(false))
            .andReturn();
    Integer id =
        JsonPath.parse(result.getResponse().getContentAsString()).read("$.id", Integer.class);
    treeNodeUri = TREE_NODE_URI.replace("{0}", id.toString());
  }

  @Test
  @DisplayName("POST code list rejects a 51 character name")
  @WithMockUser(roles = "ADMIN")
  void codeListNameOf51IsRejected() throws Exception {
    mvc.perform(
            post(CODELIST_VALUES_URI)
                .contentType(APPLICATION_JSON)
                .content(
                    """
                    {
                      "codeListName": "%s",
                      "value": "A",
                      "description": "flag",
                      "defaultCode": false
                    }"""
                        .formatted("n".repeat(51))))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("POST user rejects a 251 character email")
  @WithMockUser(roles = "ADMIN")
  void userEmailOf251IsRejected() throws Exception {
    mvc.perform(
            post(USER_URI)
                .contentType(APPLICATION_JSON)
                .content(
                    """
                    {
                      "username": "long-email-user",
                      "administrator": false,
                      "blocked": false,
                      "email": "%s@example.com"
                    }"""
                        .formatted("a".repeat(239))))
        .andExpect(status().isBadRequest());
  }

  private void deleteIfPresent(String uri) throws Exception {
    if (uri != null) {
      mvc.perform(delete(uri));
    }
  }
}
