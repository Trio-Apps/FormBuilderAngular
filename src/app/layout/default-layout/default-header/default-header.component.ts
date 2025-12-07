import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';

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
  HeaderTogglerDirective,
  NavItemComponent,
  NavLinkDirective,
  SidebarToggleDirective
} from '@coreui/angular';

import { IconDirective } from '@coreui/icons-angular';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-default-header',
  templateUrl: './default-header.component.html',
  imports: [
    ContainerComponent, HeaderTogglerDirective, SidebarToggleDirective, IconDirective,
    HeaderNavComponent, NavItemComponent, NavLinkDirective, RouterLink, RouterLinkActive,
    NgTemplateOutlet, BreadcrumbRouterComponent, DropdownComponent, DropdownToggleDirective,
    AvatarComponent, DropdownMenuDirective, DropdownHeaderDirective, DropdownItemDirective,
    BadgeComponent, DropdownDividerDirective
  ]
})
export class DefaultHeaderComponent extends HeaderComponent {

  readonly #colorModeService = inject(ColorModeService);
  readonly colorMode = this.#colorModeService.colorMode;

  readonly authService = inject(AuthService);

  sidebarId = input('sidebar1');

  readonly colorModes = [
    { name: 'light', text: 'Light', icon: 'cilSun' },
    { name: 'dark', text: 'Dark', icon: 'cilMoon' },
    { name: 'auto', text: 'Auto', icon: 'cilContrast' }
  ];

  readonly icons = computed(() => {
    const currentMode = this.colorMode();
    return this.colorModes.find(mode => mode.name === currentMode)?.icon ?? 'cilSun';
  });

  // الرسائل، notifications، tasks (يمكنك تعبئتهم كما في النسخة السابقة)
  public newMessages = [];
  public newNotifications = [];
  public newStatus = [];
  public newTasks = [];

  logout(): void {
    this.authService.logout();
  }
}
