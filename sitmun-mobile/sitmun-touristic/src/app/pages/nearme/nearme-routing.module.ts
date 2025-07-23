import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { NearmePage } from './nearme.page';

const routes: Routes = [
  {
    path: '',
    component: NearmePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NearmePageRoutingModule {}
