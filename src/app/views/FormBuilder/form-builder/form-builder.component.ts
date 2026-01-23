import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule  // مهم لعرض المكونات الفرعية
  ],
  template: `
    <div class="form-builder-shell">
      <div class="container-fluid py-4">
        <!-- Router Outlet for Child Components -->
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styleUrls: ['./form-builder.component.scss']
})
export class FormBuilderComponent implements OnInit {
  ngOnInit(): void {
    // Component initialized
  }
}
