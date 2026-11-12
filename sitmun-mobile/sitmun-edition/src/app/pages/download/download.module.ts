import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';
import { ProfileModalComponent } from 'src/app/components/profile-modal/profile-modal.component';

import { DownloadPageRoutingModule } from './download-routing.module';
import { DownloadPage } from './download.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DownloadPageRoutingModule,
    TranslatePipe,
    ProfileModalComponent
  ],
  declarations: [DownloadPage]
})
export class DownloadPageModule {}
