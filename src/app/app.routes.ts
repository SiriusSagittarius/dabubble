import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { AvatarSelectorComponent } from './pages/avatar/avatar';
import { Login } from './pages/login/login';
import { Signup } from './pages/signup/signup';
import { AuthShell } from './core/layout/auth-shell/auth-shell';


export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'home', component: Home },
  { path: 'avatar', component: AvatarSelectorComponent },
  {
    path: '',
    component: AuthShell,
    children: [
      { path: 'login', component: Login },
      { path: 'signup', component: Signup },
      { path: 'reset', loadComponent: () => import('./pages/reset/reset').then((m) => m.Reset) },
    ],
  },
  { path: 'info', redirectTo: 'info/legal', pathMatch: 'full' },
  { path: 'info/:view', loadComponent: () => import('./pages/info/info').then((m) => m.Info) },
];
