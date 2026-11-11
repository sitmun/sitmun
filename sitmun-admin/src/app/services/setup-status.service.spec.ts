import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ResourceService } from '@app/core/hal/services';

import { SetupStatusService } from './setup-status.service';

describe('SetupStatusService', () => {
  let service: SetupStatusService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        SetupStatusService,
        { provide: ResourceService, useValue: { getResourceUrl: () => 'http://localhost:8080/api/' } },
      ],
    });
    service = TestBed.inject(SetupStatusService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('requests setup status once until forced', () => {
    const body = {
      firstRun: true,
      defaultLanguage: 'en',
      languages: [{ id: 1, shortname: 'en', name: 'English', order: 0 }],
    };

    service.load().subscribe();
    service.load(true).subscribe();
    const first = httpMock.expectOne('http://localhost:8080/api/setup/status');
    first.flush(body);
    httpMock.expectNone('http://localhost:8080/api/setup/status');

    service.load(true).subscribe();
    const second = httpMock.expectOne('http://localhost:8080/api/setup/status');
    expect(second.request.context).toBeDefined();
    second.flush({ ...body, firstRun: false });
  });
});
