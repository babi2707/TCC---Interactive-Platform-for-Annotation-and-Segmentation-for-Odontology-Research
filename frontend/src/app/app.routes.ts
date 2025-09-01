import { RouterModule, Routes } from '@angular/router';
import { Login } from './login/login';
import { Register } from './register/register';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'register', component: Register }
];
