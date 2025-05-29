import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { AuthService } from "../auth"; // Adjust path as needed
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule], // Import necessary modules
  templateUrl: "./login.html",
  styleUrls: ["./login.css"]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ["anatoleabe@gmail.com", [Validators.required, Validators.email]], // Pre-fill for convenience during dev
      password: ["anatole", Validators.required] // Pre-fill for convenience during dev
    });
  }

  ngOnInit(): void {
    // If already logged in, redirect away from login page
    if (this.authService.getToken()) {
       this.router.navigate(["/"]); // Navigate to home or dashboard
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.error = "Please enter a valid email and password.";
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.error = null;

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        // Navigate to the intended destination or dashboard after successful login
        // Consider storing intended URL if redirected to login
        this.router.navigate(["/"]); // Navigate to home/dashboard
      },
      error: (err) => {
        this.error = err.message || "Login failed. Please check your credentials.";
        this.isLoading = false;
        console.error("Login error:", err);
      }
    });
  }
}

