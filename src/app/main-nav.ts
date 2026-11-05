import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './auth/auth-service';
import { InventoryService } from './inventory/inventory-service';
import { TodoService } from './todos/todo-service';

/** Switches between the to-do and inventory screens, and signs out. */
@Component({
  selector: 'app-main-nav',
  imports: [MatIconModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="main-nav" aria-label="Main">
      <div class="segmented">
        <a
          class="segment"
          routerLink="/"
          routerLinkActive="is-active"
          [routerLinkActiveOptions]="{ exact: true }"
          ariaCurrentWhenActive="page"
        >
          <mat-icon>checklist</mat-icon>
          To-dos
        </a>
        <a
          class="segment"
          routerLink="/inventory"
          routerLinkActive="is-active"
          ariaCurrentWhenActive="page"
        >
          <mat-icon>inventory_2</mat-icon>
          Inventory
        </a>
      </div>
      <button type="button" class="btn btn-text" (click)="signOut()">
        <mat-icon>logout</mat-icon>
        Sign out
      </button>
    </nav>
  `,
  styles: `
    .main-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .segment {
      text-decoration: none;
    }
    .segment .mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
  `,
})
export class MainNav {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly todos = inject(TodoService);
  private readonly inventory = inject(InventoryService);

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    this.todos.clear();
    this.inventory.clear();
    await this.router.navigateByUrl('/sign-in');
  }
}
