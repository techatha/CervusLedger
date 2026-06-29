import { useState, useRef, useEffect, useCallback } from 'react';
import SettingBox from './SettingBox';

const DEFAULT_COLORS = {
  income: '#5BAF82',
  expense: '#D45C5C',
};

/* ─── Edit popover (upside-down talk bubble) ───────────────────── */
function EditBubble({ preset, onApply, onClose }) {
  const [name, setName] = useState(preset.name);
  const [color, setColor] = useState(preset.color || DEFAULT_COLORS[preset.type]);
  const bubbleRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const handleApply = () => {
    if (!name.trim()) return;
    onApply({ name: name.trim(), color });
    onClose();
  };

  return (
    <div className="iep-bubble" ref={bubbleRef}>
      <div className="iep-bubble__arrow" />
      <div className="iep-bubble__body">
        <div className="iep-bubble__row">
          <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
            <label className="form-label">ชื่อ</label>
            <input
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleApply(); if (e.key === 'Escape') onClose(); }}
              autoFocus
            />
          </div>
          <div className="form-group" style={{ width: '100px' }}>
            <label className="form-label">สี</label>
            <div className="iep-add-color-wrap">
              <input
                type="color"
                className="sp-color-input"
                value={color}
                onChange={e => setColor(e.target.value)}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  width: '34px',
                  height: '34px',
                  cursor: 'pointer',
                  padding: 0,
                  background: 'transparent',
                }}
              />
              <span className="iep-add-color-hex">
                {color.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
        <div className="iep-bubble__actions">
          <button className="btn btn-xs btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-xs btn-primary" onClick={handleApply}>บันทึก</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────── */
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

  const [activeTab, setActiveTab] = useState('income');
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(DEFAULT_COLORS.income);

  // Track which preset (global index) has the edit bubble open
  const [editingIdx, setEditingIdx] = useState(null);

  const filtered = presets.filter(p => p.type === activeTab);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setNewCatColor(DEFAULT_COLORS[tab]);
    setEditingIdx(null);
  };

  const handleAddPreset = () => {
    if (!newCatName.trim()) return;
    if (presets.some(p => p.name.trim() === newCatName.trim() && p.type === activeTab)) {
      alert('มีหมวดหมู่นี้ในระบบแล้ว');
      return;
    }
    const newPreset = {
      name: newCatName.trim(),
      type: activeTab,
      color: newCatColor,
    };
    setPresets(p => [...p, newPreset]);
    setNewCatName('');
    setNewCatColor(DEFAULT_COLORS[activeTab]);
  };

  const handleRemovePreset = (globalIndex) => {
    setPresets(p => p.filter((_, i) => i !== globalIndex));
    setEditingIdx(null);
  };

  const handleEditApply = useCallback((globalIndex, { name, color }) => {
    setPresets(p => p.map((item, i) => i === globalIndex ? { ...item, name, color } : item));
  }, []);

  const handleSave = async () => {
    await onSave({
      income_expense_presets: JSON.stringify(presets),
    });
  };

  // Map filtered items back to their global index in the presets array
  const getGlobalIndex = (filteredIdx) => {
    const item = filtered[filteredIdx];
    for (let i = 0; i < presets.length; i++) {
      if (presets[i] === item) return i;
    }
    return -1;
  };

  return (
    <SettingBox
      title="หมวดหมู่รายรับ-รายจ่าย"
      description="ตั้งค่าหมวดหมู่และสีสำหรับบันทึกรายรับ-รายจ่าย"
      onSave={handleSave}
    >
      {/* ── Full-width tab selector ── */}
      <div className="iep-tabs">
        <button
          className={`iep-tab ${activeTab === 'income' ? 'iep-tab--active iep-tab--income' : ''}`}
          onClick={() => handleTabChange('income')}
        >
          <span className="iep-tab__dot iep-tab__dot--income" />
          รายรับ
          <span className="iep-tab__count">{presets.filter(p => p.type === 'income').length}</span>
        </button>
        <button
          className={`iep-tab ${activeTab === 'expense' ? 'iep-tab--active iep-tab--expense' : ''}`}
          onClick={() => handleTabChange('expense')}
        >
          <span className="iep-tab__dot iep-tab__dot--expense" />
          รายจ่าย
          <span className="iep-tab__count">{presets.filter(p => p.type === 'expense').length}</span>
        </button>
      </div>

      {/* ── Item list with square border ── */}
      <div className="iep-list-box">
        {filtered.length === 0 ? (
          <div className="iep-empty">
            <span className="iep-empty__icon">{activeTab === 'income' ? '📥' : '📤'}</span>
            <span>ยังไม่มีหมวดหมู่{activeTab === 'income' ? 'รายรับ' : 'รายจ่าย'}ที่ตั้งไว้</span>
          </div>
        ) : (
          filtered.map((p, filteredIdx) => {
            const globalIdx = getGlobalIndex(filteredIdx);
            const isEditing = editingIdx === globalIdx;

            return (
              <div key={globalIdx} className="iep-item-wrap">
                {/* Edit bubble — floats above the item */}
                {isEditing && (
                  <EditBubble
                    preset={p}
                    onApply={(changes) => handleEditApply(globalIdx, changes)}
                    onClose={() => setEditingIdx(null)}
                  />
                )}

                <div className="iep-item">
                  <div className="iep-item__left">
                    <span
                      className="iep-color-dot"
                      style={{ backgroundColor: p.color || DEFAULT_COLORS[p.type] }}
                    />
                    <span className="iep-item__name">{p.name}</span>
                    <span className="iep-item__hex">
                      {(p.color || DEFAULT_COLORS[p.type]).toUpperCase()}
                    </span>
                  </div>
                  <div className="iep-item__actions">
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost"
                      onClick={() => setEditingIdx(isEditing ? null : globalIdx)}
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-danger-ghost"
                      onClick={() => handleRemovePreset(globalIdx)}
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Add new preset row ── */}
      <div className="iep-add-form">
        <div className="iep-add-form__row">
          <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
            <label className="form-label">
              ชื่อหมวดหมู่{activeTab === 'income' ? 'รายรับ' : 'รายจ่าย'}
            </label>
            <input
              className="input"
              placeholder={activeTab === 'income' ? 'เช่น ปันผล, ค่าเช่า...' : 'เช่น ค่าขนส่ง, ค่าน้ำ...'}
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddPreset(); }}
            />
          </div>
          <div className="form-group" style={{ width: '110px' }}>
            <label className="form-label">สี</label>
            <div className="iep-add-color-wrap">
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
                  background: 'transparent',
                }}
              />
              <span className="iep-add-color-hex">
                {newCatColor.toUpperCase()}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ height: '40px', alignSelf: 'flex-end' }}
            onClick={handleAddPreset}
          >
            เพิ่มหมวดหมู่
          </button>
        </div>
      </div>
    </SettingBox>
  );
}
