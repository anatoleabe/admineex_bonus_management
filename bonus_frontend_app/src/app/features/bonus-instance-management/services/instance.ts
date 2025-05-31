import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../../../environments/environment";

export interface BonusInstance {
  _id: string;
  templateId: string;
  template: {
    code: string;
    name: string;
    category?: string;
    periodicity?: string;
    calculationConfig?: any;
  };
  referencePeriod: string;
  status: string;
  shareAmount: number;
  generationDate?: Date;
  approvalDate?: Date;
  paymentDate?: Date;
  customOverrides?: any;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface BonusAllocation {
  _id: string;
  instanceId: string;
  personnelId: string;
  personnelInfo: {
    name: string;
    employeeId: string;
    department: string;
    position: string;
    salary: number;
  };
  calculationInputs: any;
  calculatedAmount: number;
  finalAmount: number;
  status: string;
  adjustmentReason?: string;
  exclusionReason?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  instanceStatus?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InstanceService {
  private apiUrl = `${environment.apiUrl}/bonus/instances`;
  private allocationsUrl = `${environment.apiUrl}/allocations`;

  constructor(private http: HttpClient) {}

  // Instance methods
  getInstances(filters?: any): Observable<BonusInstance[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params = params.set(key, filters[key]);
        }
      });
    }
    return this.http.get<BonusInstance[]>(this.apiUrl, { params });
  }

  getInstance(id: string): Observable<BonusInstance> {
    return this.http.get<BonusInstance>(`${this.apiUrl}/${id}`);
  }

  createInstance(instance: Partial<BonusInstance>): Observable<BonusInstance> {
    return this.http.post<BonusInstance>(this.apiUrl, instance);
  }

  updateInstance(id: string, instance: Partial<BonusInstance>): Observable<BonusInstance> {
    return this.http.put<BonusInstance>(`${this.apiUrl}/${id}`, instance);
  }

  generateAllocations(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/generate`, {});
  }

  updateInstanceStatus(id: string, action: string, reason?: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/status`, { action, reason });
  }

  // Allocation methods
  getAllocations(instanceId: string, filters?: any): Observable<BonusAllocation[]> {
    let params = new HttpParams();
    params = params.set('instanceId', instanceId);
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params = params.set(key, filters[key]);
        }
      });
    }
    
    return this.http.get<BonusAllocation[]>(`${this.allocationsUrl}`, { params });
  }

  // Add missing methods for allocation management
  getAllocationById(id: string): Observable<BonusAllocation> {
    return this.http.get<BonusAllocation>(`${this.allocationsUrl}/${id}`);
  }

  getAllocationHistory(id: string): Observable<BonusAllocation[]> {
    return this.http.get<BonusAllocation[]>(`${this.allocationsUrl}/${id}/history`);
  }

  updateAllocation(id: string, data: any): Observable<BonusAllocation> {
    return this.http.put<BonusAllocation>(`${this.allocationsUrl}/${id}`, data);
  }

  excludeAllocation(id: string, data: any): Observable<BonusAllocation> {
    return this.http.patch<BonusAllocation>(`${this.allocationsUrl}/${id}/exclude`, data);
  }
}
