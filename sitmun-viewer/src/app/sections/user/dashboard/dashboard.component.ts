import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface Item {
  img: string;
  id: number;
  name: string;
}

export enum DashboardTypes {
  APPLICATIONS,
  TERRITORIES
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  type: DashboardTypes;

  applicationsList: Item[] = [
    {
      img: '',
      id: 1,
      name: 'App 1'
    },
    {
      img: '',
      id: 2,
      name: 'App 2'
    },
    {
      img: '',
      id: 3,
      name: 'App 3'
    }
  ];

  territoriesList: Item[] = [
    {
      img: '',
      id: 1,
      name: 'Territory 1'
    },
    {
      img: '',
      id: 2,
      name: 'Territory 2'
    },
    {
      img: '',
      id: 3,
      name: 'Territory 3'
    }
  ];

  constructor(private router: Router) {
    this.type = DashboardTypes.APPLICATIONS;
  }

  onChange(type: string) {
    this.type =
      type === '0' ? DashboardTypes.APPLICATIONS : DashboardTypes.TERRITORIES;
  }

  goToMap() {
    this.router.navigateByUrl('/user/map');
  }

  protected readonly DashboardTypes = DashboardTypes;
}
