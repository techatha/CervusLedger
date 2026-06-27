import { GetWiFiDisplayerIP, RegisterWebhook } from 'wailsjs/go/handlers/DisplayerHandler.js';

export async function syncDevice() {
    try {
        // 1. Grab the currently saved ESP32 IP from your SQLite DB
        const espIp = await GetWiFiDisplayerIP();
        
        if (espIp) {
            // 2. Tell the Go backend to send its local IP to the ESP32
            await RegisterWebhook(espIp);
            console.log("Webhook successfully registered with ESP32 at:", espIp);
        }
    } catch (error) {
        console.error("Failed to sync device webhook:", error);
    }
}
