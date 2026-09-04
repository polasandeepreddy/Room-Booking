/**
 * Utility functions for Date (DD/MM/YYYY) and Time (12-hour AM/PM) formatting
 * and consistent Asia/Kolkata (IST) timestamp conversion.
 */

export const TIMEZONE = 'Asia/Kolkata';

export interface TimeOption {
  value: string; // "00:00", "00:30", ..., "23:30"
  label: string; // "12:00 AM (Midnight)", "03:00 AM", etc.
}

/**
 * Generates comprehensive 30-minute interval options (48 slots per 24 hours).
 */
export function getTimeOptions(): TimeOption[] {
  const options: TimeOption[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const val = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const ampm = h >= 12 ? 'PM' : 'AM';
      let h12 = h % 12;
      if (h12 === 0) h12 = 12;
      const hStr = h12.toString().padStart(2, '0');
      const mStr = m.toString().padStart(2, '0');
      
      let label = `${hStr}:${mStr} ${ampm}`;
      if (h === 0 && m === 0) label += ' (Midnight)';
      else if (h === 12 && m === 0) label += ' (Noon)';
      else if (h === 14 && m === 0) label += ' (Check-in)';
      else if (h === 11 && m === 0) label += ' (Check-out)';

      options.push({ value: val, label });
    }
  }
  return options;
}

/**
 * Normalizes a time input (which might be '14:00', '14:00:00', '04:00 PM', '4:00 PM', '12:00 AM', '04:30 PM') into standard 24-hour 'HH:mm' format.
 */
export function normalizeTime24H(timeStr?: string | null): string {
  if (!timeStr) return '12:00';
  const trimmed = timeStr.trim();

  // Check if it already has AM/PM
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const minute = ampmMatch[2];
    const modifier = ampmMatch[3]?.toUpperCase();

    if (modifier === 'PM' && hour < 12) hour += 12;
    if (modifier === 'AM' && hour === 12) hour = 0;

    return `${hour.toString().padStart(2, '0')}:${minute}`;
  }

  // Fallback 24-hour match
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    const hour = parseInt(match24[1], 10);
    const minute = match24[2];
    if (!isNaN(hour) && hour >= 0 && hour <= 23) {
      return `${hour.toString().padStart(2, '0')}:${minute}`;
    }
  }

  // Fallback split
  const parts = trimmed.split(':');
  if (parts.length >= 2) {
    const hour = parseInt(parts[0], 10);
    const minute = parts[1].replace(/[^0-9]/g, '').padStart(2, '0').slice(0, 2);
    if (!isNaN(hour) && hour >= 0 && hour <= 23) {
      return `${hour.toString().padStart(2, '0')}:${minute}`;
    }
  }

  return '12:00';
}

/**
 * Normalizes a date input (YYYY-MM-DD or DD/MM/YYYY or D/M/YYYY or ISO string) to standard 'YYYY-MM-DD'.
 */
export function normalizeDateYYYYMMDD(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  if (dateInput instanceof Date) {
    const y = dateInput.getFullYear();
    const m = (dateInput.getMonth() + 1).toString().padStart(2, '0');
    const d = dateInput.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const cleanStr = String(dateInput).trim();
  // Handle DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY
  const matchDMY = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (matchDMY) {
    const d = matchDMY[1].padStart(2, '0');
    const m = matchDMY[2].padStart(2, '0');
    const y = matchDMY[3];
    return `${y}-${m}-${d}`;
  }

  // Handle YYYY-MM-DD or ISO
  const isoPart = cleanStr.split('T')[0].trim();
  const parts = isoPart.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }

  return cleanStr;
}

/**
 * Converts date & time strings into a standard MySQL DATETIME string: 'YYYY-MM-DD HH:mm:00'
 */
export function toMySQLDateTime(dateStr: string, timeStr: string): string {
  const normDate = normalizeDateYYYYMMDD(dateStr);
  const normTime = normalizeTime24H(timeStr);
  return `${normDate} ${normTime}:00`;
}

/**
 * Converts date & time strings into a standard ISO 8601 string: 'YYYY-MM-DDTHH:mm:00'
 */
export function toISOString(dateStr: string, timeStr: string): string {
  const normDate = normalizeDateYYYYMMDD(dateStr);
  const normTime = normalizeTime24H(timeStr);
  return `${normDate}T${normTime}:00`;
}

/**
 * Parses date & time into a native JavaScript Date object representing the timestamp.
 */
export function parseDateTimeToDate(dateStr: string, timeStr: string): Date {
  const iso = toISOString(dateStr, timeStr);
  return new Date(iso);
}

/**
 * Formats a date string (YYYY-MM-DD, ISO, or Date object) into DD/MM/YYYY format.
 * Example: '2026-09-05' -> '05/09/2026'
 */
export function formatDateDDMMYYYY(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  if (dateInput instanceof Date) {
    const d = dateInput.getDate().toString().padStart(2, '0');
    const m = (dateInput.getMonth() + 1).toString().padStart(2, '0');
    const y = dateInput.getFullYear();
    return `${d}/${m}/${y}`;
  }

  const cleanStr = String(dateInput).split('T')[0].split(' ')[0].trim();
  // Already in DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleanStr)) {
    return cleanStr;
  }

  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year.length === 4) {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }
  return String(dateInput);
}

/**
 * Formats a 24-hour or raw time string into standard 12-hour AM/PM format.
 * Example: '14:00' -> '02:00 PM', '04:00' -> '04:00 AM', '16:30' -> '04:30 PM', '03:00' -> '03:00 AM'
 */
export function formatTime12H(timeStr?: string | null): string {
  if (!timeStr) return '';
  const trimmed = String(timeStr).trim();

  // If already contains AM/PM, reformat neatly
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampmMatch) {
    const h = parseInt(ampmMatch[1], 10).toString().padStart(2, '0');
    const m = ampmMatch[2];
    const modifier = ampmMatch[3].toUpperCase();
    return `${h}:${m} ${modifier}`;
  }

  const norm = normalizeTime24H(trimmed);
  const parts = norm.split(':');
  if (parts.length >= 2) {
    let hour = parseInt(parts[0], 10);
    const minute = parts[1];
    if (!isNaN(hour)) {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      let hour12 = hour % 12;
      if (hour12 === 0) hour12 = 12;
      return `${hour12.toString().padStart(2, '0')}:${minute} ${ampm}`;
    }
  }
  return trimmed;
}

/**
 * Formats combined date and time for display.
 * Example: '2026-09-05', '14:00' -> '05/09/2026 at 02:00 PM'
 */
export function formatDateTimeDisplay(dateStr?: string | null, timeStr?: string | null): string {
  const d = formatDateDDMMYYYY(dateStr);
  const t = formatTime12H(timeStr);
  if (d && t) return `${d} at ${t}`;
  return d || t || '';
}

