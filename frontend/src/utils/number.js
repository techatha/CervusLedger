// Add this helper function at the top near your parsing functions
export function formatNumberInput(val) {
  if (val === null || val === undefined || val === '') return '';
  const parts = val.toString().replace(/[^0-9.]/g, '').split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (parts.length > 1) {
    return `${parts[0]}.${parts[1].slice(0, 2)}`;
  }
  return parts[0];
}

export function formatCurrency(val) {
  if (!val) return '';
  const num = parseFloat(val.toString().replace(/,/g, ''));
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatBaht(n) {
  if (n == null || n === '') return '—'
  const num = parseFloat(n)
  if (isNaN(num)) return '—'
  return num.toLocaleString('th-TH', {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  }) + ' ฿'
}

export function formatTicket(n) {
  if (!n) return '—'
  return String(n).padStart(4, '0')
}

export function parseWeightToBaht(subtype) {
  if (!subtype) return 0
  const s = subtype.trim().toLowerCase()
  if (s.includes('ครึ่งสลึง')) return 0.125
  if (s.includes('1 สลึง') || s.includes('หนึ่งสลึง')) return 0.25
  if (s.includes('2 สลึง') || s.includes('สองสลึง')) return 0.5
  if (s.includes('3 สลึง') || s.includes('สามสลึง')) return 0.75

  const gramMatch = s.match(/([0-9.]+)\s*(กรัม|g|gram)/i)
  if (gramMatch) {
    return parseFloat(gramMatch[1]) / 15.244
  }

  const bahtMatch = s.match(/([0-9.]+)\s*(บาท|b|baht)/i)
  if (bahtMatch) {
    return parseFloat(bahtMatch[1])
  }

  const raw = parseFloat(s)
  return isNaN(raw) ? 0 : raw
}
