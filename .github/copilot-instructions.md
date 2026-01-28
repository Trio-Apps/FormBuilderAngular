<!-- Copilot instructions for contributors and AI coding agents -->
# Project summary & quick-start

This is an Angular 20 app based on the CoreUI Free Admin Template. Run locally with `npm install` then `npm start` (or `ng serve`). Builds use `npm run build`. Tests use `npm test` (Karma).

# Big-picture architecture (what matters to an AI code agent)

* Bootstrapping: application is started with `bootstrapApplication(AppComponent, appConfig)` in `src/main.ts` (standalone application approach).
* Global providers & wiring: `src/app/app.config.ts` sets up `provideRouter`, `provideHttpClient` (with interceptors) and shared providers like `IconSetService` and `MessageService`.
* Routing & lazy-loading: `src/app/app.routes.ts` uses `loadComponent` and `loadChildren` heavily. Many screens are lazy-loaded as standalone components — change routing here when adding pages.
* Guards & auth: authentication and roles are enforced via guards in `src/app/auth/` (e.g. `auth.guard.ts`, `admin.guard.ts`, `login.guard.ts`). The `form-builder` routes are protected by `adminGuard`.

# Important integration & runtime conventions

* HTTP base URLs come from `environment.apiUrl` (see `src/environments/environment.ts`) and services concatenate paths (example: `FormSubmissionService` uses `${environment.apiUrl}/FormSubmissions`).
* Interceptor order matters: `app.config.ts` registers `withInterceptors([errorInterceptor, authInterceptor, languageInterceptor])`. The `errorInterceptor` must be registered first so it can catch all errors.
* Message showing: `MessageService` (PrimeNG) is injected globally and used by interceptors for toast notifications.
* i18n: translation files live under `src/assets/i18n/` (`en.json`, `ar.json`). Language switching flows are implemented using a language interceptor at HTTP level.

# Project-specific patterns to follow (examples)

* Standalone components + lazy loading: prefer `loadComponent(() => import('...').then(m => m.SomeComponent))` over large NgModule edits.
* Prefer `provideHttpClient(withFetch(), withInterceptors([...]))` in `appConfig` rather than adding interceptors in module metadata.
* Services are typically singletons: `@Injectable({ providedIn: 'root' })` in `src/app/services/`.
* API helper pattern: services build a `base` string from `environment.apiUrl` and call `this.http.get/post(...)` (see `src/app/services/form-submission.service.ts` and `src/app/services/email.service.ts`).

# Files and locations an AI agent will frequently edit or read

* Boot/start: `src/main.ts`
* App wiring: `src/app/app.config.ts`
* Routes: `src/app/app.routes.ts`
* Auth & guards: `src/app/auth/*`
* Services calling backend: `src/app/services/*` (e.g. `form-submission.service.ts`, `email.service.ts`)
* Environments: `src/environments/environment.ts`
* Translations: `src/assets/i18n/*.json`

# Run / build / test commands (exact)

* Install dependencies: `npm install`
* Start dev server (hot reload): `npm start` or `ng serve`
* Build production: `npm run build` (alias for `ng build`)
* Unit tests: `npm test` (Karma)

# When changing behavior, check these places first

* If adding HTTP behavior or headers: `src/app/app.config.ts` (interceptors) and `src/app/auth/auth.interceptor.ts`.
* If changing navigation or adding pages: `src/app/app.routes.ts` (routes + guards).
* If adding global UI services (icons, toasts): `app.config.ts` (IconSetService, MessageService).

# Notes / gotchas observed in the repo

* `src/main.ts` includes a custom suppression for DOM mutation deprecation warnings — do not remove without understanding third-party noise from PrimeNG/CoreUI.
* Code contains bilingual comments (Arabic + English) — preserve intent when editing messages or user-facing strings.
* Heavy use of lazy-loading means type imports may be dynamic; prefer editing or adding components consistent with the `loadComponent` pattern.

# If you need guidance

* Ask for an example change (add a lazy route, add an interceptor, or add a simple API service). I'll provide a focused PR-sized patch.
