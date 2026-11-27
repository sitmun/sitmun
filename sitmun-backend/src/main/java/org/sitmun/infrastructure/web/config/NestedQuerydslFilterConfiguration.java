package org.sitmun.infrastructure.web.config;

import com.querydsl.core.types.Predicate;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import org.jspecify.annotations.NonNull;
import org.sitmun.domain.task.Task;
import org.sitmun.domain.user.configuration.UserConfiguration;
import org.springframework.beans.factory.BeanFactory;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.MethodParameter;
import org.springframework.data.core.TypeInformation;
import org.springframework.data.mapping.PersistentProperty;
import org.springframework.data.mapping.context.PersistentEntities;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;
import org.springframework.data.querydsl.QuerydslRepositoryInvokerAdapter;
import org.springframework.data.querydsl.binding.QuerydslBindingsFactory;
import org.springframework.data.querydsl.binding.QuerydslPredicate;
import org.springframework.data.querydsl.binding.QuerydslPredicateBuilder;
import org.springframework.data.repository.support.Repositories;
import org.springframework.data.repository.support.RepositoryInvoker;
import org.springframework.data.repository.support.RepositoryInvokerFactory;
import org.springframework.data.rest.webmvc.config.RepositoryRestMvcConfiguration;
import org.springframework.data.rest.webmvc.config.ResourceMetadataHandlerMethodArgumentResolver;
import org.springframework.data.rest.webmvc.config.RootResourceInformationHandlerMethodArgumentResolver;
import org.springframework.data.rest.webmvc.json.MappedJacksonProperties;
import org.springframework.format.support.DefaultFormattingConversionService;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/**
 * Restores the nested Querydsl filters the admin sends, such as {@code /api/tasks?type.id=5}.
 *
 * <p>Spring Data REST 5 keeps a Querydsl filter only when its key is a top-level property in the
 * entity's JSON, so every dotted path was dropped and the collection came back unfiltered (#372).
 * That check stops clients filtering on fields the API hides. This resolver keeps it for every
 * other key, and also accepts the dotted paths listed in {@link #NESTED_PATHS}. Add a path there
 * only when it leads to an id or another value the API already shows.
 */
@Configuration
public class NestedQuerydslFilterConfiguration {

  static final Map<Class<?>, Set<String>> NESTED_PATHS =
      Map.of(
          Task.class, Set.of("type.id", "group.id", "cartography.id"),
          UserConfiguration.class, Set.of("territory.id", "role.id"));

  @Bean
  static BeanPostProcessor nestedQuerydslFilterResolver(BeanFactory beanFactory) {
    return new BeanPostProcessor() {
      @Override
      public @NonNull Object postProcessAfterInitialization(
          @NonNull Object bean, @NonNull String name) {
        if (bean instanceof RootResourceInformationHandlerMethodArgumentResolver
            && !(bean instanceof NestedPathResolver)) {
          return new NestedPathResolver(beanFactory);
        }
        return bean;
      }
    };
  }

  static final class NestedPathResolver
      extends RootResourceInformationHandlerMethodArgumentResolver {

    private final Repositories repositories;
    private final QuerydslBindingsFactory bindingsFactory;
    private final QuerydslPredicateBuilder predicateBuilder;
    private final PersistentEntities entities;
    private final BeanFactory beanFactory;

    NestedPathResolver(BeanFactory beanFactory) {
      super(
          beanFactory.getBean(Repositories.class),
          beanFactory.getBean("repositoryInvokerFactory", RepositoryInvokerFactory.class),
          beanFactory.getBean(ResourceMetadataHandlerMethodArgumentResolver.class));
      this.beanFactory = beanFactory;
      this.repositories = beanFactory.getBean(Repositories.class);
      this.bindingsFactory = beanFactory.getBean(QuerydslBindingsFactory.class);
      this.predicateBuilder =
          new QuerydslPredicateBuilder(
              new DefaultFormattingConversionService(), bindingsFactory.getEntityPathResolver());
      this.entities = beanFactory.getBean(PersistentEntities.class);
    }

    @Override
    @SuppressWarnings("unchecked")
    protected @NonNull RepositoryInvoker postProcess(
        @NonNull MethodParameter parameter,
        @NonNull RepositoryInvoker invoker,
        @NonNull Class<?> domainType,
        @NonNull Map<String, String[]> parameters) {
      if (!parameter.hasParameterAnnotation(QuerydslPredicate.class)
          || !(repositories.getRepositoryFor(domainType).orElse(null)
              instanceof QuerydslPredicateExecutor<?> executor)) {
        return invoker;
      }
      TypeInformation<?> type = TypeInformation.of(domainType);
      Predicate predicate =
          predicateBuilder.getPredicate(
              type, filterKeys(domainType, parameters), bindingsFactory.createBindingsFor(type));
      return predicate == null
          ? invoker
          : new QuerydslRepositoryInvokerAdapter(
              invoker, (QuerydslPredicateExecutor<Object>) executor, predicate);
    }

    /** Spring Data REST's top-level JSON check, plus the allowed nested paths. */
    private MultiValueMap<String, String> filterKeys(
        Class<?> domainType, Map<String, String[]> parameters) {
      Set<String> nested = NESTED_PATHS.getOrDefault(domainType, Set.of());
      MappedJacksonProperties visible =
          entities
              .getPersistentEntity(domainType)
              .map(
                  entity ->
                      MappedJacksonProperties.forSerialization(
                          entity,
                          beanFactory.getBean(RepositoryRestMvcConfiguration.class).objectMapper()))
              .orElse(null);
      MultiValueMap<String, String> kept = new LinkedMultiValueMap<>();
      parameters.forEach(
          (key, values) -> {
            if (nested.contains(key) || visible == null) {
              kept.put(key, Arrays.asList(values));
              return;
            }
            PersistentProperty<?> property = visible.getPersistentProperty(key);
            if (property != null) {
              kept.put(property.getName(), Arrays.asList(values));
            }
          });
      return kept;
    }
  }
}
