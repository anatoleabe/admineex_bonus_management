import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { catchError } from "rxjs/operators";
import { AuthService } from "../../../core/auth/auth"; // Adjust path as needed
import { BonusInstance } from "../../bonus-instance-management/services/instance"; // Import related model

// Define an interface for an Approval Item (could be a BonusInstance or other entity)
// This might need refinement based on actual backend API response
export interface ApprovalItem {
  _id: string; // ID of the item needing approval (e.g., BonusInstance ID)
  type: string; // Type of item (e.g., "BonusInstance")
  referencePeriod?: string;
  status?: string; // Current status (e.g., "under_review")
  submittedBy?: string; // User who submitted for approval
  submittedAt?: Date;
  // Include relevant details from the item itself (e.g., template name)
  details?: Partial<BonusInstance>;
}

@Injectable({
  providedIn: "root"
})
export class ApprovalService {
  // Define the API endpoint for approvals
  // This is hypothetical and needs to match the actual backend implementation
  private apiUrl = "/api/bonus/approvals";

  constructor(private http: HttpClient, private authService: AuthService) {}

  /**
   * Fetches the list of items awaiting approval for the current user.
   * @param filters Optional filters (e.g., status, type)
   */
  getApprovalQueue(filters?: any): Observable<ApprovalItem[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        params = params.set(key, filters[key]);
      });
    }
    // Assumes the backend endpoint returns items assigned to the logged-in user based on their token/role
    return this.http.get<ApprovalItem[]>(this.apiUrl, { params })
      .pipe(catchError(this.authService["handleError"]));
  }

  /**
   * Submits an approval decision for a specific item.
   * @param itemId The ID of the item being approved/rejected.
   * @param decision The decision ("approve" or "reject").
   * @param comments Optional comments for the decision.
   */
  submitDecision(itemId: string, decision: "approve" | "reject", comments?: string): Observable<any> {
    // The backend endpoint might vary, e.g., PATCH /api/bonus/instances/:id/status or a dedicated approval endpoint
    // Using a hypothetical dedicated endpoint here:
    const payload = { decision, comments };
    return this.http.post<any>(`${this.apiUrl}/${itemId}/decision`, payload)
      .pipe(catchError(this.authService["handleError"]));

    /* Alternative using instance status update:
    const action = decision === "approve" ? "approve" : "reject";
    const payload = { comments }; // Backend needs to handle comments on reject
    return this.instanceService.updateInstanceStatus(itemId, action, payload)
        .pipe(catchError(this.authService["handleError"]));
    */
  }

  // Add other methods if needed (e.g., get approval history for an item)
}

