import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AnimationController, IonicModule } from "@ionic/angular";
import { TranslateModule } from '@ngx-translate/core';
import { DatabaseService } from 'src/app/services/database.service';
import { LanguageService } from 'src/app/services/language.service';

@Component({
  selector: 'app-profile-modal',
  templateUrl: './profile-modal.component.html',
  styleUrls: ['./profile-modal.component.scss'],
  imports: [IonicModule, TranslateModule,  CommonModule, FormsModule],
  standalone: true
})
export class ProfileModalComponent  implements OnInit {
  selectedLanguage: string | null = null;
  languageOptions: any[] = [];
  isProfileOpen = false;
  userName: string | null = null;
  instanceDB: string | null = null;

  constructor(private languageService: LanguageService, private router: Router, 
    private animationCtrl: AnimationController, private databaseService: DatabaseService) { }

  ngOnInit() {}

  onModalOpen() {
    this.selectedLanguage = this.languageService.getLanguage();
    this.languageOptions = this.languageService.getLanguageOptions();

    this.databaseService.getLoginUsers().then((users: any[]) => {
      this.userName = users?.[0]?.name ?? '';

      this.databaseService.getInstances().then((instances: any[]) => {
        this.instanceDB = instances?.[0]?.instance ?? '';
      });
    });
  }

  setLanguage(langCode: string) {
    this.selectedLanguage = langCode;
    this.languageService.setLanguage(langCode);
  }

  openProfileModal() {
    this.isProfileOpen = true;
  }

  closeProfileModal(exit: boolean){    
    this.isProfileOpen = false;
    if (exit) {
      setTimeout(() => this.router.navigate(['/']), 500);  
    }      
  }

  enterAnimation = (baseEl: HTMLElement) => {
    const root = baseEl.shadowRoot;

    const backdropAnimation = this.animationCtrl
      .create()
      .addElement(root!.querySelector('ion-backdrop')!)
      .fromTo('opacity', '0.01', 'var(--backdrop-opacity)');

    const wrapperAnimation = this.animationCtrl
      .create()
      .addElement(root!.querySelector('.modal-wrapper')!)
      .fromTo('transform', 'translateX(100%)', 'translateX(0)')
      .fromTo('opacity', '0', '1');

    return this.animationCtrl
      .create()
      .addElement(baseEl)
      .easing('ease-out')
      .duration(400)
      .addAnimation([backdropAnimation, wrapperAnimation]);
  };

  leaveAnimation = (baseEl: HTMLElement) => {
    return this.enterAnimation(baseEl).direction('reverse');
  };

}
