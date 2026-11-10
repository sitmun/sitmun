import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { FavitemsPageRoutingModule } from './favitems-routing.module';

import { FavitemsPage } from './favitems.page';
import { TranslatePipe } from '@ngx-translate/core';

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
