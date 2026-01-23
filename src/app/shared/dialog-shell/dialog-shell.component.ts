import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-dialog-shell',
  standalone: true,
  imports: [CommonModule, DialogModule],
  templateUrl: './dialog-shell.component.html',
  styleUrls: ['./dialog-shell.component.scss'],
})
export class DialogShellComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() header?: string;
  @Input() modal = true;
  @Input() style?: Record<string, unknown>;
  @Input() styleClass?: string;
  @Input() draggable = false;
  @Input() resizable = false;
  @Input() closable = true;
  @Input() closeOnEscape = true;
  @Input() dismissableMask = true;
  @Input() appendTo: string | HTMLElement = 'body';
  @Input() baseZIndex?: number;
  @Input() autoZIndex?: boolean;

  @Output() onHide = new EventEmitter<void>();
  @Output() onShow = new EventEmitter<void>();

  get resolvedStyleClass(): string {
    return ['app-dialog-shell', this.styleClass].filter(Boolean).join(' ');
  }

  handleHide(): void {
    this.visibleChange.emit(false);
    this.onHide.emit();
  }
}
