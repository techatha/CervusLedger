export function formatDate(dateStr) {
  if (!dateStr) return ''
  const cleanDate = dateStr.slice(0, 10)
  const parts = cleanDate.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}

export function getLocalISOString() {
  const date = new Date();
  
  // 1. Extract local date and time components
  const pad = num => String(Math.floor(Math.abs(num))).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const ms = String(date.getMilliseconds()).padStart(3, '0');

  // 2. Calculate local time zone offset (e.g., +07:00 or -05:00)
  const tzOffset = -date.getTimezoneOffset();
  const sign = tzOffset >= 0 ? '+' : '-';
  const offsetHours = pad(tzOffset / 60);
  const offsetMinutes = pad(tzOffset % 60);

  // 3. Assemble the local ISO string
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}${sign}${offsetHours}:${offsetMinutes}`;
}
