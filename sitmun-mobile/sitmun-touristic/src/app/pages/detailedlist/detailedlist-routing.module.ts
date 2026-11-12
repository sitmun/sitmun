import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DetailedlistPage } from './detailedlist.page';

const routes: Routes = [
  {
    path: '',
    component: DetailedlistPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DetailedlistPageRoutingModule {}
