import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InstanceService, BonusAllocation } from '../services/instance';

@Component({
  selector: 'app-allocation-view',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: "./allocation-view.html",
  styleUrls: ["./allocation-view.css"]
})
export class AllocationViewComponent implements OnInit {
  @Input() instanceId: string | null = null;
  @Input() allocations: BonusAllocation[] = [];
  @Input() instanceStatus: string = '';

  // Add Math property for template usage
  Math = Math;
  
  // Filtering
  filters = {
    status: '',
    personnelName: '',
    minAmount: null as number | null,
    maxAmount: null as number | null
  };
  
  // Sorting
  sortField = 'personnel.name';
  sortDirection = 'asc';
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  
  // Filtered and sorted allocations
  filteredAllocations: BonusAllocation[] = [];
  
  constructor(private instanceService: InstanceService) {}
  
  ngOnInit(): void {
    if (this.allocations.length === 0 && this.instanceId) {
      this.loadAllocations();
    } else {
      this.applyFiltersAndSort();
    }
  }
  
  loadAllocations(): void {
    if (!this.instanceId) return;
    
    this.instanceService.getAllocations(this.instanceId).subscribe({
      next: (data) => {
        this.allocations = data;
        this.applyFiltersAndSort();
      },
      error: (err) => {
        console.error('Error loading allocations:', err);
      }
    });
  }
  
  applyFiltersAndSort(): void {
    // Apply filters
    let filtered = [...this.allocations];
    
    if (this.filters.status) {
      filtered = filtered.filter(a => a.status === this.filters.status);
    }
    
    if (this.filters.personnelName) {
      const searchTerm = this.filters.personnelName.toLowerCase();
      filtered = filtered.filter(a => 
        (a.personnelInfo?.name?.toLowerCase().includes(searchTerm)) || 
        (a.personnelInfo?.employeeId?.toLowerCase().includes(searchTerm))
      );
    }
    
    if (this.filters.minAmount !== null) {
      filtered = filtered.filter(a => a.finalAmount >= (this.filters.minAmount || 0));
    }
    
    if (this.filters.maxAmount !== null) {
      filtered = filtered.filter(a => a.finalAmount <= (this.filters.maxAmount || Infinity));
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let valueA: any;
      let valueB: any;
      
      // Handle nested properties
      if (this.sortField.includes('.')) {
        const parts = this.sortField.split('.');
        valueA = parts.reduce((obj: any, key: string) => obj && obj[key], a);
        valueB = parts.reduce((obj: any, key: string) => obj && obj[key], b);
      } else {
        valueA = (a as any)[this.sortField];
        valueB = (b as any)[this.sortField];
      }
      
      // Handle string comparison
      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
      }
      if (typeof valueB === 'string') {
        valueB = valueB.toLowerCase();
      }
      
      // Handle undefined values
      if (valueA === undefined) valueA = '';
      if (valueB === undefined) valueB = '';
      
      // Sort direction
      if (this.sortDirection === 'asc') {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });
    
    // Update total count
    this.totalItems = filtered.length;
    
    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.filteredAllocations = filtered.slice(startIndex, startIndex + this.pageSize);
  }
  
  sortBy(field: string): void {
    if (this.sortField === field) {
      // Toggle direction if same field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New field, default to ascending
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    
    this.applyFiltersAndSort();
  }
  
  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return '';
    }
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }
  
  resetFilters(): void {
    this.filters = {
      status: '',
      personnelName: '',
      minAmount: null,
      maxAmount: null
    };
    this.applyFiltersAndSort();
  }
  
  changePage(page: number): void {
    this.currentPage = page;
    this.applyFiltersAndSort();
  }
  
  getStatusClass(status: string): string {
    const statusMap: {[key: string]: string} = {
      'eligible': 'status-eligible',
      'adjusted': 'status-adjusted',
      'excluded_rule': 'status-excluded',
      'excluded_manual': 'status-excluded',
      'paid': 'status-paid'
    };
    
    return statusMap[status] || 'status-default';
  }
  
  canAdjust(allocation: BonusAllocation): boolean {
    // Check allocation status
    const allowedStatuses = ['eligible', 'adjusted'];
    if (!allowedStatuses.includes(allocation.status)) return false;
    
    // Check instance status (would need to be populated from backend)
    const instanceStatus = allocation.instanceStatus || 
                          (allocation as any).instance?.status;
    
    const allowedInstanceStatuses = ['generated', 'under_review'];
    return allowedInstanceStatuses.includes(instanceStatus || '');
  }
  
  canExclude(allocation: BonusAllocation): boolean {
    // Usually same conditions as adjustment
    return this.canAdjust(allocation);
  }
}
