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

  editDatabase(databaseData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/database/edit`, databaseData);
  }

  deleteDatabase(databaseId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/database/delete/${databaseId}`);
  }

  findAllDatabases(): Observable<any> {
    return this.http.get(`${this.apiUrl}/database/findAll`);
  }

  findAllImagesByDatabase(databaseId: any): Observable<any> {
    return this.http.get(`${this.apiUrl}/image/findAllByDatabase`, {
      params: { databaseId },
    });
  }

  findImageById(imageId: any): Observable<any> {
    return this.http.get(`${this.apiUrl}/image/findImageById`, {
      params: { imageId },
    });
  }

  segmentation(formData: FormData) {
    return this.http.post(`${this.apiUrl}/image/segment`, formData);
  }

  generateInitialMarkers(formData: FormData): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/image/generate-initial-markers`,
      formData,
      {
        reportProgress: true,
        observe: 'events',
      }
    );
  }

  getAnnotation(imageId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/annotation/${imageId}`);
  }
}
