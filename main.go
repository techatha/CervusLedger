package main

import (
	"context"
	"embed"
	"os"
	"path/filepath"
	"time"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"

	"CervusLedger/db"
	"CervusLedger/handlers"
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
	customerHandler := handlers.NewCustomerHandler()
	pawnHandler := handlers.NewPawnHandler()
	smartCardHandler := handlers.NewSmartCardHandler()
	goldItemHandler := handlers.NewGoldItemHandler()
	saleHandler := handlers.NewSaleHandler()
	goldPriceHandler := handlers.NewGoldPriceHandler()
	purchaseHandler := handlers.NewPurchaseHandler()

	err := wails.Run(&options.App{
		Title:  "CervusLedger",
		Width:  1280,
		Height: 800,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup: func(ctx context.Context) {
			app.startup(ctx)
			customerHandler.Startup(ctx)
			pawnHandler.Startup(ctx)
			smartCardHandler.Startup(ctx)
			goldItemHandler.Startup(ctx)
			saleHandler.Startup(ctx)
			goldPriceHandler.Startup(ctx)
			purchaseHandler.Startup(ctx)
			
			// Start background polling worker
			go goldPriceHandler.StartPolling(2 * time.Minute)
		},
		Bind: []interface{}{
			app,
			customerHandler,
			pawnHandler,
			smartCardHandler,
			goldItemHandler,
			saleHandler,
			goldPriceHandler,
			purchaseHandler,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
