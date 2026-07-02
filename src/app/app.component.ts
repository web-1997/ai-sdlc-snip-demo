import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { SnipService, Link } from './snip.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule, DatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private snip = inject(SnipService);

  inputUrl = '';
  submitting = signal(false);
  newLink = signal<Link | null>(null);
  formError = signal('');
  links = signal<Link[]>([]);

  ngOnInit(): void {
    this.loadLinks();
  }

  private loadLinks(): void {
    this.snip.list().subscribe({ next: list => this.links.set(list) });
  }

  submit(): void {
    const url = this.inputUrl.trim();
    if (!/^https?:\/\/.+/i.test(url)) {
      this.formError.set('Please enter a valid http or https URL.');
      return;
    }
    this.formError.set('');
    this.newLink.set(null);
    this.submitting.set(true);
    this.snip.create(url).subscribe({
      next: link => {
        this.newLink.set(link);
        this.inputUrl = '';
        this.submitting.set(false);
        this.loadLinks();
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(err.error?.error ?? 'Network error – is the backend running?');
        this.submitting.set(false);
      },
    });
  }
}
