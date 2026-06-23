import { useState } from 'react';
import SettingBox, { Field } from './SettingBox';

export default function GoldPriceSettings({ initialValues, onSave }) {
  const [sellPrice, setSellPrice] = useState(initialValues.sell_price_per_baht || '');
  const [buyPrice, setBuyPrice] = useState(initialValues.buy_price_per_baht || '');
  const [buyingDiff, setBuyingDiff] = useState(initialValues.buying_difference || '0');

  const handleSave = async () => {
    await onSave({
      sell_price_per_baht: sellPrice,
      buy_price_per_baht: buyPrice,
      buying_difference: buyingDiff
    });
  };

  return (
    <SettingBox
      title="ราคาทองเริ่มต้น"
      description="ราคาจริงตั้งได้จากหน้าซื้อ-ขาย"
      onSave={handleSave}
    >
      <div className="form-row form-row-2">
        <Field label="ราคาขาย (บาท/บาท)">
          <input
            className="input"
            type="number"
            value={sellPrice}
            onChange={e => setSellPrice(e.target.value)}
            placeholder="32000"
          />
        </Field>
        <Field label="ราคารับซื้อ (บาท/บาท)">
          <input
            className="input"
            type="number"
            value={buyPrice}
            onChange={e => setBuyPrice(e.target.value)}
            placeholder="31500"
          />
        </Field>
      </div>
      <Field label="ส่วนต่างราคารับซื้อทองคำแท่ง (บาท/บาท)" hint="ใช้หักลบราคาอ้างอิงตอนคำนวณราคารับซื้อ">
        <input
          className="input"
          type="number"
          value={buyingDiff}
          onChange={e => setBuyingDiff(e.target.value)}
          placeholder="0"
        />
      </Field>
    </SettingBox>
  );
}
