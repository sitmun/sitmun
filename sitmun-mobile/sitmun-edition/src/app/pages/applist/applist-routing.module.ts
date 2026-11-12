import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ApplistPage } from './applist.page';

const routes: Routes = [
  {
    path: '',
    component: ApplistPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ApplistPageRoutingModule {}
