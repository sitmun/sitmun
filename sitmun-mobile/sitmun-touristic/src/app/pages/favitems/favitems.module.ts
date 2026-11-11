import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { FavitemsPageRoutingModule } from './favitems-routing.module';
import { FavitemsPage } from './favitems.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FavitemsPageRoutingModule,
    TranslatePipe
  ],
  declarations: [FavitemsPage]
})
export class FavitemsPageModule {}
