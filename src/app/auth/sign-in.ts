import { Component, inject, signal } from '@angular/core';
import { FormField, FormRoot, email, form, required } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService, signInErrorMessage } from './auth-service';

/** Email/password sign-in screen. Accounts are created in the Firebase console. */
@Component({
  selector: 'app-sign-in',
  imports: [FormField, FormRoot, MatIconModule],
  template: `
    <main class="page">
      <form class="card" [formRoot]="signInForm" aria-labelledby="sign-in-title">
        <span class="brand-mark"><mat-icon>format_list_bulleted</mat-icon></span>
        <h1 id="sign-in-title">Sign in to ung-do</h1>

        @if (error(); as message) {
          <p class="alert" role="alert">{{ message }}</p>
        }

        <label for="email">Email</label>
        <input
          id="email"
          type="email"
          autocomplete="username"
          [formField]="signInForm.email"
          [attr.aria-invalid]="showErrors(signInForm.email)"
          aria-describedby="email-error"
        />
        <p id="email-error" class="field-error">
          @if (showErrors(signInForm.email)) {
            {{ signInForm.email().errors()[0].message }}
          }
        </p>

        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          autocomplete="current-password"
          [formField]="signInForm.password"
          [attr.aria-invalid]="showErrors(signInForm.password)"
          aria-describedby="password-error"
        />
        <p id="password-error" class="field-error">
          @if (showErrors(signInForm.password)) {
            {{ signInForm.password().errors()[0].message }}
          }
        </p>

        <button type="submit" class="submit" [disabled]="signInForm().submitting()">
          {{ signInForm().submitting() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </main>
  `,
  styles: `
    .page {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 1rem;
    }
    .card {
      width: 100%;
      max-width: 380px;
      display: flex;
      flex-direction: column;
      padding: 1.75rem;
      border-radius: 22px;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 24px 48px -24px rgba(15, 23, 42, 0.28);
    }
    .brand-mark {
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      border-radius: 15px;
      background: linear-gradient(140deg, var(--brand-400), var(--brand-600));
      color: #fff;
    }
    h1 {
      margin: 1rem 0 1.25rem;
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--ink-600);
      margin-bottom: 0.35rem;
    }
    input {
      font: inherit;
      padding: 0.6rem 0.8rem;
      border-radius: 12px;
      border: 1.5px solid var(--ink-500);
      background: #fff;
      color: var(--ink-900);
    }
    input:focus-visible {
      border-color: var(--brand-600);
    }
    input[aria-invalid='true'] {
      border-color: #dc2626;
    }
    .field-error {
      min-height: 1.1rem;
      margin: 0.25rem 0 0.6rem;
      font-size: 0.8rem;
      color: #b91c1c;
    }
    .alert {
      margin: 0 0 1rem;
      padding: 0.6rem 0.8rem;
      border-radius: 12px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      font-size: 0.875rem;
    }
    .submit {
      margin-top: 0.4rem;
      padding: 0.7rem 1rem;
      border: none;
      border-radius: 12px;
      font: inherit;
      font-weight: 700;
      color: #fff;
      background: linear-gradient(135deg, var(--brand-600), var(--brand-700));
      cursor: pointer;
    }
    .submit:disabled {
      cursor: progress;
      opacity: 0.8;
    }
  `,
})
export class SignIn {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly error = signal<string | null>(null);
  private readonly credentials = signal({ email: '', password: '' });

  protected readonly signInForm = form(
    this.credentials,
    (path) => {
      required(path.email, { message: 'Enter your email.' });
      email(path.email, { message: 'Enter a valid email address.' });
      required(path.password, { message: 'Enter your password.' });
    },
    {
      submission: {
        action: async (fields) => {
          this.error.set(null);
          const { email, password } = fields().value();
          try {
            await this.auth.signIn(email, password);
            await this.router.navigateByUrl('/');
          } catch (e) {
            this.error.set(signInErrorMessage(e));
          }
          return undefined;
        },
      },
    },
  );

  protected showErrors(field: typeof this.signInForm.email): boolean {
    return field().touched() && field().invalid();
  }
}
