import { Component, computed, inject } from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

import {
  AvatarComponent,
  BadgeComponent,
  BreadcrumbRouterComponent,
  ColorModeService,
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
    DropdownItemDirective
  ]
})
export class DefaultHeaderComponent extends HeaderComponent {
  readonly authService = inject(AuthService);
  readonly translationService = inject(TranslationService);
  readonly colorModeService = inject(ColorModeService);
  readonly colorMode = this.colorModeService.colorMode;

  readonly colorModes = [
    { name: 'light', text: 'Light', icon: 'cilSun' },
    { name: 'dark', text: 'Dark', icon: 'cilMoon' },
    { name: 'auto', text: 'Auto', icon: 'cilContrast' }
  ];

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

  readonly icons = computed(() => {
    const currentMode = this.colorMode();
    return this.colorModes.find(mode => mode.name === currentMode)?.icon ?? 'cilSun';
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
