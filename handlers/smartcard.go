package handlers

import (
	"context"
	"CervusLedger/models"
)

type SmartCardHandler struct {
	ctx context.Context
}

func NewSmartCardHandler() *SmartCardHandler {
	return &SmartCardHandler{}
}

func (h *SmartCardHandler) Startup(ctx context.Context) {
	h.ctx = ctx
}

func (h *SmartCardHandler) ReadSmartCard() (models.Customer, error) {
	// Stub for reading Thai smart card
	return models.Customer{
		Prefix: "นาย",
		FirstName: "ทดสอบ",
		LastName: "สมาร์ทการ์ด",
		IDCard: "1234567890123",
		AddressNo: "99/9",
		Tambon: "ช้างเผือก",
		Amphoe: "เมืองเชียงใหม่",
		Province: "เชียงใหม่",
	}, nil
}
