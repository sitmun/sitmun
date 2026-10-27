import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DownloadPageRoutingModule } from './download-routing.module';

import { DownloadPage } from './download.page';
import { TranslateModule } from '@ngx-translate/core';
import { ProfileModalComponent } from 'src/app/components/profile-modal/profile-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DownloadPageRoutingModule,
    TranslateModule,
    ProfileModalComponent
  ],
  declarations: [DownloadPage]
})
export class DownloadPageModule {}
