import { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuardC: CanActivateFn = () => {
  const router = inject(Router);

  if (typeof window !== 'undefined') {
    const usuario = localStorage.getItem('usuario');

    if (usuario) {
      const userObj = JSON.parse(usuario);
      const roleId = userObj?.role_id;

      if (roleId === 1) {
        return true;
      }
    }
  }

  if (typeof window !== 'undefined') {
    alert('Acceso denegado. Por favor inicia sesión con un usuario válido.');
  }

  router.navigate(['/login']);
  return false;
};
