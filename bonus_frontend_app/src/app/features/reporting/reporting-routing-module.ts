import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SummaryReportComponent } from './summary-report/summary-report';
import { DetailedReportComponent } from './detailed-report/detailed-report';
import { DashboardComponent } from './dashboard/dashboard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: DashboardComponent
  },
  {
    path: 'summary',
    component: SummaryReportComponent
  },
  {
    path: 'detailed',
    component: DetailedReportComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportingRoutingModule { }
