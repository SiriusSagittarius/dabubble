import { Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { signal } from '@angular/core';

import { MockDatabaseService } from '../../core/database/mock-database.service';

@Component({
  selector: 'app-home',
  imports: [FormsModule],
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
  protected selectedProfileUserId: string | null = null;
  protected channelNameEditMode = false;
  protected channelDescriptionEditMode = false;
  protected channelNameDraft = '';
  protected channelDescriptionDraft = '';
  protected addMembersName = '';
  protected chatMessageDraft = '';
  protected readonly selectedAddMemberIds = signal<string[]>([]);
  protected readonly membersPanelOpen = signal(false);
  protected readonly addMembersPanelOpen = signal(false);
  protected readonly sidebarCollapsed = signal(false);
  protected readonly threadCollapsed = signal(false);
  protected readonly channelEditionOpen = signal(false);
  protected readonly channelsExpanded = signal(true);
  protected readonly directMessagesExpanded = signal(true);
  protected readonly addChannelDialogOpen = signal(false);

  @ViewChild('profileArea', { read: ElementRef })
  private profileArea?: ElementRef<HTMLElement>;

  @ViewChild('addMemberInput')
  private addMemberInput?: ElementRef<HTMLInputElement>;

  @ViewChild('chatMessage')
  private chatMessageInput?: ElementRef<HTMLTextAreaElement>;

  protected sendChannelMessage(body: string): void {
    this.database.sendChannelMessage(body);
  }

  protected sendThreadReply(body: string): void {
    this.database.sendThreadReply(body);
  }

  protected toggleChannels(): void {
    this.channelsExpanded.update((value) => !value);
  }

  protected toggleDirectMessages(): void {
    this.directMessagesExpanded.update((value) => !value);
  }

  protected openMembersPanel(): void {
    this.membersPanelOpen.set(true);
  }

  protected closeMembersPanel(): void {
    this.membersPanelOpen.set(false);
  }

  protected openAddMembersPanel(): void {
    this.membersPanelOpen.set(false);
    this.addMembersPanelOpen.set(true);
    this.addMembersName = '';
    this.selectedAddMemberIds.set([]);
  }

  protected closeAddMembersPanel(): void {
    this.addMembersPanelOpen.set(false);
  }

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((value) => !value);
  }

  protected closeThread(): void {
    this.threadCollapsed.set(true);
  }

  protected openThread(): void {
    this.threadCollapsed.set(false);
  }

  protected toggleChannelEdition(): void {
    this.channelEditionOpen.update((value) => !value);
    if (this.channelEditionOpen()) {
      this.syncChannelDrafts();
      this.channelNameEditMode = false;
      this.channelDescriptionEditMode = false;
    }
  }

  protected closeChannelEdition(): void {
    this.channelEditionOpen.set(false);
    this.channelNameEditMode = false;
    this.channelDescriptionEditMode = false;
  }

  protected isSidebarExpanded(): boolean {
    return !this.sidebarCollapsed();
  }

  protected isSidebarCollapsed(): boolean {
    return this.sidebarCollapsed();
  }

  protected isThreadCollapsed(): boolean {
    return this.threadCollapsed();
  }

  protected openAddChannelDialog(): void {
    this.addChannelDialogOpen.set(true);
  }

  protected editChannelName(): void {
    this.channelNameDraft = this.database.activeChannel()?.name ?? '';
    this.channelNameEditMode = true;
    this.channelDescriptionEditMode = false;
  }

  protected saveChannelName(): void {
    const channel = this.database.activeChannel();
    const trimmedName = this.channelNameDraft.trim();

    if (!channel || !trimmedName) {
      return;
    }

    this.database.updateChannel(channel.id, { name: trimmedName });
    this.channelNameEditMode = false;
  }

  protected cancelChannelNameEdit(): void {
    this.channelNameDraft = this.database.activeChannel()?.name ?? '';
    this.channelNameEditMode = false;
  }

  protected editChannelDescription(): void {
    this.channelDescriptionDraft = this.database.activeChannel()?.description ?? '';
    this.channelDescriptionEditMode = true;
    this.channelNameEditMode = false;
  }

  protected saveChannelDescription(): void {
    const channel = this.database.activeChannel();

    if (!channel) {
      return;
    }

    this.database.updateChannel(channel.id, { description: this.channelDescriptionDraft.trim() });
    this.channelDescriptionEditMode = false;
  }

  protected addMembersSuggestions() {
    const query = this.addMembersName.trim().toLowerCase();
    if (!query) {
      return [];
    }

    const selectedIds = this.selectedAddMemberIds();
    return this.database.users().filter((user) => {
      if (selectedIds.includes(user.id)) return false;
      const name = user.name.toLowerCase();
      const email = user.email.toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }

  protected selectSuggestedMember(userId: string): void {
    if (!this.selectedAddMemberIds().includes(userId)) {
      this.selectedAddMemberIds.update((ids) => [...ids, userId]);
    }
    this.addMembersName = '';
    this.addMemberInput?.nativeElement.focus();
  }

  protected addMembersToChannel(): void {
    const selectedIds = this.selectedAddMemberIds();
    if (selectedIds.length === 0) return;

    console.log('Mitglieder zum Channel hinzufügen:', selectedIds);
    this.closeAddMembersPanel();
  }

  protected channelSuggestions() {
    const hashIndex = this.chatMessageDraft.lastIndexOf('#');
    if (hashIndex === -1) {
      return [];
    }

    const query = this.chatMessageDraft
      .slice(hashIndex + 1)
      .trim()
      .toLowerCase();

    return this.database.channels().filter((c) => c.name.toLowerCase().includes(query));
  }

  protected contactSuggestions() {
    const atIndex = this.chatMessageDraft.lastIndexOf('@');
    if (atIndex === -1) {
      return [];
    }

    const query = this.chatMessageDraft
      .slice(atIndex + 1)
      .trim()
      .toLowerCase();

    return this.database.directMessageUsers().filter((user) => {
      const name = user.name.toLowerCase();
      const email = user.email.toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }

  protected showContactSuggestions(): boolean {
    return this.chatMessageDraft.lastIndexOf('@') !== -1 && this.contactSuggestions().length > 0;
  }

  protected selectChannelSuggestion(name: string): void {
    const hashIndex = this.chatMessageDraft.lastIndexOf('#');
    if (hashIndex === -1) {
      this.chatMessageDraft = `#${name} `;
    } else {
      this.chatMessageDraft = `${this.chatMessageDraft.slice(0, hashIndex)}#${name} `;
    }
    this.chatMessageInput?.nativeElement.focus();
  }

  protected selectContactSuggestion(name: string): void {
    const atIndex = this.chatMessageDraft.lastIndexOf('@');
    if (atIndex === -1) {
      this.chatMessageDraft = `@${name} `;
    } else {
      this.chatMessageDraft = `${this.chatMessageDraft.slice(0, atIndex)}@${name} `;
    }
    this.chatMessageInput?.nativeElement.focus();
  }

  protected insertContactMentionTrigger(): void {
    const textarea = this.chatMessageInput?.nativeElement;

    if (!textarea) {
      this.chatMessageDraft = this.chatMessageDraft ? `${this.chatMessageDraft}@` : '@';
      return;
    }

    const start = textarea.selectionStart ?? this.chatMessageDraft.length;
    const end = textarea.selectionEnd ?? start;
    this.chatMessageDraft = `${this.chatMessageDraft.slice(0, start)}@${this.chatMessageDraft.slice(end)}`;

    queueMicrotask(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 1, start + 1);
    });
  }

  protected removeSelectedMember(userId: string): void {
    this.selectedAddMemberIds.update((ids) => ids.filter((id) => id !== userId));
  }

  protected selectedAddMembers() {
    return this.selectedAddMemberIds()
      .map((id) => this.database.findUser(id))
      .filter((u): u is NonNullable<typeof u> => !!u);
  }

  protected avatarSvgPath(userId: string): string {
    const avatarId = this.userAvatarId(userId);
    if (!avatarId) {
      return '/assets/1.svg';
    }

    return `/assets/${avatarId}.svg`;
  }

  private userAvatarId(userId: string): number | null {
    const user = this.database.findUser(userId);
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

  protected cancelChannelDescriptionEdit(): void {
    this.channelDescriptionDraft = this.database.activeChannel()?.description ?? '';
    this.channelDescriptionEditMode = false;
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
    this.selectedProfileUserId = this.database.currentUser()?.id ?? null;
    this.profileEditName = this.database.currentUser()?.name ?? '';
  }

  protected openContactProfile(userId: string): void {
    this.profileMenuOpen = false;
    this.profileDialogOpen = true;
    this.profileEditMode = false;
    this.selectedProfileUserId = userId;
    this.profileEditName = this.profileUser()?.name ?? '';
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
    this.selectedProfileUserId = null;
  }

  protected editProfile(): void {
    this.profileEditMode = true;
    this.profileEditName = this.profileUser()?.name ?? '';
  }

  protected cancelProfileEdit(): void {
    this.profileEditMode = false;
    this.profileEditName = this.profileUser()?.name ?? '';
  }

  protected saveProfileEdit(): void {
    if (this.selectedProfileUserId !== this.database.currentUser()?.id) {
      return;
    }

    const updatedUser = this.database.updateCurrentUserName(this.profileEditName);
    if (!updatedUser) {
      return;
    }

    this.profileEditMode = false;
    this.profileEditName = updatedUser.name;
  }

  protected profileAvatarBackgroundImage(): string {
    return this.profileAvatarId()
      ? "url('/assets/avatar-sprite.svg')"
      : "url('/assets/profile-bild.svg')";
  }

  protected profileAvatarBackgroundPosition(): string {
    return this.profileSpritePosition(168 / 64);
  }

  protected profileAvatarBackgroundSize(): string {
    return this.profileAvatarId() ? this.profileSpriteBackgroundSize(168 / 64) : 'contain';
  }

  protected headerAvatarBackgroundImage(): string {
    return this.profileAvatarId()
      ? "url('/assets/avatar-sprite.svg')"
      : "url('/assets/profile-bild.svg')";
  }

  protected headerAvatarBackgroundPosition(): string {
    return this.profileSpritePosition(70 / 64);
  }

  protected headerAvatarBackgroundSize(): string {
    return this.profileAvatarId() ? this.profileSpriteBackgroundSize(70 / 64) : 'contain';
  }

  protected contactAvatarBackgroundImage(userId: string): string {
    return this.contactAvatarId(userId)
      ? "url('/assets/avatar-sprite.svg')"
      : "url('/assets/profile-bild.svg')";
  }

  protected contactAvatarBackgroundPosition(userId: string): string {
    return this.contactSpritePosition(userId, 50 / 64);
  }

  protected contactAvatarBackgroundSize(userId: string): string {
    return this.contactAvatarId(userId) ? this.profileSpriteBackgroundSize(50 / 64) : 'contain';
  }

  protected profileAvatarId(): number | null {
    const user = this.profileUser();
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

  protected profileUser(): {
    id: string;
    name: string;
    email: string;
    avatarClass: string;
    avatarId?: number;
    isOnline: boolean;
  } | null {
    if (this.selectedProfileUserId) {
      return this.database.findUser(this.selectedProfileUserId);
    }

    return this.database.currentUser();
  }

  protected isCurrentProfileUser(): boolean {
    return this.profileUser()?.id === this.database.currentUser()?.id;
  }

  protected syncChannelDrafts(): void {
    this.channelNameDraft = this.database.activeChannel()?.name ?? '';
    this.channelDescriptionDraft = this.database.activeChannel()?.description ?? '';
  }

  private contactAvatarId(userId: string): number | null {
    const user = this.database.findUser(userId);
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

  private contactSpritePosition(userId: string, scale: number): string {
    const avatarId = this.contactAvatarId(userId);
    const x = 4 * scale;
    const y = 99 * scale;

    switch (avatarId) {
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
