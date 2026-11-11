import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { NearelementsPageRoutingModule } from './nearelements-routing.module';
import { NearelementsPage } from './nearelements.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NearelementsPageRoutingModule,
    TranslatePipe
  ],
  declarations: [NearelementsPage]
})
export class NearelementsPageModule {}
