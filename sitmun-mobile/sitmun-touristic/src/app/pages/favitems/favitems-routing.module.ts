import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FavitemsPage } from './favitems.page';

const routes: Routes = [
  {
    path: '',
    component: FavitemsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FavitemsPageRoutingModule {}
