import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-signup',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly registerForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
    acceptTerms: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  protected readonly showPassword = signal(false);
  protected readonly showToast = signal(false);
  protected readonly toastMessage = signal('');

  constructor() {
    this.registerForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.showToast()) {
        this.showToast.set(false);
      }
    });
  }

  protected goBack(): void {
    this.router.navigate(['/login']);
  }

  protected togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  protected toggleTerms(): void {
    const current = this.registerForm.controls.acceptTerms.value;
    this.registerForm.controls.acceptTerms.setValue(!current);
    this.registerForm.controls.acceptTerms.markAsDirty();
    this.registerForm.controls.acceptTerms.markAsTouched();
  }

  protected openPrivacyPolicy(event: MouseEvent): void {
    event.preventDefault();
    this.toastMessage.set('Datenschutzerklärung ist noch nicht verknüpft.');
    this.showToast.set(true);
  }

  protected isFieldInvalid(field: keyof typeof this.registerForm.controls): boolean {
    const control = this.registerForm.controls[field];
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected onSubmit(): void {
    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid) {
      this.toastMessage.set('Bitte alle Felder korrekt ausfüllen.');
      this.showToast.set(true);
      return;
    }

    this.toastMessage.set('Registrierung wurde ausgelöst.');
    this.showToast.set(true);
  }
}
