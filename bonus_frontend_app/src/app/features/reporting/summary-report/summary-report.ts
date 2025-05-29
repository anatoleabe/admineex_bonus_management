import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ReportingService, ReportFilter, SummaryReport } from '../services/reporting';
import { ChartModule } from 'primeng/chart';

@Component({
  selector: 'app-summary-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ChartModule],
  templateUrl: './summary-report.html',
  styleUrls: ['./summary-report.css']
})
export class SummaryReportComponent implements OnInit {
  filterForm: FormGroup;
  report: SummaryReport | null = null;
  isLoading = false;
  error: string | null = null;
  
  // Chart data
  chartData: any = null;
  chartOptions: any = null;
  
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
  
  // Group by options
  groupByOptions = [
    { value: 'template', label: 'Template' },
    { value: 'status', label: 'Status' },
    { value: 'period', label: 'Reference Period' },
    { value: 'month', label: 'Month' },
    { value: 'department', label: 'Department' }
  ];

  constructor(
    private fb: FormBuilder,
    private reportingService: ReportingService
  ) {
    this.filterForm = this.fb.group({
      templateId: [''],
      status: [''],
      startDate: [''],
      endDate: [''],
      referencePeriod: [''],
      groupBy: ['template']
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
    
    this.reportingService.getSummaryReport(filters).subscribe({
      next: (data) => {
        this.report = data;
        this.prepareChartData();
        this.isLoading = false;
      },
      error: (err) => {
        this.error = `Error generating report: ${err.message || 'Unknown error'}`;
        this.isLoading = false;
      }
    });
  }

  prepareChartData(): void {
    if (!this.report) return;
    
    // Prepare data for bar chart
    const labels = this.report.data.map(item => item.groupLabel);
    const amounts = this.report.data.map(item => item.totalAmount);
    const counts = this.report.data.map(item => item.count);
    
    this.chartData = {
      labels: labels,
      datasets: [
        {
          label: 'Total Amount',
          backgroundColor: '#42A5F5',
          data: amounts
        },
        {
          label: 'Count',
          backgroundColor: '#66BB6A',
          data: counts
        }
      ]
    };
    
    this.chartOptions = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                if (context.dataset.label === 'Total Amount') {
                  label += this.reportingService.formatCurrency(context.parsed.y);
                } else {
                  label += context.parsed.y;
                }
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            autoSkip: false,
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          beginAtZero: true
        }
      }
    };
  }

  resetFilters(): void {
    this.filterForm.reset({
      templateId: '',
      status: '',
      startDate: '',
      endDate: '',
      referencePeriod: '',
      groupBy: 'template'
    });
    
    this.generateReport();
  }

  exportReport(format: string): void {
    this.isExporting = true;
    this.exportError = null;
    this.exportStatus = 'Preparing export...';
    this.downloadUrl = null;
    
    const filters: ReportFilter = this.filterForm.value;
    
    this.reportingService.createExport('summary', filters, format).subscribe({
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
}
