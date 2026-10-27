import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { NearmePageRoutingModule } from './nearme-routing.module';

import { NearmePage } from './nearme.page';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NearmePageRoutingModule,
    TranslateModule
  ],
  declarations: [NearmePage]
})
export class NearmePageModule {}
