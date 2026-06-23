import { useState } from 'react';

export default function SettingBox({
  title,
  description,
  onSave,
  showSave = true,
  saving = false,
  disabled = false,
  children
}) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [localSaving, setLocalSaving] = useState(false);

  const handleSave = async () => {
    if (!onSave) return;
    setLocalSaving(true);
    setError(null);
    setSaved(false);
    try {
      await onSave();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLocalSaving(false);
    }
  };

  const isSaving = saving || localSaving;

  return (
    <section className="card sp-section">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <span className="card-title">{title}</span>
          {description && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400, display: 'block', marginTop: '2px' }}>
              {description}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {error && <span className="sp-error-text" style={{ color: 'var(--red)', fontSize: '13px' }}>{error}</span>}
          {saved && (
            <span className="sp-saved-badge" style={{ padding: '4px 10px', fontSize: '12px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ marginRight: '3px' }}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              บันทึกแล้ว
            </span>
          )}
          {showSave && onSave && (
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={isSaving || disabled}
              style={{ padding: '6px 14px', height: 'auto', fontSize: '13px' }}
            >
              {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          )}
        </div>
      </div>
      <div className="sp-fields">
        {children}
      </div>
    </section>
  );
}

export function Field({ label, hint, required, children }) {
  return (
    <div className="form-group sp-field">
      <label className="form-label">
        {label}
        {required && <span style={{ color: 'var(--red)' }}> *</span>}
      </label>
      {children}
      {hint && <div className="sp-hint">{hint}</div>}
    </div>
  );
}

