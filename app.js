// AETHER // Intelligent Desk Appliance Core

// Zero-Touch URL Configuration Override (for seamless appliance provisioning)
try {
  const urlParams = new URLSearchParams(window.location.search);
  let shouldCleanUrl = false;
  if (urlParams.has('gemini_key') || urlParams.has('key')) {
    const pKey = urlParams.get('gemini_key') || urlParams.get('key');
    if (pKey) {
      localStorage.setItem('aether_gemini_key', pKey);
      shouldCleanUrl = true;
    }
  }
  if (urlParams.has('pv_key')) {
    localStorage.setItem('aether_pv_key', urlParams.get('pv_key'));
    shouldCleanUrl = true;
  }
  if (urlParams.has('city')) {
    localStorage.setItem('aether_city', urlParams.get('city'));
    shouldCleanUrl = true;
  }
  if (urlParams.has('wakeword')) {
    localStorage.setItem('aether_wakeword', urlParams.get('wakeword'));
    shouldCleanUrl = true;
  }
  if (shouldCleanUrl) {
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
  }
} catch (e) {
  console.warn('URL param parse error:', e);
}

// Configuration & Local Persistence
const CONFIG = {
  wakeWord: localStorage.getItem('aether_wakeword') || 'hey jarvis',
  geminiKey: localStorage.getItem('aether_gemini_key') || '',
  pvKey: localStorage.getItem('aether_pv_key') || '',
  customCity: localStorage.getItem('aether_city') || '',
  use24h: localStorage.getItem('aether_24h') === 'true',
  volume: parseFloat(localStorage.getItem('aether_volume') || '0.8')
};

// Global State
let audioCtx = null;
let analyser = null;
let audioSource = null;
let audioDataArray = null;
let isPlaying = false;
let currentStation = null;
let isAwake = false;
let recognition = null;
let wakeTimer = null;
let conversationHistory = [];

// Audio Streams
const STATIONS = {
  lofi: { name: 'SomaFM Groove Salad', url: 'https://ice6.somafm.com/groovesalad-256-mp3' },
  jazz: { name: 'SomaFM Secret Agent', url: 'https://ice4.somafm.com/secretagent-256-mp3' },
  rain: { name: 'SomaFM Drone Zone', url: 'https://ice4.somafm.com/dronezone-256-mp3' },
  synthwave: { name: 'SomaFM Def Con Radio', url: 'https://ice6.somafm.com/defcon-256-mp3' }
};

// DOM References
const timeDisplay = document.getElementById('time-display');
const amPmDisplay = document.getElementById('am-pm');
const secondsDisplay = document.getElementById('seconds-display');
const secondsProgress = document.getElementById('seconds-progress');
const dateDisplay = document.getElementById('date-display');
const miniDate = document.getElementById('mini-date');

const weatherTemp = document.getElementById('weather-temp');
const weatherDesc = document.getElementById('weather-desc');
const weatherIcon = document.getElementById('weather-icon');
const weatherHumidity = document.getElementById('weather-humidity');
const weatherWind = document.getElementById('weather-wind');
const weatherHighlow = document.getElementById('weather-highlow');
const weatherCity = document.getElementById('weather-city');

const audioPlayer = document.getElementById('audio-player');
const btnPlayPause = document.getElementById('btn-play-pause');
const playText = document.getElementById('play-text');
const nowPlayingTitle = document.getElementById('now-playing-title');
const volumeSlider = document.getElementById('volume-slider');
const matrixTiles = document.querySelectorAll('.matrix-tile');

const voiceIndicator = document.getElementById('voice-indicator');
const wakeStatusText = document.getElementById('wake-status-text');
const assistantResponse = document.getElementById('assistant-response');
const userSpeech = document.getElementById('user-speech');
const orbTrigger = document.getElementById('orb-trigger');

const btnSettings = document.getElementById('btn-settings');
const settingsModal = document.getElementById('settings-modal');
const modalClose = document.getElementById('modal-close');
const btnSaveSettings = document.getElementById('btn-save-settings');
const cfgWakeword = document.getElementById('cfg-wakeword');
const cfgGeminiKey = document.getElementById('cfg-gemini-key');
const cfgCity = document.getElementById('cfg-city');
const cfg24h = document.getElementById('cfg-24h');
const geminiStatus = document.getElementById('gemini-status');
const btnTestGemini = document.getElementById('btn-test-gemini');

/* ==========================================================================
   1. Three.js 3D Kinetic Background Engine
   ========================================================================== */
let scene, camera, renderer, particles, particlePositions, particleVelocities;
const PARTICLE_COUNT = 1400;
let shockwaveRadius = 0;
let shockwaveActive = false;

function initThreeScene() {
  const canvas = document.getElementById('webgl-canvas');
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x06080d, 0.0018);

  camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.z = 700;
  camera.position.y = 120;

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Kinetic Particle Lattice
  const geometry = new THREE.BufferGeometry();
  particlePositions = new Float32Array(PARTICLE_COUNT * 3);
  particleVelocities = new Float32Array(PARTICLE_COUNT);

  const rangeX = 1800;
  const rangeY = 900;
  const rangeZ = 1000;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    particlePositions[i3] = (Math.random() - 0.5) * rangeX;
    particlePositions[i3 + 1] = (Math.random() - 0.5) * rangeY - 100;
    particlePositions[i3 + 2] = (Math.random() - 0.5) * rangeZ;
    particleVelocities[i] = Math.random() * 0.02 + 0.005;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  // Subtle cyan-indigo particle material
  const material = new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 3.2,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);

  window.addEventListener('resize', onWindowResize, false);
  animateThree();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

let clock = new THREE.Clock();

function animateThree() {
  requestAnimationFrame(animateThree);
  const elapsedTime = clock.getElapsedTime();

  // Audio Reactivity
  let audioEnergy = 0;
  if (analyser && isPlaying && audioDataArray) {
    try {
      analyser.getByteFrequencyData(audioDataArray);
      let sum = 0;
      for (let i = 0; i < 32; i++) sum += audioDataArray[i];
      audioEnergy = (sum / 32) / 255; // 0.0 to 1.0
    } catch (e) {}
  }
  if (isPlaying && audioEnergy === 0) {
    // Generative kinetic pulse when streaming
    audioEnergy = 0.35 + Math.sin(elapsedTime * 3.2) * 0.15 + Math.cos(elapsedTime * 6.5) * 0.1;
  }

  const positions = particles.geometry.attributes.position.array;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    const x = positions[i3];
    const z = positions[i3 + 2];

    // Undulating 3D wave mathematics
    const wave = Math.sin(x * 0.003 + elapsedTime * 1.2) * Math.cos(z * 0.003 + elapsedTime * 0.8) * (35 + audioEnergy * 70);
    positions[i3 + 1] = wave - 120;

    // Shockwave ripple when AI is awakened
    if (shockwaveActive) {
      const dist = Math.sqrt(x * x + z * z);
      const diff = Math.abs(dist - shockwaveRadius);
      if (diff < 90) {
        positions[i3 + 1] += Math.sin((diff / 90) * Math.PI) * 50;
      }
    }
  }

  if (shockwaveActive) {
    shockwaveRadius += 16;
    if (shockwaveRadius > 1400) {
      shockwaveActive = false;
      shockwaveRadius = 0;
    }
  }

  particles.geometry.attributes.position.needsUpdate = true;
  particles.rotation.y = elapsedTime * 0.025;

  renderer.render(scene, camera);
}

function trigger3DShockwave() {
  shockwaveActive = true;
  shockwaveRadius = 0;
}

initThreeScene();

/* ==========================================================================
   2. GSAP Entrance Timeline & Micro-Interactions
   ========================================================================== */
function runEntranceAnimations() {
  if (typeof gsap === 'undefined') return;
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.from('.top-nav', {
    y: -20,
    opacity: 0,
    duration: 0.7
  })
  .from('.bento-card', {
    y: 30,
    opacity: 0,
    scale: 0.98,
    duration: 0.8,
    stagger: 0.1
  }, '-=0.3');
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', runEntranceAnimations);
} else {
  runEntranceAnimations();
}

/* ==========================================================================
   3. Chrono Engine
   ========================================================================== */
function updateClock() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = now.getSeconds();

  if (CONFIG.use24h) {
    timeDisplay.textContent = `${String(hours).padStart(2, '0')}:${minutes}`;
    amPmDisplay.textContent = '24H';
  } else {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    timeDisplay.textContent = `${hours}:${minutes}`;
    amPmDisplay.textContent = ampm;
  }

  secondsDisplay.textContent = `:${String(seconds).padStart(2, '0')}`;

  const pct = ((seconds + now.getMilliseconds() / 1000) / 60) * 100;
  secondsProgress.style.width = `${pct}%`;

  const dateOpts = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
  const dateStr = now.toLocaleDateString(undefined, dateOpts);
  dateDisplay.textContent = dateStr;
  miniDate.textContent = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

setInterval(updateClock, 250);
updateClock();

/* ==========================================================================
   4. Weather & Atmosphere Engine (Open-Meteo)
   ========================================================================== */
const WMO_CODES = {
  0: { desc: 'Clear sky', icon: '☀️' },
  1: { desc: 'Mainly clear', icon: '🌤️' },
  2: { desc: 'Partly cloudy', icon: '⛅' },
  3: { desc: 'Overcast', icon: '☁️' },
  45: { desc: 'Dense fog', icon: '🌫️' },
  51: { desc: 'Light drizzle', icon: '🌦️' },
  61: { desc: 'Slight rain', icon: '🌧️' },
  65: { desc: 'Heavy rain', icon: '⛈️' },
  71: { desc: 'Light snow', icon: '🌨️' },
  95: { desc: 'Thunderstorm', icon: '⚡' }
};

async function fetchAtmosphere() {
  try {
    let lat = 40.7128;
    let lon = -74.0060;
    let cityLabel = 'Auto Geolocation';

    try {
      const geo = await fetch('https://ipapi.co/json/');
      if (geo.ok) {
        const d = await geo.json();
        lat = d.latitude || lat;
        lon = d.longitude || lon;
        cityLabel = `${d.city || 'Local'}, ${d.region_code || ''}`;
      }
    } catch (e) {
      console.warn('IP geoloc fallback', e);
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();

    const curr = data.current;
    const daily = data.daily;
    const info = WMO_CODES[curr.weather_code] || { desc: 'Fair', icon: '🌤️' };

    weatherTemp.textContent = `${Math.round(curr.temperature_2m)}°`;
    weatherDesc.textContent = info.desc;
    weatherIcon.textContent = info.icon;
    weatherHumidity.textContent = `${curr.relative_humidity_2m}%`;
    weatherWind.textContent = `${Math.round(curr.wind_speed_10m)} mph`;
    if (daily && daily.temperature_2m_max) {
      weatherHighlow.textContent = `${Math.round(daily.temperature_2m_max[0])}°/${Math.round(daily.temperature_2m_min[0])}°`;
    }
    weatherCity.textContent = cityLabel;
  } catch (err) {
    console.warn('Atmosphere load failure:', err);
    weatherDesc.textContent = 'Weather Unavailable';
  }
}

fetchAtmosphere();
setInterval(fetchAtmosphere, 30 * 60 * 1000);

/* ==========================================================================
   5. Acoustic Engine (Web Audio API & Stream Manager)
   ========================================================================== */
audioPlayer.volume = CONFIG.volume;
volumeSlider.value = CONFIG.volume;

function setupAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playStation(key) {
  setupAudioContext();
  const station = STATIONS[key];
  if (!station) return;

  currentStation = key;
  audioPlayer.src = station.url;
  audioPlayer.loop = !!station.loop;

  audioPlayer.play()
    .then(() => {
      isPlaying = true;
      btnPlayPause.disabled = false;
      playText.textContent = 'PAUSE';
      nowPlayingTitle.textContent = `Streaming: ${station.name}`;

      matrixTiles.forEach(tile => {
        const isSelected = tile.dataset.station === key;
        tile.classList.toggle('active', isSelected);
        tile.querySelector('.tile-status').textContent = isSelected ? 'Streaming' : 'Idle';
      });
    })
    .catch(err => {
      console.error('Audio playback error', err);
      nowPlayingTitle.textContent = `Error connecting to ${station.name}`;
    });
}

function stopAudio() {
  audioPlayer.pause();
  isPlaying = false;
  playText.textContent = 'PLAY';
  matrixTiles.forEach(tile => {
    tile.classList.remove('active');
    tile.querySelector('.tile-status').textContent = 'Idle';
  });
  nowPlayingTitle.textContent = 'Acoustic playback paused';
}

matrixTiles.forEach(tile => {
  tile.addEventListener('click', () => {
    const key = tile.dataset.station;
    if (currentStation === key && isPlaying) {
      stopAudio();
    } else {
      playStation(key);
    }
  });
});

btnPlayPause.addEventListener('click', () => {
  if (isPlaying) {
    stopAudio();
  } else if (currentStation) {
    playStation(currentStation);
  }
});

volumeSlider.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  audioPlayer.volume = val;
  CONFIG.volume = val;
  localStorage.setItem('aether_volume', val);
});

/* ==========================================================================
   6. On-Device Chime Synthesizer
   ========================================================================== */
function playHarmonicChime() {
  try {
    setupAudioContext();
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc2.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.08); // G5

    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);

    osc1.start();
    osc2.start(audioCtx.currentTime + 0.08);
    osc1.stop(audioCtx.currentTime + 0.45);
    osc2.stop(audioCtx.currentTime + 0.45);
  } catch (e) {
    console.warn('Chime synthesis exception', e);
  }
}

/* ==========================================================================
   6.5. Real-Time Audio Subsystem (16kHz 16-bit PCM Pipeline)
   ========================================================================== */
// Android/Kiosk restricts importing external JS worklet files due to CORS/Paths.
// We inject the AudioWorklet string as a Blob natively.
const audioWorkletCode = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sampleRate = 16000;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      
      // Naive downsampling (browser usually provides 44.1kHz or 48kHz)
      // Since we can't easily rely on the exact native sampleRate in the worklet without passing it,
      // we pass it in the constructor or assume AudioContext handles resample on node creation.
      // But for exact safety, we convert Float32 [-1.0, 1.0] to Int16
      const pcm16 = new Int16Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        let s = Math.max(-1, Math.min(1, channelData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`;

let liveAudioContext = null;
let liveMicStream = null;
let pcmWorkletNode = null;

async function initMicPipeline() {
  if (liveAudioContext) return;
  
/* ==========================================================================
   6.7. Gemini Multimodal Live API (WebSocket)
   ========================================================================== */
let geminiSocket = null;
let isGeminiSpeaking = false;

function connectGeminiLive() {
  if (!CONFIG.geminiKey) {
    console.warn("No Gemini Key, Live API disabled.");
    return;
  }
  
  const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${CONFIG.geminiKey}`;
  
  geminiSocket = new WebSocket(WS_URL);
  
  geminiSocket.onopen = () => {
    console.log("Gemini Live WebSocket Connected");
    // Setup Payload
    const setupMessage = {
      setup: {
        model: "models/gemini-2.5-flash",
        generationConfig: {
          responseModalities: ["AUDIO"],
        },
        systemInstruction: {
          parts: [{
            text: "You are Jarvis/Aether, the ultra-smart AI on an ambient desk appliance. Be extremely concise. Talk fast."
          }]
        }
      }
    };
    geminiSocket.send(JSON.stringify(setupMessage));
  };
  
  geminiSocket.onmessage = async (event) => {
    // If response is Blob, we need to read it
    let dataStr;
    if (event.data instanceof Blob) {
      dataStr = await event.data.text();
    } else {
      dataStr = event.data;
    }
    
    try {
      const response = JSON.parse(dataStr);
      
      if (response.serverContent && response.serverContent.modelTurn) {
        const parts = response.serverContent.modelTurn.parts;
        if (parts) {
          for (let p of parts) {
            if (p.inlineData && p.inlineData.mimeType.startsWith("audio/pcm")) {
              playGeminiAudio(p.inlineData.data);
            }
          }
        }
      }
      if (response.serverContent && response.serverContent.turnComplete) {
        isGeminiSpeaking = false;
        setWakeState(false);
      }
    } catch(err) {
      console.warn("WebSocket parse error", err);
    }
  };
  
  geminiSocket.onclose = () => {
    console.log("Gemini Live WebSocket Closed");
    geminiSocket = null;
  };
  
  geminiSocket.onerror = (err) => {
    console.error("Gemini Live WebSocket Error", err);
  };
}

let playbackQueue = [];
let isPlayingPcm = false;
let currentPlaybackSource = null;

// Quick base64 to Float32 AudioBuffer and schedule
function playGeminiAudio(base64Str) {
  isGeminiSpeaking = true;
  const binaryStr = atob(base64Str);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  
  // Gemini returns 24000 Hz 16-bit PCM Mono
  const int16 = new Int16Array(bytes.buffer);
  const audioBuffer = liveAudioContext.createBuffer(1, int16.length, 24000);
  const channelData = audioBuffer.getChannelData(0);
  
  for(let i=0; i<int16.length; i++) {
    channelData[i] = int16[i] / 32768.0;
  }
  
  playbackQueue.push(audioBuffer);
  if(!isPlayingPcm) processPlaybackQueue();
}

async function processPlaybackQueue() {
  if(playbackQueue.length === 0) {
    isPlayingPcm = false;
    currentPlaybackSource = null;
    return;
  }
  
  isPlayingPcm = true;
  const buffer = playbackQueue.shift();
  currentPlaybackSource = liveAudioContext.createBufferSource();
  currentPlaybackSource.buffer = buffer;
  currentPlaybackSource.connect(liveAudioContext.destination);
  
  currentPlaybackSource.onended = () => {
    processPlaybackQueue();
  };
  
  currentPlaybackSource.start();
}

  try {
    liveMicStream = await navigator.mediaDevices.getUserMedia({ 
      audio: { 
        echoCancellation: true, 
        noiseSuppression: true, 
        autoGainControl: true 
      } 
    });
    
    // Gemini API requires 16000 Hz. We set the AudioContext natively to 16kHz so the browser handles resampling!
    liveAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    
    const blob = new Blob([audioWorkletCode], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(blob);
    
    await liveAudioContext.audioWorklet.addModule(workletUrl);
    
    const source = liveAudioContext.createMediaStreamSource(liveMicStream);
    pcmWorkletNode = new AudioWorkletNode(liveAudioContext, 'pcm-processor');
    
    pcmWorkletNode.port.onmessage = (e) => {
      const pcmBuffer = e.data; 
      // Pass to Wake Word / Gemini WebSockets here later...
      handlePcmData(pcmBuffer);
    };
    
    source.connect(pcmWorkletNode);
    pcmWorkletNode.connect(liveAudioContext.destination); // Required to keep worklet alive in some browsers
    
    console.log("16kHz PCM audio pipeline active.");
  } catch (err) {
    console.error("Mic initialization failed", err);
  }
}

function handlePcmData(pcmBuffer) {
  if (isListeningForWake && porcupineWorker) {
    // Porcupine expects Int16Array
    porcupineWorker.postMessage({ command: "process", inputFrame: new Int16Array(pcmBuffer) });
  } else if (isAwake && geminiSocket && geminiSocket.readyState === WebSocket.OPEN && !isGeminiSpeaking) {
    // Gemini expects base64 PCM via JSON
    const b64 = arrayBufferToBase64(pcmBuffer);
    geminiSocket.send(JSON.stringify({
      realtimeInput: {
        mediaChunks: [{
          mimeType: "audio/pcm;rate=16000",
          data: b64
        }]
      }
    }));
  }
}


let porcupineWorker = null;
let isListeningForWake = false;

async function initPorcupine() {
  if (!CONFIG.pvKey || typeof PorcupineWeb === 'undefined') return;
  
  try {
    // Using the built-in wake word 'Porcupine'. (Custom wake words require a custom base64 model from Picovoice console)
    porcupineWorker = await PorcupineWeb.PorcupineWorker.create(
      CONFIG.pvKey,
      PorcupineWeb.BuiltInKeyword.Porcupine,
      porcupineKeywordCallback,
      { processErrorCallback: (err) => console.error("Porcupine error:", err) }
    );
    
    isListeningForWake = true;
    console.log("Porcupine Wake Word initialized. Waiting for 'Porcupine'...");
  } catch(err) {
    console.error("Failed to init Porcupine:", err);
  }
}

function porcupineKeywordCallback(keyword) {
  console.log(`Wake word detected: ${keyword}`);
  isListeningForWake = false; // Stop listening to mic locally
  
  // If we are currently playing audio from a previous turn, halt it
  if (currentPlaybackSource) {
    currentPlaybackSource.stop();
    playbackQueue = [];
    isPlayingPcm = false;
  }
  
  // If Gemini socket is active, send interruption
  if (geminiSocket && geminiSocket.readyState === WebSocket.OPEN) {
    geminiSocket.send(JSON.stringify({
      clientContent: {
        turns: [{ role: "user", parts: [] }],
        turnComplete: true
      }
    }));
  } else {
    connectGeminiLive();
  }
  
  setWakeState(true);
  assistantResponse.textContent = "Listening via Live API...";
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  let bytes = new Uint8Array(buffer);
  let len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/* ==========================================================================
   7. Cognitive Intelligence & Wake-Word Architecture
   ========================================================================== */
async function speakResponse(text) {
  if (CONFIG.geminiKey) {
    try {
      // Premium Google Cloud Text-to-Speech (Journey Voice)
      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${CONFIG.geminiKey}`;
      const payload = {
        input: { text: text },
        voice: { languageCode: 'en-US', name: 'en-US-Journey-F' }, // Studio quality AI voice
        audioConfig: { audioEncoding: 'MP3', speakingRate: 1.05 }
      };
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.audioContent) {
        const audio = new Audio("data:audio/mp3;base64," + data.audioContent);
        audio.play();
        return; // Success, skip local fallback
      }
    } catch (e) {
      console.warn("GCP TTS failed, falling back to local synthesis", e);
    }
  }

  // Fallback to local Web Speech API
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.05;
  utter.pitch = 1.0;
  window.speechSynthesis.speak(utter);
}

function setWakeState(awake) {
  isAwake = awake;
  if (awake) {
    voiceIndicator.classList.add('listening');
    orbTrigger.classList.add('listening');
    playHarmonicChime();
    trigger3DShockwave();

    assistantResponse.textContent = "Cognitive link open. Listening...";
    userSpeech.textContent = "Listening for prompt...";

    clearTimeout(wakeTimer);
    wakeTimer = setTimeout(() => {
      setWakeState(false);
      assistantResponse.textContent = `"Awaiting wake trigger '${CONFIG.wakeWord}' or tactile engagement."`;
      userSpeech.textContent = "Passive acoustic standby.";
    }, 8000);
  } else {
    voiceIndicator.classList.remove('listening');
    orbTrigger.classList.remove('listening');
    clearTimeout(wakeTimer);
  }
}

// Local Command Interpreter
async function executeCognitiveQuery(cmd) {
  const clean = cmd.toLowerCase().trim();
  userSpeech.textContent = `Prompt: "${cmd}"`;

  // Local Intent: Music Control
  if (clean.includes('play lofi') || clean.includes('chillhop')) {
    playStation('lofi');
    speakResponse("Streaming Chillhop lo-fi.");
    setWakeState(false);
    return;
  }
  if (clean.includes('play jazz') || clean.includes('blue note')) {
    playStation('jazz');
    speakResponse("Streaming Blue Note jazz.");
    setWakeState(false);
    return;
  }
  if (clean.includes('play rain') || clean.includes('precipitation')) {
    playStation('rain');
    speakResponse("Streaming precipitation soundscape.");
    setWakeState(false);
    return;
  }
  if (clean.includes('play focus') || clean.includes('synthwave')) {
    playStation('synthwave');
    speakResponse("Streaming deep focus synthwave.");
    setWakeState(false);
    return;
  }
  if (clean.includes('stop music') || clean.includes('pause audio') || clean === 'stop' || clean === 'pause') {
    stopAudio();
    speakResponse("Audio paused.");
    setWakeState(false);
    return;
  }

  // Local Intent: YouTube Music Native Gateway
  if (clean.includes('youtube music') || clean.includes('open youtube')) {
    speakResponse("Launching YouTube Music.");
    document.getElementById('ytm-launch-btn').click();
    setWakeState(false);
    return;
  }

  // Local Intent: Time Query
  if (clean.includes('what time') || clean.includes('the time')) {
    const now = new Date();
    const t = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    assistantResponse.textContent = `The current time is ${t}.`;
    speakResponse(`It is ${t}.`);
    setWakeState(false);
    return;
  }

  // Local Intent: Weather Query
  if (clean.includes('weather') || clean.includes('forecast')) {
    const t = weatherTemp.textContent;
    const d = weatherDesc.textContent;
    const c = weatherCity.textContent;
    const msg = `Currently ${t} and ${d} in ${c}.`;
    assistantResponse.textContent = msg;
    speakResponse(msg);
    setWakeState(false);
    return;
  }

  // Cloud Gemini 2.0 / 1.5 Flash Conversational Reasoning
  if (CONFIG.geminiKey) {
    assistantResponse.textContent = "Synthesizing response...";
    try {
      const reply = await queryGeminiCloud(cmd, CONFIG.geminiKey);
      assistantResponse.textContent = reply;
      speakResponse(reply);
    } catch (err) {
      console.error('Gemini error:', err);
      const fallback = "Encountered a Gemini API authorization or network issue. Verify your key in Settings.";
      assistantResponse.textContent = fallback;
      speakResponse(fallback);
    }
  } else {
    // Intelligent Offline Persona
    if (clean.includes('briefing')) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const brief = `Good day. It is ${timeStr}, ${weatherTemp.textContent} with ${weatherDesc.textContent}. Acoustic hub is online.`;
      assistantResponse.textContent = brief;
      speakResponse(brief);
    } else {
      const hint = `Heard: "${cmd}". (Add a Google Gemini API Key in Settings for deep conversational reasoning!)`;
      assistantResponse.textContent = hint;
      speakResponse(`Acknowledged: ${cmd}`);
    }
  }

  setWakeState(false);
}

// Orb Click Listener
orbTrigger.addEventListener('click', () => {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    // Fire and forget, don't await, Android WebView might hang the promise silently
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => stream.getTracks().forEach(track => track.stop()))
      .catch(err => console.warn('Mic check failed', err));
  }
  setWakeState(true);
});

// Kinetic Action Chips
document.querySelectorAll('.k-chip, .k-cmd-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    executeCognitiveQuery(chip.dataset.cmd);
  });
});

/* ==========================================================================
   8. Settings & API Key Drawer Management
   ========================================================================== */
function updateSettingsStatus() {
  if (CONFIG.geminiKey) {
    geminiStatus.textContent = "Connected";
    geminiStatus.classList.add('active');
  } else {
    geminiStatus.textContent = "Unset";
    geminiStatus.classList.remove('active');
  }
}

btnSettings.addEventListener('click', () => {
  cfgWakeword.value = CONFIG.wakeWord;
  cfgGeminiKey.value = CONFIG.geminiKey;
  cfgCity.value = CONFIG.customCity;
  cfg24h.checked = CONFIG.use24h;
  updateSettingsStatus();

  settingsModal.classList.add('open');
  gsap.from('.modal-pane', {
    y: 30,
    opacity: 0,
    scale: 0.95,
    duration: 0.35,
    ease: 'power3.out'
  });
});

modalClose.addEventListener('click', () => {
  settingsModal.classList.remove('open');
});

document.querySelector('.modal-backdrop').addEventListener('click', () => {
  settingsModal.classList.remove('open');
});

btnTestGemini.addEventListener('click', async () => {
  const testKey = cfgGeminiKey.value.trim();
  if (!testKey) {
    alert("Please enter a Gemini API Key first.");
    return;
  }
  btnTestGemini.textContent = "VERIFYING...";
  try {
    const res = await queryGeminiCloud("Hello", testKey);
    btnTestGemini.textContent = "VERIFIED ✓";
    geminiStatus.textContent = "Active";
    geminiStatus.classList.add('active');
  } catch (err) {
    btnTestGemini.textContent = "INVALID ✗";
    alert("API Key verification failed: " + err.message);
  }
});

btnSaveSettings.addEventListener('click', () => {
  CONFIG.wakeWord = cfgWakeword.value.trim() || 'Hey Jarvis';
  CONFIG.geminiKey = cfgGeminiKey.value.trim();
  CONFIG.customCity = cfgCity.value.trim();
  CONFIG.use24h = cfg24h.checked;

  localStorage.setItem('aether_wakeword', CONFIG.wakeWord);
  localStorage.setItem('aether_gemini_key', CONFIG.geminiKey);
  localStorage.setItem('aether_city', CONFIG.customCity);
  localStorage.setItem('aether_24h', CONFIG.use24h);

  wakeStatusText.innerHTML = `LISTENING FOR <span class="highlight">"${CONFIG.wakeWord.toUpperCase()}"</span>`;
  settingsModal.classList.remove('open');
  updateClock();
  fetchAtmosphere();
});
/* ==========================================================================
   9. Multi-Screen Pagination Engine
   ========================================================================== */
const screensContainer = document.getElementById('main-screens');
const dots = document.querySelectorAll('.screen-pagination .dot');

if (screensContainer && dots.length > 0) {
  let currentScreen = 0;
  let touchStartX = 0;

  function updatePagination() {
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentScreen);
      dot.style.background = i === currentScreen ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.2)';
    });
  }

  function goToScreen(index) {
    currentScreen = index;
    const width = screensContainer.clientWidth;
    if (typeof gsap !== 'undefined') {
      gsap.to(screensContainer, { scrollLeft: index * width, duration: 0.45, ease: 'power3.out' });
    } else {
      screensContainer.scrollLeft = index * width;
    }
    updatePagination();
  }

  // Robust JS swipe handler for Android Kiosk WebViews
  screensContainer.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  screensContainer.addEventListener('touchend', e => {
    const touchEndX = e.changedTouches[0].screenX;
    const swipeDist = touchStartX - touchEndX;
    
    if (swipeDist > 50 && currentScreen < dots.length - 1) {
      goToScreen(currentScreen + 1); // Swipe left -> next screen
    } else if (swipeDist < -50 && currentScreen > 0) {
      goToScreen(currentScreen - 1); // Swipe right -> prev screen
    }
  }, { passive: true });

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      goToScreen(parseInt(dot.dataset.index));
    });
  });
}

/* ==========================================================================
   10. Atmosphere Deep Dive (Leaflet Maps + Weather Radar)
   ========================================================================== */
let map;
let weatherLayer;

function initAtmosphereMap() {
  if (typeof L === 'undefined') return;
  const container = document.getElementById('map-container');
  if (!container) return;

  map = L.map('map-container', {
    zoomControl: false,
    attributionControl: false
  }).setView([40.7128, -74.0060], 6);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(map);

  setWeatherLayer('radar');

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      map.setView([pos.coords.latitude, pos.coords.longitude], 7);
    });
  }
}

function setWeatherLayer(type) {
  if (weatherLayer) {
    map.removeLayer(weatherLayer);
  }
  
  fetch('https://api.rainviewer.com/public/weather-maps.json')
    .then(res => res.json())
    .then(data => {
      const host = data.host;
      let layerPath = '';
      
      if (type === 'radar') {
        const past = data.radar.past;
        layerPath = `${past[past.length - 1].path}/256/{z}/{x}/{y}/2/1_1.png`;
      } else if (type === 'clouds' || type === 'temp') {
        // Use infrared satellite for clouds
        const infrared = data.satellite.infrared;
        layerPath = `${infrared[infrared.length - 1].path}/256/{z}/{x}/{y}/0/0_0.png`;
      }
      
      weatherLayer = L.tileLayer(`${host}${layerPath}`, {
        opacity: 0.65,
        zIndex: 10
      }).addTo(map);
    }).catch(err => console.warn('Radar fetch failed', err));
}

document.querySelectorAll('.map-layer-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.map-layer-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    setWeatherLayer(e.target.dataset.layer);
  });
});

setTimeout(initAtmosphereMap, 2000); // Defer map loading slightly

/* ==========================================================================
   11. Full Screen Assistant Trust Workflow
   ========================================================================== */
const btnAuthMic = document.getElementById('btn-auth-mic');
const btnTriggerAi = document.getElementById('btn-trigger-ai');
const fullOrbTrigger = document.getElementById('full-orb-trigger');

if (btnAuthMic) {
  btnAuthMic.addEventListener('click', async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await initMicPipeline();
        await initPorcupine();
        
        document.getElementById('full-assistant-response').textContent = "Microphone Authorized. Real-Time PCM Link Established.";
        document.getElementById('full-user-speech').textContent = "Sub-system is now streaming 16kHz PCM audio for Live AI.";
        
        btnAuthMic.style.display = 'none';
        btnTriggerAi.style.display = 'block';
        fullOrbTrigger.style.pointerEvents = 'auto';
      }
    } catch (err) {
      document.getElementById('full-assistant-response').textContent = "Authorization Failed.";
      document.getElementById('full-user-speech').textContent = "Check OS-level app permissions for microphone.";
      console.error(err);
    }
  });

  
  // New manual wake button hooks right into our new wake function
  function triggerManualWake(e) {
    e.preventDefault();
    if (!CONFIG.geminiKey) {
      alert("Please set Gemini API Key in Settings first.");
      return;
    }
    
    // If we're not currently awake, simulate a wake word hit
    if (!isAwake) {
      porcupineKeywordCallback("Manual Trigger");
    }
  }
  
  btnTriggerAi.addEventListener('click', triggerManualWake);
  
  // Also keep the simple orb click for the regular text-based wake
  fullOrbTrigger.addEventListener('click', triggerManualWake);
}
