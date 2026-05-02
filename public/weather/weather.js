/* Liquid Glass Weather — OpenWeather */
const API_KEY = "5eeee11cdb5e6f638c5145acafd9ac51";
const BASE = "https://api.openweathermap.org";

function setBackground(cur){
  const code = cur.weather[0].icon; // e.g. 01d, 10n
  const isNight = code.endsWith("n");
  const main = code.slice(0,2);
  // 1 clouds-day, 2 clear-sun, 3 hazy-day, 4 dusk-cloud, 5 night-stars, 6 twilight
  let pick = "weather_2.jpg";
  if (isNight) pick = (main === "01") ? "weather_5.jpg" : "weather_6.jpg";
  else if (main === "01") pick = "weather_2.jpg";
  else if (main === "02") pick = "weather_3.jpg";
  else if (main === "03" || main === "04") pick = "weather_1.jpg";
  else if (main === "09" || main === "10" || main === "11") pick = "weather_4.jpg";
  else if (main === "13" || main === "50") pick = "weather_3.jpg";
  document.getElementById("bgImage").style.backgroundImage = `url('/weather/bg/${pick}')`;
}

const $ = (id) => document.getElementById(id);
const round = (n) => Math.round(n);
const fmtTime = (ts, tz=0) => {
  const d = new Date((ts + tz) * 1000);
  let h = d.getUTCHours(); const m = d.getUTCMinutes();
  const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2,"0")} ${ap}`;
};
const fmtHour = (ts, tz=0) => {
  const d = new Date((ts + tz) * 1000);
  let h = d.getUTCHours();
  const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
  return `${h} ${ap}`;
};
const dayName = (ts, tz=0, i=0) => {
  if (i===0) return "Today";
  const d = new Date((ts + tz) * 1000);
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getUTCDay()];
};

/* Map OpenWeather icon -> FontAwesome */
function iconFor(code) {
  const map = {
    "01d":"fa-solid fa-sun",            "01n":"fa-solid fa-moon",
    "02d":"fa-solid fa-cloud-sun",      "02n":"fa-solid fa-cloud-moon",
    "03d":"fa-solid fa-cloud",          "03n":"fa-solid fa-cloud",
    "04d":"fa-solid fa-clouds",         "04n":"fa-solid fa-clouds",
    "09d":"fa-solid fa-cloud-showers-heavy","09n":"fa-solid fa-cloud-showers-heavy",
    "10d":"fa-solid fa-cloud-sun-rain", "10n":"fa-solid fa-cloud-moon-rain",
    "11d":"fa-solid fa-cloud-bolt",     "11n":"fa-solid fa-cloud-bolt",
    "13d":"fa-solid fa-snowflake",      "13n":"fa-solid fa-snowflake",
    "50d":"fa-solid fa-smog",           "50n":"fa-solid fa-smog",
  };
  return map[code] || "fa-solid fa-cloud";
}

function uvLabel(uv){
  if (uv<3) return "Low"; if (uv<6) return "Moderate";
  if (uv<8) return "High"; if (uv<11) return "Very High"; return "Extreme";
}

async function geocode(q){
  const r = await fetch(`${BASE}/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=1&appid=${API_KEY}`);
  const j = await r.json();
  if (!j.length) throw new Error("City not found");
  return { lat:j[0].lat, lon:j[0].lon, name:`${j[0].name}${j[0].state?", "+j[0].state:""}` };
}

async function reverse(lat,lon){
  const r = await fetch(`${BASE}/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`);
  const j = await r.json();
  return j[0] ? `${j[0].name}${j[0].state?", "+j[0].state:""}` : "My Location";
}

async function loadWeather(lat, lon, name){
  document.body.classList.add("loading");
  try {
    // current + forecast (5d/3h) — works on free tier
    const [curR, fcR] = await Promise.all([
      fetch(`${BASE}/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`),
      fetch(`${BASE}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`)
    ]);
    if (!curR.ok || !fcR.ok) throw new Error("API error — check your API key");
    const cur = await curR.json();
    const fc  = await fcR.json();
    render(name || cur.name, cur, fc);
  } catch (e) {
    alert(e.message);
    console.error(e);
  } finally {
    document.body.classList.remove("loading");
  }
}

function render(name, cur, fc){
  const tz = cur.timezone || 0;
  $("city").textContent = name;
  $("temp").textContent = round(cur.main.temp);
  $("cond").textContent = cur.weather[0].description.replace(/\b\w/g,c=>c.toUpperCase());
  // hi/lo from next 24h forecast
  const next24 = fc.list.slice(0,8);
  const hi = round(Math.max(...next24.map(x=>x.main.temp_max)));
  const lo = round(Math.min(...next24.map(x=>x.main.temp_min)));
  $("hi").textContent = hi+"°"; $("lo").textContent = lo+"°";

  // Hourly
  const hourly = $("hourly"); hourly.innerHTML = "";
  setBackground(cur);
  // first slot = Now
  const nowEl = document.createElement("div"); nowEl.className = "h-item";
  nowEl.innerHTML = `<span class="h-t">Now</span><i class="${iconFor(cur.weather[0].icon)}"></i><span class="h-tm">${round(cur.main.temp)}°</span>`;
  hourly.appendChild(nowEl);
  fc.list.slice(0,10).forEach(item=>{
    const pop = Math.round((item.pop||0)*100);
    const el = document.createElement("div"); el.className = "h-item";
    el.innerHTML = `<span class="h-t">${fmtHour(item.dt,tz)}</span>
      <i class="${iconFor(item.weather[0].icon)}"></i>
      <span class="h-tm">${round(item.main.temp)}°</span>
      ${pop>=20?`<span class="h-pop">${pop}%</span>`:""}`;
    hourly.appendChild(el);
  });

  // Daily — group by date
  const days = {};
  fc.list.forEach(item=>{
    const d = new Date((item.dt+tz)*1000).toISOString().slice(0,10);
    (days[d] ||= []).push(item);
  });
  const dailyEl = $("daily"); dailyEl.innerHTML = "";
  const allTemps = fc.list.map(x=>x.main.temp);
  const wkMin = Math.min(...allTemps), wkMax = Math.max(...allTemps);
  Object.values(days).slice(0,7).forEach((arr,i)=>{
    const lo = Math.min(...arr.map(x=>x.main.temp_min));
    const hi = Math.max(...arr.map(x=>x.main.temp_max));
    // pick midday icon
    const mid = arr[Math.floor(arr.length/2)];
    const left = ((lo - wkMin) / (wkMax - wkMin)) * 100;
    const right = ((hi - wkMin) / (wkMax - wkMin)) * 100;
    const row = document.createElement("div"); row.className = "d-row";
    row.innerHTML = `
      <span class="d-day">${dayName(arr[0].dt,tz,i)}</span>
      <i class="${iconFor(mid.weather[0].icon)}"></i>
      <span class="d-lo">${round(lo)}°</span>
      <div class="d-bar"><span style="left:${left}%;right:${100-right}%"></span></div>
      <span class="d-hi">${round(hi)}°</span>`;
    dailyEl.appendChild(row);
  });

  // Metrics
  const wind = round(cur.wind.speed * 3.6);
  $("wind").textContent = wind;
  $("hum").textContent = cur.main.humidity + "%";
  const dew = cur.main.temp - ((100 - cur.main.humidity)/5);
  $("dew").textContent = round(dew);
  $("vis").textContent = (cur.visibility/1000).toFixed(1);
  $("press").textContent = cur.main.pressure;
  $("feels").textContent = round(cur.main.feels_like) + "°";
  const rain = (cur.rain && (cur.rain["1h"]||cur.rain["3h"])) || 0;
  $("precip").textContent = rain.toFixed(1);
  $("sunrise").textContent = fmtTime(cur.sys.sunrise, tz);
  $("sunset").textContent = fmtTime(cur.sys.sunset, tz);

  // UV (free tier — approximate from clouds + time of day)
  const uv = approximateUV(cur);
  $("uv").textContent = uv;
  $("uvLabel").textContent = uvLabel(uv);
  $("uvFill").style.width = Math.min(100, (uv/11)*100) + "%";
}

function approximateUV(cur){
  const now = Date.now()/1000;
  if (now < cur.sys.sunrise || now > cur.sys.sunset) return 0;
  const noon = (cur.sys.sunrise + cur.sys.sunset)/2;
  const span = (cur.sys.sunset - cur.sys.sunrise)/2;
  const factor = Math.max(0, 1 - Math.abs(now-noon)/span);
  const cloudFactor = 1 - (cur.clouds?.all||0)/150;
  return Math.round(11 * factor * cloudFactor);
}

/* Events */
$("searchInput").addEventListener("keydown", async (e)=>{
  if (e.key !== "Enter") return;
  const q = e.target.value.trim(); if (!q) return;
  try { const g = await geocode(q); loadWeather(g.lat, g.lon, g.name); }
  catch(err){ alert(err.message); }
});

$("locBtn").addEventListener("click", useGeo);

function useGeo(){
  if (!navigator.geolocation) return loadWeather(40.7128,-74.0060,"New York");
  navigator.geolocation.getCurrentPosition(
    async (p)=>{
      const name = await reverse(p.coords.latitude, p.coords.longitude).catch(()=>"My Location");
      loadWeather(p.coords.latitude, p.coords.longitude, name);
    },
    ()=> loadWeather(40.7128,-74.0060,"New York"),
    { timeout: 6000 }
  );
}

/* Boot */
if (API_KEY.startsWith("REPLACE")) {
  console.warn("Add your OpenWeather API key in public/weather/weather.js");
}
useGeo();
