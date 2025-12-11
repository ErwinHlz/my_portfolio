import {
  Directive,
  ElementRef,
  HostListener,
  Renderer2,
  OnDestroy,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';

@Directive({
  selector: '[appPanDrag]',
})
export class PanDragDirective implements OnDestroy {
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private lastY = 0;
  private dragging = false;
  private lastPointerTime = 0;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private velocityX = 0;
  private velocityY = 0;
  private rafId = 0;
  private momentumRaf = 0;
  private readonly hoverFactor = 0.12; // wie stark der Hover schieben soll
  private lastHoverX = 0;
  private lastHoverY = 0;

  private readonly hoverSmoothing = 0.2;
  private hoverVX = 0;
  private hoverVY = 0;

  @Output() panDelta = new EventEmitter<{ dx: number; dy: number }>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  constructor() {
    this.renderer.setStyle(this.element.nativeElement, 'position', 'relative');
    this.renderer.setStyle(this.element.nativeElement, 'cursor', 'grab');
  }

  private startMomentum() {
    if (Math.abs(this.velocityX) < 20 && Math.abs(this.velocityY) < 20) {
      this.velocityX = 0;
      this.velocityY = 0;
      return;
    }

    const friction = 0.94;
    let last = performance.now();

    const step = () => {
      const now = performance.now();
      const dt = (now - last) / 1000; // seconds
      last = now;

      // compute deltas based on velocity
      const dx = this.velocityX * dt;
      const dy = this.velocityY * dt;

      // apply them
      this.lastX += dx;
      this.lastY += dy;

      // → emit delta so das Grid sich weiterbewegt!
      this.panDelta.emit({ dx, dy });

      // friction / damping
      this.velocityX *= Math.pow(friction, dt * 60);
      this.velocityY *= Math.pow(friction, dt * 60);

      // stop condition
      if (Math.abs(this.velocityX) < 5 && Math.abs(this.velocityY) < 5) {
        this.momentumRaf = 0;
        return;
      }

      this.momentumRaf = requestAnimationFrame(step);
    };

    if (this.momentumRaf) cancelAnimationFrame(this.momentumRaf);
    this.momentumRaf = requestAnimationFrame(step);
  }

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.momentumRaf) cancelAnimationFrame(this.momentumRaf);
  }

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent) {
    this.dragging = true;
    this.startX = event.clientX - this.lastX;
    this.startY = event.clientY - this.lastY;
    this.lastPointerTime = performance.now();
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    try {
      (this.element.nativeElement as Element).setPointerCapture(
        event.pointerId,
      );
    } catch (e) {}
    this.renderer.setStyle(this.element.nativeElement, 'cursor', 'grabbing');
  }

  @HostListener('document:pointermove', ['$event'])
  onPointerMove(event: PointerEvent) {
    if (!this.dragging) {
      if (!this.lastHoverX && !this.lastHoverY) {
        this.lastHoverX = event.clientX;
        this.lastHoverY = event.clientY;
      }
      const rawDx = (event.clientX - this.lastHoverX) * this.hoverFactor;
      const rawDy = (event.clientY - this.lastHoverY) * this.hoverFactor;
      this.lastHoverX = event.clientX;
      this.lastHoverY = event.clientY;
      this.hoverVX =
        this.hoverVX * (1 - this.hoverSmoothing) + rawDx * this.hoverSmoothing;
      this.hoverVY =
        this.hoverVY * (1 - this.hoverSmoothing) + rawDy * this.hoverSmoothing;
      this.panDelta.emit({ dx: this.hoverVX, dy: this.hoverVY });
      return;
    }
    event.preventDefault();

    const now = performance.now();
    const dt = Math.max(1, now - this.lastPointerTime) / 1000;
    this.lastPointerTime = now;
    const dx = event.clientX - this.lastPointerX;
    const dy = event.clientY - this.lastPointerY;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    this.lastHoverX = event.clientX;
    this.lastHoverY = event.clientY;
    const vx = dx / dt;
    const vy = dy / dt;
    const smoothing = 0.8;
    this.velocityX = this.velocityX * smoothing + vx * (1 - smoothing);
    this.velocityY = this.velocityY * smoothing + vy * (1 - smoothing);
    this.lastX = event.clientX - this.startX;
    this.lastY = event.clientY - this.startY;

    this.panDelta.emit({ dx, dy });
  }

  @HostListener('document:pointerup', ['$event'])
  @HostListener('document:pointercancel', ['$event'])
  onPointerUp(event?: PointerEvent) {
    this.dragging = false;
    try {
      (this.element.nativeElement as Element).releasePointerCapture(
        event?.pointerId || 0,
      );
    } catch (e) {}
    this.renderer.setStyle(this.element.nativeElement, 'cursor', 'grab');
    // start simple momentum
    this.startMomentum();
  }
}
