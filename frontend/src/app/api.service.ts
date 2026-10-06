import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = 'http://localhost:8001/api';

  constructor(private readonly http: HttpClient) {}

  get<T>(path: string, params: Record<string, string> = {}): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${path}`, { headers: this.headers(), params: new HttpParams({ fromObject: params }) });
  }

  post<T>(path: string, value: object): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${path}`, value, { headers: this.headers() });
  }

  patch<T>(path: string, value: object): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}/${path}`, value, { headers: this.headers() });
  }

  delete(path: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${path}`, { headers: this.headers() });
  }

  private headers(): HttpHeaders {
    const token = localStorage.getItem('crm_token');
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }
}
