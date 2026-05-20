export function formatDate(dateStr) {
  if (!dateStr) return ''
  const cleanDate = dateStr.slice(0, 10)
  const parts = cleanDate.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}