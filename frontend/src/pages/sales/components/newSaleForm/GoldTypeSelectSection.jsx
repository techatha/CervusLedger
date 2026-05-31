import { useState, useEffect } from 'react'
import { ListGoldItems, GetGoldMainTypes } from 'wailsjs/go/handlers/GoldItemHandler.js'

export default function GoldTypeSelectSection({
  goldItemId,    
  weightGrams,   
  purity,        
  onChange       
}) {
  const [goldItems, setGoldItems] = useState([])
  const [mainTypes, setMainTypes] = useState([])
  const [selectedMainType, setSelectedMainType] = useState('')
  const [selectedSubtype, setSelectedSubtype] = useState('')

  useEffect(() => {
    ListGoldItems('available').then(d => setGoldItems(d || []))
  }, [])

  useEffect(() => {
    GetGoldMainTypes().then(setMainTypes)
  }, [])

  const handleMainTypeChange = (val) => {
    setSelectedMainType(val)
    setSelectedSubtype('')
    onChange({ gold_item_id: 0, gold_item_label: '', weight_grams: '', purity: '0' })
  }

  const handleSubtypeChange = (val) => {
    setSelectedSubtype(val)
    const item = goldItems.find(g => g.type === selectedMainType && g.subtype === val)
    
    if (item) {
      onChange({
        gold_item_id: item.id,
        gold_item_label: `${item.type} — ${item.subtype}`,
        weight_grams: item.weight_grams ? String(item.weight_grams) : '',
        purity: item.purity ? String(item.purity) : '90'
      })
    } else {
      onChange({ gold_item_id: 0, gold_item_label: '', weight_grams: '', purity: '0' })
    }
  }

  return (
    <>
      <div className="section-divider">เลือกรายการทอง</div>

      <div className="form-row form-row-2">
        <div className="form-group">
          <label className="form-label form-label-required">ประเภทสินค้าหลัก</label>
          <select
            className="input"
            value={selectedMainType}
            onChange={e => handleMainTypeChange(e.target.value)}
          >
            <option value="">-- เลือกประเภทหลัก --</option>
            {mainTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label form-label-required">เลือกรุ่น / น้ำหนัก</label>
          <select
            className="input"
            value={selectedSubtype}
            disabled={!selectedMainType}
            onChange={e => handleSubtypeChange(e.target.value)}
          >
            <option value="">-- เลือกรุ่น/น้ำหนัก --</option>
            {goldItems
              .filter(item => item.type === selectedMainType)
              .map(item => <option key={item.id} value={item.subtype}>{item.subtype}</option>)}
          </select>
        </div>
      </div>

      <div className="section-divider">รายละเอียดการชั่งน้ำหนัก & คำนวณราคา</div>

      <div className="form-row form-row-2" style={{ marginTop: '12px' }}>
        <div className="form-group">
          <label className="form-label form-label-required">น้ำหนัก (กรัม)</label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.0001"
            placeholder="0.00"
            value={weightGrams}
            onChange={e => onChange({ weight_grams: e.target.value })}
            disabled={!goldItemId}
          />
        </div>
        <div className="form-group">
          <label className="form-label form-label-required">ความบริสุทธิ์ (%)</label>
          <input
            className="input"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={purity}
            onChange={e => onChange({ purity: e.target.value })}
            disabled={!goldItemId}
          />
        </div>
      </div>
    </>
  )
}
