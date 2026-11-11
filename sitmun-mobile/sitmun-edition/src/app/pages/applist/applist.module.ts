import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';
import { ProfileModalComponent } from 'src/app/components/profile-modal/profile-modal.component';

import { ApplistPageRoutingModule } from './applist-routing.module';
import { ApplistPage } from './applist.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ApplistPageRoutingModule,
    TranslatePipe,
    ProfileModalComponent
  ],
  declarations: [ApplistPage]
})
export class ApplistPageModule {}
