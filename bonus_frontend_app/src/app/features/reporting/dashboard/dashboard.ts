import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ReportingService, DashboardMetrics, ReportFilter } from '../services/reporting';
import { ChartModule } from 'primeng/chart';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ChartModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  filterForm: FormGroup;
  metrics: DashboardMetrics | null = null;
  isLoading = false;
  error: string | null = null;
  
  // Chart data
  statusChartData: any = null;
  statusChartOptions: any = null;
  timelineChartData: any = null;
  timelineChartOptions: any = null;
  
  // Templates for dropdown (would be populated from API)
  templates = [
    { id: '', name: 'All Templates' }
    // Additional templates would be loaded from API
  ];
  
  // Color mapping for status
  statusColors: Record<string, string> = {
    'draft': '#8c8c8c',
    'pending_generation': '#faad14',
    'generated': '#1890ff',
    'under_review': '#722ed1',
    'approved': '#52c41a',
    'paid': '#13c2c2',
    'cancelled': '#f5222d'
  };

  constructor(
    private fb: FormBuilder,
    private reportingService: ReportingService
  ) {
    this.filterForm = this.fb.group({
      templateId: [''],
      startDate: [''],
      endDate: ['']
    });
  }

  ngOnInit(): void {
    // Load initial dashboard data
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.error = null;
    
    const filters: ReportFilter = this.filterForm.value;
    
    this.reportingService.getDashboardMetrics(filters).subscribe({
      next: (data) => {
        this.metrics = data;
        this.prepareChartData();
        this.isLoading = false;
      },
      error: (err) => {
        this.error = `Error loading dashboard: ${err.message || 'Unknown error'}`;
        this.isLoading = false;
      }
    });
  }

  prepareChartData(): void {
    if (!this.metrics) return;
    
    // Prepare data for status distribution chart (pie/donut)
    const statusLabels = this.metrics.statusDistribution.map(item => this.reportingService.formatStatus(item.status));
    const statusData = this.metrics.statusDistribution.map(item => item.count);
    const statusBackgroundColors = this.metrics.statusDistribution.map(item => this.statusColors[item.status] || '#1890ff');
    
    this.statusChartData = {
      labels: statusLabels,
      datasets: [
        {
          data: statusData,
          backgroundColor: statusBackgroundColors,
          hoverBackgroundColor: statusBackgroundColors.map(color => this.lightenColor(color, 10))
        }
      ]
    };
    
    this.statusChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            padding: 20
          }
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    };
    
    // For a real implementation, we would fetch timeline data from the API
    // For now, we'll create mock data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const mockData = months.map(() => Math.floor(Math.random() * 100000));
    
    this.timelineChartData = {
      labels: months,
      datasets: [
        {
          label: 'Bonus Amount',
          data: mockData,
          fill: false,
          borderColor: '#1890ff',
          tension: 0.4
        }
      ]
    };
    
    this.timelineChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
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
                label += this.reportingService.formatCurrency(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: any) => {
              return this.reportingService.formatCurrency(value);
            }
          }
        }
      }
    };
  }

  resetFilters(): void {
    this.filterForm.reset({
      templateId: '',
      startDate: '',
      endDate: ''
    });
    
    this.loadDashboard();
  }

  // Helper method to format currency
  formatCurrency(value: number): string {
    return this.reportingService.formatCurrency(value);
  }
  
  // Helper method to lighten a color
  lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return `#${(
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1)}`;
  }
}
