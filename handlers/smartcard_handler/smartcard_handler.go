package smartcard_handler

// Thai National ID Card reader via PCSC (go-pcsclite).
//
// Install:  go get github.com/ebfe/scard
// macOS:    brew install pcsc-lite  (or use the built-in CryptoTokenKit)
// The IDENTIV SCR-2700R uses standard CCID — no extra driver needed.
//
// The Thai ID card public layer returns TLV-encoded data.
// This file parses the fields needed for the customer form.

import (
	"context"
	"fmt"
	"strings"

	"CervusLedger/models"

	"github.com/ebfe/scard"
)

// Thai ID card APDUs (public layer — no PIN required)
var (
	apdSelect  = []byte{0x00, 0xA4, 0x04, 0x00, 0x08, 0xA0, 0x00, 0x00, 0x00, 0x54, 0x48, 0x00, 0x01}
	apdCitizen = []byte{0x80, 0xB0, 0x00, 0x04, 0x02, 0x00, 0x0D, 0x00} // CID (13 digits)
	apdThName  = []byte{0x80, 0xB0, 0x00, 0x11, 0x02, 0x00, 0x64, 0x00} // Thai full name
	apdEnName  = []byte{0x80, 0xB0, 0x00, 0x75, 0x02, 0x00, 0x64, 0x00} // English full name
	apdDOB     = []byte{0x80, 0xB0, 0x00, 0xD9, 0x02, 0x00, 0x08, 0x00} // Date of birth
	apdAddress = []byte{0x80, 0xB0, 0x15, 0x79, 0x02, 0x00, 0x64, 0x00} // Address
)

type SmartCardHandler struct {
	ctx context.Context
	p2  byte
}

func NewSmartCardHandler() *SmartCardHandler {
	return &SmartCardHandler{
		p2: 0x00,
	}
}

func (h *SmartCardHandler) Startup(ctx context.Context) {
	h.ctx = ctx
}

func (h *SmartCardHandler) ReadSmartCard() (models.Customer, error) {
	ctx, err := scard.EstablishContext()
	if err != nil {
		return models.Customer{}, fmt.Errorf("ไม่พบเครื่องอ่านบัตร: %w", err)
	}
	defer ctx.Release()

	readers, err := ctx.ListReaders()
	if err != nil || len(readers) == 0 {
		return models.Customer{}, fmt.Errorf("ไม่พบเครื่องอ่านบัตร กรุณาเสียบเครื่องอ่าน")
	}

	card, err := ctx.Connect(readers[0], scard.ShareExclusive, scard.ProtocolAny)
	if err != nil {
		return models.Customer{}, fmt.Errorf("ไม่พบบัตรในเครื่องอ่าน กรุณาใส่บัตร")
	}
	defer card.Disconnect(scard.LeaveCard)

	h.p2 = 0x00
	if status, err := card.Status(); err == nil {
		fmt.Printf("[SmartCard] ATR: %x\n", status.Atr)
	} else {
		fmt.Printf("[SmartCard] Failed to read ATR: %v\n", err)
	}

	resp, err := card.Transmit(apdSelect)
	if err != nil {
		return models.Customer{}, fmt.Errorf("ไม่สามารถสั่งงานบัตรประชาชนได้: %w", err)
	}
	fmt.Printf("[SmartCard] Select response: %x\n", resp)
	if len(resp) < 2 {
		return models.Customer{}, fmt.Errorf("บัตรไม่ตอบสนอง")
	}
	sw1 := resp[len(resp)-2]
	if sw1 != 0x90 && sw1 != 0x61 {
		return models.Customer{}, fmt.Errorf("บัตรไม่ใช่บัตรประชาชนไทย (SW1=%02X)", sw1)
	}

	var c models.Customer

	data, err := h.transmit(card, apdCitizen)
	if err != nil {
		return models.Customer{}, fmt.Errorf("อ่านเลขบัตรประชาชนล้มเหลว: %w", err)
	}
	fmt.Printf("[SmartCard] Citizen ID raw bytes: %x\n", data)
	c.IDCard = strings.TrimSpace(h.thaiStr(data))
	fmt.Printf("[SmartCard] Citizen ID: %q\n", c.IDCard)

	data, err = h.transmit(card, apdThName)
	if err != nil {
		return models.Customer{}, fmt.Errorf("อ่านชื่อ-นามสกุลล้มเหลว: %w", err)
	}
	fmt.Printf("[SmartCard] Thai Name raw bytes: %x\n", data)
	c.Prefix, c.FirstName, c.LastName = h.parseThaiName(h.thaiStr(data))
	fmt.Printf("[SmartCard] Prefix: %q, First: %q, Last: %q\n", c.Prefix, c.FirstName, c.LastName)

	data, err = h.transmit(card, apdAddress)
	if err != nil {
		return models.Customer{}, fmt.Errorf("อ่านที่อยู่ล้มเหลว: %w", err)
	}
	fmt.Printf("[SmartCard] Address raw bytes: %x\n", data)
	h.parseAddress(h.thaiStr(data), &c)
	fmt.Printf("[SmartCard] Address: %+v\n", c)

	return c, nil
}

func (h *SmartCardHandler) transmit(card *scard.Card, apdu []byte) ([]byte, error) {
	resp, err := card.Transmit(apdu)
	if err != nil {
		return nil, err
	}

	currentApdu := make([]byte, len(apdu))
	copy(currentApdu, apdu)

	for {
		if len(resp) < 2 {
			return nil, fmt.Errorf("response too short")
		}

		sw1, sw2 := resp[len(resp)-2], resp[len(resp)-1]

		if sw1 == 0x61 {
			getResp := []byte{0x00, 0xC0, 0x00, h.p2, sw2}
			resp, err = card.Transmit(getResp)
			if err != nil {
				return nil, fmt.Errorf("GET RESPONSE failed: %w", err)
			}
			continue
		}

		if sw1 == 0x6C {
			if len(currentApdu) > 0 {
				currentApdu[len(currentApdu)-1] = sw2
				resp, err = card.Transmit(currentApdu)
				if err != nil {
					return nil, fmt.Errorf("re-transmit with correct length failed: %w", err)
				}
				continue
			}
		}

		if sw1 == 0x90 && sw2 == 0x00 {
			return resp[:len(resp)-2], nil
		}

		return nil, fmt.Errorf("APDU error %02X%02X", sw1, sw2)
	}
}

func (h *SmartCardHandler) thaiStr(b []byte) string {
	runes := make([]rune, 0, len(b))
	for _, ch := range b {
		switch {
		case ch == 0x00:
			// skip nulls
		case ch >= 0xA1:
			runes = append(runes, rune(0x0E00+(int(ch)-0xA0)))
		default:
			runes = append(runes, rune(ch))
		}
	}
	return strings.TrimSpace(string(runes))
}

func (h *SmartCardHandler) parseThaiName(full string) (prefix, first, last string) {
	parts := strings.Split(full, "#")
	var clean []string
	for _, p := range parts {
		clean = append(clean, strings.TrimSpace(p))
	}

	if len(clean) >= 1 {
		prefix = clean[0]
	}
	if len(clean) >= 2 {
		first = clean[1]
	}
	if len(clean) >= 4 {
		if clean[2] != "" {
			first = first + " " + clean[2]
		}
		last = clean[3]
	} else if len(clean) == 3 {
		last = clean[2]
	}
	return
}

func (h *SmartCardHandler) parseAddress(addr string, c *models.Customer) {
	parts := strings.Split(addr, "#")
	var cleanParts []string
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" {
			cleanParts = append(cleanParts, trimmed)
		}
	}

	if len(cleanParts) == 0 {
		return
	}

	c.AddressNo = cleanParts[0]

	for i := 1; i < len(cleanParts); i++ {
		part := cleanParts[i]
		if strings.Contains(part, "หมู่") {
			m := strings.TrimPrefix(part, "หมู่ที่")
			m = strings.TrimPrefix(m, "หมู่")
			c.Moo = strings.TrimSpace(m)
		} else if strings.Contains(part, "ตำบล") || strings.Contains(part, "แขวง") {
			t := strings.TrimPrefix(part, "ตำบล")
			t = strings.TrimPrefix(t, "แขวง")
			c.Tambon = strings.TrimSpace(t)
		} else if strings.Contains(part, "อำเภอ") || strings.Contains(part, "เขต") {
			a := strings.TrimPrefix(part, "อำเภอ")
			a = strings.TrimPrefix(a, "เขต")
			c.Amphoe = strings.TrimSpace(a)
		} else if strings.Contains(part, "จังหวัด") {
			p := strings.TrimPrefix(part, "จังหวัด")
			c.Province = strings.TrimSpace(p)
		} else {
			if strings.Contains(part, "ซอย") || strings.Contains(part, "ตรอก") || strings.Contains(part, "หมู่บ้าน") || strings.Contains(part, "อาคาร") || strings.Contains(part, "ตึก") || strings.Contains(part, "ชั้น") {
				if c.AddressLine != "" {
					c.AddressLine += " " + part
				} else {
					c.AddressLine = part
				}
			} else {
				r := strings.TrimPrefix(part, "ถนน")
				r = strings.TrimSpace(r)
				if c.Road == "" {
					c.Road = r
				} else {
					if c.AddressLine != "" {
						c.AddressLine += " " + part
					} else {
						c.AddressLine = part
					}
				}
			}
		}
	}
}
