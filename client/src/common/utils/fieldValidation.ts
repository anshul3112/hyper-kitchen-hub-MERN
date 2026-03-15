const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function normalizePhoneInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

export function isValidPhone(value: string): boolean {
  return /^\d{10}$/.test(value);
}

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export function isValidPassword(value: string): boolean {
  return PASSWORD_REGEX.test(value);
}
