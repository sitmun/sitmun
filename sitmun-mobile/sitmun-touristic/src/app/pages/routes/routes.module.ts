import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { RoutesPageRoutingModule } from './routes-routing.module';
import { RoutesPage } from './routes.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RoutesPageRoutingModule,
    TranslatePipe
  ],
  declarations: [RoutesPage]
})
export class RoutesPageModule {}
