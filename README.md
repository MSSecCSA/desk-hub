# AETHER // Intelligent Desk Appliance

A heavily optimized, multi-screen glassmorphism dashboard and multimodal voice assistant. Designed specifically to run as a 24/7 dedicated kiosk appliance on Android tablets (e.g., Samsung Galaxy Tab A7 running WallPanel Pro).

## Core Architecture & Features

### 1. Multi-Screen Kinetic UI
- **Horizontal Swiping**: Bypass native Android WebView scroll-blocking with a robust, bespoke JavaScript touch-event router.
- **Screen 1 (Dashboard)**: High-contrast chronometry, real-time geolocation weather (Open-Meteo), and quick-access Bluetooth & Cast intents.
- **Screen 2 (Atmosphere)**: Interactive Leaflet maps featuring a CartoDB dark base and live, zero-auth **RainViewer** precipitation radar and infrared cloud cover overlays.
- **Screen 3 (Intelligence)**: The cognitive assistant hub featuring multimodal voice processing and an explicit "Trust" authorization workflow for Android microphone permissions.

### 2. Acoustic Engine & Integrations
- **Ad-Free Radial Streaming**: Completely stripped of commercial YouTube streams. Features 4 built-in **SomaFM** streams (Groove Salad, Secret Agent, Drone Zone, Def Con Radio) for 24/7 uninterrupted ambient audio.
- **Deep Linking**: 1-tap intent gateways directly into the Android OS for YouTube Music, Bluetooth pairing, and Screen Casting.

### 3. Multimodal Voice Assistant (Google Cloud Powered)
- **Always-On Wake Word**: Continuous background listener leveraging native `SpeechRecognition` triggered by custom wake words (e.g., "Hey Jarvis").
- **Google Cloud TTS**: Answers are synthesized using premium, studio-grade Google Cloud Text-to-Speech (`en-US-Journey-F` voice) instead of robotic browser voices.
- **Multimodal Push-To-Talk (PTT)**: Captures raw high-fidelity `audio/webm` buffers and routes them directly to **Gemini 2.5 Flash** for pure speech-to-speech reasoning and intent mapping.

---

## Google Cloud Platform (GCP) Configuration

This appliance is powered by the GCP project `aether-hub-98862a`.

**Enabled APIs:**
- Generative Language API (Gemini)
- Cloud Text-to-Speech API
- Cloud Speech-to-Text API

**Security Posture:**
- The API key is securely stored in GCP Secret Manager (`aether-desk-hub-api-key`).
- The key is severely restricted via HTTP referrers to only accept requests originating from the authorized GitHub Pages deployment (`https://msseccsa.github.io/*`) and local testing (`http://localhost:*/*`).
- **Zero-Touch Provisioning**: The API key is *never* hardcoded into this repository.

---

## Deployment & Setup Instructions

### 1. Zero-Touch URL Provisioning (Tablet Setup)
To securely provision the tablet without typing a massive API key on an Android virtual keyboard, append your configurations as URL parameters. `app.js` will intercept them, save them to the device's secure `localStorage`, and immediately wipe the URL history to prevent leaks.

Enter this exact URL into your Android Kiosk Browser:
`https://msseccsa.github.io/desk-hub/?gemini_key=YOUR_GCP_API_KEY&wakeword=hey+jarvis`

### 2. Establishing Microphone Trust
Android WebViews (like WallPanel Pro) will silently hang if microphone permissions are requested without explicit user interaction. 
1. Swipe to Screen 3 (Intelligence).
2. Tap the massive **AUTHORIZE ALWAYS-ON MICROPHONE** button.
3. Accept the Android OS permission popup. The background listener will now remain active.

### 3. Deploying Code Changes
Because hardware security keys (YubiKey/TouchID) can block automated deployment scripts, run this manually from your terminal to bypass the GPG signature requirement if your token is unavailable:
```bash
git add . && git commit --no-gpg-sign -m "Deploy update" && git push
```
