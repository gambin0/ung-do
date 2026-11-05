import { Routes } from '@angular/router';
import { signedInGuard, signedOutGuard } from './auth/auth-guards';

export const routes: Routes = [
  {
    path: 'sign-in',
    canActivate: [signedOutGuard],
    loadComponent: () => import('./auth/sign-in').then((m) => m.SignIn),
  },
  {
    path: '',
    canActivate: [signedInGuard],
    loadComponent: () => import('./todos/todos').then((m) => m.Todos),
  },
  { path: '**', redirectTo: '' },
];
