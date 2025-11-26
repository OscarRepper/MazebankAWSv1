import { Routes } from '@angular/router';
import { Login } from './login/login';
import { authGuard } from './guards/auth.guard_admin';
import { authGuardC } from './guards/auth.guard_cliente';
import { Prestamos } from './prestamos/prestamos';

export const routes: Routes = [
  { path: 'login', component: Login },

  //--SECCIONES DEL ADMINISTRADOR--//


  {
    path: 'main-administrador',
    loadComponent: () => import('./administrador/main-admin/main-admin').then(m => m.MainAdmin),
    canActivate: [authGuard]
  },

  //--SECCIONES DEL CLIENTE--//

  {
    path: 'main-menu',
    loadComponent: () => import('./main-menu/main-menu').then(m => m.MainMenu),
    canActivate: [authGuardC]
  },

  {
    path: 'transferir',
    loadComponent: () => import('./transferir/transferir.component').then(m => m.TransferirComponent)
  },

  {
    path: 'servicio',
    loadComponent: () => import('./servicio/servicio').then(m => m.Servicio)
  },

  {
    path: 'historial',
    loadComponent: () => import('./historial/historial').then(m => m.Historial)
  },

  {
    path: 'tarjetas',
    loadComponent: () => import('./tarjetas/tarjetas').then(m => m.Tarjetas)
  },

  {
    path: 'prestamos',
    loadComponent: () => import('./prestamos/prestamos').then(m => m.Prestamos)
  },

  {
    path: 'registro',
    loadComponent: () => import('./registro/registro').then(m => m.Registro)
  },

  { path: '', redirectTo: 'login', pathMatch: 'full' },

];
