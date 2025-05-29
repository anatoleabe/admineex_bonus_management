import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { InstanceListComponent } from "./instance-list/instance-list"; // Adjust path if needed
import { InstanceFormComponent } from "./instance-form/instance-form"; // Adjust path if needed
import { InstanceDetailComponent } from "./instance-detail/instance-detail"; // Adjust path if needed
// Import AuthGuard if needed for route protection
// import { AuthGuard } from "../../core/auth/auth-guard";

const routes: Routes = [
  {
    path: "",
    component: InstanceListComponent,
    // canActivate: [AuthGuard] // Protect the route
  },
  {
    path: "create",
    component: InstanceFormComponent,
    // canActivate: [AuthGuard]
  },
  {
    path: "edit/:id", // Route for editing an existing instance
    component: InstanceFormComponent,
    // canActivate: [AuthGuard]
  },
  {
    path: "detail/:id", // Route for viewing instance details
    component: InstanceDetailComponent,
    // canActivate: [AuthGuard]
  },
  // Add other routes within this feature module if needed
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BonusInstanceManagementRoutingModule { }

