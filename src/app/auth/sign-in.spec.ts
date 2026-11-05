import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { FirebaseError } from 'firebase/app';
import { vi } from 'vitest';
import { AuthService } from './auth-service';
import { SignIn } from './sign-in';

async function render(signIn: (email: string, password: string) => Promise<void>) {
  await TestBed.configureTestingModule({
    imports: [SignIn],
    providers: [provideRouter([]), { provide: AuthService, useValue: { signIn: vi.fn(signIn) } }],
  }).compileComponents();
  const fixture = TestBed.createComponent(SignIn);
  fixture.detectChanges();
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

  const fill = (selector: string, value: string) => {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const submit = async () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { el, fill, submit, navigate, auth: TestBed.inject(AuthService) };
}

describe('SignIn', () => {
  it('shows validation errors and does not call sign-in for an empty form', async () => {
    const { el, submit, auth } = await render(async () => {});
    await submit();

    expect(auth.signIn).not.toHaveBeenCalled();
    expect(el.querySelector('#email')!.getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('#email-error')!.textContent).toContain('Enter your email.');
    expect(el.querySelector('#password-error')!.textContent).toContain('Enter your password.');
  });

  it('signs in and navigates to the list', async () => {
    const { fill, submit, navigate, auth } = await render(async () => {});
    fill('#email', 'me@example.com');
    fill('#password', 'secret');
    await submit();

    expect(auth.signIn).toHaveBeenCalledWith('me@example.com', 'secret');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('shows a friendly message when credentials are wrong', async () => {
    const { el, fill, submit, navigate } = await render(async () => {
      throw new FirebaseError('auth/invalid-credential', 'raw firebase message');
    });
    fill('#email', 'me@example.com');
    fill('#password', 'wrong');
    await submit();

    expect(el.querySelector('[role="alert"]')!.textContent).toContain(
      'Incorrect email or password.',
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});
