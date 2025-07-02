import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { RoutingService } from './services/routing.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(private platform: Platform, private routingService: RoutingService) {
    this.platform.backButton.subscribeWithPriority(9999, () => {
      this.routingService.navigateBack();
    });
  }
}
