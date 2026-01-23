import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-table-shell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-shell.component.html',
  styleUrls: ['./table-shell.component.scss']
})
export class TableShellComponent {
  @Input() title = '';
  @Input() icon = '';
}
