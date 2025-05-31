import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms"; // Import ReactiveFormsModule
import { ActivatedRoute, Router, RouterModule } from "@angular/router"; // Import RouterModule
import { Observable, switchMap, of } from "rxjs";
import { InstanceService, BonusInstance } from "../services/instance"; // Adjust path as needed
import { TemplateService, BonusTemplate } from "../../template-management/services/template"; // Adjust path
import { CommonModule } from "@angular/common"; // Import CommonModule

@Component({
  selector: "app-instance-form",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule], // Add necessary modules
  templateUrl: "./instance-form.html",
  styleUrls: ["./instance-form.css"]
})
export class InstanceFormComponent implements OnInit {
  instanceForm: FormGroup;
  isEditMode = false;
  instanceId: string | null = null;
  templates$: Observable<BonusTemplate[]> | undefined;
  isLoading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private instanceService: InstanceService,
    private templateService: TemplateService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.instanceForm = this.fb.group({
      templateId: ["", Validators.required],
      referencePeriod: ["", Validators.required],
      shareAmount: [null],
      notes: [""]
      // Add other fields as needed (e.g., customOverrides)
    });
  }

  ngOnInit(): void {
    this.loadTemplates();
    this.route.paramMap.pipe(
      switchMap(params => {
        this.instanceId = params.get("id");
        if (this.instanceId) {
          this.isEditMode = true;
          this.isLoading = true;
          return this.instanceService.getInstance(this.instanceId);
        } else {
          this.isEditMode = false;
          return of(null);
        }
      })
    ).subscribe({
      next: (instance) => {
        if (instance) {
          this.instanceForm.patchValue(instance);
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.error = `Failed to load instance data: ${err.message || "Unknown error"}`;
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  loadTemplates(): void {
    this.templates$ = this.templateService.getTemplates(); // Fetch only active templates for selection
  }

  onSubmit(): void {
    if (this.instanceForm.invalid) {
      this.error = "Please fill in all required fields.";
      this.instanceForm.markAllAsTouched(); // Highlight invalid fields
      return;
    }

    this.isLoading = true;
    this.error = null;
    const formData = this.instanceForm.value;

    const operation = this.isEditMode && this.instanceId
      ? this.instanceService.updateInstance(this.instanceId, formData)
      : this.instanceService.createInstance(formData);

    operation.subscribe({
      next: (savedInstance) => {
        this.isLoading = false;
        this.router.navigate(["/instances", savedInstance._id]); // Navigate to detail view after save
      },
      error: (err) => {
        this.error = `Failed to save instance: ${err.message || "Unknown error"}`;
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    // Navigate back to the list or previous page
    this.router.navigate(["/instances"]); // Adjust as needed
  }
}

