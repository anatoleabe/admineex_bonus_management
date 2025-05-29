import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InstanceService, BonusInstance } from '../services/instance';
import { WorkflowService, WorkflowAction, WorkflowHistoryEntry } from '../services/workflow';
import { AllocationViewComponent } from '../allocation-view/allocation-view';

@Component({
  selector: 'app-instance-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AllocationViewComponent],
  templateUrl: './instance-detail.html',
  styleUrls: ['./instance-detail.css']
})
export class InstanceDetailComponent implements OnInit {
  instanceId: string | null = null;
  instance: BonusInstance | null = null;
  isLoadingInstance = true;
  isLoadingAllocations = true;
  isLoadingActions = true;
  error: string | null = null;
  
  // Workflow actions and history
  allowedActions: Record<string, WorkflowAction> = {};
  workflowHistory: WorkflowHistoryEntry[] = [];
  
  // For workflow action form
  actionForm: FormGroup;
  showActionForm = false;
  currentAction: string = '';
  isSubmitting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private instanceService: InstanceService,
    private workflowService: WorkflowService,
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
      this.loadAllowedActions();
      this.loadWorkflowHistory();
    } else {
      this.error = 'No instance ID provided';
      this.isLoadingInstance = false;
    }
  }

  loadInstanceDetails(): void {
    if (!this.instanceId) return;
    
    this.isLoadingInstance = true;
    this.error = null;
    
    // Load instance details
    this.instanceService.getInstanceById(this.instanceId).subscribe({
      next: (data) => {
        this.instance = data;
        this.isLoadingInstance = false;
      },
      error: (err) => {
        this.error = `Error loading instance: ${err.message || 'Unknown error'}`;
        this.isLoadingInstance = false;
      }
    });
  }

  loadAllowedActions(): void {
    if (!this.instanceId) return;
    
    this.isLoadingActions = true;
    
    this.workflowService.getAllowedActions(this.instanceId).subscribe({
      next: (data) => {
        this.allowedActions = data;
        this.isLoadingActions = false;
      },
      error: (err) => {
        console.error('Error loading allowed actions:', err);
        this.isLoadingActions = false;
      }
    });
  }

  loadWorkflowHistory(): void {
    if (!this.instanceId) return;
    
    this.workflowService.getWorkflowHistory(this.instanceId).subscribe({
      next: (data) => {
        this.workflowHistory = data;
      },
      error: (err) => {
        console.error('Error loading workflow history:', err);
      }
    });
  }

  refreshData(): void {
    this.loadInstanceDetails();
    this.loadAllowedActions();
    this.loadWorkflowHistory();
  }

  goBack(): void {
    this.router.navigate(['../..'], { relativeTo: this.route });
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
    
    const actionData = {
      action: this.currentAction,
      comments: this.actionForm.value.comments
    };
    
    this.workflowService.performTransition(this.instanceId, this.currentAction, actionData).subscribe({
      next: (data) => {
        this.isSubmitting = false;
        this.showActionForm = false;
        this.currentAction = '';
        
        // Refresh data to show updated status
        this.refreshData();
      },
      error: (err) => {
        this.error = `Error performing action: ${err.message || 'Unknown error'}`;
        this.isSubmitting = false;
      }
    });
  }

  // Helper method to get status display name
  getStatusDisplayName(status: string | undefined): string {
    if (!status) return 'Unknown';
    return this.workflowService.getStatusDisplayName(status);
  }

  // Helper method to get status class
  getStatusClass(status: string | undefined): string {
    if (!status) return '';
    return this.workflowService.getStatusClass(status);
  }

  // Helper method to format date
  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }
}
