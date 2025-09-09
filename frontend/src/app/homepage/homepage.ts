import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { ProfileSymbol } from "../profile-symbol/profile-symbol";

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, MatDividerModule, ProfileSymbol],
  templateUrl: './homepage.html',
  styleUrls: ['./homepage.scss'],
})
export class Homepage {
  
}
