import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NgScrollbar } from 'ngx-scrollbar';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { IconDirective } from '@coreui/icons-angular';
import {
  ContainerComponent,
  ShadowOnScrollDirective,
  SidebarBrandComponent,
  SidebarComponent,
  SidebarFooterComponent,
  SidebarHeaderComponent,
  SidebarNavComponent,
  SidebarToggleDirective,
  SidebarTogglerDirective,
  INavData
} from '@coreui/angular';

import { DefaultFooterComponent, DefaultHeaderComponent } from './';
import { navItems } from './_nav';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './default-layout.component.html',
  styleUrls: ['./default-layout.component.scss'],
  imports: [
    CommonModule,
    SidebarComponent,
    SidebarHeaderComponent,
    SidebarBrandComponent,
    SidebarNavComponent,
    SidebarFooterComponent,
    SidebarToggleDirective,
    SidebarTogglerDirective,
    ContainerComponent,
    DefaultFooterComponent,
    DefaultHeaderComponent,
    IconDirective,
    NgScrollbar,
    RouterOutlet,
    RouterLink,
    ShadowOnScrollDirective
  ]
})
export class DefaultLayoutComponent implements OnInit, OnDestroy {
  public navItems: INavData[] = [];
  private roleSubscription?: Subscription;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.filterNavItemsByRole();
  }

  ngOnDestroy(): void {
    if (this.roleSubscription) {
      this.roleSubscription.unsubscribe();
    }
  }

  private filterNavItemsByRole(): void {
    const userRole = this.authService.role();
    
    // If role is "Administration", show all items
    if (userRole === 'Administration') {
      this.navItems = [...navItems];
      return;
    }

    // If role is "User" or any other role, filter items
    // Hide: Form Builder section and Projects section
    // Show: Dashboard, Document Types, Logout
    const filteredItems: INavData[] = [];
    let skipNext = false;

    for (let i = 0; i < navItems.length; i++) {
      const item = navItems[i];
      
      // Skip if previous item was Form Builder title
      if (skipNext) {
        skipNext = false;
        continue;
      }

      // Always show Dashboard
      if (item.name === 'Dashboard') {
        filteredItems.push(item);
        continue;
      }

      // Hide Form Builder section
      if (item.title === true && item.name === 'Form Builder') {
        // Skip this title and the next Form Builder item
        skipNext = true;
        continue;
      }
      if (item.name === 'Form Builder') {
        continue; // Skip Form Builder menu item
      }

      // Show Documents Setup title
      if (item.title === true && item.name === 'Documents Setup') {
        filteredItems.push(item);
        continue;
      }

      // Show Document Types
      if (item.name === 'Document Types') {
        filteredItems.push(item);
        continue;
      }

      // Hide Projects section
      if (item.title === true && item.name === 'Projects') {
        continue; // Skip Projects title
      }
      if (item.name === 'Projects') {
        continue; // Skip Projects menu item
      }

      // Show Logout
      if (item.name === 'Logout') {
        filteredItems.push(item);
        continue;
      }
    }

    this.navItems = filteredItems;
  }
}
