import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { finalize, shareReplay } from 'rxjs/operators';

import { ResourceService } from '@app/core/hal/services';
import {
  SKIP_MESSAGES_INTERCEPTOR,
  SUPPRESS_HTTP_NOTIFICATION,
} from '@app/core/interceptors/messages.interceptor';

export interface SetupStatusLanguage {
  id: number;
  shortname: string;
  name: string;
  order?: number | null;
}

export interface SetupStatus {
  firstRun: boolean;
  defaultLanguage: string;
  languages: SetupStatusLanguage[];
}

@Injectable({ providedIn: 'root' })
export class SetupStatusService {
  private statusRequest$: Observable<SetupStatus> | null = null;
  private inFlight = false;

  constructor(
    private readonly http: HttpClient,
    private readonly resourceService: ResourceService,
  ) {}

  load(force = false): Observable<SetupStatus> {
    if (!this.statusRequest$ || (force && !this.inFlight)) {
      this.inFlight = true;
      this.statusRequest$ = this.http
        .get<SetupStatus>(this.api('setup/status'), {
          context: new HttpContext()
            .set(SKIP_MESSAGES_INTERCEPTOR, true)
            .set(SUPPRESS_HTTP_NOTIFICATION, true),
        })
        .pipe(
          finalize(() => {
            this.inFlight = false;
          }),
          shareReplay(1),
        );
    }
    return this.statusRequest$;
  }

  clearCache(): void {
    this.statusRequest$ = null;
  }

  private api(path: string): string {
    return `${this.resourceService.getResourceUrl().replace(/\/$/, '')}/${path}`;
  }
}
