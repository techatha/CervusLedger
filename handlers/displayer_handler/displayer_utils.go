package displayer_handler

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/png"
	"net"

	"golang.org/x/image/draw"
)

const (
	TargetWidth  = 128
	TargetHeight = 128
)

type Bitmap struct {
	Width  int
	Height int
	Bytes  []byte
}

func DecodeBase64PNG(s string) ([]byte, error) {
	if idx := dataURLCommaIndex(s); idx != -1 {
		s = s[idx+1:]
	}
	return base64.StdEncoding.DecodeString(s)
}

func dataURLCommaIndex(s string) int {
	if len(s) < 5 || s[:5] != "data:" {
		return -1
	}
	for i := 0; i < len(s); i++ {
		if s[i] == ',' {
			return i
		}
	}
	return -1
}

func QRToBitmap(pngBytes []byte) (*Bitmap, error) {
	img, err := png.Decode(bytes.NewReader(pngBytes))
	if err != nil {
		return nil, fmt.Errorf("decode png: %w", err)
	}

	resized := image.NewGray(image.Rect(0, 0, TargetWidth, TargetHeight))
	// CatmullRom keeps QR module edges sharp after downscaling.
	draw.CatmullRom.Scale(resized, resized.Bounds(), img, img.Bounds(), draw.Over, nil)

	bytesPerRow := (TargetWidth + 7) / 8
	packed := make([]byte, bytesPerRow*TargetHeight)

	const threshold = 128 // 0-255 luminance midpoint
	for y := 0; y < TargetHeight; y++ {
		for x := 0; x < TargetWidth; x++ {
			lum := resized.GrayAt(x, y).Y
			if lum < threshold {
				byteIdx := y*bytesPerRow + x/8
				bitIdx := 7 - (x % 8) // MSB first
				packed[byteIdx] |= 1 << bitIdx
			}
		}
	}

	return &Bitmap{Width: TargetWidth, Height: TargetHeight, Bytes: packed}, nil
}

func getLocalIP() string {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		return "127.0.0.1" // Fallback
	}
	defer conn.Close()
	localAddr := conn.LocalAddr().(*net.UDPAddr)
	return localAddr.IP.String()
}
