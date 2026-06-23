import { useState } from 'react';
import SettingBox, { Field } from './SettingBox';

export default function PawnLegalTermsSettings({ initialValues, onSave }) {
  const [legalTerms, setLegalTerms] = useState(initialValues.pawn_legal_terms || '');

  const handleSave = async () => {
    await onSave({
      pawn_legal_terms: legalTerms
    });
  };

  return (
    <SettingBox
      title="เงื่อนไขและข้อตกลงตั๋วจำนำ"
      onSave={handleSave}
    >
      <Field
        label="ข้อความเงื่อนไข"
        hint="สามารถเน้นข้อความตัวหนาด้วย <bold>ข้อความ</bold> และขีดเส้นใต้ด้วย <underline>ข้อความ</underline> ได้"
      >
        <textarea
          className="input"
          style={{ height: 'auto', minHeight: '120px', lineHeight: '1.6', resize: 'vertical' }}
          value={legalTerms}
          onChange={e => setLegalTerms(e.target.value)}
          placeholder="กรอกข้อความเงื่อนไขทางกฎหมายสำหรับแสดงบนตั๋วจำนำ..."
        />
      </Field>
    </SettingBox>
  );
}
