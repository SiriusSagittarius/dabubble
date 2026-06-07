import { Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';

import { MockDatabaseService } from '../../core/database/mock-database.service';

@Component({
  selector: 'app-home',
  imports: [FormsModule, PickerComponent],
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
  protected workspaceSearchDraft = '';
  protected channelNameEditMode = false;
  protected channelDescriptionEditMode = false;
  protected channelNameDraft = '';
  protected channelDescriptionDraft = '';
  protected addMembersName = '';
  protected addChannelNameDraft = '';
  protected addChannelDescriptionDraft = '';
  protected addChannelMembersStep = false;
  protected addChannelMemberMode: 'all' | 'selected' = 'all';
  protected readonly showAddMembersSuggestions = signal(false);
  protected pendingAddChannelId: string | null = null;
  protected chatMessageDraft = '';
  protected threadMessageDraft = '';
  protected readonly activeMessageMenuId = signal<string | null>(null);
  protected readonly activeThreadEditMenuId = signal<string | null>(null);
  protected readonly activeThreadReactionBarId = signal<string | null>(null);
  protected readonly editingMessageId = signal<string | null>(null);
  protected readonly activeEmojiPicker = signal<'message' | 'thread' | null>(null);
  protected editMessageDraft = '';
  protected readonly selectedDirectMessageUserId = signal<string | null>(null);
  protected readonly selectedAddMemberIds = signal<string[]>([]);
  protected readonly membersPanelOpen = signal(false);
  protected readonly addMembersPanelOpen = signal(false);
  protected readonly sidebarCollapsed = signal(false);
  protected readonly threadCollapsed = signal(false);
  protected readonly channelEditionOpen = signal(false);
  protected readonly channelsExpanded = signal(true);
  protected readonly directMessagesExpanded = signal(false);
  protected readonly addChannelDialogOpen = signal(false);
  protected readonly showMainChatIntro = signal(false);
  protected readonly showTodoList = signal(false);
  protected readonly emojiCategories = ['recent', 'people', 'nature', 'foods', 'activity', 'places', 'objects', 'symbols'];
  protected readonly todoItems = signal([
    { id: 1, title: 'Channel-Layout final prüfen', done: false },
    { id: 2, title: 'Thread-Ansicht responsive testen', done: true },
    { id: 3, title: 'Neue Nachrichten-Ansicht mit Daten verbinden', done: false },
  ]);
  protected todoDraft = '';

  @ViewChild('profileArea', { read: ElementRef })
  private profileArea?: ElementRef<HTMLElement>;

  @ViewChild('addMemberInput')
  private addMemberInput?: ElementRef<HTMLInputElement>;

  @ViewChild('chatMessage')
  private chatMessageInput?: ElementRef<HTMLTextAreaElement>;

  @ViewChild('threadMessage')
  private threadMessageInput?: ElementRef<HTMLTextAreaElement>;

  protected sendChannelMessage(body: string): void {
    const message = this.database.sendChannelMessage(body);

    if (message) {
      this.threadCollapsed.set(false);
    }
  }

  protected sendThreadReply(body: string): void {
    const message = this.database.sendThreadReply(body);

    if (message) {
      this.threadMessageDraft = '';
    }
  }

  protected openMessageThread(messageId: string): void {
    this.activeMessageMenuId.set(null);
    this.database.createThreadFromMessage(messageId);
    this.threadCollapsed.set(false);
  }

  protected toggleMessageMenu(messageId: string): void {
    this.activeMessageMenuId.update((activeId) => (activeId === messageId ? null : messageId));
  }

  protected toggleThreadEditMenu(messageId: string): void {
    this.activeThreadReactionBarId.set(null);
    this.activeThreadEditMenuId.update((activeId) => (activeId === messageId ? null : messageId));
  }

  protected toggleThreadReactionBar(messageId: string): void {
    this.activeThreadEditMenuId.set(null);
    this.activeThreadReactionBarId.update((activeId) => (activeId === messageId ? null : messageId));
  }

  protected closeThreadReactionBar(): void {
    this.activeThreadReactionBarId.set(null);
  }

  protected startEditingThreadMessage(messageId: string, body: string): void {
    this.activeThreadEditMenuId.set(null);
    this.activeThreadReactionBarId.set(null);
    this.startEditingMessage(messageId, body);
  }

  protected startEditingMessage(messageId: string, body: string): void {
    this.activeMessageMenuId.set(null);
    this.editingMessageId.set(messageId);
    this.editMessageDraft = body;
  }

  protected cancelEditingMessage(): void {
    this.editingMessageId.set(null);
    this.editMessageDraft = '';
  }

  protected saveEditedMessage(messageId: string): void {
    const updatedMessage = this.database.updateMessageBody(messageId, this.editMessageDraft);

    if (updatedMessage) {
      this.cancelEditingMessage();
    }
  }

  protected shouldShowDateSeparator(index: number): boolean {
    const messages = this.database.channelMessages();
    const message = messages[index];

    if (!message) {
      return false;
    }

    if (index === 0) {
      return true;
    }

    const previousMessage = messages[index - 1];
    return this.dateKey(message.createdAt) !== this.dateKey(previousMessage.createdAt);
  }

  protected formatDateSeparator(date: string): string {
    const value = new Date(date);
    const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const months = [
      'Januar',
      'Februar',
      'Maerz',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember',
    ];

    return `${weekdays[value.getDay()]}, ${value.getDate()} ${months[value.getMonth()]}`;
  }

  protected formatMessageTimestamp(date: string): string {
    const value = new Date(date);
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear();
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes} Uhr`;
  }

  protected formatThreadMetaTimestamp(date: string): string {
    return this.formatMessageTimestamp(date).replace(/\s/g, '\u00a0');
  }

  protected threadUserName(userId: string): string {
    return this.database.userName(userId).replace(/\s/g, '\u00a0');
  }

  protected toggleChannels(): void {
    const nextExpanded = !this.channelsExpanded();

    this.channelsExpanded.set(nextExpanded);
    if (nextExpanded) {
      this.directMessagesExpanded.set(false);
    }
  }

  protected toggleDirectMessages(): void {
    const nextExpanded = !this.directMessagesExpanded();

    this.directMessagesExpanded.set(nextExpanded);
    if (nextExpanded) {
      this.channelsExpanded.set(false);
    }
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

  protected openMainChatIntro(): void {
    this.selectedDirectMessageUserId.set(null);
    this.showTodoList.set(false);
    this.showMainChatIntro.update((value) => !value);
  }

  protected workspaceSearchChannels() {
    const query = this.workspaceSearchDraft.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return this.database.channels().filter(
      (channel) =>
        channel.name.toLowerCase().includes(query) || channel.description.toLowerCase().includes(query),
    );
  }

  protected workspaceSearchUsers() {
    const query = this.workspaceSearchDraft.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return this.database.users().filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query),
    );
  }

  protected workspaceSearchMessages() {
    const query = this.workspaceSearchDraft.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return this.database.messages().filter((message) => {
      const author = this.database.findUser(message.authorId);
      const channel = this.database.channels().find((entry) => entry.id === message.channelId);
      const body = message.body.toLowerCase();

      return (
        body.includes(query) ||
        author?.name.toLowerCase().includes(query) ||
        channel?.name.toLowerCase().includes(query)
      );
    });
  }

  protected showWorkspaceSearchResults(): boolean {
    return this.workspaceSearchDraft.trim().length > 0;
  }

  protected openWorkspaceSearchChannel(channelId: string): void {
    this.database.selectChannel(channelId);
    this.workspaceSearchDraft = '';
  }

  protected openWorkspaceSearchUser(userId: string): void {
    this.openContactProfile(userId);
    this.workspaceSearchDraft = '';
  }

  protected openWorkspaceSearchMessage(messageId: string): void {
    const message = this.database.findMessage(messageId);

    if (!message) {
      return;
    }

    this.database.selectChannel(message.channelId);

    const thread = this.database.threadForMessage(message.id) ?? (message.threadId ? this.database.findThread(message.threadId) : null);

    if (thread) {
      this.database.selectThread(thread.id);
      this.threadCollapsed.set(false);
    }

    this.workspaceSearchDraft = '';
  }

  protected channelName(channelId: string): string {
    return this.database.channels().find((channel) => channel.id === channelId)?.name ?? 'Channel';
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
    this.addChannelNameDraft = '';
    this.addChannelDescriptionDraft = '';
    this.addChannelMembersStep = false;
    this.addChannelMemberMode = 'all';
    this.pendingAddChannelId = null;
    this.addChannelDialogOpen.set(true);
  }

  protected createAddChannel(): void {
    const name = this.addChannelNameDraft.trim();

    if (!name) {
      return;
    }

    const channel = this.database.createChannel(name);

    if (channel && this.addChannelDescriptionDraft.trim()) {
      this.database.updateChannel(channel.id, {
        description: this.addChannelDescriptionDraft.trim(),
      });
    }

    if (channel) {
      this.pendingAddChannelId = channel.id;
      this.addChannelMembersStep = true;
    }
  }

  protected finishAddChannelMembers(): void {
    const channelId = this.pendingAddChannelId;

    if (!channelId) {
      this.closeAddChannelDialog();
      return;
    }

    if (this.addChannelMemberMode === 'all') {
      this.database.addMembersToChannel(
        channelId,
        this.database.users().map((user) => user.id),
      );
    } else if (this.addChannelMemberMode === 'selected') {
      const selectedIds = this.selectedAddMemberIds();
      if (selectedIds.length > 0) {
        this.database.addMembersToChannel(channelId, selectedIds);
      }
    }

    this.closeAddChannelDialog();
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

  protected isActiveChannelCreator(): boolean {
    const channel = this.database.activeChannel();
    const currentUser = this.database.currentUser();

    return !!channel && !!currentUser && channel.createdBy === currentUser.id;
  }

  protected isActiveChannelMember(): boolean {
    const channel = this.database.activeChannel();
    const currentUser = this.database.currentUser();

    return !!channel && !!currentUser && channel.memberIds.includes(currentUser.id);
  }

  protected channelEditionActionLabel(): string {
    if (!this.isActiveChannelMember()) {
      return 'Channel beitreten';
    }

    return this.isActiveChannelCreator() ? 'Channel löschen' : 'Channel verlassen';
  }

  protected handleChannelEditionAction(): void {
    const channel = this.database.activeChannel();

    if (!channel) {
      return;
    }

    if (!this.isActiveChannelMember()) {
      this.database.joinChannel(channel.id);
    } else if (this.isActiveChannelCreator()) {
      this.database.deleteChannel(channel.id);
    } else {
      this.database.leaveChannel(channel.id);
    }

    this.closeChannelEdition();
  }

  protected addMembersSuggestions() {
    const query = this.addMembersName.trim().toLowerCase();

    const selectedIds = this.selectedAddMemberIds();
    const channelId = this.addChannelMembersStep ? this.pendingAddChannelId : this.database.activeChannel()?.id;
    const channel = channelId ? this.database.channels().find((c) => c.id === channelId) : null;
    const activeMemberIds = channel?.memberIds ?? [];

    const filtered = this.database.users().filter((user) => {
      if (selectedIds.includes(user.id)) return false;
      if (activeMemberIds.includes(user.id)) return false;

      if (!query) return true; // Zeige alle verfügbaren Nutzer, wenn noch nichts getippt wurde

      return user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
    });

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  protected hideSuggestionsWithDelay(): void {
    // Kleiner Delay, damit der Click-Event auf einen Vorschlag noch gefeuert wird
    setTimeout(() => this.showAddMembersSuggestions.set(false), 200);
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

    const channel = this.database.activeChannel();
    if (!channel) return;

    this.database.addMembersToChannel(channel.id, selectedIds);

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
    return this.mentionSuggestions(this.chatMessageDraft);
  }

  protected threadContactSuggestions() {
    return this.mentionSuggestions(this.threadMessageDraft);
  }

  protected showContactSuggestions(): boolean {
    return this.chatMessageDraft.trimStart().startsWith('@') && this.contactSuggestions().length > 0;
  }

  protected showThreadContactSuggestions(): boolean {
    return this.threadMessageDraft.trimStart().startsWith('@') && this.threadContactSuggestions().length > 0;
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
    this.chatMessageDraft = this.replaceLeadingMention(this.chatMessageDraft, name);
    this.chatMessageInput?.nativeElement.focus();
  }

  protected selectThreadContactSuggestion(name: string): void {
    this.threadMessageDraft = this.replaceLeadingMention(this.threadMessageDraft, name);
    this.threadMessageInput?.nativeElement.focus();
  }

  protected insertContactMentionTrigger(): void {
    this.insertMentionTrigger(this.chatMessageInput, 'chat');
  }

  protected insertThreadMentionTrigger(): void {
    this.insertMentionTrigger(this.threadMessageInput, 'thread');
  }

  private mentionSuggestions(draft: string) {
    const trimmed = draft.trimStart();
    if (!trimmed.startsWith('@')) {
      return [];
    }

    const query = trimmed.slice(1).trim().toLowerCase();
    const members = this.database.activeChannelMembers();

    return members
      .filter((user) => {
        const name = user.name.toLowerCase();
        const email = user.email.toLowerCase();

        if (!query) {
          return true;
        }

        return name.includes(query) || email.includes(query);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  protected toggleEmojiPicker(target: 'message' | 'thread'): void {
    this.activeEmojiPicker.update((activeTarget) => (activeTarget === target ? null : target));
  }

  protected closeEmojiPicker(): void {
    this.activeEmojiPicker.set(null);
  }

  protected addReaction(messageId: string, reaction: string): void {
    this.database.toggleMessageReaction(messageId, reaction);
  }

  protected reactionIcon(reaction: string): string {
    switch (reaction) {
      case 'check':
        return '✅';
      case 'hands':
        return '👏';
      case 'thumbs_up':
        return '👍';
      case 'heart':
        return '❤️';
      case 'smile':
        return '😊';
      case 'open_mouth':
        return '??';
      case 'sad':
        return '??';
      default:
        return reaction;
    }
  }

  protected reactionHoverLabel(reaction: { userIds: string[] }): string {
    const names = reaction.userIds.map((userId) => this.database.userName(userId)).filter(Boolean);

    if (!names.length) {
      return 'Reaktion';
    }

    return `${names.join(', ')} hat reagiert`;
  }

  protected reactionHoverUser(reaction: { userIds: string[] }): string {
    const name = reaction.userIds
      .map((userId) => this.database.userName(userId))
      .find(Boolean);

    return name ?? 'Reaktion';
  }

  private replaceLeadingMention(draft: string, name: string): string {
    const trimmed = draft.trimStart();
    if (!trimmed.startsWith('@')) {
      return `@${name} `;
    }

    const remaining = trimmed.slice(1);
    const spaceIndex = remaining.search(/\s/);
    const tail = spaceIndex === -1 ? '' : remaining.slice(spaceIndex);

    return `@${name}${tail || ' '}`;
  }

  private replaceThreadMention(name: string): void {
    this.threadMessageDraft = this.replaceLeadingMention(this.threadMessageDraft, name);
  }

  private insertMentionTrigger(
    textareaRef: ElementRef<HTMLTextAreaElement> | undefined,
    target: 'chat' | 'thread',
  ): void {
    const textarea = textareaRef?.nativeElement;

    if (!textarea) {
      if (target === 'chat') {
        this.chatMessageDraft = this.chatMessageDraft ? `${this.chatMessageDraft}@` : '@';
      } else {
        this.threadMessageDraft = this.threadMessageDraft ? `${this.threadMessageDraft}@` : '@';
      }
      return;
    }

    const value = target === 'chat' ? this.chatMessageDraft : textarea.value;
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? start;
    const nextValue = `${value.slice(0, start)}@${value.slice(end)}`;

    if (target === 'chat') {
      this.chatMessageDraft = nextValue;
    } else {
      this.threadMessageDraft = nextValue;
    }

    queueMicrotask(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 1, start + 1);
    });
  }

  @HostListener('document:click', ['$event'])
  protected closeEmojiPickerOnOutsideClick(event: MouseEvent): void {
    if (!this.activeEmojiPicker()) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) {
      this.activeEmojiPicker.set(null);
      return;
    }

    if (
      target.closest('.emoji-picker-popover') ||
      target.closest('.action-button-emoji')
    ) {
      return;
    }

    this.activeEmojiPicker.set(null);
  }


  @HostListener('document:pointerdown', ['$event'])
  @HostListener('document:mousedown', ['$event'])
  @HostListener('document:touchstart', ['$event'])
  @HostListener('document:click', ['$event'])
  protected closeThreadReactionBarOnOutsideClick(event: Event): void {
    if (!this.activeThreadReactionBarId()) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (
      target?.closest('.thread-reaction-popover') ||
      target?.closest('.thread-edit-icon-button') ||
      target?.closest('.thread-reaction-add') ||
      target?.closest('.thread-message-time-with-icon')
    ) {
      return;
    }

    this.activeThreadReactionBarId.set(null);
  }

  protected onMessageEmojiSelect(event: { emoji?: { native?: string } }, target: 'message' | 'thread'): void {
    const emoji = event.emoji?.native;

    if (!emoji) {
      return;
    }

    if (target === 'thread') {
      this.insertEmojiIntoThreadReply(emoji);
      this.closeEmojiPicker();
      return;
    }

    this.insertEmojiIntoMessageDraft(emoji);
    this.closeEmojiPicker();
  }

  private insertEmojiIntoMessageDraft(emoji: string): void {
    const textarea = this.chatMessageInput?.nativeElement;

    if (!textarea) {
      this.chatMessageDraft = `${this.chatMessageDraft}${emoji}`;
      return;
    }

    const start = textarea.selectionStart ?? this.chatMessageDraft.length;
    const end = textarea.selectionEnd ?? start;
    this.chatMessageDraft = `${this.chatMessageDraft.slice(0, start)}${emoji}${this.chatMessageDraft.slice(end)}`;

    queueMicrotask(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  private insertEmojiIntoThreadReply(emoji: string): void {
    const textarea = this.threadMessageInput?.nativeElement;

    if (!textarea) {
      this.threadMessageDraft = `${this.threadMessageDraft}${emoji}`;
      return;
    }

    const value = this.threadMessageDraft;
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? start;
    this.threadMessageDraft = `${value.slice(0, start)}${emoji}${value.slice(end)}`;

    queueMicrotask(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
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
    this.addChannelNameDraft = '';
    this.addChannelDescriptionDraft = '';
    this.addChannelMembersStep = false;
    this.addChannelMemberMode = 'all';
    this.pendingAddChannelId = null;
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

  protected openDirectMessage(userId: string): void {
    this.profileMenuOpen = false;
    this.profileDialogOpen = false;
    this.profileEditMode = false;
    this.selectedProfileUserId = null;
    this.showMainChatIntro.set(false);
    this.channelEditionOpen.set(false);

    if (this.database.isCurrentUser(userId)) {
      this.selectedDirectMessageUserId.set(null);
      this.showTodoList.set(true);
      this.threadCollapsed.set(true);
      return;
    }

    this.selectedDirectMessageUserId.set(userId);
    this.showTodoList.set(false);
    this.threadCollapsed.set(false);
  }

  protected addTodoItem(title: string): void {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    this.todoItems.update((items) => [
      ...items,
      {
        id: Date.now(),
        title: trimmedTitle,
        done: false,
      },
    ]);
  }

  protected toggleTodoItem(todoId: number): void {
    this.todoItems.update((items) =>
      items.map((item) => (item.id === todoId ? { ...item, done: !item.done } : item)),
    );
  }

  protected messageProfileUser(): void {
    const user = this.profileUser();

    if (!user) {
      return;
    }

    this.openDirectMessage(user.id);
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

  protected directMessageUser() {
    const userId = this.selectedDirectMessageUserId();
    return userId ? this.database.findUser(userId) : null;
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

  private dateKey(date: string): string {
    const value = new Date(date);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
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

  // HIER EINGEFÜGT: Schließt das Reaction-Menü bei Klicks außerhalb
  @HostListener('document:keydown.escape')
  protected closeProfileMenuOnEscape(): void {
    this.profileMenuOpen = false;
    this.profileDialogOpen = false;
    this.profileEditMode = false;
    this.closeAddChannelDialog();
    this.activeThreadReactionBarId.set(null); // Schließt das Menü auch bei Escape
  }
}
