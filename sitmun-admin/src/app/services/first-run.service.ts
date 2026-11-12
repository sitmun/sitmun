import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { ResourceService } from '@app/core/hal/services';
import { SUPPRESS_HTTP_NOTIFICATION } from '@app/core/interceptors/messages.interceptor';

import { SetupStatusService } from './setup-status.service';

export const PASSWORD_CHANGED_KEY = 'sitmun.passwordChanged';

export interface FirstRunStatus {
  firstRun: boolean;
  currentDefault: string;
}

export interface FirstRunSaveRequest {
  language?: string | null;
  password?: string | null;
}

export interface FirstRunSaveResponse {
  firstRun: boolean;
  passwordChanged: boolean;
}

@Injectable({ providedIn: 'root' })
export class FirstRunService {
  constructor(
    private readonly http: HttpClient,
    private readonly resourceService: ResourceService,
    private readonly setupStatus: SetupStatusService,
  ) {}

  load(force = false): Observable<FirstRunStatus> {
    return this.setupStatus.load(force).pipe(
      map((status) => ({ firstRun: status.firstRun, currentDefault: status.defaultLanguage })),
    );
  }

  clearCache(): void {
    this.setupStatus.clearCache();
  }

  save(body: FirstRunSaveRequest): Observable<FirstRunSaveResponse> {
    return this.http.post<FirstRunSaveResponse>(this.api('setup/first-run'), body, {
      context: new HttpContext().set(SUPPRESS_HTTP_NOTIFICATION, true),
    }).pipe(
      tap(() => this.setupStatus.clearCache()),
      switchMap((response) => this.setupStatus.load(true).pipe(map(() => response))),
    );
  }

  private api(path: string): string {
    return `${this.resourceService.getResourceUrl().replace(/\/$/, '')}/${path}`;
  }
}
