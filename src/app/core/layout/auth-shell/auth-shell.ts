import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  templateUrl: './auth-shell.html',
  styleUrl: './auth-shell.scss',
})
export class AuthShell implements OnInit, OnDestroy {
  private readonly router = inject(Router);

  protected introVisible = false;
  protected introLeaving = false;

  private introTimers: number[] = [];

  ngOnInit(): void {
    if (typeof window === 'undefined') {
      return;
    }

    setTimeout(() => {
      if (!this.shouldPlayIntro()) {
        return;
      }

      this.startIntro();
    }, 0);
  }

  ngOnDestroy(): void {
    this.clearIntroTimers();
  }

  private shouldPlayIntro(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }

    if (window.sessionStorage.getItem('dabubble.auth-intro-seen') === 'true') {
      return false;
    }

    return this.router.url.startsWith('/login');
  }

  private startIntro(): void {
    this.clearIntroTimers();

    this.introVisible = true;
    this.introLeaving = false;

    this.introTimers.push(
      setTimeout(() => {
        this.introLeaving = true;
      }, 1650),
    );

    this.introTimers.push(
      setTimeout(() => {
        this.introVisible = false;
        this.introLeaving = false;
        window.sessionStorage.setItem('dabubble.auth-intro-seen', 'true');
      }, 2050),
    );
  }

  private clearIntroTimers(): void {
    for (const timerId of this.introTimers) {
      clearTimeout(timerId);
    }

    this.introTimers = [];
  }
}
