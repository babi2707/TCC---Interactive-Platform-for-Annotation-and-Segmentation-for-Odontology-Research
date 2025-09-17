import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../api.services';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-register-database',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
  ],
  templateUrl: './register-database.html',
  styleUrls: ['./register-database.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterDatabase {
  readonly name = new FormControl('', [Validators.required]);
  selectedFiles: File[] = [];

  errorMessage = signal('');
  hide = signal(true);

  constructor(private apiService: ApiService, private router: Router) {}

  updateErrorMessage() {
    if (this.name.hasError('required')) {
      this.errorMessage.set('You must insert a valid name');
    }
  }

  openFileSelector(event: MouseEvent) {
    event.preventDefault();
    const input = document.querySelector<HTMLInputElement>('input[type=file]');
    input?.click();
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const newFiles = Array.from(input.files);

      const uniqueFiles = newFiles.filter(
        (file) => !this.selectedFiles.some((f) => f.name === file.name)
      );

      this.selectedFiles = [...this.selectedFiles, ...uniqueFiles];
    }
  }

  private parseJwt(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );

      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  onRegisterNewDatabase() {
    if (this.name.invalid) {
      this.errorMessage.set('Please provide a valid name for the database.');
      return;
    }

    const token = localStorage.getItem('authToken');
    let userId = '';

    if (token) {
      const payload = this.parseJwt(token);
      userId = payload?.userId;

      console.log('User ID from token:', userId);
    }

    const formData = new FormData();
    formData.append('name', this.name.value || '');
    formData.append('userId', userId);

    this.selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    this.apiService.registerDatabase(formData).subscribe({
      next: () => this.router.navigate(['/database']),
      error: (err) => {
        console.error('Error registering database:', err);
        this.errorMessage.set('Failed to register database. Please try again.');
      },
    });
  }
}
