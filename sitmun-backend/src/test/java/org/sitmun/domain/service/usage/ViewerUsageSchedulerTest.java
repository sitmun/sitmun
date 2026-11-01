package org.sitmun.domain.service.usage;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.time.Duration;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.sitmun.administration.service.access.ServiceCheckProperties;
import org.sitmun.domain.service.Service;

class ViewerUsageSchedulerTest {

  @Test
  @DisplayName("Disabled service checks do not write pending viewer usage")
  void disabledServiceCheckDoesNotFlushPendingUsage() {
    ServiceUsageStore store = mock(ServiceUsageStore.class);
    ViewerUsage usage = new ViewerUsage(store, ZoneId.of("UTC"));
    usage.record(10001, List.of(Service.builder().id(7).name("roads").build()));

    ViewerUsageScheduler scheduler = new ViewerUsageScheduler(usage, disabled());
    scheduler.shutdown();

    verify(store, never()).add(anyInt(), anyInt(), any(), any(), anyLong(), anyLong());
  }

  private static ServiceCheckProperties disabled() {
    Duration interval = Duration.ofMinutes(1);
    return new ServiceCheckProperties(
        false,
        interval,
        interval,
        1,
        1,
        interval,
        interval,
        interval,
        interval,
        interval,
        interval,
        2,
        Duration.ofMillis(1),
        500,
        200,
        65536);
  }
}
