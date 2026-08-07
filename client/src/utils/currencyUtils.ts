export function formatAmountNumber(amount: number, currencySymbol: string = '₹'): string {
  if (amount === null || amount === undefined || isNaN(amount) || !isFinite(amount)) {
    return '0';
  }
  const absAmount = Math.abs(amount);
  const locale = currencySymbol === '₹' ? 'en-IN' : 'en-US';
  return absAmount.toLocaleString(locale, { maximumFractionDigits: 2 });
}

export function formatCurrency(amount: number, currencySymbol: string = '₹', shorten: boolean = true): string {
  if (amount === null || amount === undefined || isNaN(amount) || !isFinite(amount)) {
    return `${currencySymbol}0`;
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  let formatted = '';
  const isRupee = currencySymbol === '₹';

  if (isRupee) {
    // Shorten if amount is extremely large (>= 1 Lakh or 1 Crore) to prevent text overflow
    if (shorten && absAmount >= 10000000) {
      const crValue = absAmount / 10000000;
      formatted = `${crValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}Cr`;
    } else if (shorten && absAmount >= 100000) {
      const lValue = absAmount / 100000;
      formatted = `${lValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}L`;
    } else {
      formatted = absAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    }
  } else {
    // International standard formatting (k, M, B) for USD, EUR, GBP, YEN, etc.
    if (shorten && absAmount >= 1000000000) {
      const bValue = absAmount / 1000000000;
      formatted = `${bValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}B`;
    } else if (shorten && absAmount >= 1000000) {
      const mValue = absAmount / 1000000;
      formatted = `${mValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}M`;
    } else if (shorten && absAmount >= 100000) {
      const kValue = absAmount / 1000;
      formatted = `${kValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}k`;
    } else {
      formatted = absAmount.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
  }

  return `${isNegative ? '-' : ''}${currencySymbol}${formatted}`;
}
