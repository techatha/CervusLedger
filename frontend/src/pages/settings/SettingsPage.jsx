import { useState, useEffect } from 'react';
import { GetAllSettings, SaveAllSettings } from 'wailsjs/go/handlers/SettingsHandler';
import { SetShopName } from 'wailsjs/go/handlers/DisplayerHandler';
import './SettingsPage.css';

import ShopInfoSettings from './components/ShopInfoSettings';
import PromptPaySettings from './components/PromptPaySettings';
import GoldPriceSettings from './components/GoldPriceSettings';
import InterestRateSettings from './components/InterestRateSettings';
import TicketNumberSettings from './components/TicketNumberSettings';
import IncomeExpensePresetsSettings from './components/IncomeExpensePresetsSettings';
import ImportDataSettings from './components/ImportDataSettings';
import PawnLegalTermsSettings from './components/PawnLegalTermsSettings';
import QRDisplayerWiFiSetup from './components/QRDisplayerWiFiSetup';

const DEFAULTS = {
  shop_name:              '',
  shop_address:           '',
  shop_phone:             '',
  buy_price_per_baht:     '',
  sell_price_per_baht:    '',
  buying_difference:      '0',
  interest_rate_low:      '0.3',
  interest_rate_high:     '0.2',
  interest_threshold:     '10000',
  min_interest_amount:    '20',
  last_ticket_number:     '0',
  pawn_legal_terms:       '',
  income_expense_presets: '[]',
  promptpay_number:       '',
  promptpay_name:         '',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    GetAllSettings()
      .then(data => {
        setSettings({ ...DEFAULTS, ...data });
      })
      .catch(e => setError('โหลดการตั้งค่าไม่สำเร็จ: ' + e))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveSection = async (updatedValues) => {
    await SaveAllSettings(updatedValues);
    
    // Check if shop_name changed to trigger displayer sync
    const originalShopName = settings?.shop_name;
    const newShopName = updatedValues.shop_name;
    
    setSettings(prev => ({ ...prev, ...updatedValues }));

    if (newShopName !== undefined && newShopName !== originalShopName) {
      try {
        await SetShopName(newShopName);
      } catch (err) {
        console.warn('ส่งชื่อร้านไปยังหน้าจอแสดงผลไม่สำเร็จ:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="page-view">
        <div className="empty-state">
          <div className="empty-state-text">กำลังโหลด...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-view">
      <div className="page-header">
        <div>
          <div className="page-title">ตั้งค่า</div>
          <div className="page-meta">ข้อมูลร้านและค่าพารามิเตอร์</div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="sp-layout">
        {/* Shop Info Settings */}
        <ShopInfoSettings
          initialValues={{
            shop_name: settings.shop_name,
            shop_address: settings.shop_address,
            shop_phone: settings.shop_phone,
          }}
          onSave={handleSaveSection}
        />

        {/* PromptPay Settings */}
        <PromptPaySettings
          initialValues={{
            promptpay_number: settings.promptpay_number,
            promptpay_name: settings.promptpay_name,
          }}
          onSave={handleSaveSection}
        />

        {/* Gold Prices Settings */}
        <GoldPriceSettings
          initialValues={{
            sell_price_per_baht: settings.sell_price_per_baht,
            buy_price_per_baht: settings.buy_price_per_baht,
            buying_difference: settings.buying_difference,
          }}
          onSave={handleSaveSection}
        />

        {/* Interest Rates Settings */}
        <InterestRateSettings
          initialValues={{
            interest_rate_low: settings.interest_rate_low,
            interest_rate_high: settings.interest_rate_high,
            interest_threshold: settings.interest_threshold,
            min_interest_amount: settings.min_interest_amount,
          }}
          onSave={handleSaveSection}
        />

        {/* Ticket Number Settings */}
        <TicketNumberSettings
          initialValues={{
            last_ticket_number: settings.last_ticket_number,
          }}
          onSave={handleSaveSection}
        />

        {/* Income/Expense Presets Settings */}
        <IncomeExpensePresetsSettings
          initialValues={{
            income_expense_presets: settings.income_expense_presets,
          }}
          onSave={handleSaveSection}
        />

        {/* Import Data Settings */}
        <ImportDataSettings />

        {/* Pawn Legal Terms Settings */}
        <PawnLegalTermsSettings
          initialValues={{
            pawn_legal_terms: settings.pawn_legal_terms,
          }}
          onSave={handleSaveSection}
        />

        {/* WiFi Displayer Setup */}
        <QRDisplayerWiFiSetup shopName={settings.shop_name} />
      </div>
    </div>
  );
}
