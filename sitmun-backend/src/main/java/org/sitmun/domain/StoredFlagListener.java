package org.sitmun.domain;

import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Transient;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import org.sitmun.domain.tree.node.TreeNode;
import org.sitmun.infrastructure.persistence.type.i18n.Language;

/** Stores a null persisted flag as false, except the flags that already default to true. */
public class StoredFlagListener {

  @PrePersist
  @PreUpdate
  public void fillNullFlags(Object entity) {
    Class<?> type = entity.getClass();
    while (type != null && type != Object.class) {
      for (Field field : type.getDeclaredFields()) {
        if (field.getType() != Boolean.class || Modifier.isStatic(field.getModifiers())) {
          continue;
        }
        if (field.getAnnotation(Transient.class) != null) {
          continue;
        }
        field.setAccessible(true);
        try {
          if (field.get(entity) == null) {
            field.set(entity, defaultFor(entity, field.getName()));
          }
        } catch (IllegalAccessException exception) {
          throw new IllegalStateException(exception);
        }
      }
      type = type.getSuperclass();
    }
  }

  private static Boolean defaultFor(Object entity, String name) {
    if (entity instanceof Language && "enabled".equals(name)) {
      return Boolean.TRUE;
    }
    if (entity instanceof TreeNode && "visible".equals(name)) {
      return Boolean.TRUE;
    }
    return Boolean.FALSE;
  }
}
