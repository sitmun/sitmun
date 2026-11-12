import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { firstValueFrom } from 'rxjs';

import { Principal } from '@app/core/auth/principal.service';
import { FirstRunService } from '@app/services/first-run.service';

/** Wizard route while the built-in admin password is null or blank. */
export async function pendingFirstRun(
  firstRun: FirstRunService,
  router: Router,
): Promise<UrlTree | null> {
  try {
    const status = await firstValueFrom(firstRun.load());
    if (status.firstRun) {
      return router.createUrlTree(['/first-run']);
    }
  } catch {
    return null;
  }
  return null;
}

/** Sends every visitor to first-run while the admin password is still empty. */
export const firstRunGuard: CanActivateFn = async () => {
  const target = await pendingFirstRun(inject(FirstRunService), inject(Router));
  return target ?? true;
};

/** Opens the wizard before the login form while first-run is still available. */
export const loginGuard: CanActivateFn = async () => {
  const target = await pendingFirstRun(inject(FirstRunService), inject(Router));
  return target ?? true;
};

/** Keeps `/first-run` only while setup is open. A closed setup leaves the stepper. */
export const firstRunPageGuard: CanActivateFn = async () => {
  const firstRun = inject(FirstRunService);
  const router = inject(Router);
  const principal = inject(Principal);
  try {
    const status = await firstValueFrom(firstRun.load());
    if (status.firstRun) {
      return true;
    }
  } catch {
    return true;
  }
  const identity = await principal.identity();
  return router.createUrlTree([identity ? '/dashboard' : '/login']);
};
