import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth-service';

/** Lets signed-in users through; sends everyone else to the sign-in page. */
export const signedInGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  return (await auth.isSignedIn()) || router.createUrlTree(['/sign-in']);
};

/** Keeps signed-in users off the sign-in page. */
export const signedOutGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  return !(await auth.isSignedIn()) || router.createUrlTree(['/']);
};
