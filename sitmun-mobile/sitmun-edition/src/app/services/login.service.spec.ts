import { TestBed } from '@angular/core/testing';

import { environment } from 'src/environments/environment';

import { DatabaseService } from './database.service';
import { InstancesService } from './instances.service';
import { LoginService, SessionExpiredError } from './login.service';

function jwtWithExp(expSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString('base64url');
  return `${header}.${payload}.sig`;
}

describe('LoginService', () => {
  let service: LoginService;
  let instances: { getInstanceUrl: jest.Mock };
  let db: { logoutUser: jest.Mock };
  let httpRequest: jest.SpyInstance;
  let validAccessJwt: string;

  beforeEach(() => {
    validAccessJwt = jwtWithExp(Math.floor(Date.now() / 1000) + 3600);
    instances = {
      getInstanceUrl: jest.fn().mockResolvedValue('https://gw.example.com/backend')
    };
    db = {
      logoutUser: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        LoginService,
        { provide: InstancesService, useValue: instances },
        { provide: DatabaseService, useValue: db }
      ]
    });
    service = TestBed.inject(LoginService);
    httpRequest = jest.spyOn(service as any, 'request').mockImplementation(
      async (...args: unknown[]) => {
        const options = args[0] as { url: string };
        const callback = args[1] as (resp: any) => unknown;
        const base = { status: 200, headers: {}, url: options.url };
        if (String(options.url).endsWith(environment.authenticationPath)) {
          return callback({
            ...base,
            data: { access_token: validAccessJwt, token_type: 'Bearer', expires_in: 3600 }
          });
        }
        if (String(options.url).endsWith('/api/authenticate/proxy')) {
          return callback({ ...base, data: { proxy_token: 'proxy-jwt' } });
        }
        throw new Error(`Unexpected URL ${options.url}`);
      }
    );
  });

  it('logs in through authenticationPath and stores access_token', async () => {
    await service.login('user', 'secret');
    expect(httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `https://gw.example.com/backend${environment.authenticationPath}`,
        data: { username: 'user', password: 'secret' }
      }),
      expect.any(Function)
    );
    expect(service.getAccessToken()).toBe(validAccessJwt);
  });

  it('exchanges access_token for proxy_token after login', async () => {
    await service.login('user', 'secret');
    expect(service.getProxyToken()).toBe('proxy-jwt');
    expect(httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://gw.example.com/backend/api/authenticate/proxy',
        headers: expect.objectContaining({ Authorization: `Bearer ${validAccessJwt}` })
      }),
      expect.any(Function)
    );
  });

  it('does not store undefined as proxy_token when authenticate/proxy fails', async () => {
    httpRequest.mockImplementation(async (...args: unknown[]) => {
      const options = args[0] as { url: string };
      const callback = args[1] as (resp: any) => unknown;
      const base = { status: 200, headers: {}, url: options.url };
      if (String(options.url).endsWith(environment.authenticationPath)) {
        return callback({
          ...base,
          data: { access_token: validAccessJwt, token_type: 'Bearer', expires_in: 3600 }
        });
      }
      if (String(options.url).endsWith('/api/authenticate/proxy')) {
        return callback({ ...base, status: 401, data: {} });
      }
      throw new Error(`Unexpected URL ${options.url}`);
    });
    await expect(service.login('user', 'secret')).rejects.toBeInstanceOf(SessionExpiredError);
    expect(service.getProxyToken()).toBe('');
  });

  it('clears both tokens on logout', async () => {
    await service.login('user', 'secret');
    service.logout();
    expect(service.getAccessToken()).toBe('');
    expect(service.getProxyToken()).toBe('');
    expect(db.logoutUser).toHaveBeenCalled();
  });

  it('withProxyRetry reissues proxy token once on 401 and does not loop', async () => {
    await service.login('user', 'secret');
    const reissue = jest.spyOn(service, 'reissueProxyToken').mockResolvedValue('proxy-jwt-new');
    const send = jest.fn()
      .mockResolvedValueOnce({ status: 401 })
      .mockResolvedValueOnce({ status: 200 });

    const resp = await service.withProxyRetry(send);

    expect(resp.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(2);
    expect(reissue).toHaveBeenCalledTimes(1);
  });

  describe('hasValidAccessToken', () => {
    it('is false for an empty token', () => {
      expect(service.hasValidAccessToken()).toBe(false);
    });

    it('is false for a token that is not a JWT', () => {
      (service as any).accessToken = 'not-a-jwt';
      expect(service.hasValidAccessToken()).toBe(false);
    });

    it('is false for an expired token', () => {
      (service as any).accessToken = jwtWithExp(Math.floor(Date.now() / 1000) - 60);
      expect(service.hasValidAccessToken()).toBe(false);
    });

    it('is true for a token with exp in the future', () => {
      (service as any).accessToken = jwtWithExp(Math.floor(Date.now() / 1000) + 3600);
      expect(service.hasValidAccessToken()).toBe(true);
    });
  });
});
