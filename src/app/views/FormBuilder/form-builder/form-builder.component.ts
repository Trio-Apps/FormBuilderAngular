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
    <div class="container-fluid py-4">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1 class="h2 mb-0">Form Builder System</h1>
      </div>
      
      <!-- Router Outlet for Child Components -->
      <router-outlet></router-outlet>
    </div>
  `,
  styleUrls: ['./form-builder.component.scss']
})
export class FormBuilderComponent implements OnInit {
  ngOnInit(): void {
    // Component initialized
  }
}