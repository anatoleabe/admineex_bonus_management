import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

// Define the expected response structure from the signin endpoint
interface AuthResponse {
  activated?: boolean;
  token: string;
  language?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Use environment variables for API URL in a real app
  private apiUrl = 'http://localhost:4001/api'; // Base URL from user
  private tokenKey = 'bonus_auth_token';

  private loggedInStatus = new BehaviorSubject<boolean>(this.hasToken());

  constructor(private http: HttpClient, private router: Router) { }

  /**
   * Checks if a token exists in local storage.
   */
  private hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  /**
   * Saves the authentication token to local storage.
   * @param token The JWT token string.
   */
  private saveToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.loggedInStatus.next(true);
  }

  /**
   * Removes the authentication token from local storage.
   */
  private removeToken(): void {
    localStorage.removeItem(this.tokenKey);
    this.loggedInStatus.next(false);
  }

  /**
   * Retrieves the authentication token from local storage.
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Observable indicating the user's logged-in status.
   */
  isLoggedIn(): Observable<boolean> {
    return this.loggedInStatus.asObservable();
  }

  /**
   * Logs the user in by sending credentials to the backend.
   * @param credentials User email and password.
   * @returns Observable of the authentication response.
   */
  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/account/signin`, credentials)
      .pipe(
        tap(response => {
          if (response && response.token) {
            this.saveToken(response.token);
          } else {
            // Handle cases where login succeeds but no token is returned (shouldn't happen based on user info)
            console.error('Login successful but no token received.');
            this.removeToken(); // Ensure logged out state
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Logs the user out.
   */
  logout(): void {
    this.removeToken();
    // Optionally call a backend signout endpoint if available
    // this.http.get(`${this.apiUrl}/account/signout`).subscribe();
    this.router.navigate(['/login']); // Redirect to login page after logout
  }

  /**
   * Basic error handling for HTTP requests.
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Backend returned an unsuccessful response code
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      if (error.status === 401) {
        errorMessage = 'Invalid credentials. Please try again.';
      }
      // Add more specific error handling based on status codes if needed
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}

