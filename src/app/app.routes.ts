import { Routes } from '@angular/router';
import { FleetOverview } from './pages/fleet-overview/fleet-overview';
import { WallDetailComp } from './pages/wall-detail-comp/wall-detail-comp';
import { ResidentsComp } from './pages/residents-comp/residents-comp';
import { Login } from './pages/login/login';
import { authGuard } from './guards/auth.guard';
import { LogsComp } from './pages/logs-comp/logs-comp';
import { SettingsComp } from './pages/settings-comp/settings-comp';
import { ResetPassword } from './pages/reset-password/reset-password';
import { NotFound } from './pages/not-found/not-found';

export const routes: Routes = [
    { path: '', redirectTo: 'fleet-overview', pathMatch: 'full'},
    { path: 'login', component: Login},
    { path: "fleet-overview", component: FleetOverview, canActivate: [authGuard]},
    { path: 'walls/:id', component: WallDetailComp, canActivate: [authGuard]},
    { path: 'residents', component: ResidentsComp, canActivate: [authGuard]},
    { path: 'logs', component: LogsComp, canActivate: [authGuard]},
    { path: 'settings', component: SettingsComp, canActivate: [authGuard]},
    { path: 'reset-password', component: ResetPassword},
    { path: '**', component: NotFound } 
];
