import { Injectable, computed, signal } from '@angular/core';

import { MOCK_DATABASE_SEED } from './mock-database.seed';
import {
  MockChannel,
  MockDatabaseState,
  MockLoginResult,
  MockMessage,
  MockThread,
  MockUser,
} from './mock-database.models';

const STORAGE_KEY = 'dabubble.mock-database.v1';

@Injectable({ providedIn: 'root' })
export class MockDatabaseService {
  private readonly state = signal<MockDatabaseState>(this.loadState());

  readonly users = computed(() => this.state().users);
  readonly channels = computed(() => this.state().channels);
  readonly currentUser = computed(() => this.findUser(this.state().currentUserId));
  readonly contacts = computed(() => this.state().users.filter((user) => user.id !== this.state().currentUserId));

  readonly activeChannel = computed(() => {
    const state = this.state();
    return state.channels.find((channel) => channel.id === state.selectedChannelId) ?? state.channels[0] ?? null;
  });

  readonly activeChannelMembers = computed(() => {
    const channel = this.activeChannel();
    if (!channel) {
      return [];
    }

    return channel.memberIds
      .map((userId) => this.findUser(userId))
      .filter((user): user is MockUser => !!user);
  });

  readonly channelMessages = computed(() => {
    const channel = this.activeChannel();
    if (!channel) {
      return [];
    }

    return this.state().messages
      .filter((message) => message.channelId === channel.id && !message.threadId)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  });

  readonly activeThread = computed(() => {
    const state = this.state();
    const channel = this.activeChannel();
    if (!channel) {
      return null;
    }

    return (
      state.threads.find((thread) => thread.id === state.selectedThreadId && thread.channelId === channel.id) ??
      state.threads.find((thread) => thread.channelId === channel.id) ??
      null
    );
  });

  readonly activeThreadOrigin = computed(() => {
    const thread = this.activeThread();
    if (!thread) {
      return null;
    }

    return this.state().messages.find((message) => message.id === thread.originMessageId) ?? null;
  });

  readonly threadMessages = computed(() => {
    const thread = this.activeThread();
    if (!thread) {
      return [];
    }

    return this.state().messages
      .filter((message) => message.threadId === thread.id)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  });

  login(email: string, password: string): MockLoginResult {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.state().users.find(
      (entry) => entry.email.toLowerCase() === normalizedEmail && entry.password === password,
    );

    if (!user) {
      return { ok: false, message: 'E-Mail oder Passwort stimmt nicht.' };
    }

    this.patchState((state) => ({
      ...state,
      currentUserId: user.id,
      users: state.users.map((entry) => (entry.id === user.id ? { ...entry, isOnline: true } : entry)),
    }));

    return { ok: true, user };
  }

  loginAsGuest(): MockUser {
    const guest = this.findUser('user-guest') ?? this.state().users[0];
    this.patchState((state) => ({
      ...state,
      currentUserId: guest.id,
      users: state.users.map((entry) => (entry.id === guest.id ? { ...entry, isOnline: true } : entry)),
    }));

    return guest;
  }

  logout(): void {
    const currentUserId = this.state().currentUserId;
    if (!currentUserId) {
      return;
    }

    this.patchState((state) => ({
      ...state,
      currentUserId: '',
      users: state.users.map((user) => (user.id === currentUserId ? { ...user, isOnline: false } : user)),
    }));
  }

  registerUser(name: string, email: string, password: string, avatarId?: number | null): MockLoginResult {
    const normalizedEmail = email.trim().toLowerCase();
    const exists = this.state().users.some((user) => user.email.toLowerCase() === normalizedEmail);

    if (exists) {
      return { ok: false, message: 'Diese E-Mail ist schon in der Mock-Datenbank.' };
    }

    const newUser: MockUser = {
      id: this.createId('user'),
      name: name.trim(),
      email: normalizedEmail,
      password,
      avatarClass: 'avatar-4',
      ...(avatarId ? { avatarId } : {}),
      isOnline: true,
    };

    this.patchState((state) => ({
      ...state,
      currentUserId: newUser.id,
      users: [...state.users, newUser],
      channels: state.channels.map((channel) =>
        channel.id === state.selectedChannelId
          ? { ...channel, memberIds: [...channel.memberIds, newUser.id] }
          : channel,
      ),
    }));

    return { ok: true, user: newUser };
  }

  selectChannel(channelId: string): void {
    if (!this.state().channels.some((channel) => channel.id === channelId)) {
      return;
    }

    const threadId = this.state().threads.find((thread) => thread.channelId === channelId)?.id ?? '';
    this.patchState((state) => ({ ...state, selectedChannelId: channelId, selectedThreadId: threadId }));
  }

  selectThread(threadId: string): void {
    if (!this.state().threads.some((thread) => thread.id === threadId)) {
      return;
    }

    this.patchState((state) => ({ ...state, selectedThreadId: threadId }));
  }

  createChannel(name: string, memberIds: string[] = []): MockChannel | null {
    const trimmedName = name.trim();
    const currentUser = this.currentUser();

    if (!trimmedName || !currentUser) {
      return null;
    }

    const channel: MockChannel = {
      id: this.createId('channel'),
      name: trimmedName,
      description: '',
      memberIds: Array.from(new Set([currentUser.id, ...memberIds])),
      createdBy: currentUser.id,
    };

    this.patchState((state) => ({
      ...state,
      selectedChannelId: channel.id,
      channels: [...state.channels, channel],
    }));

    return channel;
  }

  addContact(name: string, email: string): MockUser | null {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || !normalizedEmail) {
      return null;
    }

    const existingUser = this.state().users.find((user) => user.email.toLowerCase() === normalizedEmail);
    if (existingUser) {
      return existingUser;
    }

    const contact: MockUser = {
      id: this.createId('user'),
      name: trimmedName,
      email: normalizedEmail,
      password: 'dabubble123',
      avatarClass: 'avatar-4',
      isOnline: false,
    };

    this.patchState((state) => ({ ...state, users: [...state.users, contact] }));
    return contact;
  }

  createThreadFromMessage(messageId: string): MockThread | null {
    const originMessage = this.state().messages.find((message) => message.id === messageId && !message.threadId);

    if (!originMessage) {
      return null;
    }

    const existingThread = this.state().threads.find((thread) => thread.originMessageId === messageId);
    if (existingThread) {
      this.selectThread(existingThread.id);
      return existingThread;
    }

    const thread: MockThread = {
      id: this.createId('thread'),
      channelId: originMessage.channelId,
      originMessageId: originMessage.id,
    };

    this.patchState((state) => ({
      ...state,
      selectedThreadId: thread.id,
      threads: [...state.threads, thread],
    }));

    return thread;
  }

  sendChannelMessage(body: string): MockMessage | null {
    const text = body.trim();
    const channel = this.activeChannel();
    const currentUser = this.currentUser();

    if (!text || !channel || !currentUser) {
      return null;
    }

    const message: MockMessage = {
      id: this.createId('message'),
      channelId: channel.id,
      authorId: currentUser.id,
      body: text,
      createdAt: new Date().toISOString(),
      reactions: [],
    };

    this.patchState((state) => ({ ...state, messages: [...state.messages, message] }));
    return message;
  }

  sendThreadReply(body: string): MockMessage | null {
    const text = body.trim();
    const thread = this.activeThread();
    const currentUser = this.currentUser();

    if (!text || !thread || !currentUser) {
      return null;
    }

    const message: MockMessage = {
      id: this.createId('message'),
      channelId: thread.channelId,
      threadId: thread.id,
      authorId: currentUser.id,
      body: text,
      createdAt: new Date().toISOString(),
      reactions: [],
    };

    this.patchState((state) => ({ ...state, messages: [...state.messages, message] }));
    return message;
  }

  resetDatabase(): void {
    const seed = this.cloneState(MOCK_DATABASE_SEED);
    this.state.set(seed);
    this.persistState(seed);
  }

  findUser(userId: string): MockUser | null {
    return this.state().users.find((user) => user.id === userId) ?? null;
  }

  userName(userId: string): string {
    return this.findUser(userId)?.name ?? 'Unbekannt';
  }

  avatarClass(userId: string): string {
    return this.findUser(userId)?.avatarClass ?? 'avatar-4';
  }

  isCurrentUser(userId: string): boolean {
    return userId === this.state().currentUserId;
  }

  formatTime(date: string): string {
    const value = new Date(date);
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes} Uhr`;
  }

  private patchState(updater: (state: MockDatabaseState) => MockDatabaseState): void {
    const nextState = updater(this.state());
    this.state.set(nextState);
    this.persistState(nextState);
  }

  private loadState(): MockDatabaseState {
    const storage = this.getStorage();
    if (!storage) {
      return this.cloneState(MOCK_DATABASE_SEED);
    }

    const storedState = storage.getItem(STORAGE_KEY);
    if (!storedState) {
      const seed = this.cloneState(MOCK_DATABASE_SEED);
      this.persistState(seed);
      return seed;
    }

    try {
      return JSON.parse(storedState) as MockDatabaseState;
    } catch {
      const seed = this.cloneState(MOCK_DATABASE_SEED);
      this.persistState(seed);
      return seed;
    }
  }

  private persistState(state: MockDatabaseState): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  private cloneState(state: MockDatabaseState): MockDatabaseState {
    return JSON.parse(JSON.stringify(state)) as MockDatabaseState;
  }

  private createId(prefix: string): string {
    const fallbackId = Math.random().toString(36).slice(2);
    const randomId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : fallbackId;

    return `${prefix}-${randomId}`;
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage;
  }
}
