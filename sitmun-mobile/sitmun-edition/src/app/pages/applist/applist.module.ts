import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ApplistPageRoutingModule } from './applist-routing.module';

import { ApplistPage } from './applist.page';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ApplistPageRoutingModule,
    TranslateModule,
  ],
  declarations: [ApplistPage]
})
export class ApplistPageModule {}
