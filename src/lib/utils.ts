import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to parse dates from dd-MM-yyyy format
export function parseDateFromDDMMYYYY(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  // If it's already in dd-MM-yyyy format
  if (dateStr.includes('-') && dateStr.split('-').length === 3) {
    const parts = dateStr.split('-');
    // Check if it's dd-MM-yyyy format
    if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      const [day, month, year] = parts.map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed
    }
    // Check if it's yyyy-MM-dd format
    if (parts[0].length === 4 && parts[1].length === 2 && parts[2].length === 2) {
      return new Date(dateStr);
    }
  }
  
  // If it's a valid ISO string or other format, try to parse it
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  // Fallback to current date
  return new Date();
}

// Utility function to format date to dd-MM-yyyy
export function formatDateToDDMMYYYY(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}
