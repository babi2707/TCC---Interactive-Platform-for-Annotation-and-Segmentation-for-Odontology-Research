import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { ClickOutsideDirective } from '../app.clickoutside';

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, MatDividerModule, ClickOutsideDirective],
  templateUrl: './homepage.html',
  styleUrls: ['./homepage.scss'],
})
export class Homepage {
  showUserDropdown = false;

  toggleUserDropdown() {
    this.showUserDropdown = !this.showUserDropdown;
  }

  closeDropdown() {
    this.showUserDropdown = false;
  }
}
