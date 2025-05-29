import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { catchError } from "rxjs/operators";
import { AuthService } from "../../../core/auth/auth"; // Adjust path as needed

// Define an interface for the BonusTemplate structure (align with backend model)
export interface BonusTemplate {
  _id?: string;
  code: string;
  name: string;
  description?: string;
  category: "with_parts" | "without_parts" | "fixed_amount" | "calculated";
  periodicity: "monthly" | "quarterly" | "semesterly" | "yearly" | "on_demand";
  eligibilityRules?: any[]; // Define more specific interface if needed
  calculationConfig?: any; // Define more specific interface if needed
  approvalWorkflow?: any; // Define more specific interface if needed
  documentation?: string;
  isActive?: boolean;
  // Add other fields like createdBy, createdAt etc. if needed in UI
}

@Injectable({
  providedIn: "root" // Provide service at root level
})
export class TemplateService {
  // Use environment variables for API URL in a real app
  private apiUrl = "/api/bonus/templates"; // Assuming proxy config or relative path

  constructor(private http: HttpClient, private authService: AuthService) {}

  // Fetch all active templates (add filters/pagination later)
  getTemplates(includeInactive = false): Observable<BonusTemplate[]> {
    let params = new HttpParams();
    if (includeInactive) {
      params = params.set("includeInactive", "true");
    }
    // Interceptor will add the auth token
    return this.http.get<BonusTemplate[]>(this.apiUrl, { params })
      .pipe(catchError(this.authService["handleError"])); // Use handleError from AuthService
  }

  // Fetch a single template by ID
  getTemplateById(id: string): Observable<BonusTemplate> {
    return this.http.get<BonusTemplate>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.authService["handleError"]));
  }

  // Create a new template
  createTemplate(templateData: BonusTemplate): Observable<BonusTemplate> {
    return this.http.post<BonusTemplate>(this.apiUrl, templateData)
      .pipe(catchError(this.authService["handleError"]));
  }

  // Update an existing template
  updateTemplate(id: string, templateData: Partial<BonusTemplate>): Observable<BonusTemplate> {
    return this.http.put<BonusTemplate>(`${this.apiUrl}/${id}`, templateData)
      .pipe(catchError(this.authService["handleError"]));
  }

  // Deactivate a template (soft delete)
  deactivateTemplate(id: string): Observable<any> { // Backend returns { message, template }
    return this.http.delete<any>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.authService["handleError"]));
  }

  // Add other methods as needed (e.g., activate, clone, validate, test)
}

