import { Component, Input, OnInit, OnChanges, SimpleChanges } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { BonusAllocation } from "../services/instance";

@Component({
  selector: "app-allocation-view",
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: "./allocation-view.html",
  styleUrls: ["./allocation-view.css"]
})
export class AllocationViewComponent implements OnInit, OnChanges {
  @Input() allocations: BonusAllocation[] = [];
  @Input() instanceStatus: string = '';
  
  filteredAllocations: BonusAllocation[] = [];
  
  // Filtering
  filters = {
    status: '',
    personnelName: '',
    minAmount: null as number | null,
    maxAmount: null as number | null
  };
  
  // Sorting
  sortField: string = 'personnel.name';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Pagination (if needed)
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;

  constructor() {}

  ngOnInit(): void {
    this.applyFiltersAndSort();
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['allocations']) {
      this.applyFiltersAndSort();
    }
  }
  
  applyFiltersAndSort(): void {
    // Start with all allocations
    let result = [...this.allocations];
    
    // Apply filters
    if (this.filters.status) {
      result = result.filter(a => a.status === this.filters.status);
    }
    
    if (this.filters.personnelName) {
      const searchTerm = this.filters.personnelName.toLowerCase();
      result = result.filter(a => 
        (a.personnel?.name || '').toLowerCase().includes(searchTerm) ||
        a.personnelId.toString().includes(searchTerm)
      );
    }
    
    if (this.filters.minAmount !== null) {
      result = result.filter(a => (a.finalAmount || 0) >= (this.filters.minAmount || 0));
    }
    
    if (this.filters.maxAmount !== null) {
      result = result.filter(a => (a.finalAmount || 0) <= (this.filters.maxAmount || 0));
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let valueA: any;
      let valueB: any;
      
      // Handle nested properties like 'personnel.name'
      if (this.sortField.includes('.')) {
        const parts = this.sortField.split('.');
        valueA = parts.reduce((obj, key) => obj && obj[key], a);
        valueB = parts.reduce((obj, key) => obj && obj[key], b);
      } else {
        valueA = a[this.sortField as keyof BonusAllocation];
        valueB = b[this.sortField as keyof BonusAllocation];
      }
      
      // Handle null/undefined values
      if (valueA === undefined || valueA === null) valueA = '';
      if (valueB === undefined || valueB === null) valueB = '';
      
      // Compare based on type
      let comparison = 0;
      if (typeof valueA === 'string') {
        comparison = valueA.localeCompare(valueB);
      } else {
        comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      }
      
      // Apply direction
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
    
    // Apply pagination if needed
    this.totalItems = result.length;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    result = result.slice(startIndex, startIndex + this.pageSize);
    
    this.filteredAllocations = result;
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
  
  sortBy(field: string): void {
    if (this.sortField === field) {
      // Toggle direction if same field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Set new field and default to ascending
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFiltersAndSort();
  }
  
  getSortIcon(field: string): string {
    if (this.sortField !== field) return ''; // No icon
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }
  
  changePage(page: number): void {
    this.currentPage = page;
    this.applyFiltersAndSort();
  }
  
  viewPersonnelDetail(personnelId: string): void {
    console.log(`Navigate to personnel detail for ID: ${personnelId}`);
    // Implementation would likely involve routing to a different part of the app
    // or opening a modal, potentially fetching more data.
    alert(`Placeholder: View details for personnel ID ${personnelId}`);
  }

  viewAllocationDetail(allocationId: string | undefined): void {
    if (!allocationId) return;
    // This would typically navigate to the allocation detail page
    // using the router, but for now we'll just log it
    console.log(`Navigate to allocation detail for ID: ${allocationId}`);
  }
  
  // Helper method to determine if adjustment is allowed
  canAdjust(allocation: BonusAllocation): boolean {
    // Check allocation status
    const allowedStatuses = ['eligible', 'adjusted'];
    if (!allowedStatuses.includes(allocation.status || '')) return false;
    
    // Check instance status
    const allowedInstanceStatuses = ['generated', 'under_review'];
    return allowedInstanceStatuses.includes(this.instanceStatus);
  }

  // Helper method to determine if exclusion is allowed
  canExclude(allocation: BonusAllocation): boolean {
    // Usually same conditions as adjustment
    return this.canAdjust(allocation);
  }
  
  // Helper method to get status class
  getStatusClass(status: string): string {
    return `status-${status}`;
  }
}
