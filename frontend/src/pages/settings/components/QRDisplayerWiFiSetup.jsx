import { useState, useCallback, useEffect } from 'react';
import { GetWiFiDisplayerIP, TestWiFiDisplayerConnection, SaveWiFiCredentialsAuto, SetShopName } from 'wailsjs/go/handlers/DisplayerHandler.js';
import SettingBox from './SettingBox';

export default function QRDisplayerWiFiSetup({ shopName }) {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle'); // idle | connecting | done | error
  const [error, setError] = useState(null);
  const [savedIP, setSavedIP] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(null); // null | true | false

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

  const handleSave = useCallback(async () => {
    if (!ssid) {
      setError('กรุณากรอกชื่อ WiFi');
      return;
    }

    setStatus('connecting');
    setError(null);
    setConnectionSuccess(null); // Reset connection test state

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
      
      setStatus('done');
    } catch (err) {
      setError(err.message || String(err));
      setStatus('error');
    }
  }, [ssid, password, shopName]);

  return (
    <SettingBox
      title="ตั้งค่าหน้าจอแสดง QR Code"
      showSave={false}
    >
      {error && <div className="alert alert-error">{error}</div>}
      {status === 'done' && savedIP && (
        <div className="alert alert-success">
          เชื่อมต่อสำเร็จ — IP ของหน้าจอ: {savedIP}
        </div>
      )}
      {connectionSuccess === true && (
        <div className="alert alert-success">
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
            onChange={(e) => setSsid(e.target.value)}
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
            onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่าน WiFi"
            disabled={status === 'connecting'}
            style={{ fontFamily: 'sans-serif' }}
          />
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={handleSave}
        disabled={status === 'connecting'}
      >
        {status === 'connecting' ? 'กำลังค้นหาอุปกรณ์และเชื่อมต่อ...' : 'บันทึกและเชื่อมต่อ'}
      </button>

      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>
        เสียบสาย USB เข้ากับหน้าจอ Nerd Miner และคอมพิวเตอร์เครื่องนี้ จากนั้นกรอกชื่อ WiFi และรหัสผ่านเพื่อตั้งค่า
      </p>
    </SettingBox>
  );
}