import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MockDatabaseService } from '../../core/database/mock-database.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
[x: string]: any;
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly database = inject(MockDatabaseService);
  private loginSuccessTimer: ReturnType<typeof setTimeout> | null = null;
  private introTimers: ReturnType<typeof setTimeout>[] = [];

  protected readonly loginForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly showPassword = signal(false);
  protected readonly showToast = signal(false);
  protected readonly toastMessage = signal('');
  protected readonly showSuccessOverlay = signal(false);
  protected readonly showIntro = signal(true);
  protected readonly introLeaving = signal(false);

  constructor() {
    this.loginForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.showToast()) {
        this.showToast.set(false);
      }
    });

    this.startIntro();

    this.destroyRef.onDestroy(() => {
      this.clearLoginSuccessTimer();
      this.clearIntroTimers();
    });
  }

  protected togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  protected isFieldInvalid(field: keyof typeof this.loginForm.controls): boolean {
    const control = this.loginForm.controls[field];
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected onSubmit(): void {
    this.clearLoginSuccessTimer();
    this.showSuccessOverlay.set(false);
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) {
      this.toastMessage.set('Bitte die Felder korrekt ausfuellen.');
      this.showToast.set(true);
      return;
    }

    const { email, password } = this.loginForm.getRawValue();
    const result = this.database.login(email, password);

    if (!result.ok) {
      this.toastMessage.set(result.message);
      this.showToast.set(true);
      return;
    }

    this.showToast.set(false);
    this.showSuccessOverlay.set(true);
    this.loginSuccessTimer = setTimeout(() => {
      this.showSuccessOverlay.set(false);
      this.router.navigate(['/home']);
    }, 1600);
  }

  protected loginWithGoogle(): void {
    this.toastMessage.set('Google-Login ist noch nicht verbunden.');
    this.showToast.set(true);
  }

  protected loginAsGuest(): void {
    this.database.loginAsGuest();
    this.router.navigate(['/home']);
  }

  private clearLoginSuccessTimer(): void {
    if (this.loginSuccessTimer !== null) {
      clearTimeout(this.loginSuccessTimer);
      this.loginSuccessTimer = null;
    }
  }

  private startIntro(): void {
    this.clearIntroTimers();
    this.showIntro.set(true);
    this.introLeaving.set(false);

    this.introTimers.push(
      setTimeout(() => {
        this.introLeaving.set(true);
      }, 3050),
      setTimeout(() => {
        this.showIntro.set(false);
        this.introLeaving.set(false);
      }, 3450),
    );
  }

  private clearIntroTimers(): void {
    for (const timer of this.introTimers) {
      clearTimeout(timer);
    }

    this.introTimers = [];
  }
}
