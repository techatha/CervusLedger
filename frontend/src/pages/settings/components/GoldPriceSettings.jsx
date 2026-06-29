import { useState } from 'react';
import SettingBox, { Field } from './SettingBox';

export default function GoldPriceSettings({ initialValues, onSave }) {
  const [buyingDiff, setBuyingDiff] = useState(initialValues.buying_difference || '0');

  const handleSave = async () => {
    await onSave({
      buying_difference: buyingDiff
    });
  };

  return (
    <SettingBox
      title="ส่วนต่างราคารับซื้อ"
      description="ตั้งค่าส่วนต่างหักลบจากราคาอ้างอิงตอนคำนวณราคารับซื้อทองคำแท่ง"
      onSave={handleSave}
    >
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

