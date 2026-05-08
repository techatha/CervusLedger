/**
 * Convert CE date string to Buddhist Era display (dd/mm/พ.ศ.)
 * @param {string|null} dateStr - ISO or YYYY-MM-DD
 */
export function toBE(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d)) return '—'
  const day   = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year  = d.getFullYear() + 543
  return `${day}/${month}/${year}`
}

/**
 * Full Thai status label + badge class for pawn status
 */
export function pawnStatusBadge(status) {
  switch (status) {
    case 'active': return { label: 'ยังอยู่',  cls: 'badge-green' }
    case 'ถอน':    return { label: 'ถอนแล้ว', cls: 'badge-blue'  }
    case 'ขาด':    return { label: 'ขาด',     cls: 'badge-red'   }
    default:       return { label: status,    cls: 'badge-muted' }
  }
}

/**
 * Format number as Thai Baht (no decimals for integers, 2dp otherwise)
 */
export function formatBaht(n) {
  if (n == null || n === '') return '—'
  const num = parseFloat(n)
  if (isNaN(num)) return '—'
  return num.toLocaleString('th-TH', {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  }) + ' ฿'
}

/**
 * Ticket number formatted with zero-padding to 4 digits
 */
export function formatTicket(n) {
  if (!n) return '—'
  return String(n).padStart(4, '0')
}

/**
 * Build full name from customer object
 */
export function fullName(c) {
  if (!c) return '—'
  return [c.prefix, c.firstname, c.lastname].filter(Boolean).join(' ')
}

/**
 * Thai prefixes
 */
export const PREFIXES = ['นาย', 'นาง', 'นางสาว', 'เด็กชาย', 'เด็กหญิง', 'พระ', 'อื่นๆ']

/**
 * Thai provinces (sorted)
 */
export const PROVINCES = [
  'กระบี่','กรุงเทพมหานคร','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร',
  'ขอนแก่น','จันทบุรี','ฉะเชิงเทรา','ชลบุรี','ชัยนาท','ชัยภูมิ',
  'ชุมพร','เชียงราย','เชียงใหม่','ตรัง','ตราด','ตาก','นครนายก',
  'นครปฐม','นครพนม','นครราชสีมา','นครศรีธรรมราช','นครสวรรค์',
  'นนทบุรี','นราธิวาส','น่าน','บึงกาฬ','บุรีรัมย์','ปทุมธานี',
  'ประจวบคีรีขันธ์','ปราจีนบุรี','ปัตตานี','พระนครศรีอยุธยา',
  'พะเยา','พังงา','พัทลุง','พิจิตร','พิษณุโลก','เพชรบุรี',
  'เพชรบูรณ์','แพร่','ภูเก็ต','มหาสารคาม','มุกดาหาร','แม่ฮ่องสอน',
  'ยโสธร','ยะลา','ร้อยเอ็ด','ระนอง','ระยอง','ราชบุรี','ลพบุรี',
  'ลำปาง','ลำพูน','เลย','ศรีสะเกษ','สกลนคร','สงขลา','สตูล',
  'สมุทรปราการ','สมุทรสงคราม','สมุทรสาคร','สระแก้ว','สระบุรี',
  'สิงห์บุรี','สุโขทัย','สุพรรณบุรี','สุราษฎร์ธานี','สุรินทร์',
  'หนองคาย','หนองบัวลำภู','อ่างทอง','อำนาจเจริญ','อุดรธานี',
  'อุตรดิตถ์','อุทัยธานี','อุบลราชธานี',
]
