package org.sitmun.proxy.middleware.protocols.jdbc;

import com.fasterxml.jackson.annotation.JsonTypeName;
import java.util.ArrayList;
import java.util.List;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.sitmun.proxy.contract.JdbcParameter;
import org.sitmun.proxy.middleware.dto.PayloadDto;

@Getter
@Setter
@JsonTypeName("DatasourcePayload")
@NoArgsConstructor
public class JdbcPayloadDto extends PayloadDto implements JdbcContext {

  private String uri;
  private String user;
  private String password;
  private String driver;
  private String sql;
  private List<JdbcParameter> parameters;
  private Integer maxRows;
  private Integer timeoutSeconds;

  @Builder
  public JdbcPayloadDto(
      List<String> vary,
      String uri,
      String user,
      String password,
      String driver,
      String sql,
      List<JdbcParameter> parameters,
      Integer maxRows,
      Integer timeoutSeconds) {
    super(vary);
    this.uri = uri;
    this.user = user;
    this.password = password;
    this.driver = driver;
    this.sql = sql;
    this.parameters = parameters != null ? parameters : new ArrayList<>();
    this.maxRows = maxRows;
    this.timeoutSeconds = timeoutSeconds;
  }

  @Override
  public String describe() {
    return "DatasourcePayloadDto{"
        + "varyCount="
        + (getVary() == null ? 0 : getVary().size())
        + ", parameterCount="
        + (parameters != null ? parameters.size() : 0)
        + '}';
  }
}
