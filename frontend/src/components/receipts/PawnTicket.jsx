import { useEffect, useRef } from 'react'
import { PrintWindow } from 'wailsjs/go/handlers/SettingsHandler'
import { toBE, formatBaht, formatTicket } from '@/utils/thai'
import './receipt.css'

/**
 * PawnTicket
 * Props:
 *   pawn      — PawnRecord (with current_principal)
 *   customer  — Customer (full object)
 *   shop      — ShopSettings { shop_name, shop_address, shop_phone }
 *   onClose   — fn
 */
export default function PawnTicket({ pawn, customer, shop, onClose }) {
  const printRef = useRef(null)

  const handlePrint = () => {
    if (PrintWindow) {
      PrintWindow().catch((err) => {
        console.error("PrintWindow failed, falling back to window.print:", err)
        window.print()
      })
    } else {
      window.print()
    }
  }

  const principal = pawn.current_principal ?? pawn.initial_principal

  return (
    <>
      {/* ── Screen modal ── */}
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal receipt-preview-modal"
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header">
            <div className="modal-title">ตัวอย่างตั๋วจำนำ</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handlePrint}>
                <IconPrint /> พิมพ์
              </button>
              <button className="modal-close" onClick={onClose}>×</button>
            </div>
          </div>

          <div className="receipt-preview-body">
            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
              2 สำเนา / A4 — ตัดตรงเส้นประ
            </p>

            {/* The element that gets printed */}
            <div className="print-root" ref={printRef}>
              {/* ── Copy 1: Customer ── */}
              <TicketBody
                pawn={pawn}
                customer={customer}
                shop={shop}
                principal={principal}
                copyLabel="สำเนาลูกค้า"
              />

              {/* ── Cut line ── */}
              <div className="rcp-cut-line">
                <div className="rcp-cut-dashes" />
                <span>✂ ตัดตรงนี้</span>
                <div className="rcp-cut-dashes" />
              </div>

              {/* ── Copy 2: Shop ── */}
              <div className="receipt-copy-shop">
                <TicketBody
                  pawn={pawn}
                  customer={customer}
                  shop={shop}
                  principal={principal}
                  copyLabel="สำเนาร้าน"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>ปิด</button>
            <button className="btn btn-primary" onClick={handlePrint}>
              <IconPrint /> พิมพ์
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Single ticket body (reused for both copies) ──────────── */
function TicketBody({ pawn, customer, shop, principal, copyLabel }) {
  return (
    <div className="receipt-paper">
      {/* Shop header */}
      <div className="rcp-shop-header">
        <div className="rcp-shop-name">{shop.shop_name || 'ร้านทองของเรา'}</div>
        {shop.shop_address && <div className="rcp-shop-addr">{shop.shop_address}</div>}
        {shop.shop_phone && <div className="rcp-shop-phone">โทร. {shop.shop_phone}</div>}
      </div>

      {/* Title + ticket number */}
      <div className="rcp-title-row">
        <div className="rcp-title">ใบรับจำนำ</div>
        <div className="rcp-ticket-num">{formatTicket(pawn.ticket_number)}</div>
      </div>

      {/* Customer info */}
      <div className="rcp-section">
        <div className="rcp-section-title">ข้อมูลลูกค้า</div>
        <div className="rcp-row">
          <span className="rcp-label">ชื่อ-นามสกุล</span>
          <span className="rcp-value rcp-value-lg">
            {[customer?.prefix, customer?.firstname, customer?.lastname].filter(Boolean).join(' ') || '—'}
          </span>
        </div>
        {customer?.phone && (
          <div className="rcp-row">
            <span className="rcp-label">เบอร์โทร</span>
            <span className="rcp-value">{customer.phone}</span>
          </div>
        )}
        {customer?.id_card && (
          <div className="rcp-row">
            <span className="rcp-label">บัตร ปชช.</span>
            <span className="rcp-value" style={{ fontFamily: 'Courier New', fontSize: 12 }}>
              {customer.id_card}
            </span>
          </div>
        )}
        {(customer?.tambon || customer?.amphoe || customer?.province) && (
          <div className="rcp-row">
            <span className="rcp-label">ที่อยู่</span>
            <span className="rcp-value" style={{ fontSize: 12 }}>
              {[
                customer.address_no,
                customer.moo ? `ม.${customer.moo}` : '',
                customer.road,
                customer.tambon,
                customer.amphoe,
                customer.province,
              ].filter(Boolean).join(' ')}
            </span>
          </div>
        )}
      </div>

      {/* Item info */}
      <div className="rcp-section">
        <div className="rcp-section-title">รายการที่จำนำ</div>
        <div className="rcp-row">
          <span className="rcp-label">ประเภท</span>
          <span className="rcp-value rcp-value-lg">{pawn.item_type || '—'}</span>
        </div>
        {pawn.weight_grams > 0 && (
          <div className="rcp-row">
            <span className="rcp-label">น้ำหนัก</span>
            <span className="rcp-value">{pawn.weight_grams} กรัม</span>
          </div>
        )}
        {pawn.description && (
          <div className="rcp-row">
            <span className="rcp-label">ลักษณะ</span>
            <span className="rcp-value">{pawn.description}</span>
          </div>
        )}
        <div className="rcp-row">
          <span className="rcp-label">วันที่จำนำ</span>
          <span className="rcp-value">{toBE(pawn.pawned_date)}</span>
        </div>
      </div>

      {/* Financial */}
      <div className="rcp-finance">
        <div className="rcp-section-title" style={{ marginBottom: 6 }}>การเงิน</div>
        <div className="rcp-finance-row">
          <span>เงินต้น</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatBaht(principal)}</span>
        </div>
        <div className="rcp-finance-row">
          <span>อัตราดอกเบี้ย</span>
          <span>{pawn.monthly_interest_rate}% ต่อเดือน</span>
        </div>
        <div className="rcp-finance-row rcp-total">
          <span>ดอกเบี้ย / เดือน</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatBaht(pawn.interest_amount)}</span>
        </div>
      </div>

      {/* Legal terms */}
      <div className="rcp-legal">
        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 12 }}>เงื่อนไขและข้อตกลง</div>
        <PawnLegalTerms text={shop?.pawn_legal_terms} />
      </div>

      {/* Signatures */}
      <div className="rcp-sigs">
        <div className="rcp-sig">
          <div className="rcp-sig-line" />
          <div className="rcp-sig-label">ลายมือชื่อลูกค้า</div>
        </div>
        <div className="rcp-sig">
          <div className="rcp-sig-line" />
          <div className="rcp-sig-label">ลายมือชื่อเจ้าหน้าที่</div>
        </div>
      </div>

      <div className="rcp-copy-label">{copyLabel}</div>
    </div>
  )
}

const DEFAULT_LEGAL_TERMS = "ข้่าพเจ้าขอรับรองว่าทรัพย์สินดั่งกล่าวเป็นของข้าพเจ้าจริงไม่ใช่ทรัพย์สินที่ได้มาจากการกระทำผิดใดๆ ทั้งสิ้น และ <bold><underline> จะมาถอนภายในกำหนด หนึ่ง เดือน </underline></bold> หากพ้นกำหนดนี้แล้ว ข้าพเจ้ายินยอมให้กรรมสิทธิในทรัพสินดังกล่าวเป็นกรรมสิทธิของทางร้าน ข้าพเจ้าได้อ่านสัญญาดีแล้วจึงลงลายมือไว้เป็นหลักฐาน";

function PawnLegalTerms({ text }) {
  const content = text || DEFAULT_LEGAL_TERMS;
  const tokens = content.split(/(<\/?(?:bold|underline)>)/gi);
  let isBold = false;
  let isUnderline = false;

  return (
    <p>
      {tokens.map((token, index) => {
        const lower = token.toLowerCase();
        if (lower === '<bold>') {
          isBold = true;
          return null;
        }
        if (lower === '</bold>') {
          isBold = false;
          return null;
        }
        if (lower === '<underline>') {
          isUnderline = true;
          return null;
        }
        if (lower === '</underline>') {
          isUnderline = false;
          return null;
        }

        if (!token) return null;

        const styles = {};
        if (isBold) styles.fontWeight = 'bold';
        if (isUnderline) styles.textDecoration = 'underline';

        if (isBold || isUnderline) {
          return (
            <span key={index} style={styles}>
              {token}
            </span>
          );
        }
        return token;
      })}
    </p>
  );
}

function IconPrint() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
}
