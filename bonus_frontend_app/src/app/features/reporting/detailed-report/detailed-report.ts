import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ReportingService, ReportFilter, DetailedReport } from '../services/reporting';

@Component({
  selector: 'app-detailed-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './detailed-report.html',
  styleUrls: ['./detailed-report.css']
})
export class DetailedReportComponent implements OnInit {
  filterForm: FormGroup;
  report: DetailedReport | null = null;
  isLoading = false;
  error: string | null = null;
  
  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalItems = 0;
  totalPages = 1;
  
  // Sorting
  sortField = 'createdAt';
  sortDirection = 'desc';
  
  // Export options
  isExporting = false;
  exportJobId: string | null = null;
  exportStatus: string | null = null;
  exportError: string | null = null;
  downloadUrl: string | null = null;
  
  // Templates for dropdown (would be populated from API)
  templates = [
    { id: '', name: 'All Templates' }
    // Additional templates would be loaded from API
  ];
  
  // Statuses for dropdown
  statuses = [
    { value: '', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending_generation', label: 'Pending Generation' },
    { value: 'generated', label: 'Generated' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'paid', label: 'Paid' },
    { value: 'cancelled', label: 'Cancelled' }
  ];
  
  // Report types
  reportTypes = [
    { value: 'instances', label: 'Bonus Instances' },
    { value: 'allocations', label: 'Allocations' },
    { value: 'adjustments', label: 'Adjustments' },
    { value: 'workflow', label: 'Workflow History' }
  ];

  constructor(
    private fb: FormBuilder,
    private reportingService: ReportingService
  ) {
    this.filterForm = this.fb.group({
      reportType: ['instances'],
      templateId: [''],
      status: [''],
      startDate: [''],
      endDate: [''],
      referencePeriod: [''],
      personnelId: [''],
      minAmount: [''],
      maxAmount: ['']
    });
  }

  ngOnInit(): void {
    // Load initial report
    this.generateReport();
  }

  generateReport(): void {
    this.isLoading = true;
    this.error = null;
    
    const filters: ReportFilter = this.filterForm.value;
    
    // Convert string amounts to numbers if present
    if (filters.minAmount) filters.minAmount = parseFloat(filters.minAmount as unknown as string);
    if (filters.maxAmount) filters.maxAmount = parseFloat(filters.maxAmount as unknown as string);
    
    this.reportingService.getDetailedReport(
      filters,
      this.currentPage,
      this.pageSize,
      this.sortField,
      this.sortDirection
    ).subscribe({
      next: (data) => {
        this.report = data;
        this.totalItems = data.pagination.totalCount;
        this.totalPages = data.pagination.totalPages;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = `Error generating report: ${err.message || 'Unknown error'}`;
        this.isLoading = false;
      }
    });
  }

  resetFilters(): void {
    this.filterForm.reset({
      reportType: 'instances',
      templateId: '',
      status: '',
      startDate: '',
      endDate: '',
      referencePeriod: '',
      personnelId: '',
      minAmount: '',
      maxAmount: ''
    });
    
    this.currentPage = 1;
    this.generateReport();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    
    this.currentPage = page;
    this.generateReport();
  }

  sort(field: string): void {
    if (this.sortField === field) {
      // Toggle direction if same field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Set new field and default to ascending
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    
    this.generateReport();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return '';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  exportReport(format: string): void {
    this.isExporting = true;
    this.exportError = null;
    this.exportStatus = 'Preparing export...';
    this.downloadUrl = null;
    
    const filters: ReportFilter = this.filterForm.value;
    
    // Convert string amounts to numbers if present
    if (filters.minAmount) filters.minAmount = parseFloat(filters.minAmount as unknown as string);
    if (filters.maxAmount) filters.maxAmount = parseFloat(filters.maxAmount as unknown as string);
    
    this.reportingService.createExport('detailed', filters, format).subscribe({
      next: (data) => {
        this.exportJobId = data.jobId;
        this.checkExportStatus();
      },
      error: (err) => {
        this.exportError = `Error creating export: ${err.message || 'Unknown error'}`;
        this.isExporting = false;
      }
    });
  }

  checkExportStatus(): void {
    if (!this.exportJobId) return;
    
    this.reportingService.getExportStatus(this.exportJobId).subscribe({
      next: (data) => {
        this.exportStatus = data.status;
        
        if (data.status === 'completed') {
          this.downloadUrl = this.reportingService.getDownloadUrl(this.exportJobId!);
          this.isExporting = false;
        } else if (data.status === 'failed') {
          this.exportError = `Export failed: ${data.error || 'Unknown error'}`;
          this.isExporting = false;
        } else {
          // Still processing, check again in 2 seconds
          setTimeout(() => this.checkExportStatus(), 2000);
        }
      },
      error: (err) => {
        this.exportError = `Error checking export status: ${err.message || 'Unknown error'}`;
        this.isExporting = false;
      }
    });
  }

  // Helper method to format currency
  formatCurrency(value: number): string {
    return this.reportingService.formatCurrency(value);
  }
  
  // Helper method to format date
  formatDate(value: string | Date): string {
    return this.reportingService.formatDate(value);
  }
  
  // Helper method to format status
  formatStatus(status: string): string {
    return this.reportingService.formatStatus(status);
  }
  
  // Helper method to get column headers based on report type
  getColumnHeaders(): string[] {
    const reportType = this.filterForm.get('reportType')?.value || 'instances';
    
    switch (reportType) {
      case 'instances':
        return [
          'Reference Period',
          'Template',
          'Status',
          'Total Amount',
          'Allocation Count',
          'Created Date',
          'Generation Date',
          'Approval Date',
          'Payment Date'
        ];
      case 'allocations':
        return [
          'Reference Period',
          'Template',
          'Personnel',
          'Status',
          'Calculated Amount',
          'Final Amount',
          'Adjustment Reason',
          'Version',
          'Created Date'
        ];
      case 'adjustments':
        return [
          'Reference Period',
          'Template',
          'Personnel',
          'Status',
          'Previous Amount',
          'New Amount',
          'Adjustment Amount',
          'Adjustment %',
          'Adjustment Reason',
          'Adjusted Date'
        ];
      case 'workflow':
        return [
          'Reference Period',
          'Template',
          'Action',
          'From Status',
          'To Status',
          'User',
          'Timestamp',
          'Comments'
        ];
      default:
        return [];
    }
  }
  
  // Helper method to get cell value based on column and item
  getCellValue(item: any, column: string): string {
    const reportType = this.filterForm.get('reportType')?.value || 'instances';
    
    switch (reportType) {
      case 'instances':
        switch (column) {
          case 'Reference Period': return item.referencePeriod || 'N/A';
          case 'Template': return item.templateName || 'N/A';
          case 'Status': return this.formatStatus(item.status);
          case 'Total Amount': return this.formatCurrency(item.totalAmount);
          case 'Allocation Count': return item.allocationCount?.toString() || '0';
          case 'Created Date': return this.formatDate(item.createdAt);
          case 'Generation Date': return item.generationDate ? this.formatDate(item.generationDate) : 'N/A';
          case 'Approval Date': return item.approvalDate ? this.formatDate(item.approvalDate) : 'N/A';
          case 'Payment Date': return item.paymentDate ? this.formatDate(item.paymentDate) : 'N/A';
          default: return 'N/A';
        }
      case 'allocations':
        switch (column) {
          case 'Reference Period': return item.referencePeriod || 'N/A';
          case 'Template': return item.templateName || 'N/A';
          case 'Personnel': return item.personnelName || 'N/A';
          case 'Status': return this.formatStatus(item.status);
          case 'Calculated Amount': return this.formatCurrency(item.calculatedAmount);
          case 'Final Amount': return this.formatCurrency(item.finalAmount);
          case 'Adjustment Reason': return item.adjustmentReason || 'N/A';
          case 'Version': return item.version?.toString() || '1';
          case 'Created Date': return this.formatDate(item.createdAt);
          default: return 'N/A';
        }
      case 'adjustments':
        switch (column) {
          case 'Reference Period': return item.referencePeriod || 'N/A';
          case 'Template': return item.templateName || 'N/A';
          case 'Personnel': return item.personnelName || 'N/A';
          case 'Status': return this.formatStatus(item.status);
          case 'Previous Amount': return this.formatCurrency(item.previousAmount);
          case 'New Amount': return this.formatCurrency(item.newAmount);
          case 'Adjustment Amount': return this.formatCurrency(item.adjustmentAmount);
          case 'Adjustment %': return `${item.adjustmentPercentage?.toFixed(2) || '0.00'}%`;
          case 'Adjustment Reason': return item.adjustmentReason || 'N/A';
          case 'Adjusted Date': return this.formatDate(item.adjustedAt);
          default: return 'N/A';
        }
      case 'workflow':
        switch (column) {
          case 'Reference Period': return item.referencePeriod || 'N/A';
          case 'Template': return item.templateName || 'N/A';
          case 'Action': return item.action || 'N/A';
          case 'From Status': return this.formatStatus(item.fromStatus);
          case 'To Status': return this.formatStatus(item.toStatus);
          case 'User': return item.userName || 'N/A';
          case 'Timestamp': return this.formatDate(item.timestamp);
          case 'Comments': return item.comments || 'N/A';
          default: return 'N/A';
        }
      default:
        return 'N/A';
    }
  }
}
