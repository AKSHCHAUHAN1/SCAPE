/**
 * Utility functions barrel export.
 *
 * Add shared utilities here:
 * - formatCurrency
 * - formatDate
 * - classNames / cn helper
 */

import { clsx, type ClassValue } from 'clsx';

/** Utility for conditionally joining class names */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Format a number as USD currency */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/** Format an ISO date string to a human-readable format */
export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}
