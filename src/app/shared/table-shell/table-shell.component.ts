import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input } from '@angular/core';

@Component({
  selector: 'app-table-shell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-shell.component.html',
  styleUrls: ['./table-shell.component.scss']
})
export class TableShellComponent {
  // Prevent native browser tooltip from inherited `title="..."` attribute on host element.
  @HostBinding('attr.title') hostTitle: string | null = null;

  @Input() title = '';
  @Input() icon = '';
}
