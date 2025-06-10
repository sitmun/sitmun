import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DetailedlistPageRoutingModule } from './detailedlist-routing.module';

import { DetailedlistPage } from './detailedlist.page';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DetailedlistPageRoutingModule,
    TranslateModule
  ],
  declarations: [DetailedlistPage]
})
export class DetailedlistPageModule {}
