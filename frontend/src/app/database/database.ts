import { Component } from '@angular/core';
import { ProfileSymbol } from '../profile-symbol/profile-symbol';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../api.services';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-database',
  imports: [ProfileSymbol, RouterModule, CommonModule],
  templateUrl: './database.html',
  styleUrls: ['./database.scss'],
})
export class Database {
  databases: any[] = [];

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
}
