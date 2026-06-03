import { Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { signal } from '@angular/core';

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
  protected profileEditMode = false;
  protected profileEditName = '';
  protected readonly channelsExpanded = signal(true);
  protected readonly addChannelDialogOpen = signal(false);

  @ViewChild('profileArea', { read: ElementRef })
  private profileArea?: ElementRef<HTMLElement>;

  protected sendChannelMessage(body: string): void {
    this.database.sendChannelMessage(body);
  }

  protected sendThreadReply(body: string): void {
    this.database.sendThreadReply(body);
  }

  protected toggleChannels(): void {
    this.channelsExpanded.update((value) => !value);
  }

  protected openAddChannelDialog(): void {
    this.addChannelDialogOpen.set(true);
  }

  protected closeAddChannelDialog(): void {
    this.addChannelDialogOpen.set(false);
  }

  protected toggleProfileMenu(): void {
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  protected openProfile(): void {
    this.profileMenuOpen = false;
    this.profileDialogOpen = true;
    this.profileEditMode = false;
    this.profileEditName = this.database.currentUser()?.name ?? '';
  }

  protected logout(): void {
    this.profileMenuOpen = false;
    this.profileDialogOpen = false;
    this.profileEditMode = false;
    this.database.logout();
    void this.router.navigate(['/login']);
  }

  protected closeProfileDialog(): void {
    this.profileDialogOpen = false;
    this.profileEditMode = false;
  }

  protected editProfile(): void {
    this.profileEditMode = true;
    this.profileEditName = this.database.currentUser()?.name ?? '';
  }

  protected cancelProfileEdit(): void {
    this.profileEditMode = false;
    this.profileEditName = this.database.currentUser()?.name ?? '';
  }

  protected saveProfileEdit(): void {
    const updatedUser = this.database.updateCurrentUserName(this.profileEditName);
    if (!updatedUser) {
      return;
    }

    this.profileEditMode = false;
    this.profileEditName = updatedUser.name;
  }

  protected profileAvatarBackgroundImage(): string {
    return this.profileAvatarId() ? "url('/assets/avatar-sprite.svg')" : "url('/assets/profile-bild.svg')";
  }

  protected profileAvatarBackgroundPosition(): string {
    return this.profileSpritePosition(168 / 64);
  }

  protected profileAvatarBackgroundSize(): string {
    return this.profileAvatarId() ? this.profileSpriteBackgroundSize(168 / 64) : 'contain';
  }

  protected headerAvatarBackgroundImage(): string {
    return this.profileAvatarId() ? "url('/assets/avatar-sprite.svg')" : "url('/assets/profile-bild.svg')";
  }

  protected headerAvatarBackgroundPosition(): string {
    return this.profileSpritePosition(70 / 64);
  }

  protected headerAvatarBackgroundSize(): string {
    return this.profileAvatarId() ? this.profileSpriteBackgroundSize(70 / 64) : 'contain';
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

  private profileSpritePosition(scale: number): string {
    const x = 4 * scale;
    const y = 99 * scale;

    switch (this.profileAvatarId()) {
      case 1:
        return `-${x}px -${y}px`;
      case 2:
        return `-${84 * scale}px -${y}px`;
      case 3:
        return `-${164 * scale}px -${y}px`;
      case 4:
        return `-${244 * scale}px -${y}px`;
      case 5:
        return `-${324 * scale}px -${y}px`;
      case 6:
        return `-${404 * scale}px -${y}px`;
      default:
        return 'center';
    }
  }

  private profileSpriteBackgroundSize(scale: number): string {
    return `${472 * scale}px ${167 * scale}px`;
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
    this.profileEditMode = false;
    this.addChannelDialogOpen.set(false);
  }
}
