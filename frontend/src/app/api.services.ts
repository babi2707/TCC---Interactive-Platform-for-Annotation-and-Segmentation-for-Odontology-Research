import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  registerUser(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/user/register`, userData);
  }

  loginUser(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/user/login`, credentials);
  }

  registerDatabase(databaseData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/database/register`, databaseData);
  }

  findAllDatabases(): Observable<any> {
    return this.http.get(`${this.apiUrl}/database/findAll`);
  }
}
