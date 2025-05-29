import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient, withInterceptorsFromDi } from "@angular/common/http"; // Import provideHttpClient and interceptor support
import { HTTP_INTERCEPTORS } from "@angular/common/http"; // Import HTTP_INTERCEPTORS

import { routes } from "./app.routes";
import { AuthInterceptor } from "./core/auth/auth-interceptor-interceptor"; // Adjust path if needed

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()), // Provide HttpClient with interceptor support
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    // Add other providers here (e.g., for state management, services)
  ]
};

