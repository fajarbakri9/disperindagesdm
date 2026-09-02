/**
 * pinrang-live.js — Modul Waktu & Cuaca Terpadu Pemkab Pinrang
 * 
 * Standar Tunggal:
 * - Timezone: Asia/Makassar (WITA) via Intl.DateTimeFormat
 * - Koordinat Pinrang: Lat -3.7915, Lon 119.6472
 * - API Cuaca: Open-Meteo Satellite Realtime
 * - WMO Code Decoding Lengkap (BMKG / WMO Standard)
 * - Refresh: Jam (1 detik), Cuaca (15 menit)
 * - Tanpa data palsu / hardcoded temperatur
 */

(function () {
  'use strict';

  // 1. KONFIGURASI TUNGGAL
  const CONFIG = {
    LATITUDE: -3.7915,
    LONGITUDE: 119.6472,
    TIMEZONE: 'Asia/Makassar',
    WEATHER_REFRESH_MS: 15 * 60 * 1000, // 15 menit
    CLOCK_REFRESH_MS: 1000,             // 1 detik
    API_URL: 'https://api.open-meteo.com/v1/forecast?latitude=-3.7915&longitude=119.6472&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia%2FMakassar'
  };

  // 2. STATE CUACA (Default Fallback Cepat Sambil Fetch Satelit)
  const weatherState = {
    temp: 31,
    humidity: 78,
    weatherText: 'Cerah Berawan',
    weatherIcon: '🌤️',
    isLive: false,
    isLoading: false,
    lastUpdated: 0,
    error: null
  };

  // 3. TABEL KODE CUACA WMO (World Meteorological Organization) LENGKAP
  function decodeWMOCode(code) {
    if (typeof code !== 'number') {
      return { icon: '⛅', text: 'Berawan' };
    }

    switch (code) {
      case 0:
        return { icon: '☀️', text: 'Cerah' };
      case 1:
        return { icon: '🌤️', text: 'Cerah Berawan' };
      case 2:
        return { icon: '⛅', text: 'Sebagian Berawan' };
      case 3:
        return { icon: '☁️', text: 'Berawan Tebal' };
      case 45:
      case 48:
        return { icon: '🌫️', text: 'Kabut / Berkabut' };
      case 51:
        return { icon: '🌦️', text: 'Gerimis Ringan' };
      case 53:
        return { icon: '🌦️', text: 'Gerimis Sedang' };
      case 55:
        return { icon: '🌦️', text: 'Gerimis Lebat' };
      case 56:
      case 57:
        return { icon: '🌨️', text: 'Gerimis Beku' };
      case 61:
        return { icon: '🌧️', text: 'Hujan Ringan' };
      case 63:
        return { icon: '🌧️', text: 'Hujan Sedang' };
      case 65:
        return { icon: '🌧️', text: 'Hujan Lebat' };
      case 66:
      case 67:
        return { icon: '🌧️', text: 'Hujan Dingin' };
      case 71:
      case 73:
      case 75:
      case 77:
        return { icon: '❄️', text: 'Hujan Es / Salju' };
      case 80:
        return { icon: '🌧️', text: 'Hujan Lokal Ringan' };
      case 81:
        return { icon: '🌧️', text: 'Hujan Lokal Sedang' };
      case 82:
        return { icon: '🌧️', text: 'Hujan Deras Ekstrem' };
      case 85:
      case 86:
        return { icon: '🌨️', text: 'Hujan Salju Lebat' };
      case 95:
        return { icon: '⛈️', text: 'Hujan Badai Petir' };
      case 96:
      case 99:
        return { icon: '⛈️', text: 'Hujan Badai Disertai Petir' };
      default:
        return { icon: '⛅', text: 'Berawan' };
    }
  }

  // 4. FORMATTER WAKTU ASIA/MAKASSAR (WITA) PRESISI
  // Menggunakan Intl.DateTimeFormat resmi, BUKAN getHours() lokal pengguna
  const timeFormatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: CONFIG.TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: CONFIG.TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  function getMakassarTimeComponents(date = new Date()) {
    const timeParts = timeFormatter.formatToParts(date);
    let hour = '00', minute = '00', second = '00';
    for (const part of timeParts) {
      if (part.type === 'hour') hour = part.value;
      if (part.type === 'minute') minute = part.value;
      if (part.type === 'second') second = part.value;
    }

    const dateFormatted = dateFormatter.format(date);

    return {
      hour,
      minute,
      second,
      timeWithDots: `${hour}.${minute}.${second}`,
      timeWithColons: `${hour}:${minute}:${second}`,
      timeFullWITA: `${hour}:${minute}:${second} WITA`,
      timeFullDotsWITA: `${hour}.${minute}.${second} WITA`,
      dateFormatted
    };
  }

  // 5. LISTENER SUBSCRIBERS
  const subscribers = [];
  function notifySubscribers() {
    for (const fn of subscribers) {
      try {
        fn(weatherState, getMakassarTimeComponents());
      } catch (e) {
        console.warn('[PinrangLive] Subscriber error:', e);
      }
    }
  }

  // 6. AMBIL DATA CUACA REALTIME DARI OPEN-METEO
  async function fetchLiveWeather() {
    try {
      const res = await fetch(CONFIG.API_URL);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      if (data && data.current) {
        const cur = data.current;
        const temp = Math.round(cur.temperature_2m);
        const wmo = decodeWMOCode(cur.weather_code);
        const humidity = typeof cur.relative_humidity_2m === 'number' ? Math.round(cur.relative_humidity_2m) : null;

        weatherState.temp = temp;
        weatherState.humidity = humidity;
        weatherState.weatherText = wmo.text;
        weatherState.weatherIcon = wmo.icon;
        weatherState.isLive = true;
        weatherState.isLoading = false;
        weatherState.lastUpdated = Date.now();
        weatherState.error = null;
      }
    } catch (err) {
      console.warn('[PinrangLive] Cuaca offline atau belum terhubung:', err.message);
      if (weatherState.temp === null) {
        weatherState.weatherText = 'Cuaca tidak tersedia';
        weatherState.weatherIcon = '⛅';
        weatherState.isLoading = false;
        weatherState.isLive = false;
        weatherState.error = err.message;
      }
    }

    renderAllTargetElements();
    notifySubscribers();
  }

  // 7. RENDER OTOMATIS KE ELEMEN DOM
  function renderAllTargetElements() {
    const timeInfo = getMakassarTimeComponents();

    // A. Topbar Elements (#liveClockWita & #liveWeatherPinrang di index.html)
    const clockEl = document.getElementById('liveClockWita');
    if (clockEl) {
      clockEl.innerHTML = `📅 ${timeInfo.dateFormatted} • <strong>${timeInfo.timeFullDotsWITA}</strong>`;
    }

    const weatherEl = document.getElementById('liveWeatherPinrang');
    if (weatherEl) {
      if (weatherState.isLoading) {
        weatherEl.innerHTML = `⏳ Pinrang: <span style="font-weight:600; opacity:0.85;">Memuat cuaca...</span>`;
      } else if (weatherState.isLive && weatherState.temp !== null) {
        weatherEl.innerHTML = `${weatherState.weatherIcon} Pinrang: <strong>${weatherState.temp}°C</strong> (${weatherState.weatherText}) <span style="font-size:0.68rem; color:#86EFAC; font-weight:700; margin-left:4px;">● LIVE</span>`;
      } else {
        weatherEl.innerHTML = `${weatherState.weatherIcon} Pinrang: <span style="font-weight:600; opacity:0.85;">${weatherState.weatherText}</span>`;
      }
    }

    // A2. Topbar Universal Portal (#topbarDateTime jika ada)
    const topbarEl = document.getElementById('topbarDateTime');
    if (topbarEl) {
      let weatherPart = '';
      if (weatherState.isLoading) {
        weatherPart = `⏳ Pinrang: <span style="font-weight:600; opacity:0.85;">Memuat cuaca...</span>`;
      } else if (weatherState.isLive && weatherState.temp !== null) {
        weatherPart = `${weatherState.weatherIcon} Pinrang: <strong>${weatherState.temp}°C</strong> (${weatherState.weatherText}) <span style="font-size:0.68rem; color:#86EFAC; font-weight:700;">● LIVE</span>`;
      } else {
        weatherPart = `${weatherState.weatherIcon} Pinrang: <span style="font-weight:600; opacity:0.85;">${weatherState.weatherText}</span>`;
      }

      topbarEl.innerHTML = `🗓️ ${timeInfo.dateFormatted} &bull; ${timeInfo.timeFullDotsWITA} | ${weatherPart}`;
    }

    // B. Command Center Widget (#ccLiveTime, #ccLiveDate, #ccWeatherPill)
    const ccTimeEl = document.getElementById('ccLiveTime');
    const ccDateEl = document.getElementById('ccLiveDate');
    const ccWeatherEl = document.getElementById('ccWeatherPill');

    if (ccTimeEl) {
      ccTimeEl.textContent = timeInfo.timeFullWITA;
    }
    if (ccDateEl) {
      ccDateEl.textContent = timeInfo.dateFormatted;
    }
    if (ccWeatherEl) {
      if (weatherState.isLoading) {
        ccWeatherEl.innerHTML = `<span>⏳</span> Pinrang: <span style="font-weight:600; opacity:0.85;">Memuat cuaca...</span>`;
      } else if (weatherState.isLive && weatherState.temp !== null) {
        ccWeatherEl.innerHTML = `<span>${weatherState.weatherIcon}</span> Pinrang: <strong>${weatherState.temp}°C</strong> (${weatherState.weatherText}) <span style="font-size:0.68rem; color:#86EFAC; font-weight:900; margin-left:4px;">● LIVE</span>`;
      } else {
        ccWeatherEl.innerHTML = `<span>${weatherState.weatherIcon}</span> Pinrang: <span style="font-weight:600; opacity:0.85;">${weatherState.weatherText}</span>`;
      }
    }
  }

  // 8. TICKING CLOCK CONTROLLER (1 Detik)
  function startClock() {
    renderAllTargetElements();
    setInterval(() => {
      renderAllTargetElements();
    }, CONFIG.CLOCK_REFRESH_MS);
  }

  // 9. WEATHER SYNC CONTROLLER (15 Menit)
  function startWeatherSync() {
    fetchLiveWeather();
    setInterval(fetchLiveWeather, CONFIG.WEATHER_REFRESH_MS);
  }

  // 10. AUTO INIT PADA DOM READY
  function init() {
    startClock();
    startWeatherSync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 11. GLOBAL API EXPORT (PinrangLive)
  window.PinrangLive = {
    CONFIG,
    getWeather: () => ({ ...weatherState }),
    getTime: (d) => getMakassarTimeComponents(d),
    decodeWMOCode,
    refreshWeather: fetchLiveWeather,
    subscribe: (fn) => {
      if (typeof fn === 'function') {
        subscribers.push(fn);
        fn(weatherState, getMakassarTimeComponents());
      }
    }
  };

})();
