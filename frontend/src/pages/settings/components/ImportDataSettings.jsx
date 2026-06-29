import { useState } from 'react';
import { ImportFromXlsx, DownloadImportTemplate } from 'wailsjs/go/settings_handler/SettingsHandler';
import SettingBox from './SettingBox';

export default function ImportDataSettings() {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);

  const handleImport = async () => {
    setImporting(true);
    setImportResult(null);
    setImportError(null);
    try {
      const result = await ImportFromXlsx();
      if (result && !result.cancelled) {
        setImportResult(result);
      }
    } catch (e) {
      setImportError('นำเข้าไม่สำเร็จ: ' + e);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await DownloadImportTemplate();
    } catch (e) {
      setImportError('ดาวน์โหลดแม่แบบไม่สำเร็จ: ' + e);
    }
  };

  return (
    <SettingBox
      title="นำเข้าข้อมูล"
      description="นำเข้าข้อมูลจากไฟล์ Excel (.xlsx) เพื่อรวมกับฐานข้อมูลปัจจุบัน"
      showSave={false}
    >
      <div className="sp-import-desc">
        <p>รองรับไฟล์ Excel ที่มีชีทตามแม่แบบ:</p>
        <ul>
          <li><strong>ลูกค้า</strong> — ข้อมูลลูกค้า (ชื่อ, ที่อยู่, เลขบัตรประชาชน)</li>
          <li><strong>รายการจำนำ</strong> — รายการตั๋วจำนำ</li>
          <li><strong>การชำระดอกเบี้ย</strong> — ประวัติการชำระดอกเบี้ย</li>
          <li><strong>การเปลี่ยนแปลงเงินต้น</strong> — การลด/เพิ่มเงินต้น</li>
        </ul>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          ข้อมูลที่ซ้ำจะถูกข้ามไป ข้อมูลที่มีอยู่แล้วจะไม่ถูกเขียนทับ · ชีทที่ไม่มีในไฟล์จะถูกข้ามไป
        </p>
      </div>

      <div className="sp-import-actions">
        <button
          type="button"
          className="btn sp-import-template-btn"
          onClick={handleDownloadTemplate}
        >
          <IconDownload /> ดาวน์โหลดแม่แบบ (.xlsx)
        </button>
        <button
          type="button"
          className="btn btn-primary sp-import-btn"
          onClick={handleImport}
          disabled={importing}
        >
          <IconUpload /> {importing ? 'กำลังนำเข้า...' : 'เลือกไฟล์และนำเข้า'}
        </button>
      </div>

      {importError && (
        <div className="alert alert-error" style={{ marginTop: '12px' }}>{importError}</div>
      )}

      {importResult && (
        <div className="sp-import-result" style={{ marginTop: '12px' }}>
          <div className="sp-import-result-title">✅ นำเข้าสำเร็จ</div>
          <div className="sp-import-result-counts">
            <div className="sp-import-count-item">
              <span className="sp-import-count-num">{importResult.customers_imported}</span>
              <span className="sp-import-count-label">ลูกค้า</span>
            </div>
            <div className="sp-import-count-item">
              <span className="sp-import-count-num">{importResult.pawn_records_imported}</span>
              <span className="sp-import-count-label">ตั๋วจำนำ</span>
            </div>
            <div className="sp-import-count-item">
              <span className="sp-import-count-num">{importResult.pawn_payments_imported}</span>
              <span className="sp-import-count-label">การชำระ</span>
            </div>
            <div className="sp-import-count-item">
              <span className="sp-import-count-num">{importResult.principal_changes_imported}</span>
              <span className="sp-import-count-label">เปลี่ยนเงินต้น</span>
            </div>
          </div>
          {importResult.warnings && importResult.warnings.length > 0 && (
            <details className="sp-import-warnings">
              <summary>⚠️ คำเตือน ({importResult.warnings.length} รายการ)</summary>
              <ul>
                {importResult.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </SettingBox>
  );
}

function IconUpload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}
