import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './form-builder.component.html', // صحح هذا السطر
  styleUrls: ['./form-builder.component.scss']
})
export class FormBuilderComponent {
  title = 'Form Builder';
}