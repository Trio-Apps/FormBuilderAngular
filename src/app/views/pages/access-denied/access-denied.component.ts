import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  template: `
    <div class="access-denied-container">
      <div class="access-denied-card">
        <div class="icon-container">
          <i class="pi pi-lock"></i>
        </div>
        <h1>Access Denied</h1>
        <p class="message">
          You don't have permission to access this page.
          <br>
          Please contact your administrator if you believe this is an error.
        </p>
        <p class="message-ar">
          ليس لديك صلاحية للوصول إلى هذه الصفحة.
          <br>
          يرجى التواصل مع المسؤول إذا كنت تعتقد أن هذا خطأ.
        </p>
        <div class="actions">
          <button pButton 
                  icon="pi pi-arrow-left" 
                  label="Go Back" 
                  class="p-button-secondary p-button-lg"
                  (click)="goBack()">
          </button>
          <button pButton 
                  icon="pi pi-home" 
                  label="Go to Dashboard" 
                  class="p-button-primary p-button-lg"
                  routerLink="/dashboard">
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .access-denied-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
    
    .access-denied-card {
      background: white;
      border-radius: 16px;
      padding: 60px 40px;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      max-width: 500px;
      width: 100%;
    }
    
    .icon-container {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 30px;
      
      i {
        font-size: 48px;
        color: white;
      }
    }
    
    h1 {
      font-size: 2rem;
      color: #1a1a2e;
      margin-bottom: 20px;
      font-weight: 700;
    }
    
    .message {
      color: #4a5568;
      font-size: 1.1rem;
      line-height: 1.6;
      margin-bottom: 15px;
    }
    
    .message-ar {
      color: #718096;
      font-size: 1rem;
      line-height: 1.6;
      margin-bottom: 30px;
      direction: rtl;
    }
    
    .actions {
      display: flex;
      gap: 15px;
      justify-content: center;
      flex-wrap: wrap;
      
      button {
        min-width: 150px;
      }
    }
    
    @media (max-width: 480px) {
      .access-denied-card {
        padding: 40px 20px;
      }
      
      .icon-container {
        width: 100px;
        height: 100px;
        
        i {
          font-size: 40px;
        }
      }
      
      h1 {
        font-size: 1.5rem;
      }
      
      .actions {
        flex-direction: column;
        
        button {
          width: 100%;
        }
      }
    }
  `]
})
export class AccessDeniedComponent {
  goBack(): void {
    window.history.back();
  }
}

