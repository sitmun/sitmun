import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, of, throwError } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';

import { ResourceService } from '@app/core/hal/services';
import {
  SKIP_MESSAGES_INTERCEPTOR,
  SUPPRESS_HTTP_NOTIFICATION,
} from '@app/core/interceptors/messages.interceptor';

export const PASSWORD_CHANGED_KEY = 'sitmun.passwordChanged';

export interface FirstRunStatus {
  firstRun: boolean;
  currentDefault: string;
}

export interface FirstRunSaveRequest {
  language?: string | null;
  continueOnMissingTranslations: boolean;
  password?: string | null;
}

export interface FirstRunSaveResponse {
  firstRun: boolean;
  passwordChanged: boolean;
}

@Injectable({ providedIn: 'root' })
export class FirstRunService {
  private statusRequest$: Observable<FirstRunStatus> | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly resourceService: ResourceService,
  ) {}

  load(force = false): Observable<FirstRunStatus> {
    if (force || !this.statusRequest$) {
      this.statusRequest$ = this.http
        .get<FirstRunStatus>(this.api('setup/first-run'), {
          context: new HttpContext()
            .set(SKIP_MESSAGES_INTERCEPTOR, true)
            .set(SUPPRESS_HTTP_NOTIFICATION, true),
        })
        .pipe(
          catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse && error.status === 404) {
              return of({ firstRun: false, currentDefault: '' });
            }
            return throwError(() => error);
          }),
          shareReplay(1),
        );
    }
    return this.statusRequest$;
  }

  clearCache(): void {
    this.statusRequest$ = null;
  }

  save(body: FirstRunSaveRequest): Observable<FirstRunSaveResponse> {
    return this.http.post<FirstRunSaveResponse>(this.api('setup/first-run'), body, {
      context: new HttpContext().set(SUPPRESS_HTTP_NOTIFICATION, true),
    });
  }

  private api(path: string): string {
    return `${this.resourceService.getResourceUrl().replace(/\/$/, '')}/${path}`;
  }
}
