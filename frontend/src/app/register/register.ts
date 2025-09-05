import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { merge } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../api.services';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  readonly name = new FormControl('', [
    Validators.required,
    Validators.minLength(3),
  ]);
  readonly email = new FormControl('', [Validators.required, Validators.email]);
  readonly role = new FormControl('', [Validators.required]);
  readonly password = new FormControl('', [
    Validators.required,
    Validators.minLength(7),
  ]);
  readonly confirmPassword = new FormControl('', [Validators.required]);

  errorMessage = signal('');
  emailErrorMessage = signal('');
  passwordErrorMessage = signal('');
  nameErrorMessage = signal('');

  hide = signal(true);
  hideConfirm = signal(true);

  passwordMismatch = false;

  constructor(private apiService: ApiService, private router: Router) {
    merge(this.email.statusChanges, this.email.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateEmailErrorMessage());

    merge(this.password.statusChanges, this.password.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updatePasswordErrorMessage());

    merge(this.name.statusChanges, this.name.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateNameErrorMessage());

    merge(this.confirmPassword.statusChanges, this.confirmPassword.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.checkPasswordMatch());
  }

  get formInvalid(): boolean {
    return (
      this.name.invalid ||
      this.email.invalid ||
      this.role.invalid ||
      this.password.invalid ||
      this.confirmPassword.invalid ||
      this.passwordMismatch
    );
  }

  clickEvent(event: Event) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }

  updateEmailErrorMessage() {
    if (this.email.hasError('required')) {
      this.emailErrorMessage.set('Você deve inserir um email válido');
    } else if (this.email.hasError('email')) {
      this.emailErrorMessage.set('Email inválido');
    } else {
      this.emailErrorMessage.set('');
    }
  }

  updatePasswordErrorMessage() {
    if (this.password.hasError('required')) {
      this.passwordErrorMessage.set('A senha é obrigatória');
    } else if (this.password.hasError('minlength')) {
      this.passwordErrorMessage.set('A senha deve ter no mínimo 7 caracteres');
    } else {
      this.passwordErrorMessage.set('');
    }
  }

  updateNameErrorMessage() {
    if (this.name.hasError('required')) {
      this.nameErrorMessage.set('O nome é obrigatório');
    } else if (this.name.hasError('minlength')) {
      this.nameErrorMessage.set('O nome deve ter pelo menos 3 caracteres');
    } else {
      this.nameErrorMessage.set('');
    }
  }

  checkPasswordMatch() {
    this.passwordMismatch = this.password.value !== this.confirmPassword.value;
  }

  togglePasswordVisibility(event: Event) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }

  toggleConfirmPasswordVisibility(event: Event) {
    this.hideConfirm.set(!this.hideConfirm());
    event.stopPropagation();
  }

  onRegister() {
    this.apiService
      .registerUser({
        name: this.name.value,
        email: this.email.value,
        role: this.role.value,
        password: this.password.value,
      })
      .subscribe({
        next: (response) => {
          alert('Registration successful! Please log in.');
          this.router.navigate(['/']);
        },
        error: (error) => {
          this.errorMessage.set('Registration failed');
        },
      });
  }
}
