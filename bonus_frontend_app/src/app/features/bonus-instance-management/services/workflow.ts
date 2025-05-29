import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { catchError } from "rxjs/operators";
import { AuthService } from "../../../core/auth/auth";

export interface WorkflowAction {
  to: string;
  label: string;
  description: string;
}

export interface WorkflowHistoryEntry {
  action: string;
  fromStatus: string;
  toStatus: string;
  timestamp: Date;
  userId: string;
  userName: string;
  comments?: string;
}

@Injectable({
  providedIn: "root"
})
export class WorkflowService {
  private apiUrl = "/api/bonus/instances"; // Base URL for instances

  constructor(private http: HttpClient, private authService: AuthService) {}

  /**
   * Get allowed actions for a bonus instance
   * 
   * @param instanceId - ID of the bonus instance
   * @returns Observable of allowed actions
   */
  getAllowedActions(instanceId: string): Observable<Record<string, WorkflowAction>> {
    return this.http.get<Record<string, WorkflowAction>>(`${this.apiUrl}/${instanceId}/actions`)
      .pipe(catchError(this.authService["handleError"]));
  }

  /**
   * Perform a workflow transition
   * 
   * @param instanceId - ID of the bonus instance
   * @param action - Action to perform (e.g., 'submit_review', 'approve')
   * @param data - Additional data for the transition (e.g., comments)
   * @returns Observable of the transition result
   */
  performTransition(instanceId: string, action: string, data: any = {}): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${instanceId}/status`, { action, ...data })
      .pipe(catchError(this.authService["handleError"]));
  }

  /**
   * Get workflow history for an instance
   * 
   * @param instanceId - ID of the bonus instance
   * @returns Observable of workflow history entries
   */
  getWorkflowHistory(instanceId: string): Observable<WorkflowHistoryEntry[]> {
    return this.http.get<WorkflowHistoryEntry[]>(`${this.apiUrl}/${instanceId}/history`)
      .pipe(catchError(this.authService["handleError"]));
  }

  /**
   * Helper method to get status display name
   * 
   * @param status - Status code
   * @returns Human-readable status name
   */
  getStatusDisplayName(status: string): string {
    const statusMap: Record<string, string> = {
      'draft': 'Draft',
      'pending_generation': 'Pending Generation',
      'generated': 'Generated',
      'under_review': 'Under Review',
      'approved': 'Approved',
      'paid': 'Paid',
      'cancelled': 'Cancelled'
    };
    
    return statusMap[status] || status;
  }

  /**
   * Helper method to get status class for styling
   * 
   * @param status - Status code
   * @returns CSS class name
   */
  getStatusClass(status: string): string {
    const statusClassMap: Record<string, string> = {
      'draft': 'status-draft',
      'pending_generation': 'status-pending',
      'generated': 'status-generated',
      'under_review': 'status-review',
      'approved': 'status-approved',
      'paid': 'status-paid',
      'cancelled': 'status-cancelled'
    };
    
    return statusClassMap[status] || '';
  }
}
