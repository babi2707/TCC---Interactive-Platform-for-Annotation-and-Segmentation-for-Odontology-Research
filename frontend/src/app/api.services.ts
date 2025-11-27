import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../environment/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  registerUser(userData: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/user/register`, userData);
  }

  loginUser(credentials: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/user/login`, credentials);
  }

  registerDatabase(databaseData: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/database/register`, databaseData);
  }

  editDatabase(databaseData: any): Observable<any> {
    return this.http.put(`${environment.apiUrl}/database/edit`, databaseData);
  }

  deleteDatabase(databaseId: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/database/delete/${databaseId}`);
  }

  findAllDatabases(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/database/findAll`);
  }

  findAllImagesByDatabase(databaseId: any): Observable<any> {
    return this.http.get(`${environment.apiUrl}/image/findAllByDatabase`, {
      params: { databaseId },
    });
  }

  findImageById(imageId: any): Observable<any> {
    return this.http.get(`${environment.apiUrl}/image/findImageById`, {
      params: { imageId },
    });
  }

  segmentation(formData: FormData) {
    return this.http.post(`${environment.apiUrl}/image/segment`, formData);
  }

  generateInitialMarkers(formData: FormData): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/image/generate-initial-markers`,
      formData,
      {
        reportProgress: true,
        observe: 'events',
      }
    );
  }

  getAnnotation(imageId: number): Observable<any> {
    return this.http.get(`${environment.apiUrl}/annotation/${imageId}`);
  }

  saveAnnotation(imageId: number, annotationData: any): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/annotation/${imageId}/save`,
      annotationData
    );
  }

  getSegmentedImage(imageId: number): Observable<any> {
    return this.http.get(
      `${environment.apiUrl}/image/findSegmentedImageByImageId?imageId=${imageId}`
    );
  }

  autoSaveAnnotation(imageId: number, annotationData: any): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/annotation/${imageId}/auto-save`,
      annotationData
    );
  }
}
