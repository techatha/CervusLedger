import { ListGoldItems } from 'wailsjs/go/handlers/GoldItemHandler.js'

export async function getGoldMainTypes() {
  try {
    const items = await ListGoldItems('')
    if (!items || items.length === 0) {
      return []
    }
    // Extract unique types from DB
    const dbTypes = items.map(i => i.type).filter(Boolean)
    return [...Array.from(dbTypes)]
  } catch (e) {
    console.error("Failed to load gold main types", e)
    return []
  }
}

export async function getGoldSubtypes(mainType = '') {
  try {
    const items = await ListGoldItems('')
    if (!items || items.length === 0) {
      return []
    }
    
    // Filter by type if provided, otherwise get from all
    const filtered = mainType 
      ? items.filter(i => i.type === mainType) 
      : items
      
    // Extract unique subtypes
    const dbSubtypes = filtered.map(i => i.subtype).filter(Boolean)
    return Array.from(dbSubtypes)
  } catch (e) {
    console.error("Failed to load gold subtypes", e)
    return []
  }
}
