import { useState, useCallback, useEffect } from 'react';
import { GetWiFiDisplayerIP, TestWiFiDisplayerConnection, SaveWiFiCredentialsAuto, SetShopName, SendStaticQRToDisplay } from 'wailsjs/go/handlers/DisplayerHandler.js';
import SettingBox, { Field } from './SettingBox';
import { syncDevice } from '@/utils/esp32Sync';
import { EventsOn } from 'wailsjs/runtime/runtime.js';

export default function QRDisplayerWiFiSetup({ initialValues, onSave, shopName }) {
  // PromptPay states
  const [promptpayNumber, setPromptpayNumber] = useState(initialValues?.promptpay_number || '');
  const [promptpayName, setPromptpayName] = useState(initialValues?.promptpay_name || '');
  const [bankName, setBankName] = useState(initialValues?.bank_name || '');
  const [bankAccount, setBankAccount] = useState(initialValues?.bank_account || '');
  const [sendingFallbackQR, setSendingFallbackQR] = useState(false);
  const [fallbackQRSuccess, setFallbackQRSuccess] = useState(null); // null | true | false

  // WiFi states
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle'); // idle | connecting | done | error
  const [error, setError] = useState(null);
  const [savedIP, setSavedIP] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(null); // null | true | false
  const [disconnectedAlert, setDisconnectedAlert] = useState(false);

  // Fetch saved IP on mount
  useEffect(() => {
    async function loadSavedIP() {
      try {
        const ip = await GetWiFiDisplayerIP();
        if (ip) {
          setSavedIP(ip);
        }
      } catch (err) {
        console.error('Failed to load saved IP:', err);
      }
    }
    loadSavedIP();
  }, []);

  // Listen to disconnection events
  useEffect(() => {
    const onDisconnect = () => {
      setSavedIP(null);
      setStatus('idle');
      setConnectionSuccess(null);
      setFallbackQRSuccess(null);
      setDisconnectedAlert(true);
    };

    // 1. Listen directly to Wails event
    const unsubscribe = EventsOn("esp32:disconnected", onDisconnect);

    // 2. Listen to custom window event
    window.addEventListener('esp32:disconnected', onDisconnect);

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      window.removeEventListener('esp32:disconnected', onDisconnect);
    };
  }, []);

  const handleSavePromptPay = async () => {
    if (!promptpayNumber.trim()) {
      throw new Error('กรุณากรอกหมายเลขพร้อมเพย์');
    }
    setFallbackQRSuccess(null);
    setConnectionSuccess(null);
    await onSave({
      promptpay_number: promptpayNumber,
      promptpay_name: promptpayName,
      bank_name: bankName,
      bank_account: bankAccount
    });

    if (savedIP) {
      try {
        setSendingFallbackQR(true);
        await SendStaticQRToDisplay(promptpayNumber, promptpayName, bankName, bankAccount);
        setFallbackQRSuccess(true);
      } catch (err) {
        setFallbackQRSuccess(false);
        console.warn("ส่ง QR ตั้งต้นไปยังหน้าจอไม่สำเร็จ:", err);
        setError('บันทึกการตั้งค่าแล้ว แต่ส่ง QR ตั้งต้นไปยังหน้าจอไม่สำเร็จ: ' + (err.message || String(err)));
      } finally {
        setSendingFallbackQR(false);
      }
    }
  };

  const handleSendFallbackQR = useCallback(async () => {
    if (!promptpayNumber.trim()) {
      setError('กรุณากรอกหมายเลขพร้อมเพย์ก่อนส่ง QR ตั้งต้น');
      return;
    }
    setSendingFallbackQR(true);
    setFallbackQRSuccess(null);
    setConnectionSuccess(null);
    setError(null);
    try {
      await SendStaticQRToDisplay(promptpayNumber, promptpayName, bankName, bankAccount);
      setFallbackQRSuccess(true);
    } catch (err) {
      setFallbackQRSuccess(false);
      setError('ส่ง QR ตั้งต้นไม่สำเร็จ: ' + (err.message || String(err)));
    } finally {
      setSendingFallbackQR(false);
    }
  }, [promptpayNumber, promptpayName, bankName, bankAccount]);


  const handleTestConnection = useCallback(async () => {
    if (!savedIP) return;
    setTestingConnection(true);
    setConnectionSuccess(null);
    setError(null);
    try {
      const ok = await TestWiFiDisplayerConnection(savedIP);
      if (ok) {
        setConnectionSuccess(true);
      } else {
        setConnectionSuccess(false);
        setError('ไม่สามารถเชื่อมต่ออุปกรณ์ได้ (Timeout)');
      }
    } catch (err) {
      setConnectionSuccess(false);
      setError(err.message || String(err));
    } finally {
      setTestingConnection(false);
    }
  }, [savedIP]);

  const handleSaveWiFi = useCallback(async () => {
    if (!ssid) {
      setError('กรุณากรอกชื่อ WiFi');
      return;
    }

    setStatus('connecting');
    setError(null);
    setConnectionSuccess(null); // Reset connection test state
    setDisconnectedAlert(false);

    try {
      console.log("Waiting save wifi credentials...")
      const ip = await SaveWiFiCredentialsAuto(ssid, password);
      setSavedIP(ip);
      console.log("waiting done! ip: ", ip);
      
      if (shopName) {
        try {
          await SetShopName(shopName);
        } catch (sendErr) {
          console.warn("ส่งชื่อร้านไปยังหน้าจอแสดงผลไม่สำเร็จ:", sendErr);
        }
      }
      
      // Call syncDevice to register webhook immediately
      await syncDevice();
      
      setStatus('done');
    } catch (err) {
      setError(err.message || String(err));
      setStatus('error');
    }
  }, [ssid, password, shopName]);

  return (
    <SettingBox
      title="ตั้งค่าหน้าจอแสดง QR Code"
      onSave={handleSavePromptPay}
      showSave={true}
    >
      {/* ── PromptPay Info ── */}
      <div style={{ paddingBottom: '20px', marginBottom: '20px', borderBottom: '1px solid var(--divider, #e2e8f0)' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
          ใช้สำหรับสร้าง QR Code เพื่อรับชำระเงินเงินสด/โอนเงิน
        </div>
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
        <div className="form-row form-row-2" style={{ marginTop: '12px' }}>
          <Field label="ชื่อธนาคาร" hint="จะแสดงประกอบข้อมูลบนหน้าจอแสดงผล QR Code">
            <input
              className="input"
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              placeholder="เช่น กสิกรไทย, ไทยพาณิชย์..."
            />
          </Field>
          <Field label="เลขบัญชีธนาคาร" hint="จะแสดงประกอบข้อมูลบนหน้าจอแสดงผล QR Code">
            <input
              className="input"
              value={bankAccount}
              onChange={e => setBankAccount(e.target.value)}
              placeholder="123-4-56789-0"
            />
          </Field>
        </div>
        {savedIP && (
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn"
              onClick={handleSendFallbackQR}
              disabled={sendingFallbackQR}
              style={{
                fontSize: 12,
                padding: '6px 12px',
                height: 'auto',
                backgroundColor: 'var(--bg-card, #ffffff)',
                border: '1px solid var(--border-color, #cbd5e1)',
                cursor: 'pointer'
              }}
            >
              {sendingFallbackQR ? 'กำลังส่ง QR ตั้งต้น...' : 'ส่ง QR ตั้งต้น (Fallback QR) ไปยังหน้าจอ'}
            </button>
          </div>
        )}
      </div>

      {/* ── WiFi Setup ── */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          การเชื่อมต่อ WiFi หน้าจอ
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          ตั้งค่าการเชื่อมต่อ WiFi เพื่อให้อุปกรณ์สามารถสื่อสารกับระบบและแสดง QR Code ได้
        </div>

        {disconnectedAlert && (
          <div className="alert alert-error" style={{
            marginBottom: '16px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <span style={{ fontSize: '18px', lineHeight: 1 }}>🚨</span>
            <div>
              <strong style={{ display: 'block', marginBottom: '2px' }}>หน้าจอแสดงผล QR Code ถูกยกเลิกการเชื่อมต่อแล้ว (QR Display Disconnected)</strong>
              <span style={{ fontSize: '12px', opacity: 0.9 }}>
                อุปกรณ์ถูกรีเซ็ตค่าจากโรงงาน (Factory Reset) ทำให้ถูกตัดการเชื่อมต่อจากระบบ กรุณาเชื่อมต่อสายและตั้งค่า WiFi ใหม่อีกครั้ง
              </span>
            </div>
          </div>
        )}
        {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}
        {fallbackQRSuccess === true && (
          <div className="alert alert-success" style={{ marginBottom: '16px' }}>
            ส่ง QR ตั้งต้น (Fallback QR) ไปยังหน้าจอสำเร็จ!
          </div>
        )}
        {status === 'done' && savedIP && (
          <div className="alert alert-success" style={{ marginBottom: '16px' }}>
            เชื่อมต่อสำเร็จ — IP ของหน้าจอ: {savedIP}
          </div>
        )}
        {connectionSuccess === true && (
          <div className="alert alert-success" style={{ marginBottom: '16px' }}>
            เชื่อมต่อกับหน้าจอสำเร็จ! อุปกรณ์ออนไลน์และพร้อมใช้งาน
          </div>
        )}

        {savedIP && (
          <div style={{
            marginBottom: 20,
            padding: '14px 16px',
            backgroundColor: 'var(--bg-muted, #f8f9fa)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                ที่อยู่ IP ของหน้าจอที่ตั้งค่าไว้:
              </div>
              <div style={{ fontSize: 16, fontWeight: '600', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                {savedIP}
              </div>
            </div>
            <button
              className="btn"
              onClick={handleTestConnection}
              disabled={testingConnection || status === 'connecting'}
              style={{
                fontSize: 12,
                padding: '6px 12px',
                height: 'auto',
                backgroundColor: 'var(--bg-card, #ffffff)',
                border: '1px solid var(--border-color, #cbd5e1)',
                cursor: 'pointer'
              }}
            >
              {testingConnection ? 'กำลังตรวจสอบ...' : 'ทดสอบการเชื่อมต่อ'}
            </button>
          </div>
        )}

        <div className="form-row form-row-2">
          <div className="form-group">
            <label className="form-label form-label-required">ชื่อ WiFi (SSID)</label>
            <input
              className="input"
              value={ssid}
              onChange={(e) => {
                setSsid(e.target.value);
                setDisconnectedAlert(false);
              }}
              placeholder="ชื่อเครือข่าย WiFi"
              disabled={status === 'connecting'}
              style={{ fontFamily: 'sans-serif' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">รหัสผ่าน</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setDisconnectedAlert(false);
              }}
              placeholder="รหัสผ่าน WiFi"
              disabled={status === 'connecting'}
              style={{ fontFamily: 'sans-serif' }}
            />
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSaveWiFi}
          disabled={status === 'connecting'}
        >
          {status === 'connecting' ? 'กำลังค้นหาอุปกรณ์และเชื่อมต่อ...' : 'บันทึกและเชื่อมต่อ'}
        </button>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12, marginBottom: 0 }}>
          เสียบสาย USB เข้ากับหน้าจอ Nerd Miner และคอมพิวเตอร์เครื่องนี้ จากนั้นกรอกชื่อ WiFi และรหัสผ่านเพื่อตั้งค่า
        </p>
      </div>
    </SettingBox>
  );
}