import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * 404 Not Found page displayed when the user navigates to an
 * undefined route. Provides a link back to the fleet overview.
 */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {}
