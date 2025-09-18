import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { ClickOutsideDirective } from '../app.clickoutside';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-profile-symbol',
  standalone: true,
  imports: [CommonModule, MatDividerModule, ClickOutsideDirective, RouterModule],
  templateUrl: './profile-symbol.html',
  styleUrls: ['./profile-symbol.scss']
})
export class ProfileSymbol {
  showUserDropdown = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private router: Router) {}

  toggleUserDropdown() {
    this.showUserDropdown = !this.showUserDropdown;
  }

  closeUserDropdown() {
    this.showUserDropdown = false;
  }

  onLogout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.clear();
    }
    this.router.navigate(['/']);
  }
}
