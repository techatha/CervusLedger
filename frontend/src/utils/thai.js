/**
 * Convert CE date string to Buddhist Era display (dd/mm/พ.ศ.)
 * @param {string|null} dateStr - ISO or YYYY-MM-DD
 */
export function toBE(dateStr) {
  if (!dateStr) return '—'
  const part = dateStr.length > 10 ? dateStr.slice(0, 10) : dateStr
  const d = new Date(part)
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

export { formatBaht, formatTicket } from './number'

export function formatCustomerAddress(c) {
  if (!c) return '—';
  const parts = [];
  
  if (c.address_no) parts.push(`บ้านเลขที่ ${c.address_no}`);
  if (c.address_line) parts.push(c.address_line);
  if (c.moo) parts.push(`หมู่ ${c.moo}`);
  if (c.road) parts.push(`ถ. ${c.road}`);

  const isBkk = c.province && (
    c.province.includes('กรุงเทพมหานคร') || 
    c.province.includes('กรุงเทพฯ') || 
    c.province.includes('กทม')
  );

  if (c.tambon) {
    if (isBkk) {
      const tb = c.tambon.startsWith('แขวง') ? c.tambon : `แขวง${c.tambon}`;
      parts.push(tb);
    } else {
      const tb = c.tambon.startsWith('ต.') || c.tambon.startsWith('ตำบล') ? c.tambon : `ต. ${c.tambon}`;
      parts.push(tb);
    }
  }

  if (c.amphoe) {
    if (isBkk) {
      const am = c.amphoe.startsWith('เขต') ? c.amphoe : `เขต${c.amphoe}`;
      parts.push(am);
    } else {
      const am = c.amphoe.startsWith('อ.') || c.amphoe.startsWith('อำเภอ') ? c.amphoe : `อ. ${c.amphoe}`;
      parts.push(am);
    }
  }

  if (c.province) {
    if (isBkk) {
      parts.push(c.province); // No "จ." prefix for Bangkok
    } else {
      const pr = c.province.startsWith('จ.') || c.province.startsWith('จังหวัด') ? c.province : `จ. ${c.province}`;
      parts.push(pr);
    }
  }
  
  return parts.filter(Boolean).join(' ') || '—';
}

/**
 * ฟังก์ชันแปลงรูปแบบวันที่เป็นภาษาไทยเต็มรูปแบบ (วันที่ xx เดือน xx พ.ศ. xxx)
 */
export function formatFullThaiDate(dateStr) {
  if (!dateStr) return '—';
  const part = dateStr.length > 10 ? dateStr.slice(0, 10) : dateStr;
  const d = new Date(part);
  if (isNaN(d.getTime())) return dateStr;
  
  const day = d.getDate();
  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear() + 543;
  
  return `วันที่ ${day} ${month} พ.ศ. ${year}`;
}

/**
 * ฟังก์ชันแปลงรูปแบบวันที่เป็นภาษาไทยเต็มรูปแบบ (วันที่ xx เดือน xx พ.ศ. xxx)
 */
export function formatShortThaiDate(dateStr) {
  if (!dateStr) return '—';
  const part = dateStr.length > 10 ? dateStr.slice(0, 10) : dateStr;
  const d = new Date(part);
  if (isNaN(d.getTime())) return dateStr;
  
  const day = d.getDate();
  const monthNames = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear() + 543;
  
  return `${day} ${month} ${year.toString().slice(2)}`;
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

/**
 * แปลงจำนวนเงินเป็นตัวหนังสือภาษาไทย (Thai Baht Text)
 */
export function thaiBahtText(num) {
  if (num == null || num === '') return '—';
  let number = parseFloat(num);
  if (isNaN(number)) return '—';
  
  if (number === 0) return 'ศูนย์บาทถ้วน';

  // ปัดเศษให้เหลือ 2 ตำแหน่งตามทศนิยมของสตางค์
  number = Math.round(number * 100) / 100;
  
  const baht = Math.floor(number);
  const satang = Math.round((number - baht) * 100);

  let text = '';

  if (baht > 0) {
    text += convertToThaiText(baht) + 'บาท';
  }

  if (satang > 0) {
    text += convertToThaiText(satang) + 'สตางค์';
  } else if (baht > 0) {
    text += 'ถ้วน';
  }

  return text;
}

function convertToThaiText(number) {
  const numberText = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const unitText = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  let str = Math.floor(number).toString();
  let len = str.length;

  if (len > 6) {
    const millionStr = str.substring(0, len - 6);
    const unitsStr = str.substring(len - 6);
    
    const millionVal = parseInt(millionStr, 10);
    const unitsVal = parseInt(unitsStr, 10);
    
    let text = convertToThaiText(millionVal) + 'ล้าน';
    if (unitsVal > 0) {
      if (unitsVal === 1) {
        text += 'เอ็ด';
      } else {
        text += convertToThaiText(unitsVal);
      }
    }
    return text;
  }

  let text = '';
  for (let i = 0; i < len; i++) {
    const digit = parseInt(str.charAt(i), 10);
    const position = len - i - 1;

    if (digit !== 0) {
      if (position === 1 && digit === 1) {
        text += 'สิบ';
      } else if (position === 1 && digit === 2) {
        text += 'ยี่สิบ';
      } else if (position === 0 && digit === 1 && len > 1) {
        text += 'เอ็ด';
      } else {
        text += numberText[digit] + unitText[position];
      }
    }
  }
  return text;
}
