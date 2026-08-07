export const MAX_ALLOWANCE = 100000000; // 10 Crore

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  parsedValue: number;
}

export function validateFinancialInput(value: string | number): ValidationResult {
  const strVal = String(value).trim();

  if (!strVal) {
    return { isValid: false, error: 'Amount cannot be empty, bestie! 💸', parsedValue: 0 };
  }

  // Prevent scientific notation like 1e10, 1e+10, etc.
  if (/[eE]/.test(strVal)) {
    return { isValid: false, error: 'Scientific notation is not allowed!', parsedValue: 0 };
  }

  const num = Number(strVal);

  if (isNaN(num)) {
    return { isValid: false, error: 'Invalid financial amount.', parsedValue: 0 };
  }

  if (!isFinite(num)) {
    return { isValid: false, error: 'Value is too extreme/infinite.', parsedValue: 0 };
  }

  if (num < 0) {
    return { isValid: false, error: 'Please enter a positive value.', parsedValue: 0 };
  }

  if (num > MAX_ALLOWANCE) {
    return { isValid: false, error: 'Please enter a realistic monthly allowance (max ₹10 Crore).', parsedValue: num };
  }

  return { isValid: true, parsedValue: num };
}
