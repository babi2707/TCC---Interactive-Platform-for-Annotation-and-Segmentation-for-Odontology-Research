import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Login } from "./login/login";

@Component({
  selector: 'app-root',
  imports: [Login],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'frontend';
}
