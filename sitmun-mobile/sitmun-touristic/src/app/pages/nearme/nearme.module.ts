import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { NearmePageRoutingModule } from './nearme-routing.module';

import { NearmePage } from './nearme.page';
import { TranslatePipe } from '@ngx-translate/core';

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
