import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InstanceService, BonusAllocation } from '../services/instance';

@Component({
  selector: 'app-allocation-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './allocation-detail.html',
  styleUrls: ['./allocation-detail.css']
})
export class AllocationDetailComponent implements OnInit {
  allocationId: string | null = null;
  allocation: BonusAllocation | null = null;
  allocationHistory: BonusAllocation[] = [];
  isLoading = true;
  error: string | null = null;
  
  // For adjustment form
  adjustmentForm: FormGroup;
  showAdjustmentForm = false;
  isSubmitting = false;
  
  // For exclusion form
  exclusionForm: FormGroup;
  showExclusionForm = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private instanceService: InstanceService,
    private fb: FormBuilder
  ) {
    // Initialize forms
    this.adjustmentForm = this.fb.group({
      finalAmount: ['', [Validators.required, Validators.min(0)]],
      adjustmentReason: ['', [Validators.required, Validators.minLength(5)]]
    });
    
    this.exclusionForm = this.fb.group({
      reason: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  ngOnInit(): void {
    this.allocationId = this.route.snapshot.paramMap.get('id');
    if (this.allocationId) {
      this.loadAllocationDetails();
    } else {
      this.error = 'No allocation ID provided';
      this.isLoading = false;
    }
  }

  loadAllocationDetails(): void {
    if (!this.allocationId) return;
    
    this.isLoading = true;
    this.error = null;
    
    // Load allocation details
    this.instanceService.getAllocationById(this.allocationId).subscribe({
      next: (data) => {
        this.allocation = data;
        this.adjustmentForm.patchValue({
          finalAmount: data.finalAmount
        });
        this.loadAllocationHistory();
      },
      error: (err) => {
        this.error = `Error loading allocation: ${err.message || 'Unknown error'}`;
        this.isLoading = false;
      }
    });
  }

  loadAllocationHistory(): void {
    if (!this.allocationId) return;
    
    this.instanceService.getAllocationHistory(this.allocationId).subscribe({
      next: (data) => {
        this.allocationHistory = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = `Error loading allocation history: ${err.message || 'Unknown error'}`;
        this.isLoading = false;
      }
    });
  }

  goBack(): void {
    // Navigate back to instance detail or allocation list
    this.router.navigate(['../..'], { relativeTo: this.route });
  }

  toggleAdjustmentForm(): void {
    this.showAdjustmentForm = !this.showAdjustmentForm;
    if (this.showAdjustmentForm && this.allocation) {
      // Reset form with current values
      this.adjustmentForm.patchValue({
        finalAmount: this.allocation.finalAmount,
        adjustmentReason: ''
      });
    }
  }

  toggleExclusionForm(): void {
    this.showExclusionForm = !this.showExclusionForm;
    if (this.showExclusionForm) {
      // Reset form
      this.exclusionForm.reset();
    }
  }

  submitAdjustment(): void {
    if (this.adjustmentForm.invalid || !this.allocationId) return;
    
    this.isSubmitting = true;
    
    const adjustmentData = this.adjustmentForm.value;
    
    this.instanceService.updateAllocation(this.allocationId, adjustmentData).subscribe({
      next: (data) => {
        this.isSubmitting = false;
        this.showAdjustmentForm = false;
        // Reload allocation details to show the updated version
        this.loadAllocationDetails();
      },
      error: (err) => {
        this.error = `Error adjusting allocation: ${err.message || 'Unknown error'}`;
        this.isSubmitting = false;
      }
    });
  }

  submitExclusion(): void {
    if (this.exclusionForm.invalid || !this.allocationId) return;
    
    this.isSubmitting = true;
    
    const exclusionData = this.exclusionForm.value;
    
    this.instanceService.excludeAllocation(this.allocationId, exclusionData).subscribe({
      next: (data) => {
        this.isSubmitting = false;
        this.showExclusionForm = false;
        // Reload allocation details to show the updated version
        this.loadAllocationDetails();
      },
      error: (err) => {
        this.error = `Error excluding allocation: ${err.message || 'Unknown error'}`;
        this.isSubmitting = false;
      }
    });
  }

  // Helper method to format date
  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }

  // Helper method to determine if adjustment is allowed
  canAdjust(): boolean {
    if (!this.allocation) return false;
    
    // Check allocation status
    const allowedStatuses = ['eligible', 'adjusted'];
    if (!allowedStatuses.includes(this.allocation.status || '')) return false;
    
    // Check instance status (would need to be populated from backend)
    const instanceStatus = this.allocation.instanceStatus || 
                          (this.allocation as any).instance?.status;
    
    const allowedInstanceStatuses = ['generated', 'under_review'];
    return allowedInstanceStatuses.includes(instanceStatus);
  }

  // Helper method to determine if exclusion is allowed
  canExclude(): boolean {
    // Usually same conditions as adjustment
    return this.canAdjust();
  }
}
