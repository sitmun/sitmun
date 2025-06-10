import { Injectable } from '@angular/core';
import { Http } from '@capacitor-community/http';
import { InstancesService } from './instances.service';
import { DatabaseService } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  private token: string = '';

  constructor(private instancesService: InstancesService, private dbService: DatabaseService) { }

  getToken() {
    return this.token;
  }

  logout() {
    if (this.token) {
      this.dbService.logoutUser();
      this.token = '';
    }
  }

  async login(user: string, password: string) {
    const url = this.instancesService.authorizationUrl.concat('/api/authenticate');
    console.log(url);
    const options = {
      url,
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      data: {
        username: user,
        password
      },
      params: {}
    };
    return this.request(options, this.authenticateSuccess.bind(this));
  }

  private authenticateSuccess(resp: any) {
    this.token = resp.data.id_token;
    return this.token;
  }

  private request(options: any, callback: Function) {
    return new Promise<any[]>((resolve, reject) => {
      Http.request(options).then(data => {
        resolve(callback(data));
      }).catch(error => {
        reject(error);
      });
    });
  }
}