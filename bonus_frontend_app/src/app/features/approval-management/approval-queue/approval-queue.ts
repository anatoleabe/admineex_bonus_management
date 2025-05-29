import { Component, OnInit } from "@angular/core";
import { Observable } from "rxjs";
import { ApprovalService, ApprovalItem } from "../services/approval"; // Adjust path
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { ApprovalItemComponent } from "../approval-item/approval-item"; // Import child component

@Component({
  selector: "app-approval-queue",
  standalone: true,
  imports: [CommonModule, RouterModule, ApprovalItemComponent], // Import necessary modules and child component
  templateUrl: "./approval-queue.html",
  styleUrls: ["./approval-queue.css"]
})
export class ApprovalQueueComponent implements OnInit {
  approvalQueue$: Observable<ApprovalItem[]> | undefined;
  isLoading = false;
  error: string | null = null;

  constructor(private approvalService: ApprovalService) {}

  ngOnInit(): void {
    this.loadQueue();
  }

  loadQueue(): void {
    this.isLoading = true;
    this.error = null;
    this.approvalQueue$ = this.approvalService.getApprovalQueue(); // Add filters if needed
    // Handle loading and error states
    this.approvalQueue$.subscribe({
      next: () => this.isLoading = false,
      error: (err) => {
        this.error = `Failed to load approval queue: ${err.message || "Unknown error"}`;
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  // Handle event when an item is processed (approved/rejected) by the child component
  onItemProcessed(itemId: string): void {
    console.log(`Item ${itemId} processed, refreshing queue.`);
    // Refresh the queue to remove the processed item
    this.loadQueue();
  }
}

