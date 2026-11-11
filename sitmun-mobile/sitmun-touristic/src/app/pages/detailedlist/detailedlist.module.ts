import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { DetailedlistPageRoutingModule } from './detailedlist-routing.module';
import { DetailedlistPage } from './detailedlist.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DetailedlistPageRoutingModule,
    TranslatePipe
  ],
  declarations: [DetailedlistPage]
})
export class DetailedlistPageModule {}
