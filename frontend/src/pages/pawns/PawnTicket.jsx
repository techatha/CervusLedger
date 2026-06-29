import { useRef } from 'react'
import { PrintWindow } from 'wailsjs/go/settings_handler/SettingsHandler'
import { formatBaht, formatTicket, formatCustomerAddress, formatFullThaiDate, thaiBahtText } from '@/utils/thai'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPrint } from '@fortawesome/free-solid-svg-icons'
import './PawnTicket.css'

export default function PawnTicket({ pawn, customer, shop, onClose }) {
  const printRef = useRef(null)

  const handlePrint = async () => {
    // 1. เก็บชื่อ Title เดิมของหน้าต่างเว็บเอาไว้ก่อน
    const originalTitle = document.title;

    // 2. ตั้งชื่อ Title ใหม่ ซึ่งจะกลายเป็นชื่อไฟล์ PDF อัตโนมัติ
    // เช่น "สัญญาขายฝาก_0145"
    document.title = `สัญญาขายฝาก_${formatTicket(pawn.ticket_number)}`;

    try {
      if (PrintWindow) {
        await PrintWindow().catch((err) => {
          console.error("PrintWindow failed, falling back to window.print:", err)
          window.print()
        })
      } else {
        window.print()
      }
    } finally {
      // 3. คืนค่าชื่อ Title เดิมกลับมาหลังจากสั่ง Print เสร็จ
      // ใส่ setTimeout ไว้เล็กน้อยเพื่อให้ระบบ Print ดึงชื่อใหม่ไปใช้ให้ทันก่อนเราเปลี่ยนกลับ
      setTimeout(() => {
        document.title = originalTitle;
      }, 500);
    }
  }

  const principal = pawn.current_principal ?? pawn.initial_principal

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal receipt-preview-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">ตัวอย่างเอกสาร</div>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>

          <div className="receipt-preview-body">

            <div className="print-root" ref={printRef}>
              {/* ── Copy 1: Customer ── */}
              <div className="receipt-copy-customer">
                <TicketBody
                  pawn={pawn}
                  customer={customer}
                  shop={shop}
                  principal={principal}
                  copyLabel="&bull; สำเนาสำหรับลูกค้า"
                />
              </div>

              {/* ── Cut line ── */}
              <div className="rcp-cut-line">
                <div className="rcp-cut-dashes" />
              </div>

              {/* ── Copy 2: Shop ── */}
              <div className="receipt-copy-shop">
                <TicketBody
                  pawn={pawn}
                  customer={customer}
                  shop={shop}
                  principal={principal}
                  copyLabel="&bull; สำเนาสำหรับร้านค้า"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>ปิด</button>
            <button className="btn btn-primary" onClick={handlePrint}>
            <FontAwesomeIcon icon={faPrint} /> พิมพ์เอกสาร
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── โครงสร้างเอกสารสัญญาเดี่ยว (TicketBody) ──────────── */
function TicketBody({ pawn, customer, shop, principal, copyLabel }) {
  return (
    <div className="receipt-paper">

      {/* ── ส่วนหัวข้อสัญญา และ เลขที่เอกสารมุมขวาบน ── */}
      <div className="rcp-header-block">
        <div className="rcp-header-left">
          <div className="rcp-main-title">สัญญาขายฝาก</div>
          <div className="rcp-date-thai">{formatFullThaiDate(pawn.pawned_date)}</div>
        </div>
        <div className="rcp-ticket-badge">
          <div className="rcp-badge-lbl">{copyLabel}</div>
          <span className="rcp-badge-num">No. {formatTicket(pawn.ticket_number)}</span>
        </div>
      </div>

      {/* ข้อมูลสาขาผู้ออกเอกสาร (ขนาดเล็ก) - ย้ายไปด้านล่าง แต่ยังคงเส้นใต้ไว้ตามเดิม */}
      <div className="rcp-shop-mini-info" style={{ padding: 0, height: 0, overflow: 'hidden' }} />

      {/* ข้อมูลลูกค้า */}
      <div className="rcp-section">
        {/* <div className="rcp-section-title">ข้อมูลผู้ขายฝาก</div> */}
        <div className="rcp-row">
          <span className="rcp-label">ชื่อ-นามสกุล</span>
          <span className="rcp-value rcp-value-lg">
            {[customer?.prefix, customer?.firstname, customer?.lastname].filter(Boolean).join(' ') || '—'}
          </span>
        </div>

        <div className="rcp-row">
          <span className="rcp-label">เบอร์โทรศัพท์</span>
          <span className="rcp-value">{customer?.phone || '-'}</span>
        </div>
        <div className="rcp-row">
          <span className="rcp-label">เลขประจำตัวประชาชน</span>
          <span className="rcp-value" style={{ fontFamily: 'Courier New', fontSize: '13px', fontWeight: 'bold' }}>
            {customer?.id_card || '-'}
          </span>
        </div>
        <div className="rcp-row">
          <span className="rcp-label">ที่อยู่ตามภูมิลำเนา</span>
          <span className="rcp-value" style={{ fontSize: '12.5px', lineHeight: '1.4' }}>
            {formatCustomerAddress(customer)}
          </span>
        </div>
      </div>

      {/* รายการทรัพย์สินหลักประกัน (ปรับเป็นตาราง HTML ตามบรีฟ) */}
      <div className="rcp-section">
        <div className="rcp-section-title">รายละเอียดทรัพย์สินหลักประกัน</div>
        <table className="rcp-item-data-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>ประเภทสินค้า</th>
              <th style={{ width: '25%' }}>น้ำหนักรวม</th>
              <th style={{ width: '35%' }}>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="rcp-value-lg">{pawn.item_type || '—'}</td>
              <td style={{ fontWeight: '600' }}>{pawn.weight_grams > 0 ? `${pawn.weight_grams} กรัม` : '—'}</td>
              <td style={{ color: '#555', fontSize: '12px' }}>{pawn.description || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="rcp-finance">
        <div className="rcp-finance-row">
          <span>ขายฝากรวมเป็นเงินทั้งสิ้น</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}>
            {formatBaht(principal)} ({thaiBahtText(principal)})
          </span>
        </div>
      </div>

      {/* ข้อตกลงกฎหมาย */}
      <div className="rcp-legal">
        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 12 }}>เงื่อนไขและข้อตกลง</div>
        <PawnLegalTerms text={shop?.pawn_legal_terms} />
      </div>

      {/* ช่องลงชื่อ */}
      <div className="rcp-sigs">
        <div className="rcp-sig">
          <div className="rcp-sig-line" />
          <div className="rcp-sig-label">ลงชื่อ ผู้ขายฝาก (ลูกค้า)</div>
        </div>
        <div className="rcp-sig">
          <div className="rcp-sig-line" />
          <div className="rcp-sig-label">ลงชื่อ ผู้รับซื้อฝาก (เจ้าหน้าที่)</div>
        </div>
      </div>

      {/* ข้อมูลสาขาผู้ออกเอกสาร (ขนาดเล็ก) ย้ายมาด้านล่าง */}
      <div className="rcp-shop-mini-info" style={{ borderBottom: 'none', borderTop: '1px solid #eee', marginTop: '10px', paddingTop: '8px', textAlign: 'center' }}>
        <strong>หมายเหตุ:</strong> ถ้าเอกสารใบนี้สูญหายจะไม่สามารถไถ่ถอนได้ทุกกรณี
        <br />{shop.shop_name || 'ห้างทอง'}
        {shop.shop_phone && ` (โทร: ${shop.shop_phone})`}
        {shop.shop_address && (
          <>
            <br />
            {shop.shop_address}
          </>
        )}
      </div>
    </div>
  )
}

const DEFAULT_LEGAL_TERMS = "ข้่าพเจ้าขอรับรองว่าทรัพย์สินดั่งกล่าวเป็นของข้าพเจ้าจริงไม่ใช่ทรัพย์สินที่ได้มาจากการกระทำผิดใดๆ ทั้งสิ้น และ <bold><underline> จะมาถอนภายในกำหนด หนึ่งเดือน </underline></bold> หากพ้นกำหนดนี้แล้ว ข้าพเจ้านินยอมให้กรรมสิทธิในทรัพสินดังกล่าวเป็นกรรมสิทธิของทางร้าน ข้าพเจ้าได้อ่านสัญญาดีแล้วจึงลงลายมือไว้เป็นหลักฐาน";

function PawnLegalTerms({ text }) {
  const content = text || DEFAULT_LEGAL_TERMS;
  const tokens = content.split(/(<\/?(?:bold|underline)>)/gi);
  let isBold = false;
  let isUnderline = false;

  return (
    <p>
      {tokens.map((token, index) => {
        const lower = token.toLowerCase();
        if (lower === '<bold>') { isBold = true; return null; }
        if (lower === '</bold>') { isBold = false; return null; }
        if (lower === '<underline>') { isUnderline = true; return null; }
        if (lower === '</underline>') { isUnderline = false; return null; }
        if (!token) return null;

        const styles = {};
        if (isBold) styles.fontWeight = 'bold';
        if (isUnderline) styles.textDecoration = 'underline';

        return isBold || isUnderline ? <span key={index} style={styles}>{token}</span> : token;
      })}
    </p>
  );
}

