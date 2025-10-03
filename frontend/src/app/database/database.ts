import {
  Component,
  PLATFORM_ID,
  Inject,
  ChangeDetectorRef,
} from '@angular/core';
import { ProfileSymbol } from '../profile-symbol/profile-symbol';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../api.services';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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

  constructor(
    private apiService: ApiService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadDatabases();
    }
  }

  loadDatabases() {
    this.apiService.findAllDatabases().subscribe({
      next: (data) => {
        this.databases = data;
        this.cd.markForCheck();
      },
      error: (err) => console.error('Error fetching databases:', err),
    });
  }

  navigateToDatabaseRegister() {
    this.router.navigate(['/register-database']);
  }

  navigateToDatabaseImages(databaseId: number, databaseName: string) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('selectedDatabaseId', String(databaseId));
      localStorage.setItem('selectedDatabaseName', databaseName);
    }
    this.router.navigate(['/images', databaseId]).then(() => {
      if (isPlatformBrowser(this.platformId)) {
        window.location.reload();
      }
    });
  }

  toggleDatabaseDropdown(key: string, event: MouseEvent) {
    event.stopPropagation();
    this.openDropdowns[key] = !this.openDropdowns[key];
  }

  closeDatabaseDropdown(key: string) {
    this.openDropdowns[key] = false;
  }
}
