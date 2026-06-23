import { useState } from 'react';
import SettingBox from './SettingBox';

export default function IncomeExpensePresetsSettings({ initialValues, onSave }) {
  const [presets, setPresets] = useState(() => {
    try {
      return initialValues.income_expense_presets
        ? JSON.parse(initialValues.income_expense_presets)
        : [];
    } catch (e) {
      console.error('Failed to parse presets:', e);
      return [];
    }
  });

  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('income');
  const [newCatColor, setNewCatColor] = useState('#2ecc71');

  const handleAddPreset = () => {
    if (!newCatName.trim()) return;
    if (presets.some(p => p.name.trim() === newCatName.trim() && p.type === newCatType)) {
      alert('มีหมวดหมู่นี้ในระบบแล้ว');
      return;
    }
    const newPreset = {
      name: newCatName.trim(),
      type: newCatType,
      color: newCatColor
    };
    setPresets(p => [...p, newPreset]);
    setNewCatName('');
  };

  const handleRemovePreset = (index) => {
    setPresets(p => p.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    await onSave({
      income_expense_presets: JSON.stringify(presets)
    });
  };

  return (
    <SettingBox
      title="หมวดหมู่รายรับ-รายจ่าย"
      description="ตั้งค่าหมวดหมู่และสีสำหรับบันทึกรายรับ-รายจ่าย"
      onSave={handleSave}
    >
      {/* Presets List */}
      <div className="sp-presets-list">
        {presets.length === 0 ? (
          <div className="sp-presets-empty">ยังไม่มีหมวดหมู่ที่ตั้งไว้</div>
        ) : (
          presets.map((p, idx) => (
            <div key={idx} className="sp-preset-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  className="sp-preset-color-badge"
                  style={{ backgroundColor: p.color || '#95a5a6' }}
                />
                <span className="sp-preset-name">{p.name}</span>
                <span className={`badge ${p.type === 'income' ? 'badge-green' : 'badge-red'}`}>
                  {p.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-xs btn-danger-ghost"
                onClick={() => handleRemovePreset(idx)}
              >
                ลบ
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add New Preset Row */}
      <div
        className="sp-presets-add-form"
        style={{ marginTop: 10, paddingTop: 16, borderTop: '1px solid var(--divider)' }}
      >
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
            <label className="form-label">ชื่อหมวดหมู่</label>
            <input
              className="input"
              placeholder="เช่น ค่าขนส่ง, ปันผล..."
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ width: '110px' }}>
            <label className="form-label">ประเภท</label>
            <select
              className="input"
              value={newCatType}
              onChange={e => setNewCatType(e.target.value)}
            >
              <option value="income">รายรับ</option>
              <option value="expense">รายจ่าย</option>
            </select>
          </div>
          <div className="form-group" style={{ width: '110px' }}>
            <label className="form-label">สี</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '40px' }}>
              <input
                type="color"
                className="sp-color-input"
                value={newCatColor}
                onChange={e => setNewCatColor(e.target.value)}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  width: '34px',
                  height: '34px',
                  cursor: 'pointer',
                  padding: 0,
                  background: 'transparent'
                }}
              />
              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                {newCatColor.toUpperCase()}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ height: '40px' }}
            onClick={handleAddPreset}
          >
            เพิ่มหมวดหมู่
          </button>
        </div>
      </div>
    </SettingBox>
  );
}
