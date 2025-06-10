import { Injectable } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { constants } from 'src/environments/constants';

@Injectable({
  providedIn: 'root'
})
export class RoutingService {

  private paths: Record<string, any> = constants.paths;

  constructor(private router: Router) { }

  navigate(page: string, params: any) {
    let navigationExtras: NavigationExtras = {
      state: params
    };
    this.router.navigate([page], navigationExtras);
  }

  redirect(data: any, parentData: any = {}) {
    if (data.task) {
      data['parentData'] = parentData;
      this.navigate(this.paths['task'][String(data.taskNode.viewMode)], data);
    } else if (data.tasks) {
      data['parentData'] = parentData;
      this.navigate(this.paths['task'][String(data.taskNodes[0].viewMode)], data);
    } else {
      this.navigate(this.paths[data.rootNode.type], data);
    }
  }
}
