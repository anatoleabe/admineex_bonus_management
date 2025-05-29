import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { catchError } from "rxjs/operators";
import { AuthService } from "../../../core/auth/auth";

export interface ReportFilter {
  templateId?: string;
  status?: string | string[];
  startDate?: string;
  endDate?: string;
  referencePeriod?: string;
  groupBy?: string;
  reportType?: string;
  personnelId?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface SummaryReportData {
  groupValue: string;
  groupLabel: string;
  count: number;
  totalAmount: number;
  avgAmount: number;
  minAmount: number;
  maxAmount: number;
  statuses: string[];
}

export interface SummaryReport {
  reportType: string;
  groupBy: string;
  filters: any;
  data: SummaryReportData[];
  totals: {
    count: number;
    totalAmount: number;
    avgAmount: number;
  };
}

export interface DetailedReportData {
  [key: string]: any;
}

export interface DetailedReport {
  reportType: string;
  filters: any;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  sorting: {
    field: string;
    direction: string;
  };
  data: DetailedReportData[];
}

export interface ExportJob {
  jobId: string;
  status: string;
  createdAt: string;
  processedAt?: string;
  completedAt?: string;
  format: string;
  error?: string;
  downloadUrl?: string;
}

export interface DashboardMetrics {
  totalInstances: number;
  totalAmount: number;
  averageAmount: number;
  statusDistribution: {
    status: string;
    statusLabel: string;
    count: number;
    amount: number;
  }[];
}

@Injectable({
  providedIn: "root"
})
export class ReportingService {
  private apiUrl = "/api/reports";

  constructor(private http: HttpClient, private authService: AuthService) {}

  /**
   * Get summary report
   * 
   * @param filters - Report filters
   * @returns Observable of summary report
   */
  getSummaryReport(filters: ReportFilter = {}): Observable<SummaryReport> {
    let params = new HttpParams();
    
    // Add all filters to params
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof ReportFilter];
      if (value !== undefined && value !== null) {
        params = params.set(key, value.toString());
      }
    });
    
    return this.http.get<SummaryReport>(`${this.apiUrl}/summary`, { params })
      .pipe(catchError(this.authService["handleError"]));
  }

  /**
   * Get detailed report
   * 
   * @param filters - Report filters
   * @param page - Page number
   * @param limit - Items per page
   * @param sortField - Field to sort by
   * @param sortDirection - Sort direction
   * @returns Observable of detailed report
   */
  getDetailedReport(
    filters: ReportFilter = {}, 
    page: number = 1, 
    limit: number = 50,
    sortField: string = 'createdAt',
    sortDirection: string = 'desc'
  ): Observable<DetailedReport> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('sortField', sortField)
      .set('sortDirection', sortDirection);
    
    // Add all filters to params
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof ReportFilter];
      if (value !== undefined && value !== null) {
        params = params.set(key, value.toString());
      }
    });
    
    return this.http.get<DetailedReport>(`${this.apiUrl}/detailed`, { params })
      .pipe(catchError(this.authService["handleError"]));
  }

  /**
   * Create export job
   * 
   * @param reportType - Type of report
   * @param filters - Report filters
   * @param format - Export format
   * @param options - Export options
   * @returns Observable of export job
   */
  createExport(
    reportType: string,
    filters: ReportFilter = {},
    format: string = 'csv',
    options: any = {}
  ): Observable<{ jobId: string; status: string }> {
    const payload = {
      reportType,
      filters,
      format,
      options
    };
    
    return this.http.post<{ jobId: string; status: string }>(`${this.apiUrl}/export`, payload)
      .pipe(catchError(this.authService["handleError"]));
  }

  /**
   * Get export job status
   * 
   * @param jobId - Export job ID
   * @returns Observable of export job
   */
  getExportStatus(jobId: string): Observable<ExportJob> {
    return this.http.get<ExportJob>(`${this.apiUrl}/export/${jobId}`)
      .pipe(catchError(this.authService["handleError"]));
  }

  /**
   * Get download URL for export
   * 
   * @param jobId - Export job ID
   * @returns Download URL
   */
  getDownloadUrl(jobId: string): string {
    return `${this.apiUrl}/export/${jobId}/download`;
  }

  /**
   * Get dashboard metrics
   * 
   * @param filters - Dashboard filters
   * @returns Observable of dashboard metrics
   */
  getDashboardMetrics(filters: ReportFilter = {}): Observable<DashboardMetrics> {
    let params = new HttpParams();
    
    // Add all filters to params
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof ReportFilter];
      if (value !== undefined && value !== null) {
        params = params.set(key, value.toString());
      }
    });
    
    return this.http.get<DashboardMetrics>(`${this.apiUrl}/dashboard/metrics`, { params })
      .pipe(catchError(this.authService["handleError"]));
  }

  /**
   * Format currency value
   * 
   * @param value - Value to format
   * @returns Formatted currency string
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  /**
   * Format date value
   * 
   * @param value - Date to format
   * @returns Formatted date string
   */
  formatDate(value: string | Date): string {
    if (!value) return 'N/A';
    return new Date(value).toLocaleDateString();
  }

  /**
   * Format status for display
   * 
   * @param status - Status code
   * @returns Formatted status
   */
  formatStatus(status: string): string {
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
}
