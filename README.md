# Desk Hub & Audio Station

A responsive, dark-glassmorphism ambient desk display and audio appliance built for tablet and kiosk hardware (optimized for 2000x1200 landscape).

## Features
- **Ambient Glance**: High-contrast digital clock (12h/24h), live seconds bar, full calendar date.
- **Live Weather**: Powered by Open-Meteo (100% free, no API key required). Shows current temp, high/low, humidity, wind, and conditions.
- **Audio Hub**:
  - Direct 1-tap launcher for native **YouTube Music**.
  - 4 built-in ambient radio streams: *Lo-Fi Chillhop*, *Smooth Coffeehouse Jazz*, *Gentle Rainstorm*, *Deep Focus Synthwave*.
  - Live animated CSS audio visualizer bars & volume control.
- **AI Voice Assistant (Always-Listening Wake Word)**:
  - Listens continuously for **"Hey Jarvis"** (or custom configured wake word).
  - Synthesizes an on-device acoustic chime on trigger.
  - Glowing animated AI orb / soundwave feedback.
  - Executes local commands (*"Play lo-fi"*, *"Stop music"*, *"What's the weather"*, *"What time is it"*).
  - Optional Google Gemini API integration for full conversational AI answers.
  - Speaks answers back aloud via `window.speechSynthesis`.
