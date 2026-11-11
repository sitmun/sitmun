import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { NearmePageRoutingModule } from './nearme-routing.module';
import { NearmePage } from './nearme.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NearmePageRoutingModule,
    TranslatePipe
  ],
  declarations: [NearmePage]
})
export class NearmePageModule {}
