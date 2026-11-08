package org.sitmun.authorization.client.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.sitmun.authorization.access.UserApplicationAccessPolicy;
import org.sitmun.domain.DomainConstants;
import org.sitmun.domain.application.Application;
import org.sitmun.domain.application.ApplicationRepository;
import org.sitmun.domain.application.tree.ApplicationTreeRepository;
import org.sitmun.domain.background.BackgroundRepository;
import org.sitmun.domain.cartography.CartographyRepository;
import org.sitmun.domain.cartography.permission.CartographyPermissionRepository;
import org.sitmun.domain.configuration.ConfigurationParameterRepository;
import org.sitmun.domain.role.Role;
import org.sitmun.domain.role.RoleRepository;
import org.sitmun.domain.service.usage.ViewerUsage;
import org.sitmun.domain.task.Task;
import org.sitmun.domain.task.TaskRepository;
import org.sitmun.domain.task.type.TaskType;
import org.sitmun.domain.territory.Territory;
import org.sitmun.domain.territory.TerritoryRepository;
import org.sitmun.domain.tree.node.TreeNodeRepository;
import org.sitmun.infrastructure.persistence.type.i18n.TranslationService;

class AuthorizationServiceProfileTasksTest {

  @Test
  void profileTasksKeepBasicTasksAndOmitTemplatesAndMapImages() {
    TaskRepository taskRepository = mock(TaskRepository.class);
    RoleRepository roleRepository = mock(RoleRepository.class);
    ApplicationRepository applicationRepository = mock(ApplicationRepository.class);
    UserApplicationAccessPolicy accessPolicy = mock(UserApplicationAccessPolicy.class);
    when(accessPolicy.mayUseClientConfigEndpoints("viewer")).thenReturn(true);
    when(accessPolicy.mayAccessApplication(5, "viewer")).thenReturn(true);
    when(applicationRepository.findByRestrictedUserApplicationAndTerritory("viewer", 5, 7))
        .thenReturn(Optional.of(Application.builder().id(5).build()));
    TerritoryRepository territoryRepository = mock(TerritoryRepository.class);
    BackgroundRepository backgroundRepository = mock(BackgroundRepository.class);
    ApplicationTreeRepository applicationTreeRepository = mock(ApplicationTreeRepository.class);
    TreeNodeRepository treeNodeRepository = mock(TreeNodeRepository.class);
    ConfigurationParameterRepository configurationParameterRepository =
        mock(ConfigurationParameterRepository.class);
    when(roleRepository.findRolesByApplicationAndUserAndTerritory("viewer", 5, 7))
        .thenReturn(List.of(Role.builder().id(3).build()));
    when(territoryRepository.findById(7))
        .thenReturn(Optional.of(Territory.builder().id(7).build()));
    when(backgroundRepository.findActiveByApplication(5)).thenReturn(List.of());
    when(applicationTreeRepository.findByAppAndRoles(eq(5), any())).thenReturn(List.of());
    when(treeNodeRepository.findByTrees(any())).thenReturn(List.of());
    when(configurationParameterRepository.findAll()).thenReturn(List.of());

    Task template = task(401, DomainConstants.Tasks.TASK_TYPE_ID_TEMPLATE);
    Task basic = task(11, DomainConstants.Tasks.TASK_TYPE_ID_BASIC);
    Task mapImage = task(418, DomainConstants.Tasks.TASK_TYPE_ID_MAP_IMAGE);
    when(taskRepository.findByRolesAndTerritory(any(), eq(7)))
        .thenReturn(List.of(template, basic, mapImage));

    AuthorizationService service =
        new AuthorizationService(
            applicationRepository,
            territoryRepository,
            roleRepository,
            configurationParameterRepository,
            mock(CartographyPermissionRepository.class),
            mock(CartographyRepository.class),
            taskRepository,
            backgroundRepository,
            applicationTreeRepository,
            treeNodeRepository,
            mock(TranslationService.class),
            accessPolicy,
            mock(ViewerUsage.class));

    ProfileContext context =
        ProfileContext.builder()
            .username("viewer")
            .appId(5)
            .territoryId(7)
            .nodeSectionBehaviour(ProfileContext.NodeSectionBehaviour.VIRTUAL_ROOT_ALL_NODES)
            .build();

    assertThat(service.createProfile(context))
        .get()
        .extracting(Profile::getTasks)
        .isEqualTo(List.of(basic));
    assertThat(service.findTasksByUserApplicationAndTerritory("viewer", 5, 7))
        .containsExactly(template, basic, mapImage);
  }

  private static Task task(int id, int typeId) {
    return Task.builder().id(id).type(TaskType.builder().id(typeId).build()).build();
  }
}
