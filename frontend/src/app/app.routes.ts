import { RouterModule, Routes } from '@angular/router';
import { Login } from './login/login';
import { Register } from './register/register';
import { Homepage } from './homepage/homepage';
import { Database } from './database/database';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'register', component: Register },
  { path: 'homepage', component: Homepage },
  { path: 'database', component: Database }
];
