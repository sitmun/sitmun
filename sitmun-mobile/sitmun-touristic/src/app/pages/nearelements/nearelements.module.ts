import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { NearelementsPageRoutingModule } from './nearelements-routing.module';

import { NearelementsPage } from './nearelements.page';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NearelementsPageRoutingModule,
    TranslateModule
  ],
  declarations: [NearelementsPage]
})
export class NearelementsPageModule {}
