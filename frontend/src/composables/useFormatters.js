// Currency formatter for lender-facing values where cents do not add much
// decision value.
function currency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

// Compact currency keeps high-level summaries readable in cards and badges.
function currencyCompact(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value ?? 0));
}

// Generic percentage formatter for scoring weights and reserve calculations.
function percent(value) {
  return `${(Number(value ?? 0) * 100).toFixed(1)}%`;
}

// Rate formatter is kept separate so loan rates always render to two decimals.
function ratePercent(value) {
  return `${(Number(value ?? 0) * 100).toFixed(2)}%`;
}

// Dates are normalized to a lender-friendly short US format.
function formatDate(value) {
  if (!value) {
    return '--';
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

// Loan term copy is centralized so the UI never falls back to shorthand like
// "8y" in one place and "8 years" in another.
function yearsLabel(value) {
  return `${Number(value ?? 0)} ${Number(value ?? 0) === 1 ? 'year' : 'years'}`;
}

// Config dropdowns store machine values but the UI consistently renders labels.
function lookupLabel(options, value) {
  return (
    options.find((option) => option.value === value)?.label ?? value ?? '--'
  );
}

// Shared title-casing helper used by labels and action text.
function toDisplayText(value) {
  return String(value ?? '')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Converts config keys like `governmentProtection` or `real_estate` into
// readable labels for policy cards and worksheet rows.
function formatLabel(value) {
  return toDisplayText(
    String(value ?? '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' '),
  );
}

// Action labels can include amounts, so this helper upgrades raw engine output
// like `writedown 300000` into a readable currency string.
function formatActionLabel(action) {
  const rawAction = String(action ?? '').trim();
  if (rawAction.toLowerCase() === 'buyout at cmv') {
    return 'Buyout At CMV';
  }
  const amountMatch = rawAction.match(
    /^(writedown|support|conservation cancellation)\s+(-?\d+(?:\.\d+)?)$/i,
  );
  if (amountMatch) {
    return `${toDisplayText(amountMatch[1])} ${currency(Number(amountMatch[2]))}`;
  }
  return toDisplayText(rawAction);
}

// Recommendation cards often show multiple actions, so join them consistently.
function formatActions(actions) {
  return (actions ?? []).map((action) => formatActionLabel(action)).join(', ');
}

export function useFormatters() {
  return {
    currency,
    currencyCompact,
    percent,
    ratePercent,
    formatDate,
    yearsLabel,
    lookupLabel,
    toDisplayText,
    formatLabel,
    formatActionLabel,
    formatActions,
  };
}
