import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

import {
  AvatarComponent,
  BadgeComponent,
  BreadcrumbRouterComponent,
  ContainerComponent,
  DropdownComponent,
  DropdownDividerDirective,
  DropdownHeaderDirective,
  DropdownItemDirective,
  DropdownMenuDirective,
  DropdownToggleDirective,
  HeaderComponent,
  HeaderNavComponent,
  NavItemComponent,
  NavLinkDirective,
} from '@coreui/angular';

import { AuthService } from '../../../auth/auth.service';
import { TranslationService } from '../../../core/services/translation.service';
import { NotificationBellComponent } from './notification-bell/notification-bell.component';

@Component({
  selector: 'app-default-header',
  templateUrl: './default-header.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ContainerComponent,
    HeaderNavComponent,
    NavItemComponent,
    NavLinkDirective,
    RouterLink,
    RouterLinkActive,
    DropdownComponent,
    DropdownToggleDirective,
    AvatarComponent,
    DropdownMenuDirective,
    DropdownHeaderDirective,
    DropdownItemDirective,
    NotificationBellComponent
  ]
})
export class DefaultHeaderComponent extends HeaderComponent {
  readonly authService = inject(AuthService);
  readonly translationService = inject(TranslationService);

  readonly languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' }
  ];

  readonly currentLanguage = computed(() => {
    return this.translationService.getCurrentLanguage();
  });

  readonly currentLanguageFlag = computed(() => {
    const lang = this.languages.find(l => l.code === this.currentLanguage());
    return lang?.flag || '🌐';
  });

  isCurrentLanguage(langCode: string): boolean {
    return this.currentLanguage() === langCode;
  }

  changeLanguage(langCode: string): void {
    if (langCode === 'ar' || langCode === 'en') {
      this.translationService.setLanguage(langCode);
      // Language will be applied automatically via TranslatePipe
      // API requests will use the new language via languageInterceptor
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
