import { ReadSmartCard } from 'wailsjs/go/handlers/SmartCardHandler'

/**
 * Event constants for Smart Card operations
 */
export const SMARTCARD_EVENTS = {
  READER_STATUS: 'smartcard-reader-status',
  INSERT:        'smartcard-insert',
  PAWN_SELECT:   'smartcard-pawn-select',
  SALE_SELECT:   'smartcard-sale-select',
}

/**
 * Helper dispatchers for Smart Card custom events
 */
export function dispatchReaderStatus(connected) {
  window.dispatchEvent(new CustomEvent(SMARTCARD_EVENTS.READER_STATUS, { detail: { connected } }))
}

export function dispatchCardInsert(card) {
  window.dispatchEvent(new CustomEvent(SMARTCARD_EVENTS.INSERT, { detail: { card } }))
}

export function dispatchPawnSelect(customer) {
  window.dispatchEvent(new CustomEvent(SMARTCARD_EVENTS.PAWN_SELECT, { detail: { customer } }))
}

export function dispatchSaleSelect(customer) {
  window.dispatchEvent(new CustomEvent(SMARTCARD_EVENTS.SALE_SELECT, { detail: { customer } }))
}

/**
 * Maps the raw fields from Thai National ID card read by the device
 * to the form structure used by our Customer components.
 * Falls back to existing fields if card fields are empty or undefined.
 */
export function mapCardToCustomer(card, prev = {}) {
  if (!card) return prev;
  return {
    ...prev,
    prefix:       card.prefix       || prev.prefix       || 'นาย',
    firstname:    card.firstname     || prev.firstname    || '',
    lastname:     card.lastname      || prev.lastname     || '',
    id_card:      card.id_card       || prev.id_card      || '',
    address_no:   card.address_no    || prev.address_no   || '',
    address_line: card.address_line  || prev.address_line || '',
    moo:          card.moo           || prev.moo          || '',
    road:         card.road          || prev.road         || '',
    tambon:       card.tambon        || prev.tambon       || '',
    amphoe:       card.amphoe        || prev.amphoe       || '',
    province:     card.province      || prev.province     || 'เชียงใหม่',
  };
}

/**
 * Reads from the smart card handler and maps the result.
 */
export async function readSmartCardAndMap(prev = {}) {
  const card = await ReadSmartCard();
  return mapCardToCustomer(card, prev);
}
