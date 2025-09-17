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

  errorMessage = signal('');
  hide = signal(true);

  constructor(private apiService: ApiService, private router: Router) {}

  updateErrorMessage() {
    if (this.name.hasError('required')) {
      this.errorMessage.set('You must insert a valid name');
    }
  }

  clickEvent(event: MouseEvent) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }

  onRegisterNewDatabase() {}
}
