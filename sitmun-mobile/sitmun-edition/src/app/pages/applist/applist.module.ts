import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ApplistPageRoutingModule } from './applist-routing.module';

import { ApplistPage } from './applist.page';
import { TranslatePipe } from '@ngx-translate/core';
import { ProfileModalComponent } from 'src/app/components/profile-modal/profile-modal.component';

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
