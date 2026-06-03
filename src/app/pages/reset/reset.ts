import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MockDatabaseService } from '../../core/database/mock-database.service';

@Component({
  selector: 'app-reset',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset.html',
  styleUrl: './reset.scss',
})
export class Reset {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly database = inject(MockDatabaseService);
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly pendingResetEmailStorageKey = 'dabubble.pending-password-reset-email';

  protected readonly resetForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  protected readonly passwordForm = new FormGroup({
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly showToast = signal(false);
  protected readonly toastMessage = signal('');
  protected readonly showSuccessOverlay = signal(false);
  protected readonly isPasswordStep = signal(false);
  protected readonly pendingResetEmail = signal('');

  constructor() {
    this.resetForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.showToast()) {
        this.showToast.set(false);
      }
    });

    this.passwordForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.showToast()) {
        this.showToast.set(false);
      }
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const passwordStep = params.get('step') === 'password';
      this.isPasswordStep.set(passwordStep);
      this.pendingResetEmail.set(passwordStep ? this.readPendingResetEmail() : '');
      this.showToast.set(false);

      if (!passwordStep) {
        this.passwordForm.reset({ newPassword: '', confirmPassword: '' }, { emitEvent: false });
      }
    });

    this.destroyRef.onDestroy(() => {
      this.clearFeedbackTimer();
    });
  }

  protected goBack(): void {
    if (this.isPasswordStep()) {
      this.router.navigate(['/reset']);
      return;
    }

    this.router.navigate(['/login']);
  }

  protected canSendEmail(): boolean {
    return this.resetForm.controls.email.value.trim().length > 0;
  }

  protected isFieldInvalid(field: keyof typeof this.resetForm.controls): boolean {
    const control = this.resetForm.controls[field];
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected passwordMismatch(): boolean {
    if (!this.isPasswordStep()) {
      return false;
    }

    const newPassword = this.passwordForm.controls.newPassword.value;
    const confirmPassword = this.passwordForm.controls.confirmPassword.value;
    const confirmTouched =
      this.passwordForm.controls.newPassword.dirty ||
      this.passwordForm.controls.newPassword.touched ||
      this.passwordForm.controls.confirmPassword.dirty ||
      this.passwordForm.controls.confirmPassword.touched;

    return confirmTouched && newPassword.length > 0 && confirmPassword.length > 0 && newPassword !== confirmPassword;
  }

  protected canChangePassword(): boolean {
    if (!this.isPasswordStep()) {
      return false;
    }

    const newPassword = this.passwordForm.controls.newPassword.value;
    const confirmPassword = this.passwordForm.controls.confirmPassword.value;

    return !!this.pendingResetEmail() && this.passwordForm.valid && newPassword.length > 0 && newPassword === confirmPassword;
  }

  protected onSubmit(): void {
    if (this.isPasswordStep()) {
      this.onPasswordSubmit();
      return;
    }

    this.clearFeedbackTimer();
    this.showSuccessOverlay.set(false);
    this.resetForm.markAllAsTouched();

    if (this.resetForm.invalid) {
      this.toastMessage.set('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      this.showToast.set(true);
      return;
    }

    const { email } = this.resetForm.getRawValue();
    const result = this.database.requestPasswordReset(email);

    if (!result.ok) {
      this.toastMessage.set(result.message);
      this.showToast.set(true);
      return;
    }

    this.storePendingResetEmail(email);
    this.showToast.set(false);
    this.showSuccessOverlay.set(true);
    this.feedbackTimer = setTimeout(() => {
      this.showSuccessOverlay.set(false);
      this.router.navigate(['/reset'], { queryParams: { step: 'password' } });
    }, 1600);
  }

  private onPasswordSubmit(): void {
    this.clearFeedbackTimer();
    this.resetForm.markAllAsTouched();
    this.passwordForm.markAllAsTouched();

    const pendingEmail = this.pendingResetEmail() || this.readPendingResetEmail();
    this.pendingResetEmail.set(pendingEmail);

    if (!pendingEmail) {
      this.toastMessage.set('Bitte zuerst eine E-Mail anfordern.');
      this.showToast.set(true);
      return;
    }

    if (!this.canChangePassword()) {
      return;
    }

    const { newPassword } = this.passwordForm.getRawValue();
    const result = this.database.updatePasswordByEmail(pendingEmail, newPassword);

    if (!result.ok) {
      this.toastMessage.set(result.message);
      this.showToast.set(true);
      return;
    }

    this.clearPendingResetEmail();
    this.router.navigate(['/login']);
  }

  private clearFeedbackTimer(): void {
    if (this.feedbackTimer !== null) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
  }

  private readPendingResetEmail(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    return window.sessionStorage.getItem(this.pendingResetEmailStorageKey) ?? '';
  }

  private storePendingResetEmail(email: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.setItem(this.pendingResetEmailStorageKey, email.trim().toLowerCase());
  }

  private clearPendingResetEmail(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.removeItem(this.pendingResetEmailStorageKey);
  }
}
