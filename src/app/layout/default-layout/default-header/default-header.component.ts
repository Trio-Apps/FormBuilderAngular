import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  ContainerComponent,
  DropdownComponent,
  DropdownHeaderDirective,
  DropdownItemDirective,
  DropdownMenuDirective,
  DropdownToggleDirective,
  HeaderComponent,
  HeaderNavComponent
} from '@coreui/angular';

import { AuthService } from '../../../auth/auth.service';
import { NotificationBellComponent } from './notification-bell/notification-bell.component';

@Component({
  selector: 'app-default-header',
  templateUrl: './default-header.component.html',
  styleUrls: ['./default-header.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ContainerComponent,
    HeaderNavComponent,
    DropdownComponent,
    DropdownToggleDirective,
    DropdownMenuDirective,
    DropdownHeaderDirective,
    DropdownItemDirective,
    NotificationBellComponent
  ]
})
export class DefaultHeaderComponent extends HeaderComponent {
  readonly authService = inject(AuthService);

  logout(): void {
    this.authService.logout();
  }
}
