package main

import (
	"context"
	"encoding/json"
	"fmt"
	_ "embed"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

//go:embed wails.json
var wailsJSON []byte

// GetVersion returns the product version from wails.json
func (a *App) GetVersion() string {
	var config struct {
		Info struct {
			ProductVersion string `json:"productVersion"`
		} `json:"info"`
	}
	if err := json.Unmarshal(wailsJSON, &config); err != nil {
		return "unknown"
	}
	return config.Info.ProductVersion
}
