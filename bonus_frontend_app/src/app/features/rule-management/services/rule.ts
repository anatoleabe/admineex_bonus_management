import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { catchError } from "rxjs/operators";
import { AuthService } from "../../../core/auth/auth"; // Adjust path as needed

// Define an interface for the BonusRule structure (align with backend model)
export interface BonusRule {
  _id?: string;
  name: string;
  description?: string;
  condition: string;
  action: string;
  priority?: number;
  isActive?: boolean;
  appliesToTemplates?: string[] | { _id: string, code: string, name: string }[]; // Can be IDs or populated objects
  // Add other fields like createdBy, createdAt etc. if needed in UI
}

@Injectable({
  providedIn: "root" // Provide service at root level
})
export class RuleService {
  // Use environment variables for API URL in a real app
  private apiUrl = "/api/bonus/rules"; // Assuming proxy config or relative path

  constructor(private http: HttpClient, private authService: AuthService) {}

  // Fetch all active rules (add filters/pagination later)
  getRules(includeInactive = false, templateId?: string): Observable<BonusRule[]> {
    let params = new HttpParams();
    if (includeInactive) {
      params = params.set("includeInactive", "true");
    }
    if (templateId) {
      params = params.set("templateId", templateId);
    }
    // Interceptor will add the auth token
    return this.http.get<BonusRule[]>(this.apiUrl, { params })
      .pipe(catchError(this.authService["handleError"])); // Use handleError from AuthService
  }

  // Fetch a single rule by ID
  getRuleById(id: string): Observable<BonusRule> {
    return this.http.get<BonusRule>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.authService["handleError"]));
  }

  // Create a new rule
  createRule(ruleData: BonusRule): Observable<BonusRule> {
    return this.http.post<BonusRule>(this.apiUrl, ruleData)
      .pipe(catchError(this.authService["handleError"]));
  }

  // Update an existing rule
  updateRule(id: string, ruleData: Partial<BonusRule>): Observable<BonusRule> {
    return this.http.put<BonusRule>(`${this.apiUrl}/${id}`, ruleData)
      .pipe(catchError(this.authService["handleError"]));
  }

  // Deactivate a rule (soft delete)
  deactivateRule(id: string): Observable<any> { // Backend returns { message, rule }
    return this.http.delete<any>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.authService["handleError"]));
  }

  // Add other methods as needed (e.g., activate, validate, test)
}

