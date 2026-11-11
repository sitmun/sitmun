import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { SchedulePageRoutingModule } from './schedule-routing.module';
import { SchedulePage } from './schedule.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SchedulePageRoutingModule,
    TranslatePipe
  ],
  declarations: [SchedulePage]
})
export class SchedulePageModule {}
