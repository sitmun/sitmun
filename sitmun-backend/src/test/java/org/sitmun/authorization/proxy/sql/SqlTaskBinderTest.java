package org.sitmun.authorization.proxy.sql;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.sql.Types;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.sitmun.authorization.proxy.exception.BadRequestException;
import org.sitmun.authorization.proxy.service.RequestCoordinates;
import org.sitmun.domain.task.parameter.TaskParameter;
import org.sitmun.infrastructure.variables.SystemVariableResolver;

@ExtendWith(MockitoExtension.class)
class SqlTaskBinderTest {

  @Mock private SystemVariableResolver resolver;

  private SqlTaskBinder binder;

  @BeforeEach
  void setUp() {
    binder = new SqlTaskBinder(resolver);
    when(resolver.getAvailableVariables())
        .thenReturn(Map.of("TERR_ID", "id", "USER_NAME", "name", "MUN_INES", "codes"));
  }

  @Test
  void bindsTerritoryIdAsIntegerAndQuotedUserName() {
    when(resolver.resolveValue("TERR_ID", null)).thenReturn(4);
    when(resolver.resolveValue("USER_NAME", null)).thenReturn("O'Brien");

    BoundSql bound =
        binder.bind(
            "SELECT * FROM t WHERE id = #{TERR_ID} AND name = '#{USER_NAME}'",
            List.of(),
            Map.of(),
            null);

    assertThat(bound.sql()).isEqualTo("SELECT * FROM t WHERE id = ? AND name = ?");
    assertThat(bound.parameters()).hasSize(2);
    assertThat(bound.parameters().get(0).sqlType()).isEqualTo(Types.INTEGER);
    assertThat(bound.parameters().get(0).value()).isEqualTo(4);
    assertThat(bound.parameters().get(1).value()).isEqualTo("O'Brien");
  }

  @Test
  void expandsMunInesAndBindsNullWhenEmpty() {
    when(resolver.resolveValue("MUN_INES", null)).thenReturn("08019,08020");
    BoundSql codes =
        binder.bind("SELECT * FROM t WHERE code IN (#{MUN_INES})", List.of(), Map.of(), null);
    assertThat(codes.sql()).isEqualTo("SELECT * FROM t WHERE code IN (?, ?)");
    assertThat(codes.parameters())
        .extracting(parameter -> parameter.value())
        .containsExactly("08019", "08020");

    when(resolver.resolveValue("MUN_INES", null)).thenReturn("");
    BoundSql empty =
        binder.bind("SELECT * FROM t WHERE code IN (#{MUN_INES})", List.of(), Map.of(), null);
    assertThat(empty.sql()).isEqualTo("SELECT * FROM t WHERE code IN (?)");
    assertThat(empty.parameters().get(0).value()).isNull();
  }

  @Test
  void ignoresProvidedClientValueAndRejectsMissingMandatory() {
    TaskParameter provided =
        new TaskParameter("agency", "CIME", null, "string", true, true, "Agency", null, Map.of());
    TaskParameter mandatory =
        new TaskParameter("owner", null, null, "string", true, false, "Owner", null, Map.of());

    BoundSql bound =
        binder.bind(
            "SELECT * FROM t WHERE agency = ${agency}",
            List.of(provided),
            Map.of("agency", "client"),
            null);
    assertThat(bound.parameters().get(0).value()).isEqualTo("CIME");

    assertThatThrownBy(
            () ->
                binder.bind(
                    "SELECT * FROM t WHERE owner = ${owner}",
                    List.of(mandatory),
                    Map.of(),
                    (RequestCoordinates) null))
        .isInstanceOf(BadRequestException.class);
  }

  @Test
  void optionalMissingBindsTypedNull() {
    TaskParameter optional =
        new TaskParameter(
            "owner",
            null,
            null,
            null,
            null,
            false,
            "Owner",
            null,
            Map.of("optional", true, "dataType", "integer"));

    BoundSql bound =
        binder.bind("SELECT * FROM t WHERE owner = ${owner}", List.of(optional), Map.of(), null);

    assertThat(bound.parameters().get(0).sqlType()).isEqualTo(Types.INTEGER);
    assertThat(bound.parameters().get(0).value()).isNull();
  }
}
