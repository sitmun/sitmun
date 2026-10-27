import { Injectable } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { constants } from 'src/environments/constants';
import { HistoricService } from './historic.service';
import { App } from '@capacitor/app';
import { LanguageService } from './language.service';

@Injectable({
  providedIn: 'root'
})
export class RoutingService {

  private paths: Record<string, any> = constants.paths;

  constructor(private router: Router, private historicService: HistoricService,
    private languageService: LanguageService
  ) { }

  navigate(page: string, params: any, addHistoric = true) {
    let navigationExtras: NavigationExtras = {
      state: params
    };
    if (page) {
      if (addHistoric) {
        this.addHistoric(page, params);
      }
      if (this.router.url === page) {
        this.router.navigateByUrl('refresh', { skipLocationChange: true }).then(() => {
          this.router.navigateByUrl(page, navigationExtras);
        });
      } else {
        this.router.navigateByUrl(page, navigationExtras);
      }
    }
  }

  addHistoric(page: string, params: any) {
    this.historicService.push(page, params, this.languageService.getLanguage());
  }

  clearhistoric() {
    this.historicService.clear();
  }

  navigateBack() {
    this.historicService.pop(this.languageService.getLanguage()).then(previous => {
      if (previous) {
        this.navigate(previous.url, previous.state, false);
      } else {
        App.exitApp();
      }
    });
  }

  redirect(data: any, parentData: any = {}) {
    data['parentData'] = parentData;
    if (data.task) {
      this.navigate(this.paths['task'][String(data.taskNode.viewMode)], data);
    } else if (data.tasks && data.rootNode.type !== 'map') {
      this.navigate(this.paths['task'][String(data.taskNodes[0].viewMode)], data);
    } else {
      this.navigate(this.paths[data.rootNode.type], data);
    }
  }
}
