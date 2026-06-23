import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/toast-container/toast-container.component';
import { AuthService } from './core/services/auth.service';
import { MenuService } from './core/services/menu.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  template: `
    <app-toast-container />
    <router-outlet />
  `
})
export class AppComponent implements OnInit {
  private auth = inject(AuthService);
  private menu = inject(MenuService);

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.menu.refreshMenu().subscribe();
    }
  }
}
