import { useState } from 'react';
import { ImportFromXlsx, DownloadImportTemplate, ExportToXlsx, ClearAllData } from 'wailsjs/go/settings_handler/SettingsHandler';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faUpload, faFileArrowDown, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import SettingBox from './SettingBox';

export default function ImportDataSettings() {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);

  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);
  const [exportError, setExportError] = useState(null);

  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState(null);
  const [clearError, setClearError] = useState(null);

  const handleImport = async () => {
    setImporting(true);
    setImportResult(null);
    setImportError(null);
    setExportResult(null);
    setExportError(null);
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

  const handleExport = async () => {
    setExporting(true);
    setExportResult(null);
    setExportError(null);
    setImportResult(null);
    setImportError(null);
    try {
      const result = await ExportToXlsx();
      if (result && !result.cancelled) {
        setExportResult(result);
      }
    } catch (e) {
      setExportError('ส่งออกไม่สำเร็จ: ' + e);
    } finally {
      setExporting(false);
    }
  };

  const handleClearData = async () => {
    setClearing(true);
    setClearResult(null);
    setClearError(null);
    setImportResult(null);
    setImportError(null);
    setExportResult(null);
    setExportError(null);
    try {
      const result = await ClearAllData();
      if (result && !result.cancelled) {
        setClearResult(result);
      }
    } catch (e) {
      setClearError('ลบข้อมูลไม่สำเร็จ: ' + e);
    } finally {
      setClearing(false);
    }
  };

  return (
    <SettingBox
      title="นำเข้าและส่งออกข้อมูล"
      description="นำเข้าหรือส่งออกข้อมูลลูกค้า รายการจำนำ ดอกเบี้ย และเงินต้น ผ่านไฟล์ Excel (.xlsx)"
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
          เมื่อนำเข้า: ข้อมูลที่ซ้ำจะถูกข้ามไป ข้อมูลที่มีอยู่แล้วจะไม่ถูกเขียนทับ · ชีทที่ไม่มีในไฟล์จะถูกข้ามไป
        </p>
      </div>

      <div className="sp-import-actions">
        <button
          type="button"
          className="btn sp-import-template-btn"
          onClick={handleDownloadTemplate}
          disabled={importing || exporting}
        >
          <FontAwesomeIcon icon={faFileArrowDown} /> ดาวน์โหลดแม่แบบ (.xlsx)
        </button>
        <button
          type="button"
          className="btn sp-import-template-btn"
          style={{ background: 'var(--green-bg)', borderColor: 'var(--green)', color: 'var(--green)' }}
          onClick={handleExport}
          disabled={importing || exporting}
        >
          <FontAwesomeIcon icon={faUpload} /> {exporting ? 'กำลังส่งออก...' : 'ส่งออกข้อมูล (.xlsx)'}
        </button>
        <button
          type="button"
          className="btn btn-primary sp-import-btn"
          onClick={handleImport}
          disabled={importing || exporting}
        >
          <FontAwesomeIcon icon={faDownload} /> {importing ? 'กำลังนำเข้า...' : 'เลือกไฟล์และนำเข้า'}
        </button>
      </div>

      {importError && (
        <div className="alert alert-error" style={{ marginTop: '12px' }}>{importError}</div>
      )}

      {exportError && (
        <div className="alert alert-error" style={{ marginTop: '12px' }}>{exportError}</div>
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

      {exportResult && (
        <div className="sp-import-result" style={{ marginTop: '12px', borderColor: 'rgba(91, 175, 130, 0.25)' }}>
          <div className="sp-import-result-title" style={{ color: 'var(--green)' }}>✅ ส่งออกสำเร็จ</div>
          <div className="sp-import-result-counts">
            <div className="sp-import-count-item">
              <span className="sp-import-count-num">{exportResult.customers_exported}</span>
              <span className="sp-import-count-label">ลูกค้า</span>
            </div>
            <div className="sp-import-count-item">
              <span className="sp-import-count-num">{exportResult.pawn_records_exported}</span>
              <span className="sp-import-count-label">ตั๋วจำนำ</span>
            </div>
            <div className="sp-import-count-item">
              <span className="sp-import-count-num">{exportResult.pawn_payments_exported}</span>
              <span className="sp-import-count-label">การชำระ</span>
            </div>
            <div className="sp-import-count-item">
              <span className="sp-import-count-num">{exportResult.principal_changes_exported}</span>
              <span className="sp-import-count-label">เปลี่ยนเงินต้น</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Clear Data Danger Zone ── */}
      <hr className="sp-section-divider" />
      <div className="sp-section-label">จัดการข้อมูล</div>
      <div className="sp-clear-data-zone">
        <div className="sp-clear-data-header">
          <FontAwesomeIcon icon={faTriangleExclamation} className="sp-clear-data-icon" />
          <div>
            <div className="sp-clear-data-title">ลบข้อมูลทั้งหมด</div>
            <div className="sp-clear-data-desc">
              ลบข้อมูลลูกค้า รายการจำนำ การชำระดอกเบี้ย และการเปลี่ยนแปลงเงินต้นทั้งหมดออกจากระบบ
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn sp-clear-data-btn"
          onClick={handleClearData}
          disabled={importing || exporting || clearing}
        >
          <FontAwesomeIcon icon={faTriangleExclamation} />
          {clearing ? 'กำลังลบข้อมูล...' : 'ลบข้อมูลทั้งหมด'}
        </button>
      </div>

      {clearError && (
        <div className="alert alert-error" style={{ marginTop: '12px' }}>{clearError}</div>
      )}

      {clearResult && (
        <div className="sp-import-result" style={{ marginTop: '12px', borderColor: 'rgba(220, 53, 69, 0.25)' }}>
          <div className="sp-import-result-title" style={{ color: 'var(--red)' }}>🗑️ ลบข้อมูลสำเร็จ</div>
          <div className="sp-import-result-counts">
            <div className="sp-import-count-item">
              <span className="sp-import-count-num">{clearResult.customers_deleted}</span>
              <span className="sp-import-count-label">ลูกค้า</span>
            </div>
            <div className="sp-import-count-item">
              <span className="sp-import-count-num">{clearResult.pawn_records_deleted}</span>
              <span className="sp-import-count-label">ตั๋วจำนำ</span>
            </div>
            <div className="sp-import-count-item">
              <span className="sp-import-count-num">{clearResult.pawn_payments_deleted}</span>
              <span className="sp-import-count-label">การชำระ</span>
            </div>
            <div className="sp-import-count-item">
              <span className="sp-import-count-num">{clearResult.principal_changes_deleted}</span>
              <span className="sp-import-count-label">เปลี่ยนเงินต้น</span>
            </div>
          </div>
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
