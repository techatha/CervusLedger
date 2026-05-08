package main

import (
	"embed"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"

	"CervusLedger/db"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Set up database path in user's home directory
	homeDir, _ := os.UserHomeDir()
	dbPath := filepath.Join(homeDir, "CervusLedger", "data.db")

	// Create directory if it doesn't exist
	os.MkdirAll(filepath.Dir(dbPath), 0755)

	// Initialize database
	db.Init(dbPath)

	// Create app instance
	app := NewApp()

	err := wails.Run(&options.App{
		Title:  "CervusLedger",
		Width:  1280,
		Height: 800,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
