import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { NgScrollbar } from 'ngx-scrollbar';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

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
import { DocumentTypesService } from '../../views/FormBuilder/services/document-types.service';
import { DocumentType } from '../../views/FormBuilder/form-builder/models/document-types.model';

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
  private routerSubscription?: Subscription;
  documentTypes: DocumentType[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private documentTypesService: DocumentTypesService
  ) {}

  ngOnInit(): void {
    // Load document types first, then filter nav items
    this.loadDocumentTypes();
    
    // Redirect to dashboard if Admin and on root/document-types
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const userRole = this.authService.role();
        const currentPath = event.urlAfterRedirects || event.url;
        
        // Only redirect root path to dashboard, allow /document-types for admin
        if (userRole === 'Administration' && currentPath === '/') {
          this.router.navigate(['/dashboard']);
        }
      });
  }

  loadDocumentTypes(): void {
    this.documentTypesService.getAllDocumentTypes().subscribe({
      next: (types: DocumentType[]) => {
        this.documentTypes = types || [];
        this.filterNavItemsByRole();
      },
      error: (error) => {
        console.error('Error loading document types for navigation:', error);
        this.documentTypes = [];
        this.filterNavItemsByRole();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.roleSubscription) {
      this.roleSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
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
    // Hide: Dashboard, Form Builder section and Projects section
    // Show: Document Types, Logout
    const filteredItems: INavData[] = [];
    let skipNext = false;

    for (let i = 0; i < navItems.length; i++) {
      const item = navItems[i];
      
      // Skip if previous item was Form Builder title
      if (skipNext) {
        skipNext = false;
        continue;
      }

      // Hide Dashboard for User role
      if (item.name === 'Dashboard') {
        continue; // Skip Dashboard
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

      // Show Document Types dropdown with dynamic children
      if (item.name === 'Document Types') {
        // Create dynamic children from document types
        const documentTypeChildren: any[] = this.documentTypes
          .filter(dt => dt.isActive !== false) // Only show active document types
          .map(dt => ({
            name: dt.name || `Document Type #${dt.id}`,
            url: `/document-types/${dt.id}/submissions`, // Route to submissions page for this document type
            iconComponent: { name: 'cil-file' },
            ...(dt.code ? {
              badge: {
                color: 'info',
                text: dt.code
              }
            } : {})
          }));

        // If no document types, show default "Manage Document Types"
        if (documentTypeChildren.length === 0) {
          documentTypeChildren.push({
            name: 'Manage Document Types',
            url: '/document-types',
            iconComponent: { name: 'cil-list' }
          });
        }

        // Create Document Types dropdown item with dynamic children
        filteredItems.push({
          ...item,
          children: documentTypeChildren
        });
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
