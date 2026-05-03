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
import { iconSubset } from '../../icons/icon-subset';
import { AuthService } from '../../auth/auth.service';
import { DocumentTypesService } from '../../views/FormBuilder/services/document-types.service';
import { DocumentType } from '../../views/FormBuilder/form-builder/models/document-types.model';
import { UsersService, UserGroupDto } from '../../views/FormBuilder/services/users.service';
import { TableMenusService, TableMenuDto } from '../../services/table-menus.service';
import { PermissionService } from '../../services/permission.service';

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
  public isWideContentRoute = false;
  private roleSubscription?: Subscription;
  private routerSubscription?: Subscription;
  documentTypes: DocumentType[] = [];
  userGroups: UserGroupDto[] = [];
  currentUserGroup: UserGroupDto | null = null;
  tableMenus: TableMenuDto[] = [];
  // Snapshot of permissions at init time - sidebar won't be affected by later permission changes
  private permissionsSnapshot: string[] = [];
  // Flag to prevent sidebar updates after initial load
  private sidebarInitialized = false;
  private readonly sidebarIconNames = new Set(
    Object.keys(iconSubset).flatMap(iconName => [
      iconName,
      iconName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
    ])
  );

  constructor(
    private authService: AuthService,
    private router: Router,
    private documentTypesService: DocumentTypesService,
    private usersService: UsersService,
    private tableMenusService: TableMenusService,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    console.log('[DefaultLayout] ngOnInit started');
    console.log('[DefaultLayout] Permissions loaded:', this.permissionService.loaded());
    console.log('[DefaultLayout] Current permissions count:', this.permissionService.getPermissionsSync().length);
    
    // Ensure permissions are loaded before taking snapshot
    if (!this.permissionService.loaded()) {
      console.log('[DefaultLayout] Permissions not loaded yet, loading from API...');
      this.permissionService.loadUserPermissions().subscribe({
        next: (permissions) => {
          console.log('[DefaultLayout] Permissions loaded from API:', permissions?.length || 0, 'permissions');
          // Take snapshot after permissions are loaded
          this.permissionsSnapshot = this.permissionService.getPermissionsSync();
          console.log('[DefaultLayout] Permissions snapshot taken:', this.permissionsSnapshot.length, 'permissions');
          console.log('[DefaultLayout] Has Document_Allow_View:', this.permissionsSnapshot.includes('Document_Allow_View'));
          // Load user groups and filter nav items after permissions are ready
          this.loadUserGroups();
        },
        error: (error) => {
          console.error('[DefaultLayout] Error loading permissions:', error);
          // Still take snapshot even if loading fails (might have cached permissions)
          this.permissionsSnapshot = this.permissionService.getPermissionsSync();
          this.loadUserGroups();
        }
      });
    } else {
      // Permissions already loaded, take snapshot immediately
      this.permissionsSnapshot = this.permissionService.getPermissionsSync();
      console.log('[DefaultLayout] Permissions already loaded, snapshot taken:', this.permissionsSnapshot.length, 'permissions');
      console.log('[DefaultLayout] Has Document_Allow_View:', this.permissionsSnapshot.includes('Document_Allow_View'));
      // Load user groups first, then table menus, then filter nav items
      this.loadUserGroups();
    }
    
    this.updateWideContentRoute(this.router.url);

    // Redirect to dashboard if Admin and on root/document-types
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const userRole = this.authService.role();
        const currentPath = event.urlAfterRedirects || event.url;
        this.updateWideContentRoute(currentPath);
        
        // Check if user is admin based on user groups
        const isAdmin = this.isUserAdmin();
        if (isAdmin && currentPath === '/') {
          this.router.navigate(['/dashboard']);
        }
      });
  }

  private updateWideContentRoute(url: string): void {
    const currentPath = (url || '').toLowerCase();
      this.isWideContentRoute =
        currentPath.includes('/form-preview/')
        || currentPath === '/submissions'
        || currentPath === '/document-types'
        || currentPath === '/document-series'
        || currentPath === '/approval-workflows'
        || currentPath === '/approval-inbox'
        || currentPath === '/approval-delegations'
        || currentPath === '/approvals-history'
        || currentPath === '/alert-rules'
        || currentPath === '/email-templates'
        || currentPath === '/smtp-configs'
        || currentPath === '/sap-integration'
        || currentPath === '/users'
        || currentPath === '/groups'
        || currentPath === '/permissions'
        || currentPath === '/table-menus'
        || currentPath === '/projects'
        || currentPath === '/forms'
        || currentPath === '/copy-to-document'
        || currentPath === '/form-builder/forms'
        || currentPath === '/form-builder/copy-to-document'
        || /\/document-types\/[^/]+\/submissions(\/|$)/.test(currentPath);
  }

  loadUserGroups(): void {
    this.usersService.getActiveUserGroups().subscribe({
      next: (groups: UserGroupDto[]) => {
        this.userGroups = groups || [];
        // Find current user's group based on role name
        const userRole = this.authService.role();
        if (userRole && this.userGroups.length > 0) {
          this.currentUserGroup = this.userGroups.find(g => 
            g.name?.toLowerCase() === userRole.toLowerCase() ||
            g.foreignName?.toLowerCase() === userRole.toLowerCase()
          ) || null;
        }
        this.loadTableMenusIfAllowed();
      },
      error: (error) => {
        console.error('Error loading user groups:', error);
        this.userGroups = [];
        this.loadTableMenusIfAllowed();
      }
    });
  }

  private loadTableMenusIfAllowed(): void {
    if (this.isUserAdmin() || this.permissionService.canViewTableMenus()) {
      this.loadTableMenus();
      return;
    }

    this.tableMenus = [];
    this.filterNavItemsByRole();
  }

  loadTableMenus(): void {
    // Use setTimeout to ensure this runs after component initialization
    setTimeout(() => {
      this.tableMenusService.getAllMenus().subscribe({
        next: (menus: TableMenuDto[]) => {
          try {
            // Filter active menus and sort by displayOrder
            const activeMenus = (Array.isArray(menus) ? menus : [])
              .filter(menu => menu.isActive)
              .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

            // Load sub menus and documents for each menu
            if (activeMenus.length === 0) {
              this.tableMenus = [];
              this.filterNavItemsByRole();
              return;
            }

            // Load sub menus and documents for all menus
            const loadPromises = activeMenus.map(menu => {
              return new Promise<TableMenuDto>((resolve) => {
                // Load sub menus for this menu
                this.tableMenusService.getSubMenusByMenuId(menu.id).subscribe({
                  next: (subMenus) => {
                    menu.subMenus = (subMenus || []).filter(sm => sm.isActive);
                    
                    // Load documents for each sub menu
                    if (menu.subMenus && menu.subMenus.length > 0) {
                      const subMenuPromises = menu.subMenus.map(subMenu => {
                        return new Promise<void>((subResolve) => {
                          this.tableMenusService.getMenuDocumentsBySubMenuId(subMenu.id).subscribe({
                            next: (docs) => {
                              subMenu.menuDocuments = (docs || []).filter(doc => doc.isActive);
                              subResolve();
                            },
                            error: () => {
                              subMenu.menuDocuments = [];
                              subResolve();
                            }
                          });
                        });
                      });

                      Promise.all(subMenuPromises).then(() => {
                        // Load menu documents directly (not under sub menu)
                        this.tableMenusService.getMenuDocumentsByMenuId(menu.id).subscribe({
                          next: (docs) => {
                            menu.menuDocuments = (docs || []).filter(doc => 
                              doc.isActive && (!doc.subMenuId || doc.subMenuId === 0)
                            );
                            resolve(menu);
                          },
                          error: () => {
                            menu.menuDocuments = [];
                            resolve(menu);
                          }
                        });
                      });
                    } else {
                      // No sub menus, just load menu documents
                      this.tableMenusService.getMenuDocumentsByMenuId(menu.id).subscribe({
                        next: (docs) => {
                          menu.menuDocuments = (docs || []).filter(doc => 
                            doc.isActive && (!doc.subMenuId || doc.subMenuId === 0)
                          );
                          resolve(menu);
                        },
                        error: () => {
                          menu.menuDocuments = [];
                          resolve(menu);
                        }
                      });
                    }
                  },
                  error: () => {
                    menu.subMenus = [];
                    // Load menu documents even if sub menus fail
                    this.tableMenusService.getMenuDocumentsByMenuId(menu.id).subscribe({
                      next: (docs) => {
                        menu.menuDocuments = (docs || []).filter(doc => 
                          doc.isActive && (!doc.subMenuId || doc.subMenuId === 0)
                        );
                        resolve(menu);
                      },
                      error: () => {
                        menu.menuDocuments = [];
                        resolve(menu);
                      }
                    });
                  }
                });
              });
            });

            Promise.all(loadPromises).then((loadedMenus) => {
              this.tableMenus = loadedMenus;
              console.log('[DefaultLayout] Loaded table menus with sub menus and documents:', this.tableMenus);
              this.filterNavItemsByRole();
            });
          } catch (error) {
            console.error('Error processing table menus:', error);
            this.tableMenus = [];
            this.filterNavItemsByRole();
          }
        },
        error: (error) => {
          console.error('Error loading table menus for navigation:', error);
          this.tableMenus = [];
          this.filterNavItemsByRole();
        }
      });
    }, 0);
  }

  ngOnDestroy(): void {
    if (this.roleSubscription) {
      this.roleSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private isUserAdmin(): boolean {
    // Update current user group if not set
    if (!this.currentUserGroup && this.userGroups.length > 0) {
      const userRole = this.authService.role();
      if (userRole) {
        this.currentUserGroup = this.userGroups.find(g => 
          g.name?.toLowerCase() === userRole.toLowerCase() ||
          g.foreignName?.toLowerCase() === userRole.toLowerCase()
        ) || null;
      }
    }
    
    // Check if current user group is Administration (from UserGroups table in database)
    if (this.currentUserGroup) {
      const adminGroupNames = ['administration', 'admin'];
      return adminGroupNames.includes(this.currentUserGroup.name?.toLowerCase() || '') ||
             adminGroupNames.includes(this.currentUserGroup.foreignName?.toLowerCase() || '');
    }
    
    // Fallback to role name check if user groups not loaded yet
    const userRole = this.authService.role() || 'User';
    return ['administration', 'admin'].includes(userRole.toLowerCase());
  }

  /**
   * Check if current user has access based on required roles from UserGroups table
   * @param requiredRoles Array of role names that are allowed (from attributes.roles)
   * @returns true if user's group matches any required role
   */
  private hasRoleAccess(requiredRoles: string[] | undefined): boolean {
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No restrictions, allow all
    }

    // Update current user group if not set
    if (!this.currentUserGroup && this.userGroups.length > 0) {
      const userRole = this.authService.role();
      if (userRole) {
        this.currentUserGroup = this.userGroups.find(g => 
          g.name?.toLowerCase() === userRole.toLowerCase() ||
          g.foreignName?.toLowerCase() === userRole.toLowerCase()
        ) || null;
      }
    }

    // Check if current user group matches any required role (from UserGroups table)
    if (this.currentUserGroup) {
      return requiredRoles.some(role => {
        const roleLower = role.toLowerCase();
        return roleLower === this.currentUserGroup?.name?.toLowerCase() ||
               roleLower === this.currentUserGroup?.foreignName?.toLowerCase();
      });
    }

    // Fallback: check role name if user groups not loaded yet
    const userRole = this.authService.role();
    if (userRole) {
      return requiredRoles.some(role => 
        role.toLowerCase() === userRole.toLowerCase()
      );
    }

    return false;
  }

  private filterNavItemsByRole(): void {
    // Prevent sidebar updates after initial load to avoid refresh side effects
    // Once sidebar is initialized, never update it again (unless page reload)
    if (this.sidebarInitialized) {
      console.log('[DefaultLayout] filterNavItemsByRole: Sidebar already initialized, skipping update');
      return;
    }
    
    // Use snapshot taken at init - never update it here to avoid refresh side effects
    const isAdmin = this.isUserAdmin();
    
    // Helper to apply permission-based filtering (permissionCode في attributes)
    const applyPermissionFilter = (items: INavData[]): INavData[] => {
      const result: INavData[] = [];

      for (const item of items) {
        const attrs: any = item.attributes || {};
        const permissionCode = attrs.permissionCode as string | undefined;
        const itemUrl = (item as any).url as string | undefined;

        // فلترة الأطفال أولاً
        let children: INavData[] | undefined;
        if (item.children && item.children.length > 0) {
          children = applyPermissionFilter(item.children);
        }

        // لو في permissionCode ولازم يكون عند المستخدم صلاحية الـ view
        // Use snapshot instead of live permission service to avoid sidebar updates on refresh
        const hasPermission = permissionCode ? this.permissionsSnapshot.includes(permissionCode) : true;
        if (permissionCode && !hasPermission) {
          // Allow Administration to always reach the security setup screens,
          // even before their explicit permission matrix is fully configured.
          const adminAllowedUrls = ['/permissions', '/user-group-permissions', '/users', '/groups'];
          if (isAdmin && adminAllowedUrls.includes(itemUrl || '')) {
            // allow
          } else {
            // حتى لو الأطفال مسموحين، بنخفي الـ parent علشان ال sidebar يكون واضح
            continue;
          }
        }

        if (children && children.length > 0) {
          result.push({ ...item, children });
        } else if (!item.children) {
          result.push(item);
        } else if (!permissionCode || this.permissionsSnapshot.includes(permissionCode)) {
          // عنصر أب بدون أطفال بعد الفلترة لكن مسموح عرضه (مثلاً عنوان section)
          result.push({ ...item, children: [] });
        }
      }

      return result;
    };

    // If role is "Administration" (from UserGroups table), نطبق فلتر الـ permissions فقط
    if (isAdmin) {
      const adminNavItems = applyPermissionFilter(navItems);
      this.addTableMenusAfterDocumentsSetup(adminNavItems);
      this.navItems = adminNavItems;
      // Freeze navItems to prevent any future modifications
      Object.freeze(this.navItems);
      // Mark sidebar as initialized to prevent future updates
      this.sidebarInitialized = true;
      console.log('[DefaultLayout] Sidebar initialized (Admin path), will not update again');
      return;
    }

    const hasNavAccess = (item: INavData): boolean => {
      const attrs: any = item.attributes || {};
      const requiredRoles = attrs.roles as string[] | undefined;
      const permissionCode = attrs.permissionCode as string | undefined;

      if (requiredRoles && requiredRoles.length > 0 && !this.hasRoleAccess(requiredRoles)) {
        return false;
      }

      if (permissionCode && !this.permissionsSnapshot.includes(permissionCode)) {
        return false;
      }

      return true;
    };

    const filterItemsForUser = (items: INavData[]): INavData[] => {
      const result: INavData[] = [];

      for (const item of items) {
        if (item.name === 'Logout') {
          result.push(item);
          continue;
        }

        if (item.title === true) {
          if (item.name === 'Documents Setup') {
            result.push(item);
            this.addTableMenusToSidebar(result);
            continue;
          }

          result.push(item);
          continue;
        }

        const filteredChildren = item.children?.length
          ? filterItemsForUser(item.children)
          : undefined;

        const itemVisible = hasNavAccess(item);
        const hasVisibleChildren = !!filteredChildren?.some(child => !child.title);

        if (!itemVisible && !hasVisibleChildren) {
          continue;
        }

        if (filteredChildren && filteredChildren.length > 0) {
          result.push({
            ...item,
            children: filteredChildren
          });
          continue;
        }

        if (itemVisible) {
          result.push(item);
        }
      }

      return result.filter((item, index, array) => {
        if (!item.title) {
          return true;
        }

        for (let i = index + 1; i < array.length; i++) {
          if (array[i].title) {
            break;
          }
          return true;
        }

        return false;
      });
    };

    // For non-admin users, show the curated navigation by default
    // without permission-code filtering.
    this.navItems = filterItemsForUser(navItems);
    // Freeze navItems to prevent any future modifications
    Object.freeze(this.navItems);
    // Mark sidebar as initialized to prevent future updates
    this.sidebarInitialized = true;
    console.log('[DefaultLayout] Sidebar initialized (User path), will not update again');
  }

  private addTableMenusAfterDocumentsSetup(items: INavData[]): void {
    const documentsSetupIndex = items.findIndex(item => item.title === true && item.name === 'Documents Setup');
    if (documentsSetupIndex === -1) {
      this.addTableMenusToSidebar(items);
      return;
    }

    const before = items.slice(0, documentsSetupIndex + 1);
    const after = items.slice(documentsSetupIndex + 1);
    this.addTableMenusToSidebar(before);
    items.splice(0, items.length, ...before, ...after);
  }

  /**
   * Add table menus to sidebar navigation
   */
  private addTableMenusToSidebar(filteredItems: INavData[]): void {
    const userRole = this.authService.role();
    const userRoleLower = userRole?.toLowerCase() || '';
    const isAdmin = this.isUserAdmin();
    const bypassPermissionChecksForUser = true;

    console.log('[DefaultLayout] Adding table menus to sidebar:', this.tableMenus.length, 'menus');

    this.tableMenus.forEach(menu => {
      // Check if user has permission to view this menu
      const hasPermission = bypassPermissionChecksForUser || !menu.permissions || menu.permissions.length === 0 || 
        (this.currentUserGroup && menu.permissions.some(perm => 
          perm.toLowerCase() === this.currentUserGroup?.name?.toLowerCase() ||
          perm.toLowerCase() === this.currentUserGroup?.foreignName?.toLowerCase() ||
          perm.toLowerCase() === userRoleLower
        ));

      if (hasPermission) {
        const menuChildren: any[] = [];

        // Add sub menus if available
        if (menu.subMenus && menu.subMenus.length > 0) {
          menu.subMenus
            .filter(subMenu => subMenu.isActive)
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
            .forEach(subMenu => {
              // Check sub menu permissions
              const subMenuHasPermission = bypassPermissionChecksForUser || !subMenu.permissions || subMenu.permissions.length === 0 ||
                (this.currentUserGroup && subMenu.permissions.some(perm =>
                  perm.toLowerCase() === this.currentUserGroup?.name?.toLowerCase() ||
                  perm.toLowerCase() === this.currentUserGroup?.foreignName?.toLowerCase() ||
                  perm.toLowerCase() === userRoleLower
                ));

              if (subMenuHasPermission) {
                const subMenuChildren: any[] = [];

                // Add menu documents under sub menu (documents that belong to this sub menu)
                if (subMenu.menuDocuments && subMenu.menuDocuments.length > 0) {
                  subMenu.menuDocuments
                    .filter(doc => doc.isActive)
                    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                    .forEach(doc => {
                      // Check document permissions
                      const docHasPermission = bypassPermissionChecksForUser || !doc.permissions || doc.permissions.length === 0 ||
                        (this.currentUserGroup && doc.permissions.some(perm =>
                          perm.toLowerCase() === this.currentUserGroup?.name?.toLowerCase() ||
                          perm.toLowerCase() === this.currentUserGroup?.foreignName?.toLowerCase() ||
                          perm.toLowerCase() === userRoleLower
                        ));

                      if (docHasPermission && doc.documentTypeId) {
                        subMenuChildren.push({
                          name: doc.documentTypeName || doc.documentTypeCode || `Document ${doc.documentTypeId}`,
                          url: `/document-types/${doc.documentTypeId}/submissions`,
                          iconComponent: { name: 'cil-description' }
                        });
                      }
                    });
                }

                // Always add sub menu, even if it has no documents
                // If it has documents, show them as children; otherwise, make it a link
                if (subMenuChildren.length > 0) {
                  // Sub menu with documents as children
                  console.log(`[DefaultLayout] Adding sub menu "${subMenu.name}" with ${subMenuChildren.length} documents`);
                  menuChildren.push({
                    name: subMenu.name || subMenu.foreignName || `Sub Menu ${subMenu.id}`,
                    iconComponent: { name: 'cil-list' },
                    children: subMenuChildren
                  });
                } else {
                  // Sub menu without documents - make it a link
                  console.log(`[DefaultLayout] Adding sub menu "${subMenu.name}" without documents`);
                  menuChildren.push({
                    name: subMenu.name || subMenu.foreignName || `Sub Menu ${subMenu.id}`,
                    url: `/dashboard-menus?menuId=${menu.id}&subMenuId=${subMenu.id}`,
                    iconComponent: { name: 'cil-list' }
                  });
                }
              }
            });
        }

        // Add menu documents directly if no sub menus or as fallback
        if (menu.menuDocuments && menu.menuDocuments.length > 0) {
          menu.menuDocuments
            .filter(doc => doc.isActive && (!doc.subMenuId || doc.subMenuId === 0))
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
            .forEach(doc => {
              const docHasPermission = bypassPermissionChecksForUser || !doc.permissions || doc.permissions.length === 0 ||
                (this.currentUserGroup && doc.permissions.some(perm =>
                  perm.toLowerCase() === this.currentUserGroup?.name?.toLowerCase() ||
                  perm.toLowerCase() === this.currentUserGroup?.foreignName?.toLowerCase() ||
                  perm.toLowerCase() === userRoleLower
                ));

              if (docHasPermission && doc.documentTypeId) {
                menuChildren.push({
                  name: doc.documentTypeName || `Document ${doc.documentTypeId}`,
                  url: `/document-types/${doc.documentTypeId}/submissions`,
                  iconComponent: { name: 'cil-description' }
                });
              }
            });
        }

        // Add menu to sidebar
        const menuItem: INavData = {
          name: menu.name || menu.foreignName || `Menu ${menu.id}`,
          iconComponent: { name: this.resolveSidebarIcon(menu.icon) },
          ...(menuChildren.length > 0 ? { children: menuChildren } : {
            url: `/dashboard-menus?menuId=${menu.id}`
          })
        };

        console.log(`[DefaultLayout] Adding menu "${menu.name}" with ${menuChildren.length} children to sidebar`);
        filteredItems.push(menuItem);
      }
    });
  }

  private resolveSidebarIcon(iconName?: string | null): string {
    if (!iconName) {
      return 'cil-layers';
    }

    const normalizedIconName = iconName.trim();
    return this.sidebarIconNames.has(normalizedIconName) ? normalizedIconName : 'cil-layers';
  }
}
