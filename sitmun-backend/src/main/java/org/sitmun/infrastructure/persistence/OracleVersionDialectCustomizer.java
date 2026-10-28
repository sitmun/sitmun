package org.sitmun.infrastructure.persistence;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/** Applies {@code SITMUN_ORACLE_VERSION} when the oracle profile is active. */
@Component
@Profile("oracle")
public class OracleVersionDialectCustomizer implements HibernatePropertiesCustomizer {

  private final String version;

  public OracleVersionDialectCustomizer(@Value("${sitmun.db.oracle.version:19}") String version) {
    this.version = version;
  }

  @Override
  public void customize(Map<String, Object> hibernateProperties) {
    hibernateProperties.put("hibernate.dialect", OracleDialectChoice.dialectClass(version));
  }
}
