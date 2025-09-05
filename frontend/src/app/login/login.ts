import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { merge } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../api.services';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  readonly email = new FormControl('', [Validators.required, Validators.email]);
  readonly password = new FormControl('', [
    Validators.required,
    Validators.minLength(7),
  ]);

  errorMessage = signal('');
  hide = signal(true);

  constructor(private apiService: ApiService, private router: Router) {
    merge(this.email.statusChanges, this.email.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateErrorMessage());
  }

  updateErrorMessage() {
    if (this.email.hasError('required')) {
      this.errorMessage.set('You must insert a valid email');
    } else if (this.email.hasError('email')) {
      this.errorMessage.set('Invalid email');
    } else {
      this.errorMessage.set('');
    }
  }

  clickEvent(event: MouseEvent) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }

  onLogin() {
    this.apiService
      .loginUser({
        email: this.email.value,
        password: this.password.value,
      })
      .subscribe({
        next: (response) => {
          localStorage.setItem('authToken', response.token);
          this.router.navigate(['/homepage']);
        },
        error: (error) => {
          this.errorMessage.set('Login failed');
        },
      });
  }
}
