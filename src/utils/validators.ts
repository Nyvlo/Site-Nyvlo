/**
 * Validates a Brazilian CPF number
 */
export function validateCPF(cpf: string): boolean {
  // Remove non-numeric characters
  const cleaned = cpf.replace(/\D/g, '');
  
  // Must have 11 digits
  if (cleaned.length !== 11) {
    return false;
  }
  
  // Check for known invalid patterns (all same digits)
  if (/^(\d)\1+$/.test(cleaned)) {
    return false;
  }
  
  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  if (remainder !== parseInt(cleaned[9])) {
    return false;
  }
  
  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  if (remainder !== parseInt(cleaned[10])) {
    return false;
  }
  
  return true;
}

/**
 * Validates an email address
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a date in DD/MM/YYYY format
 */
export function validateDate(date: string): boolean {
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = date.match(dateRegex);
  
  if (!match) {
    return false;
  }
  
  const day = parseInt(match[1]);
  const month = parseInt(match[2]);
  const year = parseInt(match[3]);
  
  if (month < 1 || month > 12) {
    return false;
  }
  
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return false;
  }
  
  return true;
}

/**
 * Validates a Brazilian phone number
 */
export function validatePhone(phone: string): boolean {
  // Remove non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Brazilian phone numbers have 10 or 11 digits
  return cleaned.length >= 10 && cleaned.length <= 11;
}

/**
 * Formats a CPF number
 */
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formats a phone number
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
}

/**
 * Generates a unique protocol number
 */
export function generateProtocol(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${year}${month}-${random}`;
}

/**
 * Generates a unique appointment code
 */
export function generateAppointmentCode(): string {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AG-${random}`;
}
