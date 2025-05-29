import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { ApprovalQueueComponent } from "./approval-queue/approval-queue"; // Adjust path
// Import AuthGuard if needed
// import { AuthGuard } from "../../core/auth/auth-guard";

const routes: Routes = [
  {
    path: "", // Default route for this feature module
    component: ApprovalQueueComponent,
    // canActivate: [AuthGuard] // Protect the route
  },
  // Add other routes specific to approval management if needed
  // e.g., path: ":id/history"
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ApprovalManagementRoutingModule { }

