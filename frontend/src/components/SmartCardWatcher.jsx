import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ReadSmartCard } from '../../wailsjs/go/handlers/SmartCardHandler'
import { GetCustomers } from '../../wailsjs/go/handlers/CustomerHandler'

export default function SmartCardWatcher({ onOpenRegisterModal }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [lastCardId, setLastCardId] = useState(null)

  useEffect(() => {
    const checkCard = async () => {
      const isCustomerFormOpen = document.querySelector('.cf-modal') !== null
      const isNewPawnFormOpen = document.querySelector('.npf-modal') !== null
      
      // Bypassed if any modal other than CustomerForm or NewPawnForm is active
      const isOtherModalOpen = document.querySelector('.modal-backdrop:not(.npf-modal):not(.cf-modal), .modal:not(.npf-modal):not(.cf-modal)') !== null

      if (isOtherModalOpen) {
        console.log('[SmartCardWatcher] Check bypassed: Another modal backdrop is active.')
        return
      }

      try {
        const card = await ReadSmartCard()
        // If it succeeds, the reader is connected
        window.dispatchEvent(new CustomEvent('smartcard-reader-status', { detail: { connected: true } }))

        if (card && card.id_card) {
          const cleanId = card.id_card.trim()
          if (cleanId === lastCardId) {
            // Already handled this card on insertion, ignore until removed
            return
          }

          console.log(`[SmartCardWatcher] New card detected. Setting lastCardId to: "${cleanId}"`)
          setLastCardId(cleanId)

          // If CustomerForm is open, dispatch event to it and do nothing else
          if (isCustomerFormOpen) {
            console.log('[SmartCardWatcher] CustomerForm is open, sending smartcard-insert event.')
            window.dispatchEvent(new CustomEvent('smartcard-insert', { detail: { card } }))
            return
          }

          // Query if customer is already in DB
          console.log(`[SmartCardWatcher] Querying DB for card ID: "${cleanId}"`)
          const customers = await GetCustomers(cleanId)
          const matched = (customers || []).find(c => c.id_card === cleanId)

          if (matched) {
            console.log(`[SmartCardWatcher] Match found! Registered customer ID: ${matched.id}`)
            if (isNewPawnFormOpen) {
              console.log('[SmartCardWatcher] NewPawnForm is open, sending smartcard-pawn-select event.')
              window.dispatchEvent(new CustomEvent('smartcard-pawn-select', { detail: { customer: matched } }))
            } else if (location.pathname !== `/customers/${matched.id}`) {
              console.log(`[SmartCardWatcher] Navigating to customer profile: /customers/${matched.id}`)
              navigate(`/customers/${matched.id}`)
            } else {
              console.log('[SmartCardWatcher] Already on the target customer profile page. No navigation needed.')
            }
          } else {
            console.log('[SmartCardWatcher] No match found. Triggering registration form modal.')
            onOpenRegisterModal(card)
          }
        } else {
          console.log('[SmartCardWatcher] Card was read but has no id_card field:', card)
        }
      } catch (e) {
        const errMsg = String(e)
        // If the error message does not indicate "no reader found", the reader itself is connected.
        const isConnected = !errMsg.includes('ไม่พบเครื่องอ่านบัตร') && !errMsg.includes('ไม่พบเครื่องอ่าน')
        
        window.dispatchEvent(new CustomEvent('smartcard-reader-status', { detail: { connected: isConnected } }))

        // Reset lastCardId to allow re-detecting insertion
        if (lastCardId !== null) {
          console.log('[SmartCardWatcher] Read failed or card removed. Resetting lastCardId to null. Error:', e)
          setLastCardId(null)
        }
      }
    }

    // Check immediately on mount
    checkCard()

    // Poll every 2 seconds
    const interval = setInterval(checkCard, 2000)
    return () => clearInterval(interval)
  }, [lastCardId, location.pathname, navigate, onOpenRegisterModal])

  return null
}
