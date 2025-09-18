import { Component } from '@angular/core';
import { ProfileSymbol } from '../profile-symbol/profile-symbol';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../api.services';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { ClickOutsideDirective } from '../app.clickoutside';

@Component({
  selector: 'app-database',
  imports: [
    ProfileSymbol,
    RouterModule,
    CommonModule,
    MatDividerModule,
    ClickOutsideDirective,
  ],
  templateUrl: './database.html',
  styleUrls: ['./database.scss'],
})
export class Database {
  databases: any[] = [];
  openDropdowns: Record<string, boolean> = {};

  constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit() {
    this.apiService.findAllDatabases().subscribe({
      next: (data) => {
        this.databases = data;
      },
      error: (err) => {
        console.error('Error fetching databases:', err);
      },
    });
  }

  navigateToDatabaseRegister() {
    this.router.navigate(['/register-database']);
  }

  toggleDatabaseDropdown(key: string) {
    this.openDropdowns[key] = !this.openDropdowns[key];
  }

  closeDatabaseDropdown(key: string) {
    this.openDropdowns[key] = false;
  }
}
