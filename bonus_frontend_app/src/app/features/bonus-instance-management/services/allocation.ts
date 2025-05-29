import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { catchError } from "rxjs/operators";
import { AuthService } from "../../../core/auth/auth";

// Interfaces already defined in instance.ts
import { BonusAllocation } from "./instance";

@Injectable({
  providedIn: "root"
})
export class AllocationService {
  private apiUrl = "/api/bonus/allocations"; // Assuming proxy config or relative path

  constructor(private http: HttpClient, private authService: AuthService) {}

  // Get allocations with filtering
  getAllocations(filters: any = {}): Observable<BonusAllocation[]> {
    let params = new HttpParams();
    
    // Add all filters to params
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params = params.set(key, filters[key]);
      }
    });
    
    return this.http.get<BonusAllocation[]>(this.apiUrl, { params })
      .pipe(catchError(this.authService["handleError"]));
  }

  // Get a single allocation by ID
  getAllocationById(id: string): Observable<BonusAllocation> {
    return this.http.get<BonusAllocation>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.authService["handleError"]));
  }

  // Update an allocation (manual adjustment)
  updateAllocation(id: string, data: { finalAmount: number, adjustmentReason: string }): Observable<BonusAllocation> {
    return this.http.put<BonusAllocation>(`${this.apiUrl}/${id}`, data)
      .pipe(catchError(this.authService["handleError"]));
  }

  // Exclude an allocation
  excludeAllocation(id: string, data: { reason: string }): Observable<BonusAllocation> {
    return this.http.post<BonusAllocation>(`${this.apiUrl}/${id}/exclude`, data)
      .pipe(catchError(this.authService["handleError"]));
  }

  // Get allocation history (all versions)
  getAllocationHistory(id: string): Observable<BonusAllocation[]> {
    return this.http.get<BonusAllocation[]>(`${this.apiUrl}/${id}/history`)
      .pipe(catchError(this.authService["handleError"]));
  }
}
