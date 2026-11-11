package org.sitmun.infrastructure.startup;

import java.util.Optional;
import org.apache.commons.lang3.StringUtils;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Environment values that run the first-run wizard at startup. */
@Component
@ConfigurationProperties(prefix = "sitmun.startup.first-run")
public class FirstRunStartupProperties {

  private String adminPassword;
  private String language;

  public String getAdminPassword() {
    return adminPassword;
  }

  public void setAdminPassword(String adminPassword) {
    this.adminPassword = adminPassword;
  }

  public String getLanguage() {
    return language;
  }

  public void setLanguage(String language) {
    this.language = language;
  }

  public Optional<String> normalizedAdminPassword() {
    return Optional.ofNullable(StringUtils.trimToNull(adminPassword));
  }

  public Optional<String> normalizedLanguage() {
    return Optional.ofNullable(StringUtils.trimToNull(language));
  }

  /** A password or a language is enough to attempt setup. */
  public boolean isConfigured() {
    return normalizedAdminPassword().isPresent() || normalizedLanguage().isPresent();
  }

  @Override
  public String toString() {
    return "FirstRunStartupProperties{adminPasswordConfigured="
        + normalizedAdminPassword().isPresent()
        + ", language="
        + normalizedLanguage().orElse("")
        + '}';
  }
}
