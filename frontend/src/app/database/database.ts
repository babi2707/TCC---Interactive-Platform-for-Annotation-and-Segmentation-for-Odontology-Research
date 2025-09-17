import { Component } from '@angular/core';
import { ProfileSymbol } from '../profile-symbol/profile-symbol';

@Component({
  selector: 'app-database',
  imports: [
    ProfileSymbol
  ],
  templateUrl: './database.html',
  styleUrls: ['./database.scss'],
})
export class Database {

}
