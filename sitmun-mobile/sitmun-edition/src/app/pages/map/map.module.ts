import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MapPageRoutingModule } from './map-routing.module';

import { MapPage } from './map.page';
import { TranslateModule } from '@ngx-translate/core';
import { ProfileModalComponent } from 'src/app/components/profile-modal/profile-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    MapPageRoutingModule,
    TranslateModule,
    ProfileModalComponent
  ],
  declarations: [MapPage]
})
export class MapPageModule {}
