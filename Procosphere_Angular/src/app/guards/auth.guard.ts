import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Role } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigate(['']);
  return false;
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.getCurrentUser();
  if (user && user.role === 'ADMIN') return true;
  router.navigate(['/app']);
  return false;
};

/**
 * Allow only the listed roles onto a route. Other authenticated users
 * are bounced back to the dashboard (which itself renders the right
 * role-specific view).
 */
export const roleGuard = (allowed: Role[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.getCurrentUser();
  if (user && allowed.includes(user.role)) return true;
  router.navigate(['/app']);
  return false;
};
