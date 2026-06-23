import { useState } from 'react';
import SettingBox, { Field } from './SettingBox';

export default function TicketNumberSettings({ initialValues, onSave }) {
  const [lastTicketNumber, setLastTicketNumber] = useState(initialValues.last_ticket_number || '0');

  const handleSave = async () => {
    await onSave({
      last_ticket_number: lastTicketNumber
    });
  };

  const nextTicketNum = (parseInt(lastTicketNumber || 0) % 9999) + 1;
  const formattedNextTicket = String(nextTicketNum).padStart(4, '0');

  return (
    <SettingBox
      title="เลขตั๋ว"
      onSave={handleSave}
    >
      <Field
        label="เลขตั๋วล่าสุด"
        hint="ตั๋วถัดไปจะเป็นเลขนี้ + 1 (รีเซ็ตเป็น 1 หลังจาก 9999)"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            className="input"
            type="number"
            min="0"
            max="9999"
            value={lastTicketNumber}
            onChange={e => setLastTicketNumber(e.target.value)}
            style={{ maxWidth: '140px' }}
          />
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            ตั๋วถัดไป:{' '}
            <strong style={{ color: 'var(--gold)', fontFamily: 'Courier New, monospace' }}>
              {formattedNextTicket}
            </strong>
          </span>
        </div>
      </Field>
    </SettingBox>
  );
}
