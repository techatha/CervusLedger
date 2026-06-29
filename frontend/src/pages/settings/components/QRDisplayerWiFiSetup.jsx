import { useState, useCallback, useEffect, useRef } from 'react';
import {
  GetWiFiDisplayerIP,
  TestWiFiDisplayerConnection,
  SaveWiFiCredentialsAuto,
  SetShopName,
  SendStaticQRToDisplay,
  ListSerialPorts,
} from 'wailsjs/go/displayer_handler/DisplayerHandler.js';
import SettingBox, { Field } from './SettingBox';
import { syncDevice } from '@/utils/esp32Sync';
import { EventsOn } from 'wailsjs/runtime/runtime.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWifi } from '@fortawesome/free-solid-svg-icons';
import { faUsb } from '@fortawesome/free-brands-svg-icons';

import './QRDisplayerWiFiSetup.css';

/* ─── Status strip inside the box header area ─────────────────────── */
function StatusStrip({ status, ip, portName, onRetest }) {
  const map = {
    probing: { cls: 'qrd-strip qrd-strip--probing', dot: '⟳', label: 'ตรวจสอบการเชื่อมต่อ...' },
    online: { cls: 'qrd-strip qrd-strip--online', dot: '●', label: `ออนไลน์${ip ? ` · ${ip}` : ''}` },
    offline: { cls: 'qrd-strip qrd-strip--offline', dot: '●', label: 'ไม่พบหน้าจอบนเครือข่ายนี้' },
    unknown: { cls: 'qrd-strip qrd-strip--unknown', dot: '○', label: 'ไม่สามารถเชื่อมต่ออุปกรณ์' },
  };
  const cfg = map[status] || map.unknown;
  return (
    <div className={cfg.cls}>
      <span className={`qrd-strip__dot${status === 'probing' ? ' qrd-spin' : ' qrd-pulse'}`} aria-hidden="true">
        {cfg.dot}
      </span>
      <span className="qrd-strip__label">{cfg.label}</span>
      {portName && (
        <span className="qrd-port-pill">
          <span className="qrd-port-pill__dot qrd-pulse" />
          {portName.replace('/dev/', '')}
        </span>
      )}
      {status !== 'probing' && (
        <button className="qrd-strip__retest" onClick={onRetest}>ทดสอบใหม่</button>
      )}
    </div>
  );
}

/* ─── Numbered reset guide ─────────────────────────────────────────── */
function ResetStep({ n, label, children }) {
  return (
    <div className="qrd-step">
      <div className="qrd-step-num">{n}</div>
      <div className="qrd-step-body">
        {label && <div className="qrd-step-label">{label}</div>}
        {children}
      </div>
    </div>
  );
}

function ResetGuide() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        วิธีเชื่อมต่ออุปกรณ์ใหม่
      </div>
      <ResetStep n={1} label="เสียบสาย USB">
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          เสียบสาย USB จากหน้าจอ QR Code เข้ากับคอมพิวเตอร์เครื่องนี้
        </div>
      </ResetStep>
      <ResetStep n={2} label="รีเซ็ตหน้าจอ">
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          กดปุ่มด้านข้างหน้าจอค้างไว้ <strong>4 วินาที</strong> จนหน้าจอขึ้น "รีเซ็ตสำเร็จ"
        </div>
      </ResetStep>
      <ResetStep n={3} label="รอการตรวจพบอุปกรณ์">
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          รอแถบ <strong>USB พบอุปกรณ์</strong> ปรากฏด้านบน แล้วกรอก WiFi ในกล่องตั้งค่าด้านล่าง
        </div>
      </ResetStep>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────── */
export default function QRDisplayerWiFiSetup({ initialValues, onSave, shopName }) {
  const [promptpayNumber, setPromptpayNumber] = useState(initialValues?.promptpay_number || '');
  const [promptpayName, setPromptpayName] = useState(initialValues?.promptpay_name || '');
  const [bankName, setBankName] = useState(initialValues?.bank_name || '');
  const [bankAccount, setBankAccount] = useState(initialValues?.bank_account || '');

  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [wifiBusy, setWifiBusy] = useState(false);
  const [wifiError, setWifiError] = useState(null);
  const [wifiSuccess, setWifiSuccess] = useState(false);

  const [savedIP, setSavedIP] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState('probing');
  const [portName, setPortName] = useState(null);
  const [sendingQR, setSendingQR] = useState(false);
  const [qrFeedback, setQRFeedback] = useState(null); // null | 'ok' | 'err'

  const scanTimer = useRef(null);
  const portLatched = useRef(false);

  /* 1. Auto-probe on mount */
  useEffect(() => {
    (async () => {
      let ip = null;
      try { ip = await GetWiFiDisplayerIP(); if (ip) setSavedIP(ip); } catch (_) { }
      if (!ip) { setDeviceStatus('unknown'); return; }
      try {
        const ok = await TestWiFiDisplayerConnection(ip);
        setDeviceStatus(ok ? 'online' : 'offline');
      } catch (_) { setDeviceStatus('offline'); }
    })();
  }, []);

  /* 2. Serial scanner — active only while this page is mounted */
  useEffect(() => {
    async function scan() {
      if (portLatched.current) {
        console.log('[Scanner] Port is already latched. Current port:', portName);
        return;
      }
      
      console.log('[Scanner] Polling for physically connected ESP32...');

      try {
        // 1. Dynamically import the handlers
        const handlers = await import('wailsjs/go/displayer_handler/DisplayerHandler.js').catch((err) => {
          console.error('[Scanner] ❌ Failed to import Wails bindings:', err);
          return {};
        });

        console.log('[Scanner] 🔍 Available Wails handlers:', Object.keys(handlers));

        // 2. Look for our smart checking function, fallback to FindESP32Port if needed
        const checker = handlers.CheckPhysicalConnection || handlers.FindESP32Port;

        if (typeof checker !== 'function') {
          console.error('[Scanner] ❌ Checker function not found! Did you restart `wails dev` to regenerate bindings?');
          return;
        }

        console.log('[Scanner] 📡 Executing checker function...');
        const foundPort = await checker();
        
        console.log('[Scanner] ✅ Device found on port:', foundPort);
        
        if (foundPort) {
          portLatched.current = true;
          setPortName(foundPort);
        }
      } catch (err) {
        // FindESP32Port returns an error in Go if no device is found, which throws an exception in JS
        console.log('[Scanner] ℹ️ Device not found or checker threw error:', err);
        setPortName(null);
      }
    }

    scan();
    scanTimer.current = setInterval(scan, 5000);
    
    return () => {
      console.log('[Scanner] Cleaning up scanner timer...');
      clearInterval(scanTimer.current);
    };
  }, []);

  /* 3. Disconnect event */
  useEffect(() => {
    const onDisconnect = () => {
      setSavedIP(null); setDeviceStatus('offline');
      setPortName(null); portLatched.current = false;
    };
    const unsub = EventsOn('esp32:disconnected', onDisconnect);
    window.addEventListener('esp32:disconnected', onDisconnect);
    return () => { if (typeof unsub === 'function') unsub(); window.removeEventListener('esp32:disconnected', onDisconnect); };
  }, []);

  const handleRetest = useCallback(async () => {
    if (!savedIP) { setDeviceStatus('unknown'); return; }
    setDeviceStatus('probing');
    try { setDeviceStatus(await TestWiFiDisplayerConnection(savedIP) ? 'online' : 'offline'); }
    catch (_) { setDeviceStatus('offline'); }
  }, [savedIP]);

  /* PromptPay save — called by SettingBox's own Save button */
  const handleSavePromptPay = useCallback(async () => {
    if (!promptpayNumber.trim()) throw new Error('กรุณากรอกหมายเลขพร้อมเพย์');
    setQRFeedback(null);
    await onSave({ promptpay_number: promptpayNumber, promptpay_name: promptpayName, bank_name: bankName, bank_account: bankAccount });
    if (savedIP) {
      setSendingQR(true);
      try { await SendStaticQRToDisplay(promptpayNumber, promptpayName, bankName, bankAccount); setQRFeedback('ok'); }
      catch (err) { setQRFeedback('err'); console.warn(err); }
      finally { setSendingQR(false); }
    }
  }, [promptpayNumber, promptpayName, bankName, bankAccount, onSave, savedIP]);

  const handleSendQR = useCallback(async () => {
    if (!promptpayNumber.trim()) return;
    setSendingQR(true); setQRFeedback(null);
    try { await SendStaticQRToDisplay(promptpayNumber, promptpayName, bankName, bankAccount); setQRFeedback('ok'); }
    catch (err) { setQRFeedback('err'); console.warn(err); }
    finally { setSendingQR(false); }
  }, [promptpayNumber, promptpayName, bankName, bankAccount]);

  const handleConnectWifi = useCallback(async () => {
    if (!ssid.trim()) { setWifiError('กรุณากรอกชื่อ WiFi'); return; }
    setWifiBusy(true); setWifiError(null); setWifiSuccess(false); setDeviceStatus('probing');
    try {
      const ip = await SaveWiFiCredentialsAuto(ssid, password);
      setSavedIP(ip);
      if (shopName) { try { await SetShopName(shopName); } catch (_) { } }
      await syncDevice();
      setWifiSuccess(true); setDeviceStatus('online'); portLatched.current = false;
    } catch (err) { setWifiError(err.message || String(err)); setDeviceStatus('offline'); }
    finally { setWifiBusy(false); }
  }, [ssid, password, shopName]);

  const isOnline = deviceStatus === 'online';

  return (
    <SettingBox
      title="หน้าจอแสดง QR Code"
      onSave={isOnline ? handleSavePromptPay : undefined}
      showSave={isOnline}
    >
      {/* ── Device status strip ── */}
      <StatusStrip
        status={deviceStatus}
        ip={savedIP}
        portName={portName}
        onRetest={handleRetest}
      />

      {/* ── Reset guide when not online ── */}
      {!isOnline && <ResetGuide />}

      {/* ── WiFi subsection ── */}
      <div className="qrd-subsection" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--divider)' }}>
        <div className="qrd-subsection__label">
          <FontAwesomeIcon icon={faWifi} /> การเชื่อมต่อ WiFi
        </div>
        
        {/* ONLY show inputs if USB is physically connected (portName exists) */}
        {portName ? (
          <>
            <div className="form-row form-row-2">
              <Field label="ชื่อ WiFi (SSID)" required>
                <input className="input" value={ssid} onChange={e => { setSsid(e.target.value); setWifiError(null); }}
                  placeholder="ชื่อเครือข่าย WiFi" disabled={wifiBusy} style={{ fontFamily: 'sans-serif' }} />
              </Field>
              <Field label="รหัสผ่าน">
                <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="รหัสผ่าน" disabled={wifiBusy} style={{ fontFamily: 'sans-serif' }} />
              </Field>
            </div>

            {wifiError && <div className="alert alert-error">{wifiError}</div>}
            {wifiSuccess && <div className="alert alert-success">เชื่อมต่อสำเร็จ — IP: {savedIP}</div>}

            <button className="btn btn-primary" onClick={handleConnectWifi} disabled={wifiBusy} style={{ marginTop: 4 }}>
              {wifiBusy
                ? <><span className="qrd-spinner" />ค้นหาและเชื่อมต่ออุปกรณ์...</>
                : 'บันทึกและเชื่อมต่อ'}
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--bg-subtle, #f9fafb)', borderRadius: 8, marginTop: 12 }}>
            <FontAwesomeIcon icon={faUsb} style={{ fontSize: 24, color: 'var(--text-muted)', marginBottom: 8 }} />
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>
              เสียบสาย USB เข้ากับคอมพิวเตอร์เพื่อตั้งค่า WiFi
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
              ระบบจะเปิดฟอร์มตั้งค่าเครือข่ายเมื่อตรวจพบหน้าจอ
            </div>
          </div>
        )}
      </div>

      {/* ── PromptPay subsection — only when online ── */}
      {isOnline && (
        <div className="qrd-subsection">
          <div className="qrd-subsection__label">
            <svg className="qrd-subsection__icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            PromptPay &amp; QR ร้านค้า
          </div>

          <div className="form-row form-row-2">
            <Field label="หมายเลขพร้อมเพย์" required>
              <input className="input" value={promptpayNumber} onChange={e => setPromptpayNumber(e.target.value)}
                placeholder="เบอร์โทรศัพท์ หรือ เลขบัตรประชาชน" />
            </Field>
            <Field label="ชื่อบัญชี">
              <input className="input" value={promptpayName} onChange={e => setPromptpayName(e.target.value)}
                placeholder="ชื่อร้าน หรือ เจ้าของบัญชี" />
            </Field>
          </div>
          <div className="form-row form-row-2" style={{ marginTop: 10 }}>
            <Field label="ธนาคาร">
              <input className="input" value={bankName} onChange={e => setBankName(e.target.value)}
                placeholder="เช่น กสิกรไทย, ไทยพาณิชย์..." />
            </Field>
            <Field label="เลขบัญชี">
              <input className="input" value={bankAccount} onChange={e => setBankAccount(e.target.value)}
                placeholder="123-4-56789-0" />
            </Field>
          </div>

          {qrFeedback === 'ok' && <div className="alert alert-success">ส่ง QR ตั้งต้นไปยังหน้าจอสำเร็จ</div>}
          {qrFeedback === 'err' && <div className="alert alert-error">ส่ง QR ไปหน้าจอไม่สำเร็จ — ตรวจสอบการเชื่อมต่อ</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleSendQR} disabled={sendingQR || !promptpayNumber.trim()}>
              {sendingQR ? <><span className="qrd-spinner" />ส่ง QR...</> : 'ส่ง QR ตั้งต้นไปหน้าจอ'}
            </button>
          </div>
        </div>
      )}
    </SettingBox>
  );
}