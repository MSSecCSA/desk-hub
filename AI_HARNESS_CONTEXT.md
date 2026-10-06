# AI Coding Harness Context & Project Rules

## Project Identity
**Name**: AETHER Desk Hub
**Repository**: `desk-hub` (Deployed via GitHub Pages)
**Role**: A highly optimized, multi-screen glassmorphism dashboard and multimodal voice assistant. Designed specifically to run as a 24/7 dedicated kiosk appliance on Android tablets (specifically Samsung Galaxy Tab A7 running the "WallPanel Pro" kiosk app).

## Architectural Imperatives (STRICT RULES FOR AI AGENTS)

1. **Client-Side Only (Zero Backend)**
   - This project is 100% front-end JavaScript, CSS, and HTML. It is deployed statically to GitHub Pages.
   - **DO NOT** attempt to write Node.js backends, Express servers, Dockerfiles, or implement `npm install` packages.
   - **DO NOT** attempt to run an `npm start` or build process. Dependencies (Three.js, GSAP, Leaflet) are loaded via CDN.

2. **Security & Zero-Touch Provisioning**
   - **CRITICAL**: Never hardcode API keys or secrets in `app.js` or `index.html`.
   - The app dynamically ingests the Google Cloud API key via a URL parameter (`?gemini_key=YOUR_KEY`), stores it in `localStorage` (`aether_gemini_key`), and immediately scrubs the URL history.

3. **Android WebView / Kiosk Constraints**
   - The app runs in an Android WebView which lacks standard browser permission prompts.
   - Calling Promises that require OS prompts (like `await navigator.mediaDevices.getUserMedia`) will silently hang forever if the WebView drops the prompt. 
   - **Rule**: Always use non-blocking fire-and-forget logic for permission triggers.
   - Native CSS `overflow-x: auto` horizontal swiping is often hijacked by the kiosk app's edge-swipe menus. 
   - **Rule**: Rely on the bespoke JS `touchstart`/`touchend` delta calculator in `app.js` to animate `scrollLeft` via GSAP. Do not re-enable native CSS horizontal scrolling.

## Technology Stack & API Usage

If you are an AI coding harness (Cursor, Copilot, Antigravity, etc.) tasked with modifying this codebase, here is how the core systems work:

### UI / UX
- **Graphics**: HTML Canvas with Three.js (Kinetic particle waves responsive to audio).
- **Animations**: GSAP (GreenSock) for fluid entrance animations and horizontal swipe tweening.
- **Maps**: Leaflet.js rendering CartoDB dark basemaps, overlaid with RainViewer's public tile caches (zero-auth weather radar).
- **Styling**: Vanilla CSS with custom properties (`:root`). Heavy use of glassmorphism (`backdrop-filter: blur()`).

### Google Cloud Platform (GCP) APIs
The app leverages Google Cloud APIs directly via REST fetch calls (since Node SDKs cannot be used client-side without bundling).
- **GCP Project**: `aether-hub-98862a`
- **Key Authentication**: All GCP calls are authenticated by appending `?key=${CONFIG.geminiKey}` to the endpoint URL. The key is restricted by HTTP Referrer in the Google Cloud Console.

#### 1. Gemini Multimodal Live API (Speech-to-Speech via WebSockets)
- **Endpoint**: `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${CONFIG.geminiKey}`
- **Model**: `models/gemini-2.0-flash-exp`
- **Implementation**: Real-time 16kHz 16-bit PCM mono audio captured via an in-memory `AudioWorklet` (injected via Blob URL) and streamed directly over WebSockets for bi-directional voice streaming. Inbound 24kHz PCM chunks are decoded and queued via `AudioContext.createBufferSource()`.

#### 2. Gemini Cloud REST Engine (Cognitive Chips & Fallback)
- **Endpoint**: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=${CONFIG.geminiKey}`
- **Models**: Fallback cascade across `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`.
- **Implementation**: Powers tactile action chips (Weather, Daily Briefing, Music commands) and Settings API key verification.

#### 3. Google Cloud Text-to-Speech (TTS)
- **Endpoint**: `POST https://texttospeech.googleapis.com/v1/text:synthesize?key=${CONFIG.geminiKey}`
- **Implementation**: Synthesizes spoken answers for REST responses with the studio-grade `en-US-Journey-F` voice.

### Non-Google Integrations
- **Offline Wake Word**: Powered by Picovoice Porcupine WebAssembly (`@picovoice/porcupine-web@4.0.1`), configured with `BuiltInKeyword.Jarvis` and local `porcupine_params.pv`. Audio frames from the worklet are accumulated into 512-sample Int16 buffers and processed in-browser without network calls.
- **Audio Streams**: 100% ad-free, direct 24/7 `audio/mpeg` streams (StreamAfrica, Zeno.fm, Nightride FM, and TorontoCast nature audio). Commercial streams that inject dynamic audio ads or return HTML player wrappers are strictly prohibited.
- **Android Intents**: To break out of the kiosk WebView, native Android features are triggered using standard anchor tags with `href="intent://..."` URIs (e.g., launching YT Music, Bluetooth Settings, Cast Settings) without calling `e.preventDefault()`.

## Development Workflow
1. Edit `index.html`, `style.css`, or `app.js`.
2. Commit and push directly to `main`.
3. GitHub Pages automatically redeploys.
4. The Android tablet will refresh and pull the latest `main` branch. 

*Note: The user relies on a hardware security key (YubiKey/TouchID) for Git commits. Automated tools or subagents executing git commits on the user's behalf must bypass GPG signing using `git commit --no-gpg-sign` to avoid hanging the terminal.*
