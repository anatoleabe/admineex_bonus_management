import { Component, Input, Output, EventEmitter } from "@angular/core";
import { ApprovalService, ApprovalItem } from "../services/approval"; // Adjust path
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms"; // Import FormsModule for ngModel

@Component({
  selector: "app-approval-item",
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule], // Add FormsModule
  templateUrl: "./approval-item.html",
  styleUrls: ["./approval-item.css"]
})
export class ApprovalItemComponent {
  @Input() item!: ApprovalItem; // Use definite assignment assertion or initialize
  @Output() processed = new EventEmitter<string>(); // Emits the ID of the processed item

  isLoading = false;
  error: string | null = null;
  rejectionComment = ""; // For rejection comments

  constructor(private approvalService: ApprovalService) {}

  approve(): void {
    if (!this.item) return;
    this.isLoading = true;
    this.error = null;
    this.approvalService.submitDecision(this.item._id, "approve").subscribe({
      next: () => {
        this.isLoading = false;
        this.processed.emit(this.item._id);
      },
      error: (err) => {
        this.error = `Failed to approve: ${err.message || "Unknown error"}`;
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  reject(): void {
    if (!this.item) return;
    // Optionally add validation for comment length if required
    // if (!this.rejectionComment) {
    //   this.error = "Rejection comment is required.";
    //   return;
    // }
    this.isLoading = true;
    this.error = null;
    this.approvalService.submitDecision(this.item._id, "reject", this.rejectionComment).subscribe({
      next: () => {
        this.isLoading = false;
        this.processed.emit(this.item._id);
      },
      error: (err) => {
        this.error = `Failed to reject: ${err.message || "Unknown error"}`;
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  // Helper to navigate to the detail view of the item (e.g., Bonus Instance detail)
  viewItemDetail(): void {
    if (this.item && this.item.type === "BonusInstance") {
      // Navigate to the instance detail page - requires Router injection if used here
      // Or emit an event to be handled by the parent queue component
      console.log(`Placeholder: Navigate to detail view for ${this.item.type} ID: ${this.item._id}`);
      alert(`Placeholder: View details for ${this.item.type} ID: ${this.item._id}`);
    }
  }
}

