package org.sitmun.proxy.contract;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DatasourcePayload(
    List<String> vary,
    String uri,
    String user,
    String password,
    String driver,
    String sql,
    List<String> parameters)
    implements Payload {}
