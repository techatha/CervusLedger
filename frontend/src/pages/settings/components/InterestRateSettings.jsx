import { useState } from 'react';
import SettingBox, { Field } from './SettingBox';

export default function InterestRateSettings({ initialValues, onSave }) {
  const [rateLow, setRateLow] = useState(initialValues.interest_rate_low || '0.3');
  const [rateHigh, setRateHigh] = useState(initialValues.interest_rate_high || '0.2');
  const [threshold, setThreshold] = useState(initialValues.interest_threshold || '10000');
  const [minInterest, setMinInterest] = useState(initialValues.min_interest_amount || '20');

  const handleSave = async () => {
    await onSave({
      interest_rate_low: rateLow,
      interest_rate_high: rateHigh,
      interest_threshold: threshold,
      min_interest_amount: minInterest
    });
  };

  const parsedThreshold = parseInt(threshold || 0);

  return (
    <SettingBox
      title="อัตราดอกเบี้ยจำนำ"
      onSave={handleSave}
    >
      <div className="sp-rate-explainer" style={{ marginBottom: '14px' }}>
        <span>ต้นเงิน &lt; {parsedThreshold.toLocaleString('th-TH')} บาท</span>
        <span className="sp-arrow">→</span>
        <span className="sp-rate-val">{rateLow}% / เดือน</span>
        <span className="sp-divider">|</span>
        <span>ต้นเงิน ≥ {parsedThreshold.toLocaleString('th-TH')} บาท</span>
        <span className="sp-arrow">→</span>
        <span className="sp-rate-val">{rateHigh}% / เดือน</span>
      </div>

      <div className="form-row form-row-3">
        <Field label="อัตราต่ำ (% / เดือน)" hint="ต้นต่ำกว่า threshold">
          <input
            className="input"
            type="number"
            step="0.01"
            value={rateLow}
            onChange={e => setRateLow(e.target.value)}
          />
        </Field>
        <Field label="อัตราสูง (% / เดือน)" hint="ต้นตั้งแต่ threshold">
          <input
            className="input"
            type="number"
            step="0.01"
            value={rateHigh}
            onChange={e => setRateHigh(e.target.value)}
          />
        </Field>
        <Field label="Threshold (บาท)">
          <input
            className="input"
            type="number"
            step="1000"
            value={threshold}
            onChange={e => setThreshold(e.target.value)}
          />
        </Field>
      </div>

      <Field label="ดอกเบี้ยขั้นต่ำ (บาท/เดือน)">
        <input
          className="input"
          type="number"
          value={minInterest}
          onChange={e => setMinInterest(e.target.value)}
          style={{ maxWidth: 180 }}
        />
      </Field>
    </SettingBox>
  );
}
