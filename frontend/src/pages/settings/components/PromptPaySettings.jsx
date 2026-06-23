import { useState } from 'react';
import SettingBox, { Field } from './SettingBox';

export default function PromptPaySettings({ initialValues, onSave }) {
  const [promptpayNumber, setPromptpayNumber] = useState(initialValues.promptpay_number || '');
  const [promptpayName, setPromptpayName] = useState(initialValues.promptpay_name || '');

  const handleSave = async () => {
    if (!promptpayNumber.trim()) {
      throw new Error('กรุณากรอกหมายเลขพร้อมเพย์');
    }
    await onSave({
      promptpay_number: promptpayNumber,
      promptpay_name: promptpayName
    });
  };

  return (
    <SettingBox
      title="ข้อมูลพร้อมเพย์"
      description="ใช้สำหรับสร้าง QR Code รับชำระเงิน"
      onSave={handleSave}
    >
      <div className="form-row form-row-2">
        <Field label="หมายเลขพร้อมเพย์ (PromptPay ID)" required>
          <input
            className="input"
            value={promptpayNumber}
            onChange={e => setPromptpayNumber(e.target.value)}
            placeholder="เบอร์โทรศัพท์ หรือ เลขบัตรประชาชน"
          />
        </Field>
        <Field label="ชื่อบัญชีพร้อมเพย์">
          <input
            className="input"
            value={promptpayName}
            onChange={e => setPromptpayName(e.target.value)}
            placeholder="ชื่อร้าน หรือ ชื่อเจ้าของบัญชี"
          />
        </Field>
      </div>
    </SettingBox>
  );
}
