import { Routes } from '@angular/router';
import { Login } from './login/login';
import { MainMenuComponent } from './main-menu/main-menu.component';

export const routes: Routes = [
  { path: '', component: Login },  
  { path: 'login', component: Login },
  { path: 'main-menu', component: MainMenuComponent } 
];
