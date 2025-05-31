import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InstanceService } from '../services/instance';
import { AllocationViewComponent } from '../allocation-view/allocation-view';

// Define the AllowedAction interface outside the class
interface AllowedAction {
  label: string;
  description?: string;
  // Add other properties if needed
}

@Component({
  selector: 'app-instance-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AllocationViewComponent],
  templateUrl: './instance-detail.html',
  styleUrls: ['./instance-detail.css']
})
export class InstanceDetailComponent implements OnInit {
  // Add Object for template usage
  Object = Object;

  instanceId: string | null = null;
  instance: any = null;
  isLoadingInstance = true;
  isLoadingAllocations = false;
  isLoadingActions = false;
  error: string | null = null;

  // Workflow
  allowedActions: { [key: string]: AllowedAction } = {};
  workflowHistory: any[] = [];

  // Action form
  actionForm: FormGroup;
  showActionForm = false;
  currentAction = '';
  isSubmitting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private instanceService: InstanceService,
    private fb: FormBuilder
  ) {
    // Initialize action form
    this.actionForm = this.fb.group({
      comments: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  ngOnInit(): void {
    this.instanceId = this.route.snapshot.paramMap.get('id');
    if (this.instanceId) {
      this.loadInstanceDetails();
    } else {
      this.error = 'No instance ID provided';
      this.isLoadingInstance = false;
    }
  }

  loadInstanceDetails(): void {
    if (!this.instanceId) return;

    this.isLoadingInstance = true;
    this.error = null;

    this.instanceService.getInstance(this.instanceId).subscribe({
      next: (data) => {
        this.instance = data;
        this.isLoadingInstance = false;
        this.loadAllocations();
        this.loadWorkflowActions();
        this.loadWorkflowHistory();
      },
      error: (err) => {
        this.error = `Error loading instance: ${err.message || 'Unknown error'}`;
        this.isLoadingInstance = false;
      }
    });
  }

  loadAllocations(): void {
    if (!this.instanceId) return;

    this.isLoadingAllocations = true;

    this.instanceService.getAllocations(this.instanceId).subscribe({
      next: (data) => {
        if (this.instance) {
          this.instance.allocations = data;
        }
        this.isLoadingAllocations = false;
      },
      error: (err) => {
        console.error('Error loading allocations:', err);
        this.isLoadingAllocations = false;
      }
    });
  }

  loadWorkflowActions(): void {
    if (!this.instanceId) return;

    this.isLoadingActions = true;

    // This would typically come from a workflow service
    // For now, we'll simulate based on status
    const status = this.instance?.status || '';

    // Reset actions
    this.allowedActions = {};

    // Define allowed actions based on status
    switch (status) {
      case 'draft':
        this.allowedActions['generate'] = {
          label: 'Generate Allocations',
          description: 'Calculate and create allocations for eligible personnel'
        };
        break;
      case 'generated':
        this.allowedActions['submit'] = {
          label: 'Submit for Review',
          description: 'Send to approvers for review'
        };
        break;
      case 'under_review':
        this.allowedActions['approve'] = {
          label: 'Approve',
          description: 'Approve the bonus instance and all allocations'
        };
        this.allowedActions['reject'] = {
          label: 'Reject',
          description: 'Reject and return for adjustments'
        };
        break;
      case 'approved':
        this.allowedActions['pay'] = {
          label: 'Mark as Paid',
          description: 'Confirm payment has been processed'
        };
        break;
    }

    // Cancel action is available for most statuses except final ones
    if (!['paid', 'cancelled'].includes(status)) {
      this.allowedActions['cancel'] = {
        label: 'Cancel Instance',
        description: 'Cancel this bonus instance'
      };
    }

    this.isLoadingActions = false;
  }

  loadWorkflowHistory(): void {
    if (!this.instanceId) return;

    // This would typically come from a workflow service
    // For now, we'll use mock data based on instance status
    this.workflowHistory = [];

    const status = this.instance?.status || '';
    const baseHistory = [
      {
        action: 'Create',
        fromStatus: 'none',
        toStatus: 'draft',
        timestamp: this.instance?.createdAt,
        userName: 'System',
        comments: 'Instance created'
      }
    ];

    // Add history entries based on current status
    if (['generated', 'under_review', 'approved', 'paid'].includes(status)) {
      baseHistory.push({
        action: 'Generate',
        fromStatus: 'draft',
        toStatus: 'generated',
        timestamp: this.instance?.generationDate,
        userName: 'System',
        comments: 'Allocations generated'
      });
    }

    if (['under_review', 'approved', 'paid'].includes(status)) {
      baseHistory.push({
        action: 'Submit',
        fromStatus: 'generated',
        toStatus: 'under_review',
        timestamp: new Date(this.instance?.generationDate).getTime() + 86400000,
        userName: 'Manager',
        comments: 'Submitted for approval'
      });
    }

    if (['approved', 'paid'].includes(status)) {
      baseHistory.push({
        action: 'Approve',
        fromStatus: 'under_review',
        toStatus: 'approved',
        timestamp: this.instance?.approvalDate,
        userName: 'Approver',
        comments: 'Approved for payment'
      });
    }

    if (status === 'paid') {
      baseHistory.push({
        action: 'Pay',
        fromStatus: 'approved',
        toStatus: 'paid',
        timestamp: this.instance?.paymentDate,
        userName: 'Finance',
        comments: 'Payment processed'
      });
    }

    if (status === 'cancelled') {
      baseHistory.push({
        action: 'Cancel',
        fromStatus: 'draft',
        toStatus: 'cancelled',
        timestamp: new Date(),
        userName: 'Manager',
        comments: 'Instance cancelled'
      });
    }

    this.workflowHistory = baseHistory;
  }

  goBack(): void {
    this.router.navigate(['/instances']);
  }

  refreshData(): void {
    this.loadInstanceDetails();
  }

  showActionFormFor(action: string): void {
    this.currentAction = action;
    this.showActionForm = true;
    this.actionForm.reset();
  }

  cancelActionForm(): void {
    this.showActionForm = false;
    this.currentAction = '';
  }

  submitAction(): void {
    if (this.actionForm.invalid || !this.instanceId || !this.currentAction) return;

    this.isSubmitting = true;

    const comments = this.actionForm.get('comments')?.value;

    // Handle different actions
    switch (this.currentAction) {
      case 'generate':
        this.generateAllocations();
        break;
      case 'submit':
      case 'approve':
      case 'reject':
      case 'pay':
      case 'cancel':
        this.updateInstanceStatus(this.currentAction, comments);
        break;
      default:
        this.error = `Unknown action: ${this.currentAction}`;
        this.isSubmitting = false;
    }
  }

  generateAllocations(): void {
    if (!this.instanceId) return;

    this.instanceService.generateAllocations(this.instanceId).subscribe({
      next: (data) => {
        this.isSubmitting = false;
        this.showActionForm = false;
        this.refreshData();
      },
      error: (err) => {
        this.error = `Error generating allocations: ${err.message || 'Unknown error'}`;
        this.isSubmitting = false;
      }
    });
  }

  updateInstanceStatus(action: string, reason?: string): void {
    if (!this.instanceId) return;

    this.instanceService.updateInstanceStatus(this.instanceId, action, reason).subscribe({
      next: (data) => {
        this.isSubmitting = false;
        this.showActionForm = false;
        this.refreshData();
      },
      error: (err) => {
        this.error = `Error updating status: ${err.message || 'Unknown error'}`;
        this.isSubmitting = false;
      }
    });
  }

  // Helper method to format date
  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }

  // Helper method to get status display name
  getStatusDisplayName(status: string): string {
    const statusMap: { [key: string]: string } = {
      'draft': 'Draft',
      'generated': 'Generated',
      'under_review': 'Under Review',
      'approved': 'Approved',
      'paid': 'Paid',
      'cancelled': 'Cancelled',
      'none': 'None'
    };

    return statusMap[status] || status;
  }

  // Helper method to get status CSS class
  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'draft': 'status-draft',
      'generated': 'status-generated',
      'under_review': 'status-review',
      'approved': 'status-approved',
      'paid': 'status-paid',
      'cancelled': 'status-cancelled'
    };

    return statusMap[status] || 'status-default';
  }
}
