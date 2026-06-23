import { useState } from 'react';
import SettingBox, { Field } from './SettingBox';

export default function ShopInfoSettings({ initialValues, onSave }) {
  const [shopName, setShopName] = useState(initialValues.shop_name || '');
  const [shopAddress, setShopAddress] = useState(initialValues.shop_address || '');
  const [shopPhone, setShopPhone] = useState(initialValues.shop_phone || '');

  const handleSave = async () => {
    if (!shopName.trim()) {
      throw new Error('กรุณากรอกชื่อร้าน');
    }
    await onSave({
      shop_name: shopName,
      shop_address: shopAddress,
      shop_phone: shopPhone
    });
  };

  return (
    <SettingBox
      title="ข้อมูลร้าน"
      onSave={handleSave}
    >
      <Field label="ชื่อร้าน" required>
        <input
          className="input"
          value={shopName}
          onChange={e => setShopName(e.target.value)}
          placeholder="ร้านทองสมศรี"
        />
      </Field>
      <Field label="ที่อยู่ร้าน">
        <input
          className="input"
          value={shopAddress}
          onChange={e => setShopAddress(e.target.value)}
          placeholder="123/4 ถ.เชียงใหม่-ลำพูน ต.ช้างม่อย อ.เมือง จ.เชียงใหม่"
        />
      </Field>
      <Field label="เบอร์โทรศัพท์">
        <input
          className="input"
          value={shopPhone}
          onChange={e => setShopPhone(e.target.value)}
          placeholder="053-123456"
        />
      </Field>
    </SettingBox>
  );
}
