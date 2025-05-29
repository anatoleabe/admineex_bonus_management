import { Routes } from "@angular/router";
import { LoginComponent } from "./core/auth/login/login"; // Adjust path
import { AuthGuard } from "./core/auth/auth-guard"; // Adjust path
// Import a potential MainLayoutComponent or DashboardComponent if it exists
// import { MainLayoutComponent } from "./core/layout/main-layout/main-layout";

export const routes: Routes = [
  {
    path: "login",
    component: LoginComponent
  },
  {
    path: "templates", // Example route for template management
    loadChildren: () => import("./features/template-management/template-management-module").then(m => m.TemplateManagementModule),
    canActivate: [AuthGuard] // Protect this feature
  },
  {
    path: "rules", // Example route for rule management
    loadChildren: () => import("./features/rule-management/rule-management-module").then(m => m.RuleManagementModule),
    canActivate: [AuthGuard]
  },
  {
    path: "instances", // Example route for instance management
    loadChildren: () => import("./features/bonus-instance-management/bonus-instance-management-module").then(m => m.BonusInstanceManagementModule),
    canActivate: [AuthGuard]
  },
  {
    path: "approvals", // Route for approval management queue
    loadChildren: () => import("./features/approval-management/approval-management-module").then(m => m.ApprovalManagementModule),
    canActivate: [AuthGuard]
  },
  // Add a default route (e.g., dashboard or first feature)
  {
    path: "",
    redirectTo: "/instances", // Redirect to instance list by default if logged in
    pathMatch: "full"
  },
  // Add a wildcard route for 404 Not Found page
  // { path: "**", component: NotFoundComponent },
];

