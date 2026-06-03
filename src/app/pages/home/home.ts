import { Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';

import { MockDatabaseService } from '../../core/database/mock-database.service';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly database = inject(MockDatabaseService);
  private readonly router = inject(Router);

  protected profileMenuOpen = false;
  protected profileDialogOpen = false;

  @ViewChild('profileArea', { read: ElementRef })
  private profileArea?: ElementRef<HTMLElement>;

  protected sendChannelMessage(body: string): void {
    this.database.sendChannelMessage(body);
  }

  protected sendThreadReply(body: string): void {
    this.database.sendThreadReply(body);
  }

  protected toggleProfileMenu(): void {
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  protected openProfile(): void {
    this.profileMenuOpen = false;
    this.profileDialogOpen = true;
  }

  protected logout(): void {
    this.profileMenuOpen = false;
    this.profileDialogOpen = false;
    this.database.logout();
    void this.router.navigate(['/login']);
  }

  protected closeProfileDialog(): void {
    this.profileDialogOpen = false;
  }

  protected editProfile(): void {
    this.profileDialogOpen = false;
    void this.router.navigate(['/avatar']);
  }

  protected profileAvatarBackgroundImage(): string {
    return this.profileAvatarId() ? "url('/assets/avatar-sprite.svg')" : "url('/assets/profile-bild.svg')";
  }

  protected profileAvatarBackgroundPosition(): string {
    switch (this.profileAvatarId()) {
      case 1:
        return '-4px -99px';
      case 2:
        return '-84px -99px';
      case 3:
        return '-164px -99px';
      case 4:
        return '-244px -99px';
      case 5:
        return '-324px -99px';
      case 6:
        return '-404px -99px';
      default:
        return 'center';
    }
  }

  protected profileAvatarBackgroundSize(): string {
    return this.profileAvatarId() ? '1239px 438.375px' : 'contain';
  }

  protected profileAvatarId(): number | null {
    const user = this.database.currentUser();
    if (!user) {
      return null;
    }

    if (typeof user.avatarId === 'number') {
      return user.avatarId;
    }

    switch (user.avatarClass) {
      case 'avatar-1':
        return 1;
      case 'avatar-2':
        return 2;
      case 'avatar-3':
        return 3;
      case 'avatar-4':
        return 4;
      default:
        return null;
    }
  }

  @HostListener('document:click', ['$event'])
  protected closeProfileMenuOnOutsideClick(event: MouseEvent): void {
    if (!this.profileMenuOpen) {
      return;
    }

    const target = event.target as Node | null;
    if (target && this.profileArea?.nativeElement.contains(target)) {
      return;
    }

    this.profileMenuOpen = false;
  }

  @HostListener('document:keydown.escape')
  protected closeProfileMenuOnEscape(): void {
    this.profileMenuOpen = false;
    this.profileDialogOpen = false;
  }
}
