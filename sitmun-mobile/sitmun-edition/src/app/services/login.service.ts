import { Injectable } from '@angular/core';

import { CapacitorHttp } from '@capacitor/core';

import { environment } from 'src/environments/environment';

import { DatabaseService } from './database.service';
import { InstancesService } from './instances.service';

export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.name = 'SessionExpiredError';
  }
}

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  private accessToken = '';
  private proxyToken = '';

  constructor(
    private dbService: DatabaseService,
    private instancesServices: InstancesService
  ) { }

  getToken() {
    return this.accessToken;
  }

  getAccessToken() {
    return this.accessToken;
  }

  getProxyToken() {
    return this.proxyToken;
  }

  /** True when there is an access token and its `exp` is at least 30 s away. */
  hasValidAccessToken(): boolean {
    if (!this.accessToken) {
      return false;
    }
    try {
      const payload = JSON.parse(
        atob(this.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now() + 30000;
    } catch {
      return false;
    }
  }

  logout() {
    if (this.accessToken || this.proxyToken) {
      this.dbService.logoutUser();
    }
    this.accessToken = '';
    this.proxyToken = '';
  }

  async login(user: string, password: string) {
    const base = await this.instancesServices.getInstanceUrl();
    const url = base.concat(environment.authenticationPath);
    const options = {
      url,
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      data: {
        username: user,
        password
      },
      params: {}
    };
    const token = await this.request(options, this.authenticateSuccess.bind(this));
    await this.ensureProxyToken();
    return token;
  }

  async ensureProxyToken() {
    if (!this.hasValidAccessToken()) {
      throw new SessionExpiredError();
    }
    if (this.proxyToken) {
      return this.proxyToken;
    }
    const base = await this.instancesServices.getInstanceUrl();
    const url = base.concat('/api/authenticate/proxy');
    const options = {
      url,
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.accessToken}`
      },
      params: {},
      data: {}
    };
    return this.request(options, (resp: any) => {
      if (resp.status !== 200 || !resp.data?.proxy_token) {
        this.proxyToken = '';
        throw new SessionExpiredError();
      }
      this.proxyToken = resp.data.proxy_token;
      return this.proxyToken;
    });
  }

  async reissueProxyToken() {
    this.proxyToken = '';
    console.log('Refrescando proxyToken');
    return this.ensureProxyToken();
  }

  /**
   * Ensures a proxy token, runs send once, and on HTTP 401 reissues the proxy
   * token and retries send exactly once.
   */
  async withProxyRetry<T extends { status: number }>(send: () => Promise<T>): Promise<T> {
    await this.ensureProxyToken();
    let resp = await send();
    if (resp.status === 401) {
      await this.reissueProxyToken();
      resp = await send();
    }
    return resp;
  }

  private authenticateSuccess(resp: any) {
    this.accessToken = resp.data.access_token;
    this.proxyToken = '';
    return this.accessToken;
  }

  private request(options: any, callback: Function) {
    return new Promise<any>((resolve, reject) => {
      CapacitorHttp.request(options).then(data => {
        resolve(callback(data));
      }).catch(error => {
        reject(error);
      });
    });
  }
}
