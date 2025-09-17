import { Component } from '@angular/core';
import { ProfileSymbol } from '../profile-symbol/profile-symbol';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-database',
  imports: [ProfileSymbol, RouterModule],
  templateUrl: './database.html',
  styleUrls: ['./database.scss'],
})
export class Database {
  constructor(private router: Router) {}

  navigateToDatabaseRegister() {
    this.router.navigate(['/register-database']);
  }
}
