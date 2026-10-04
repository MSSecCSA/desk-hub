// Desk Hub & Audio Station App Logic

// Default Configurations
const CONFIG = {
  wakeWord: localStorage.getItem('hub_wakeword') || 'hey jarvis',
  geminiKey: localStorage.getItem('hub_gemini_key') || '',
  customCity: localStorage.getItem('hub_city') || '',
  use24h: localStorage.getItem('hub_24h') === 'true',
  volume: parseFloat(localStorage.getItem('hub_volume') || '0.8')
};

// State
let isPlaying = false;
let currentStation = null;
let isAwake = false;
let recognition = null;
let wakeTimer = null;
let audioCtx = null;

// Ambient Audio Streams
const STATIONS = {
  lofi: {
    name: 'Lofi Chillhop Radio',
    url: 'https://stream.zeno.fm/f3wvbbqmdg8uv'
  },
  jazz: {
    name: 'Smooth Coffeehouse Jazz',
    url: 'https://streaming.exclusive.radio/er/smoothjazz/icecast.audio'
  },
  rain: {
    name: 'Gentle Rainstorm & Thunder',
    url: 'https://actions.google.com/sounds/v1/weather/rain_heavy.ogg',
    loop: true
  },
  synthwave: {
    name: 'Deep Focus Synthwave',
    url: 'https://stream.zeno.fm/0r0xa792kwzuv'
  }
};

// DOM Elements
const timeDisplay = document.getElementById('time-display');
const amPmDisplay = document.getElementById('am-pm');
const secondsProgress = document.getElementById('seconds-progress');
const dateDisplay = document.getElementById('date-display');

const weatherTemp = document.getElementById('weather-temp');
const weatherDesc = document.getElementById('weather-desc');
const weatherIcon = document.getElementById('weather-icon');
const weatherHumidity = document.getElementById('weather-humidity');
const weatherWind = document.getElementById('weather-wind');
const weatherHighLow = document.getElementById('weather-highlow');
const weatherCity = document.getElementById('weather-city');

const audioPlayer = document.getElementById('audio-player');
const btnPlayPause = document.getElementById('btn-play-pause');
const volumeSlider = document.getElementById('volume-slider');
const nowPlayingTitle = document.getElementById('now-playing-title');
const visualizer = document.getElementById('visualizer');
const stationButtons = document.querySelectorAll('.station-btn');

const aiOrb = document.getElementById('ai-orb');
const orbTrigger = document.getElementById('orb-trigger');
const wakeStatusText = document.getElementById('wake-status-text');
const assistantResponse = document.getElementById('assistant-response');
const userSpeechDisplay = document.getElementById('user-speech');

const btnSettings = document.getElementById('btn-settings');
const settingsModal = document.getElementById('settings-modal');
const modalClose = document.getElementById('modal-close');
const btnSaveSettings = document.getElementById('btn-save-settings');
const cfgWakewordInput = document.getElementById('cfg-wakeword');
const cfgGeminiInput = document.getElementById('cfg-gemini-key');
const cfgCityInput = document.getElementById('cfg-city');
const cfg24hInput = document.getElementById('cfg-24h');

/* ==========================================================================
   1. Clock & Date Engine
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

  // Seconds Progress (0 to 60)
  const percent = ((seconds + now.getMilliseconds() / 1000) / 60) * 100;
  secondsProgress.style.width = `${percent}%`;

  // Date String
  const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
  dateDisplay.textContent = now.toLocaleDateString(undefined, options);
}

setInterval(updateClock, 500);
updateClock();

/* ==========================================================================
   2. Weather Engine (Open-Meteo - 100% Free, No API Key Required)
   ========================================================================== */
const WMO_CODES = {
  0: { desc: 'Clear sky', icon: '☀️' },
  1: { desc: 'Mainly clear', icon: '🌤️' },
  2: { desc: 'Partly cloudy', icon: '⛅' },
  3: { desc: 'Overcast', icon: '☁️' },
  45: { desc: 'Foggy', icon: '🌫️' },
  48: { desc: 'Depositing rime fog', icon: '🌫️' },
  51: { desc: 'Light drizzle', icon: '🌦️' },
  53: { desc: 'Moderate drizzle', icon: '🌧️' },
  55: { desc: 'Dense drizzle', icon: '🌧️' },
  61: { desc: 'Slight rain', icon: '🌦️' },
  63: { desc: 'Moderate rain', icon: '🌧️' },
  65: { desc: 'Heavy rain', icon: '⛈️' },
  71: { desc: 'Slight snow', icon: '🌨️' },
  73: { desc: 'Moderate snow', icon: '❄️' },
  75: { desc: 'Heavy snow', icon: '❄️' },
  80: { desc: 'Rain showers', icon: '🌦️' },
  95: { desc: 'Thunderstorm', icon: '⚡' }
};

async function fetchWeather() {
  try {
    let lat = 40.7128;
    let lon = -74.0060;
    let cityName = 'Auto Location';

    // Auto-location via IP
    try {
      const geoRes = await fetch('https://ipapi.co/json/');
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        lat = geoData.latitude || lat;
        lon = geoData.longitude || lon;
        cityName = `${geoData.city || 'Local Area'}, ${geoData.region_code || ''}`;
      }
    } catch (e) {
      console.warn('IP location fetch failed, using fallback coords', e);
    }

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto`;
    const res = await fetch(weatherUrl);
    const data = await res.json();

    const current = data.current;
    const daily = data.daily;
    const code = current.weather_code;
    const weatherInfo = WMO_CODES[code] || { desc: 'Fair', icon: '🌤️' };

    weatherTemp.textContent = `${Math.round(current.temperature_2m)}°`;
    weatherDesc.textContent = weatherInfo.desc;
    weatherIcon.textContent = weatherInfo.icon;
    weatherHumidity.textContent = `${current.relative_humidity_2m}%`;
    weatherWind.textContent = `${Math.round(current.wind_speed_10m)} mph`;
    
    if (daily && daily.temperature_2m_max && daily.temperature_2m_min) {
      weatherHighLow.textContent = `${Math.round(daily.temperature_2m_max[0])}° / ${Math.round(daily.temperature_2m_min[0])}°`;
    }
    weatherCity.textContent = cityName;
  } catch (err) {
    console.error('Weather load error:', err);
    weatherDesc.textContent = 'Weather Unavailable';
  }
}

fetchWeather();
setInterval(fetchWeather, 30 * 60 * 1000); // Refresh every 30 mins

/* ==========================================================================
   3. Audio Hub & Ambient Stations
   ========================================================================== */
audioPlayer.volume = CONFIG.volume;
volumeSlider.value = CONFIG.volume;

function playStation(key) {
  const station = STATIONS[key];
  if (!station) return;

  currentStation = key;
  audioPlayer.src = station.url;
  audioPlayer.loop = !!station.loop;
  
  audioPlayer.play()
    .then(() => {
      isPlaying = true;
      btnPlayPause.disabled = false;
      btnPlayPause.textContent = '⏸ Pause';
      nowPlayingTitle.textContent = `Streaming: ${station.name}`;
      visualizer.classList.add('playing');
      
      stationButtons.forEach(btn => {
        const isCurrent = btn.dataset.station === key;
        btn.classList.toggle('active', isCurrent);
        btn.querySelector('.station-state').textContent = isCurrent ? 'Playing' : 'Ready';
      });
    })
    .catch(err => {
      console.error('Playback error:', err);
      nowPlayingTitle.textContent = `Error playing ${station.name}`;
    });
}

function stopAudio() {
  audioPlayer.pause();
  isPlaying = false;
  btnPlayPause.textContent = '▶ Play';
  visualizer.classList.remove('playing');
  stationButtons.forEach(btn => {
    btn.classList.remove('active');
    btn.querySelector('.station-state').textContent = 'Ready';
  });
  nowPlayingTitle.textContent = 'Playback paused';
}

stationButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const stationKey = btn.dataset.station;
    if (currentStation === stationKey && isPlaying) {
      stopAudio();
    } else {
      playStation(stationKey);
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
  localStorage.setItem('hub_volume', val);
});

/* ==========================================================================
   4. Audio Chime Synthesizer (Instant On-Device Feedback)
   ========================================================================== */
function playWakeChime() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.1); // A5

    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.start();
    osc2.start(audioCtx.currentTime + 0.08);
    osc1.stop(audioCtx.currentTime + 0.4);
    osc2.stop(audioCtx.currentTime + 0.4);
  } catch (e) {
    console.warn('Audio chime synthesis error:', e);
  }
}

/* ==========================================================================
   5. AI Voice Assistant & Always-Listening Wake Word
   ========================================================================== */
function speakText(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

function setWakeState(awake) {
  isAwake = awake;
  if (awake) {
    aiOrb.classList.add('listening');
    playWakeChime();
    assistantResponse.textContent = "Listening...";
    userSpeechDisplay.textContent = "Go ahead, I'm listening...";
    clearTimeout(wakeTimer);
    wakeTimer = setTimeout(() => {
      setWakeState(false);
      assistantResponse.textContent = `"Say '${CONFIG.wakeWord}' or tap the orb to ask a question."`;
      userSpeechDisplay.textContent = "Standby mode.";
    }, 7000);
  } else {
    aiOrb.classList.remove('listening');
    clearTimeout(wakeTimer);
  }
}

// Local Smart Command Processor
async function processCommand(cmd) {
  const cleanCmd = cmd.toLowerCase().trim();
  userSpeechDisplay.textContent = `You: "${cmd}"`;

  // 1. Music Station Commands
  if (cleanCmd.includes('play lofi') || cleanCmd.includes('play lo-fi')) {
    playStation('lofi');
    speakText("Playing lofi chillhop.");
    setWakeState(false);
    return;
  }
  if (cleanCmd.includes('play jazz')) {
    playStation('jazz');
    speakText("Playing smooth jazz.");
    setWakeState(false);
    return;
  }
  if (cleanCmd.includes('play rain')) {
    playStation('rain');
    speakText("Playing rain ambience.");
    setWakeState(false);
    return;
  }
  if (cleanCmd.includes('play focus') || cleanCmd.includes('play synthwave')) {
    playStation('synthwave');
    speakText("Playing deep focus synthwave.");
    setWakeState(false);
    return;
  }
  if (cleanCmd.includes('stop music') || cleanCmd.includes('pause audio') || cleanCmd === 'stop' || cleanCmd === 'pause') {
    stopAudio();
    speakText("Audio stopped.");
    setWakeState(false);
    return;
  }

  // 2. Open YouTube Music
  if (cleanCmd.includes('youtube music') || cleanCmd.includes('open youtube')) {
    speakText("Opening YouTube Music.");
    document.getElementById('ytm-launch-btn').click();
    setWakeState(false);
    return;
  }

  // 3. Time Query
  if (cleanCmd.includes('what time') || cleanCmd.includes('the time')) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    assistantResponse.textContent = `It is currently ${timeStr}.`;
    speakText(`It is ${timeStr}.`);
    setWakeState(false);
    return;
  }

  // 4. Weather Query
  if (cleanCmd.includes('weather')) {
    const temp = weatherTemp.textContent;
    const desc = weatherDesc.textContent;
    const weatherSpeech = `It is currently ${temp} and ${desc} outside.`;
    assistantResponse.textContent = weatherSpeech;
    speakText(weatherSpeech);
    setWakeState(false);
    return;
  }

  // 5. General Conversational AI (Gemini or Fallback)
  if (CONFIG.geminiKey) {
    assistantResponse.textContent = "Thinking...";
    try {
      const response = await queryGemini(cleanCmd, CONFIG.geminiKey);
      assistantResponse.textContent = response;
      speakText(response);
    } catch (err) {
      console.error('Gemini error:', err);
      const fallback = "I encountered an error querying Gemini. Please verify your API key.";
      assistantResponse.textContent = fallback;
      speakText(fallback);
    }
  } else {
    // Quick Built-in Responses
    if (cleanCmd.includes('joke')) {
      const jokes = [
        "Why do programmers prefer dark mode? Because light attracts bugs!",
        "Why was the computer cold? It left its Windows open!",
        "There are 10 types of people in the world: those who understand binary, and those who don't."
      ];
      const joke = jokes[Math.floor(Math.random() * jokes.length)];
      assistantResponse.textContent = joke;
      speakText(joke);
    } else {
      const reply = `I heard: "${cmd}". (Add a Google Gemini API Key in Settings for full conversational answers!)`;
      assistantResponse.textContent = reply;
      speakText(`I heard: ${cmd}`);
    }
  }

  setWakeState(false);
}

// Google Gemini API Integration
async function queryGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{
      parts: [{
        text: `You are a concise, helpful voice assistant on a desk display appliance. Answer in 1 or 2 spoken sentences maximum: ${prompt}`
      }]
    }]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (data.candidates && data.candidates[0].content.parts[0].text) {
    return data.candidates[0].content.parts[0].text.trim();
  }
  throw new Error('Invalid response structure from Gemini API');
}

// Continuous Speech Recognition Setup
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    wakeStatusText.textContent = "Voice speech API not supported in this browser";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript.toLowerCase();
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    const currentText = (finalTranscript || interimTranscript).trim();

    // Check for Wake Word when in standby
    if (!isAwake) {
      const targetWake = CONFIG.wakeWord.toLowerCase();
      if (currentText.includes(targetWake) || currentText.includes('hey jarvis') || currentText.includes('jarvis')) {
        setWakeState(true);
        // If there's an immediate command after the wake word in the same utterance
        const afterWake = currentText.split(targetWake).pop() || currentText.split('jarvis').pop();
        if (afterWake && afterWake.trim().length > 3) {
          processCommand(afterWake.trim());
        }
      }
    } else {
      // In active listening state: display transcription and execute
      userSpeechDisplay.textContent = `"${currentText}"`;
      if (finalTranscript && finalTranscript.trim().length > 1) {
        processCommand(finalTranscript.trim());
      }
    }
  };

  recognition.onerror = (event) => {
    console.warn('Speech recognition status:', event.error);
  };

  // Keep recognition running 24/7 on end
  recognition.onend = () => {
    try {
      recognition.start();
    } catch (e) {
      // already active
    }
  };

  try {
    recognition.start();
  } catch (err) {
    console.warn('Recognition start exception:', err);
  }
}

// Initialize speech listener
initSpeechRecognition();

// Orb Touch Trigger (Manual 1-tap activation)
orbTrigger.addEventListener('click', () => {
  setWakeState(true);
});

// Quick Prompt Chips
document.querySelectorAll('.prompt-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    processCommand(chip.dataset.cmd);
  });
});

/* ==========================================================================
   6. Settings Modal Management
   ========================================================================== */
btnSettings.addEventListener('click', () => {
  cfgWakewordInput.value = CONFIG.wakeWord;
  cfgGeminiInput.value = CONFIG.geminiKey;
  cfgCityInput.value = CONFIG.customCity;
  cfg24hInput.checked = CONFIG.use24h;
  settingsModal.classList.add('open');
});

modalClose.addEventListener('click', () => {
  settingsModal.classList.remove('open');
});

btnSaveSettings.addEventListener('click', () => {
  CONFIG.wakeWord = cfgWakewordInput.value.trim() || 'Hey Jarvis';
  CONFIG.geminiKey = cfgGeminiInput.value.trim();
  CONFIG.customCity = cfgCityInput.value.trim();
  CONFIG.use24h = cfg24hInput.checked;

  localStorage.setItem('hub_wakeword', CONFIG.wakeWord);
  localStorage.setItem('hub_gemini_key', CONFIG.geminiKey);
  localStorage.setItem('hub_city', CONFIG.customCity);
  localStorage.setItem('hub_24h', CONFIG.use24h);

  wakeStatusText.innerHTML = `Listening for "<span class="wake-word-highlight">${CONFIG.wakeWord}</span>"`;
  settingsModal.classList.remove('open');
  updateClock();
  fetchWeather();
});
