// AETHER // Intelligent Desk Appliance Core

// Configuration & Local Persistence
const CONFIG = {
  wakeWord: localStorage.getItem('aether_wakeword') || 'hey jarvis',
  geminiKey: localStorage.getItem('aether_gemini_key') || '',
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
  lofi: { name: 'Chillhop Lo-Fi Radio', url: 'https://stream.zeno.fm/f3wvbbqmdg8uv' },
  jazz: { name: 'Blue Note Coffeehouse Jazz', url: 'https://streaming.exclusive.radio/er/smoothjazz/icecast.audio' },
  rain: { name: 'Precipitation Ambience', url: 'https://actions.google.com/sounds/v1/weather/rain_heavy.ogg', loop: true },
  synthwave: { name: 'Cyberpunk Focus Synth', url: 'https://stream.zeno.fm/0r0xa792kwzuv' }
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
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.from('.top-nav', {
    y: -30,
    opacity: 0,
    duration: 0.9
  })
  .from('.bento-card', {
    y: 40,
    opacity: 0,
    scale: 0.96,
    duration: 1.0,
    stagger: 0.12
  }, '-=0.5')
  .from('.display-time-wrap', {
    scale: 0.9,
    opacity: 0,
    duration: 0.8
  }, '-=0.6');
}

window.addEventListener('DOMContentLoaded', runEntranceAnimations);

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
   7. Cognitive Intelligence & Wake-Word Architecture
   ========================================================================== */
function speakResponse(text) {
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

// Google Gemini API Engine
async function queryGeminiCloud(prompt, apiKey) {
  conversationHistory.push({
    role: "user",
    parts: [{ text: prompt }]
  });

  // Keep last 6 conversational turns
  if (conversationHistory.length > 6) {
    conversationHistory = conversationHistory.slice(-6);
  }

  const payload = {
    systemInstruction: {
      parts: [{
        text: "You are Jarvis/Aether, the ultra-smart AI on an ambient desk appliance. Answer in 1 or 2 concise, natural spoken sentences. Avoid markdown or bullets, optimize for text-to-speech listening."
      }]
    },
    contents: conversationHistory
  };

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastErr = null;
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message || `API error ${data.error.code}`);
      }
      if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
        const text = data.candidates[0].content.parts[0].text.trim();
        conversationHistory.push({
          role: "model",
          parts: [{ text }]
        });
        return text;
      }
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Invalid response structure from Gemini API');
}

// Continuous Wake-Word Speech Listener
function initContinuousListener() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    wakeStatusText.textContent = "SPEECH API RESTRICTED";
    return;
  }

  recognition = new SpeechRec();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (e) => {
    let interim = '';
    let final = '';

    for (let i = e.resultIndex; i < e.results.length; ++i) {
      const transcript = e.results[i][0].transcript.toLowerCase();
      if (e.results[i].isFinal) final += transcript;
      else interim += transcript;
    }

    const currentText = (final || interim).trim();

    if (!isAwake) {
      const target = CONFIG.wakeWord.toLowerCase();
      if (currentText.includes(target) || currentText.includes('hey jarvis') || currentText.includes('jarvis')) {
        setWakeState(true);
        const splitText = currentText.split(target).pop() || currentText.split('jarvis').pop();
        if (splitText && splitText.trim().length > 3) {
          executeCognitiveQuery(splitText.trim());
        }
      }
    } else {
      userSpeech.textContent = `Listening: "${currentText}"`;
      if (final && final.trim().length > 1) {
        executeCognitiveQuery(final.trim());
      }
    }
  };

  recognition.onerror = (e) => {
    console.warn('Speech status:', e.error);
  };

  recognition.onend = () => {
    try { recognition.start(); } catch (err) {}
  };

  try { recognition.start(); } catch (err) {}
}

initContinuousListener();

// Orb Click Listener
orbTrigger.addEventListener('click', () => {
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
