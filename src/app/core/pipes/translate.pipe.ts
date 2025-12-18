import { Pipe, PipeTransform, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { TranslationService } from '../services/translation.service';
import { Subscription } from 'rxjs';

@Pipe({
  name: 'translate',
  pure: false,
  standalone: true
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private lastKey: string = '';
  private lastValue: string = '';
  private subscription?: Subscription;

  constructor(
    private translationService: TranslationService,
    private changeDetector: ChangeDetectorRef
  ) {
    // Subscribe to language changes
    this.subscription = this.translationService.getLanguage$().subscribe(() => {
      this.lastKey = ''; // Reset cache to force re-translation
      this.changeDetector.markForCheck();
    });
  }

  transform(key: string, params?: { [key: string]: any }): string {
    if (!key || key === this.lastKey) {
      return this.lastValue;
    }

    this.lastKey = key;
    this.lastValue = this.translationService.translate(key, params);
    return this.lastValue;
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
