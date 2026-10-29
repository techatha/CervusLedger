import { prefix } from "@fortawesome/free-solid-svg-icons";

// Add this helper function at the top near your parsing functions
export function formatNumberInput(val) {
  if (val === null || val === undefined || val === '') return '';
  const cleaned = val.toString().replace(/[^0-9.]/g, '');
  const [intPart, decPart] = cleaned.split('.');
  const formattedInt = intPart ? Number(intPart).toLocaleString('en-US') : '';
  if (decPart !== undefined) {
    return `${formattedInt}.${decPart.slice(0, 2)}`;
  }
  return formattedInt;
}

export function formatCurrency(val) {
  if (!val) return '';
  const num = Number.parseFloat(val.toString().replace(/,/g, ''));
  if (Number.isNaN(num)) return '';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatBaht(n) {
  if (n == null || n === '') return '—'
  const num = Number.parseFloat(n)
  if (Number.isNaN(num)) return '—'
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

  // --------- sลึง shortcuts ----------
  if (s.includes('ครึ่งสลึง')) return 0.125
  if (s.includes('1 สลึง') || s.includes('หนึ่งสลึง')) return 0.25
  if (s.includes('2 สลึง') || s.includes('สองสลึง')) return 0.5
  if (s.includes('3 สลึง') || s.includes('สามสลึง')) return 0.75

  // --------- extract number & unit ----------
  // Grab a leading numeric token (allows decimal) and the rest as unit
  const [, numStr = '', unit = ''] = s.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Zก-ฮ]*)$/) ?? []
  const num = Number(numStr)

  // Normalize unit (remove trailing punctuation)
  const cleanUnit = unit.replace(/[.,;]$/g, '')

  // --------- unit handling ----------
  if (/(?:กรัม|g(?:ram)?)$/i.test(cleanUnit)) {
    return Number.isNaN(num) ? 0 : num / 15.244
  }

  if (/(?:บาท|b|baht)$/i.test(cleanUnit)) {
    return Number.isNaN(num) ? 0 : num
  }

  // --------- fallback ----------
  const raw = Number.parseFloat(s)
  return Number.isNaN(raw) ? 0 : raw
}

