import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { catchError } from "rxjs/operators";
import { AuthService } from "../../../core/auth/auth"; // Adjust path as needed

// Define interfaces for BonusInstance and BonusAllocation (align with backend models)
export interface BonusInstance {
  _id?: string;
  templateId: string; // Reference to BonusTemplate
  referencePeriod: string;
  status?: "draft" | "pending_generation" | "generated" | "under_review" | "approved" | "paid" | "cancelled";
  shareAmount?: number;
  generationDate?: Date;
  approvalDate?: Date;
  paymentDate?: Date;
  customOverrides?: any;
  notes?: string;
  createdBy?: string; // User ID or populated object
  createdAt?: Date;
  updatedAt?: Date;
  // Add template details if populated by backend
  template?: { code: string, name: string };
}

export interface BonusAllocation {
  _id?: string;
  instanceId: string;
  personnelId: string;
  personnelSnapshotId: string;
  templateId: string;
  calculationInputs?: any;
  calculatedAmount?: number;
  finalAmount?: number;
  status?: "eligible" | "excluded_rule" | "excluded_manual" | "adjusted" | "paid" | "cancelled";
  adjustmentReason?: string;
  version?: number;
  previousVersion?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Add personnel details if populated by backend
  personnel?: { name: string, /* other relevant fields */ };
}

@Injectable({
  providedIn: "root"
})
export class InstanceService {
  private apiUrl = "/api/bonus/instances"; // Assuming proxy config or relative path
  private allocationApiUrl = "/api/bonus/allocations"; // Assuming separate endpoint for allocations

  constructor(private http: HttpClient, private authService: AuthService) {}

  // --- Instance Methods ---

  getInstances(templateId?: string, status?: string): Observable<BonusInstance[]> {
    let params = new HttpParams();
    if (templateId) {
      params = params.set("templateId", templateId);
    }
    if (status) {
      params = params.set("status", status);
    }
    return this.http.get<BonusInstance[]>(this.apiUrl, { params })
      .pipe(catchError(this.authService["handleError"]));
  }

  getInstanceById(id: string): Observable<BonusInstance> {
    return this.http.get<BonusInstance>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.authService["handleError"]));
  }

  createInstance(instanceData: Partial<BonusInstance>): Observable<BonusInstance> {
    return this.http.post<BonusInstance>(this.apiUrl, instanceData)
      .pipe(catchError(this.authService["handleError"]));
  }

  updateInstance(id: string, instanceData: Partial<BonusInstance>): Observable<BonusInstance> {
    return this.http.put<BonusInstance>(`${this.apiUrl}/${id}`, instanceData)
      .pipe(catchError(this.authService["handleError"]));
  }

  // Endpoint to trigger the generation process for an instance
  generateAllocations(instanceId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${instanceId}/generate`, {})
      .pipe(catchError(this.authService["handleError"]));
  }

  // Endpoint to advance the status (e.g., submit for review, approve)
  updateInstanceStatus(instanceId: string, action: string, payload?: any): Observable<BonusInstance> {
    // Example actions: 'submit_review', 'approve', 'reject', 'cancel', 'mark_paid'
    return this.http.patch<BonusInstance>(`${this.apiUrl}/${instanceId}/status`, { action, ...payload })
      .pipe(catchError(this.authService["handleError"]));
  }

  // --- Allocation Methods ---

  getAllocationsByInstance(instanceId: string, filters?: any): Observable<BonusAllocation[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        params = params.set(key, filters[key]);
      });
    }
    // Assuming allocations are fetched via instance endpoint or a dedicated allocation endpoint
    // Option 1: /api/bonus/instances/:instanceId/allocations
    // Option 2: /api/bonus/allocations?instanceId=:instanceId
    return this.http.get<BonusAllocation[]>(`${this.allocationApiUrl}`, { params: params.set("instanceId", instanceId) })
      .pipe(catchError(this.authService["handleError"]));
  }

  // Add methods for updating individual allocations if needed (e.g., manual adjustments)
  updateAllocation(allocationId: string, allocationData: Partial<BonusAllocation>): Observable<BonusAllocation> {
     return this.http.put<BonusAllocation>(`${this.allocationApiUrl}/${allocationId}`, allocationData)
      .pipe(catchError(this.authService["handleError"]));
  }

}

