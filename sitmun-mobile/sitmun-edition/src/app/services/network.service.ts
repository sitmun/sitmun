import { Injectable, NgZone } from '@angular/core';
import { Network } from '@capacitor/network';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {

  isConnected = true;

  constructor(private ngZone: NgZone) {
    this.getStatus();
    this.addListener(this.updateStatus.bind(this));
  }

  async getStatus() {
    const status = await Network.getStatus();
    this.updateStatus(status.connected);
    return this.isConnected;
  }

  addListener(callback: Function) {
    this.removeListeners();
    Network.addListener('networkStatusChange', (status) => {
      this.ngZone.run(() => {callback(status.connected);});
    });
  }

  removeListeners() {
    Network.removeAllListeners();
  }

  updateStatus(connected: boolean) {
    this.isConnected = connected;
  }
}
