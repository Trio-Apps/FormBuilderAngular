import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ToastModule } from 'primeng/toast';

import { ColorModeService } from '@coreui/angular';
import { IconSetService } from '@coreui/icons-angular';
import { iconSubset } from './icons/icon-subset';
import { TranslationService } from './core/services/translation.service';

@Component({
    selector: 'app-root',
    template: `
      <p-toast [autoZIndex]="true" [baseZIndex]="200000"></p-toast>
      <router-outlet />
    `,
    imports: [RouterOutlet, ToastModule]
})
export class AppComponent implements OnInit {
  title = 'Beon-IT Formbuilder';

  readonly #destroyRef: DestroyRef = inject(DestroyRef);
  readonly #activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #titleService = inject(Title);

  readonly #colorModeService = inject(ColorModeService);
  readonly #iconSetService = inject(IconSetService);
  readonly #translationService = inject(TranslationService);

  constructor() {
    this.#titleService.setTitle(this.title);
    // iconSet singleton
    this.#iconSetService.icons = { ...iconSubset };
    this.#colorModeService.localStorageItemName.set('coreui-free-angular-admin-template-theme-default');
    this.#colorModeService.eventName.set('ColorSchemeChange');
    this.#colorModeService.colorMode.set('light');
  }

  ngOnInit(): void {

    this.#router.events.pipe(
        takeUntilDestroyed(this.#destroyRef)
      ).subscribe((evt) => {
      if (!(evt instanceof NavigationEnd)) {
        return;
      }
    });

    // Handle language query parameter (?lang=ar or ?lang=en)
    this.#router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(this.#destroyRef)
    ).subscribe(() => {
      const queryParams = this.#activatedRoute.snapshot.queryParams;
      if (queryParams['lang'] === 'ar' || queryParams['lang'] === 'en') {
        this.#translationService.setLanguage(queryParams['lang']);
      }
    });

    // Also check initial query params
    const initialLang = this.#activatedRoute.snapshot.queryParams['lang'];
    if (initialLang === 'ar' || initialLang === 'en') {
      this.#translationService.setLanguage(initialLang);
    }
  }
}
