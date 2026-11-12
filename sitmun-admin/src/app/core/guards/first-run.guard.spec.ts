import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';

import { of, throwError } from 'rxjs';

import { Principal } from '@app/core/auth/principal.service';
import { FirstRunService } from '@app/services/first-run.service';

import { firstRunPageGuard, loginGuard } from './first-run.guard';

describe('first-run guards', () => {
  let firstRun: { load: jest.Mock };
  let principal: { identity: jest.Mock };
  let router: { createUrlTree: jest.Mock };

  beforeEach(() => {
    localStorage.setItem('sitmun.firstRun.dismissed', '1');
    firstRun = {
      load: jest.fn(() => of({ firstRun: true, currentDefault: 'en' })),
    };
    principal = { identity: jest.fn(() => Promise.resolve(null)) };
    router = {
      createUrlTree: jest.fn((commands: string[]) => ({ redirect: commands[0] } as unknown as UrlTree)),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: FirstRunService, useValue: firstRun },
        { provide: Principal, useValue: principal },
        { provide: Router, useValue: router },
      ],
    });
  });

  afterEach(() => localStorage.removeItem('sitmun.firstRun.dismissed'));

  it('sends login to the stepper while setup is open, including after a saved dismissal', async () => {
    const result = await TestBed.runInInjectionContext(() => loginGuard({} as never, {} as never));

    expect(result).toEqual({ redirect: '/first-run' });
  });

  it('lets login through when setup is closed', async () => {
    firstRun.load.mockReturnValue(of({ firstRun: false, currentDefault: 'en' }));

    await expect(TestBed.runInInjectionContext(() => loginGuard({} as never, {} as never))).resolves.toBe(true);
  });

  it('keeps the stepper while setup is open', async () => {
    await expect(
      TestBed.runInInjectionContext(() => firstRunPageGuard({} as never, {} as never))
    ).resolves.toBe(true);
  });

  it('sends a closed stepper to login when nobody is signed in', async () => {
    firstRun.load.mockReturnValue(of({ firstRun: false, currentDefault: 'en' }));

    const result = await TestBed.runInInjectionContext(() => firstRunPageGuard({} as never, {} as never));

    expect(result).toEqual({ redirect: '/login' });
  });

  it('sends a closed stepper to the dashboard when a session exists', async () => {
    firstRun.load.mockReturnValue(of({ firstRun: false, currentDefault: 'en' }));
    principal.identity.mockResolvedValue({ username: 'admin' });

    const result = await TestBed.runInInjectionContext(() => firstRunPageGuard({} as never, {} as never));

    expect(result).toEqual({ redirect: '/dashboard' });
  });

  it('stays on the stepper when the password state is unknown', async () => {
    firstRun.load.mockReturnValue(throwError(() => new Error('offline')));

    await expect(
      TestBed.runInInjectionContext(() => firstRunPageGuard({} as never, {} as never))
    ).resolves.toBe(true);
  });
});
