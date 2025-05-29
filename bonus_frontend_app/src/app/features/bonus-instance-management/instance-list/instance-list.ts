import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { InstanceService, BonusInstance } from '../services/instance'; // Adjust path as needed
import { CommonModule } from '@angular/common'; // Import CommonModule
import { RouterModule } from '@angular/router'; // Import RouterModule for routerLink

@Component({
  selector: 'app-instance-list',
  standalone: true, // Mark as standalone
  imports: [CommonModule, RouterModule], // Import necessary modules
  templateUrl: './instance-list.html',
  styleUrls: ['./instance-list.css']
})
export class InstanceListComponent implements OnInit {
  instances$: Observable<BonusInstance[]> | undefined;
  isLoading = false;
  error: string | null = null;

  constructor(private instanceService: InstanceService) { }

  ngOnInit(): void {
    this.loadInstances();
  }

  loadInstances(): void {
    this.isLoading = true;
    this.error = null;
    this.instances$ = this.instanceService.getInstances(); // Fetch all instances initially
    // Handle loading and error states if needed within the component or via async pipe
    this.instances$.subscribe({
        next: () => this.isLoading = false,
        error: (err) => {
            this.error = `Failed to load instances: ${err.message || 'Unknown error'}`;
            this.isLoading = false;
            console.error(err);
        }
    });
  }

  // Add methods for filtering, sorting, navigating, triggering actions (e.g., generate)
  triggerGeneration(instanceId: string | undefined): void {
      if (!instanceId) return;
      console.log(`Triggering generation for instance: ${instanceId}`);
      // Call service method - add confirmation dialog
      this.instanceService.generateAllocations(instanceId).subscribe({
          next: (res) => {
              console.log(res.message);
              // Optionally refresh the list or update the specific instance status
              this.loadInstances(); // Simple refresh for now
          },
          error: (err) => {
              this.error = `Failed to trigger generation: ${err.message || 'Unknown error'}`;
              console.error(err);
              // Show error message to user
          }
      });
  }
}

