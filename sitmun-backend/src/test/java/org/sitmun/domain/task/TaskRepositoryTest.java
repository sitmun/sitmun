package org.sitmun.domain.task;

import static org.assertj.core.api.Assertions.assertThat;
import static org.sitmun.infrastructure.security.core.SecurityConstants.*;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.sitmun.domain.role.Role;
import org.sitmun.domain.role.RoleRepository;
import org.sitmun.infrastructure.persistence.type.i18n.I18nTestConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;

@DataJpaTest
@Import(I18nTestConfiguration.class)
@DisplayName("Task Repository JPA Test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class TaskRepositoryTest {

  @Autowired private TaskRepository taskRepository;

  @Autowired private RoleRepository roleRepository;

  @Test
  @DisplayName("Find tasks filtered by roles and territory")
  void findTasksByRolesAndTerritory() {
    List<Role> roles =
        roleRepository.findRolesByApplicationAndUserAndTerritory(PUBLIC_PRINCIPAL, 10001, 10001);
    List<Task> cp = taskRepository.findByRolesAndTerritory(roles, 10001);
    // Seed oracle for public app/ter 1: wrong size or missing 10042/10043 means seed pollution.
    assertThat(cp).hasSize(17);
    assertThat(cp).extracting(Task::getId).contains(10042, 10043);
  }
}
