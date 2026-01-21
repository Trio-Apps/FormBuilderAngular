import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TableMenusService, DashboardMenuDto, DashboardSubMenuDto, DashboardDocumentDto } from '../../../services/table-menus.service';
import { AuthService } from '../../../auth/auth.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard-menus-view',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ToastModule,
    ButtonModule,
    TranslatePipe
  ],
  templateUrl: './dashboard-menus-view.component.html',
  styleUrls: ['./dashboard-menus-view.component.scss'],
  providers: [MessageService]
})
export class DashboardMenusViewComponent implements OnInit, OnDestroy {
  menus: DashboardMenuDto[] = [];
  loading = false;
  error: string | undefined = undefined;
  
  // Get user permissions from auth service or user service
  userPermissions: string[] = [];

  private subscriptions = new Subscription();

  constructor(
    private tableMenusService: TableMenusService,
    private authService: AuthService,
    private messageService: MessageService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadUserPermissions();
    this.loadDashboardMenus();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Load user permissions from auth service or user service
   * You may need to adjust this based on your auth implementation
   */
  private loadUserPermissions(): void {
    // TODO: Get permissions from auth service or user service
    // Example:
    // const currentUser = this.authService.getCurrentUser();
    // this.userPermissions = currentUser?.roles || currentUser?.permissions || [];
    
    // For now, using a placeholder - replace with actual implementation
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      // You might decode the token to get user roles/permissions
      // Or call an API endpoint to get user permissions
      this.userPermissions = ['User']; // Placeholder
    }
  }

  /**
   * Load dashboard menus filtered by user permissions
   */
  loadDashboardMenus(): void {
    this.loading = true;
    this.error = undefined;

    const sub = this.tableMenusService.getDashboardMenus(this.userPermissions).subscribe({
      next: (menus) => {
        this.menus = menus.sort((a, b) => a.displayOrder - b.displayOrder);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.error = error.message || 'Failed to load dashboard menus';
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.error
        });
        this.cdr.detectChanges();
      }
    });

    this.subscriptions.add(sub);
  }

  /**
   * Handle document click - navigate to document list or create page
   */
  openDocument(document: DashboardDocumentDto): void {
    // Navigate to document submissions list or create page
    // Adjust the route based on your routing structure
    this.router.navigate(['/document-types', document.documentTypeId, 'submissions']);
  }

  /**
   * Check if menu has any visible content
   */
  hasVisibleContent(menu: DashboardMenuDto): boolean {
    const hasSubMenus = !!(menu.subMenus && menu.subMenus.length > 0);
    const hasDocuments = !!(menu.documents && menu.documents.length > 0);
    return hasSubMenus || hasDocuments;
  }

  /**
   * Check if sub menu has documents
   */
  hasSubMenuDocuments(subMenu: DashboardSubMenuDto): boolean {
    return !!(subMenu.documents && subMenu.documents.length > 0);
  }

  /**
   * Get total number of sub menus
   */
  getTotalSubMenus(): number {
    return this.menus.reduce((total, menu) => {
      return total + (menu.subMenus?.length || 0);
    }, 0);
  }

  /**
   * Get total number of documents
   */
  getTotalDocuments(): number {
    return this.menus.reduce((total, menu) => {
      const menuDocs = menu.documents?.length || 0;
      const subMenuDocs = menu.subMenus?.reduce((subTotal, subMenu) => {
        return subTotal + (subMenu.documents?.length || 0);
      }, 0) || 0;
      return total + menuDocs + subMenuDocs;
    }, 0);
  }

  /**
   * Switch language
   */
  switchLanguage(lang: 'en' | 'ar'): void {
    this.translationService.setLanguage(lang);
  }
}

