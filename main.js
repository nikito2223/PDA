// ==================================================
// === S.T.A.L.K.E.R. PDA - Полный аккуратный JS ====
// ==================================================

// === SUPABASE INITIALIZATION ===
const SUPABASE_URL = 'https://jezvycdhlfrjitqydhur.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DL_SkwBCIrHB0f7oIhwWAA_r7B2VMut';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === GLOBAL STATE & ELEMENTS ===
const menuButtons = document.querySelectorAll(".menu-item");
const sections = document.querySelectorAll(".section");

let userPosition = null;
let userMarker = null;
let routeLayer = null;
let isNavigating = false;
let navigationTarget = null;
let watchId = null;
let destinationMarker = null;
let navigationMode = false;

let showMarkers = true;
let isDarkStyle = false;

let stashes = [];
const markers = {};
let selectedLatLng = null;

const navToggleBtn = document.getElementById('toggleNavMode');
const popup = document.getElementById('stashPopup');
const stashFormContainer = document.getElementById('stashFormContainer');
const stashForm = document.getElementById('stashForm');
const stashName = document.getElementById('stashName');
const stashDesc = document.getElementById('stashDesc');
const stashType = document.getElementById('stashType');
const stashLat = document.getElementById('stashLat');
const stashLng = document.getElementById('stashLng');
const stashIdInput = document.getElementById('stashId');

const startNavBtn = document.getElementById('startNavigation');
const stopNavBtn = document.getElementById('stopNavigation');
const navStatusText = document.getElementById('navStatus');
const stashCancelBtn = document.getElementById('stashCancel');

stashCancelBtn.addEventListener('click', () => {
  stashFormContainer.style.display = 'none';
  stashForm.reset();
  selectedLatLng = null;
});


const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImM1ZTA3NDFhYzZkMjRlMmE4MzkzMDdiMzdhMjYzZjUyIiwiaCI6Im11cm11cjY0In0='; // можно заменить своим

// === MAP SETUP ===
const map = L.map('map').setView([54.915, 33.2972], 13);

const normalTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap',
  maxZoom: 18
});
const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap',
  maxZoom: 18
});
normalTiles.addTo(map);

// === TYPE CONFIG ===
const typeConfig = {
  stash: { name: 'Тайник', class: 'type-stash' },
  quest: { name: 'Задание', class: 'type-quest' },
  danger: { name: 'Опасность', class: 'type-danger' },
  anomaly: { name: 'Аномалия', class: 'type-anomaly' }
};

// === UTILS / UI HELPERS ===
function createButton(text, className, handler) {
  const btn = document.createElement('button');
  btn.className = `btn ${className}`;
  btn.textContent = text;
  btn.addEventListener('click', handler);
  return btn;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function validateCoordinates(lat, lng) {
  if (isNaN(lat) || isNaN(lng)) {
    console.error('Координаты должны быть числами:', lat, lng);
    return false;
  }
  if (lat < -90 || lat > 90) {
    console.error('Широта должна быть между -90 и 90:', lat);
    return false;
  }
  if (lng < -180 || lng > 180) {
    console.error('Долгота должна быть между -180 и 180:', lng);
    return false;
  }
  return true;
}

// === CUSTOM ICONS ===
function createCustomIcon(type) {
  const iconConfig = {
    stash: { color: '#0f0', icon: '▩', pulse: true },
    quest: { color: '#ff0', icon: '!', pulse: true },
    danger: { color: '#f00', icon: '☠', pulse: true },
    anomaly: { color: '#ff8000', icon: '⚠', rotate: true }
  };
  const config = iconConfig[type] || iconConfig.stash;
  return L.divIcon({
    className: `stalker-marker marker-${type}`,
    html: `
      <div class="marker-container" style="position:relative;width:40px;height:40px;">
        <div class="marker-glow" style="
          position:absolute;top:50%;left:50%;width:30px;height:30px;
          background: radial-gradient(circle, ${config.color}99 0%, transparent 70%);
          border:2px solid ${config.color};border-radius:50%;
          transform:translate(-50%,-50%);box-shadow:0 0 15px ${config.color};
          ${config.pulse ? 'animation: marker-pulse 2s infinite;' : '' }
          ${config.rotate ? 'animation: marker-rotate 4s infinite linear;' : '' }
        "></div>
        <div class="marker-icon" style="
          position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
          font-size:18px;font-weight:bold;color:#000;text-shadow:0 0 3px white;z-index:2;
        ">${config.icon}</div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
}

// === USER POSITION & GPS ===
function updateUserPositionMarker() {
  if (!userPosition) return;
  if (userMarker) {
    userMarker.setLatLng(userPosition);
  } else {
    userMarker = L.marker(userPosition, {
      icon: L.divIcon({
        className: 'my-position-marker',
        html: `
          <div style="position:relative;width:40px;height:40px;">
            <div style="
              position:absolute;top:50%;left:50%;width:30px;height:30px;
              background: radial-gradient(circle, rgba(0,255,0,0.9) 0%, rgba(0,255,0,0.2) 70%);
              border:3px solid #00ff00;border-radius:50%;transform:translate(-50%,-50%);
              box-shadow:0 0 20px #00ff00;animation: position-pulse 2s infinite;
            "></div>
            <div style="
              position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
              font-size:18px;color:#000;font-weight:bold;text-shadow:0 0 5px #0f0;
            ">▼</div>
          </div>
        `,
        iconSize: [40,40],
        iconAnchor: [20,40],
        popupAnchor: [0,-40]
      }),
      zIndexOffset: 1000
    }).addTo(map);
    userMarker.bindPopup('<b>Ваша текущая позиция</b>');
  }
}

function centerOnUserPosition() {
  if (userPosition) {
    map.setView(userPosition, 16);
    if (userMarker) userMarker.openPopup();
  } else {
    alert('GPS позиция не определена. Разрешите доступ к геолокации.');
  }
}

function initNavigation() {
  // My position button
  const myPositionBtn = document.getElementById('myPositionBtn');
  if (myPositionBtn) myPositionBtn.addEventListener('click', centerOnUserPosition);

  // Nav panel buttons
  const closeNav = document.getElementById('closeNav');
  if (closeNav) closeNav.addEventListener('click', stopNavigation);

  if (stopNavBtn) stopNavBtn.addEventListener('click', stopNavigation);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
        updateUserPositionMarker();
        console.log('GPS позиция получена:', userPosition);
      },
      (error) => {
        console.warn('GPS недоступен:', error.message);
        userPosition = map.getCenter();
      }
    );

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        userPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
        updateUserPositionMarker();
        if (isNavigating && navigationTarget) {
          calculateAndDisplayRoute(userPosition, navigationTarget);
        }
      },
      (error) => {
        console.warn('Ошибка отслеживания GPS:', error.message);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
  } else {
    console.warn('Geolocation не поддерживается браузером');
    userPosition = map.getCenter();
  }
}

// === NAVIGATION API (единая точка входа) ===
function setNavigationMode(enabled) {
  navigationMode = enabled;
  navToggleBtn.classList.toggle('active', enabled);
  navToggleBtn.textContent = enabled ? 'Режим: НАВИГАЦИЯ' : 'Режим: СОЗДАНИЕ';
}

navToggleBtn.addEventListener('click', () => setNavigationMode(!navigationMode));

startNavBtn.addEventListener('click', () => {
  if (!navigationTarget) {
    alert('❗ Сначала выбери точку назначения');
    return;
  }

  if (!userPosition) {
    alert('❗ Нет GPS позиции');
    return;
  }

  isNavigating = true;
  navStatusText.textContent = 'Навигация активна';

  buildRoute(userPosition, navigationTarget);
});

stopNavBtn.addEventListener('click', () => {
  stopNavigation();
  navStatusText.textContent = 'Остановлено';
});


function navigateTo(lat, lng, name = 'Точка назначения') {
  startNavigationTo({ lat, lng, name });
}

function startNavigationTo(target) {
  navigationTarget = target;

  if (destinationMarker) map.removeLayer(destinationMarker);
  destinationMarker = L.marker([target.lat, target.lng]).addTo(map);

  const panel = document.getElementById('navigationPanel');
  if (panel) panel.style.display = 'block';

  document.getElementById('navStatus').textContent = 'Готово к старту';
  if (userPosition) {
    isNavigating = true;
    calculateAndDisplayRoute(userPosition, navigationTarget);
  }
}




function calculateAndDisplayRoute(from, to) {
  if (!from || !to) {
    console.warn('Нет начальной или конечной точки');
    return;
  }

  // Удаляем старый маршрут
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }

  document.getElementById('navStatus').textContent = 'Построение маршрута...';

  routingControl = L.Routing.control({
    waypoints: [
      L.latLng(from.lat, from.lng),
      L.latLng(to.lat, to.lng)
    ],
    routeWhileDragging: false,
    addWaypoints: false,
    draggableWaypoints: false,
    show: false,
    createMarker: () => null, // скрываем стандартные маркеры
    lineOptions: {
      styles: [{ weight: 4, opacity: 0.9 }]
    }
  }).addTo(map);

  // === КОГДА МАРШРУТ ПОСТРОЕН ===
  routingControl.on('routesfound', function (e) {
    const route = e.routes[0];
    const distanceKm = route.summary.totalDistance / 1000;
    
    // оригинальное время в секундах
    const durationSec = route.summary.totalTime;
  
    // пересчёт в минуты с корректировкой пешеходной скорости
    const realisticSpeedKmh = 5; // км/ч
    const realisticTimeMin = Math.ceil(distanceKm / realisticSpeedKmh * 60);
  
    document.getElementById('navDistance').textContent = distanceKm.toFixed(2) + ' км';
    document.getElementById('navTime').textContent = realisticTimeMin + ' мин';
    document.getElementById('navStatus').textContent = 'Пешком';
  });


  // === ЕСЛИ ОШИБКА ===
  routingControl.on('routingerror', function () {
    document.getElementById('navStatus').textContent = 'Ошибка маршрута';
    document.getElementById('navDistance').textContent = '-';
    document.getElementById('navTime').textContent = '-';
  });
}


function startNavigation() {
  if (!navigationTarget || !userPosition) return;

  isNavigating = true;
  document.getElementById('navStatus').textContent = 'В пути';

  calculateAndDisplayRoute(userPosition, navigationTarget);
}

let routingControl = null;

function buildRoute(from, to) {
  if (routingControl) {
    map.removeControl(routingControl);
  }

  routingControl = L.Routing.control({
    waypoints: [
      L.latLng(from.lat, from.lng),
      L.latLng(to.lat, to.lng)
    ],
    routeWhileDragging: false,
    addWaypoints: false,
    draggableWaypoints: false,
    show: false,
    createMarker: () => null
  }).addTo(map);
}


function stopNavigation() {
  isNavigating = false;

  document.getElementById('navStatus').textContent = 'Остановлено';
  document.getElementById('navDistance').textContent = '-';
  document.getElementById('navTime').textContent = '-';

  const panel = document.getElementById('navigationPanel');
  if (panel) panel.style.display = 'none';

  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }
  if (destinationMarker) {
    map.removeLayer(destinationMarker);
    destinationMarker = null;
  }
}



// === POPUP / STASH UI ===
function showStashPopup(stash, latlng) {
  const config = typeConfig[stash.type] || typeConfig.stash;
  const description = stash.description || stash.desc || 'Нет описания';

  // Content
  const popupName = popup.querySelector('#popupName');
  const popupDesc = popup.querySelector('#popupDesc');
  const popupCoords = popup.querySelector('#popupCoords');
  const popupType = popup.querySelector('#popupType');

  if (popupName) popupName.textContent = stash.name;
  if (popupDesc) popupDesc.textContent = description;
  if (popupCoords) popupCoords.textContent = `Координаты: ${stash.lat.toFixed(4)}, ${stash.lng.toFixed(4)}`;
  if (popupType) {
    popupType.textContent = config.name;
    popupType.className = `popup-type ${config.class}`;
  }

  popup.dataset.stashId = stash.id;

  const btnGroup = popup.querySelector('.btn-group');
  btnGroup.innerHTML = '';

  btnGroup.appendChild(createButton('Проложить маршрут', 'btn-primary', (e) => {
    e.stopPropagation();
    startNavigationTo(stash);
    popup.style.display = 'none';
  }));

  btnGroup.appendChild(createButton('Редактировать', 'btn-secondary', (e) => {
    e.stopPropagation();
    openEditForm(stash);
    popup.style.display = 'none';
  }));

  btnGroup.appendChild(createButton('Удалить', 'btn-danger', async (e) => {
    e.stopPropagation();
    if (!confirm('Удалить этот тайник?')) return;
    try {
      const { error } = await supabaseClient.from('stashes').delete().eq('id', stash.id);
      if (error) throw error;
      if (markers[stash.id]) {
        map.removeLayer(markers[stash.id]);
        delete markers[stash.id];
      }
      stashes = stashes.filter(s => s.id !== stash.id);
      updateStashList();
    } catch (err) {
      console.error(err);
      alert('Ошибка удаления тайника');
    }
  }));

  // Show and position popup
  popup.style.display = 'block';
  const point = map.latLngToContainerPoint(latlng);
  const popupWidth = popup.offsetWidth || 250;
  const popupHeight = popup.offsetHeight || 140;
  const mapRect = map.getContainer().getBoundingClientRect();
  let left = Math.min(Math.max(10, point.x - popupWidth / 2), mapRect.width - popupWidth - 10);
  let top = point.y - popupHeight - 20;
  if (top < 10) top = point.y + 20;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
}

function openEditForm(stash) {
  stashFormContainer.style.display = 'block';
  document.getElementById('formTitle').textContent = 'Изменить тайник';
  stashName.value = stash.name;
  stashDesc.value = stash.description || stash.desc || '';
  stashType.value = stash.type;
  stashLat.value = stash.lat;
  stashLng.value = stash.lng;
  stashIdInput.value = stash.id;
  stashForm.dataset.mode = 'edit';
  selectedLatLng = L.latLng(stash.lat, stash.lng);
}

// === STASH CRUD & LOADING ===
async function loadStashes() {
  try {
    const { data, error } = await supabaseClient.from('stashes').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    stashes = data || [];
    // clear markers
    Object.values(markers).forEach(m => map.removeLayer(m));
    Object.keys(markers).forEach(k => delete markers[k]);
    stashes.forEach(addStashMarker);
    updateStashList();
    console.log('Loaded', stashes.length, 'stashes from Supabase');
  } catch (err) {
    console.error('Error loading stashes:', err);
    const localStashes = JSON.parse(localStorage.getItem('stashes') || '[]');
    stashes = localStashes;
    stashes.forEach(addStashMarker);
    updateStashList();
  }
}

function addStashMarker(stash) {
  const marker = L.marker([stash.lat, stash.lng], { icon: createCustomIcon(stash.type) });
  if (showMarkers) marker.addTo(map);
  marker.on('click', (e) => showStashPopup(stash, e.latlng));
  markers[stash.id] = marker;
  return marker;
}

window.startNavigationToStash = function(stashId) {
  const stash = stashes.find(s => s.id === stashId);
  if (stash) startNavigationTo(stash);
};

window.startNavigationToPoint = function(lat, lng) {
  startNavigationTo({ lat, lng, name: 'Точка на карте' });
};

// === MAP CLICK - ADD STASH OR NAVIGATE ===
map.on('click', function (e) {
  if (isNavigating) return;
  popup.style.display = 'none';

  if (navigationMode) {
    const target = { lat: e.latlng.lat, lng: e.latlng.lng, name: 'Точка на карте' };
    startNavigationTo(target);
    return;
  }

  selectedLatLng = e.latlng;
  if (window.tempMarker) {
    map.removeLayer(window.tempMarker);
  }
  window.tempMarker = L.marker(e.latlng, { icon: createCustomIcon('stash'), opacity: 0.7 }).addTo(map);
  stashFormContainer.style.display = 'block';
  stashLat.value = e.latlng.lat.toFixed(6);
  stashLng.value = e.latlng.lng.toFixed(6);
});

// === UI BUTTONS / CONTROLS ===
const toggleMapStyleBtn = document.getElementById('toggleMapStyle');
if (toggleMapStyleBtn) toggleMapStyleBtn.addEventListener('click', function() {
  if (isDarkStyle) {
    map.removeLayer(darkTiles);
    map.addLayer(normalTiles);
    this.textContent = 'Стиль: Здания';
    isDarkStyle = false;
  } else {
    map.removeLayer(normalTiles);
    map.addLayer(darkTiles);
    this.textContent = 'Стиль: Темный';
    isDarkStyle = true;
  }
});

const toggleMarkersBtn = document.getElementById('toggleMarkers');
if (toggleMarkersBtn) toggleMarkersBtn.addEventListener('click', function() {
  showMarkers = !showMarkers;
  Object.values(markers).forEach(marker => {
    if (showMarkers) map.addLayer(marker); else map.removeLayer(marker);
  });
  this.textContent = showMarkers ? 'Скрыть метки' : 'Показать метки';
});

const centerMapBtn = document.getElementById('centerMap');
if (centerMapBtn) centerMapBtn.addEventListener('click', function() {
  if (stashes.length > 0) {
    const bounds = L.latLngBounds(stashes.map(s => [s.lat, s.lng]));
    map.fitBounds(bounds, { padding: [50, 50] });
  } else {
    map.setView([54.915, 33.2972], 13);
  }
});

// Add stash button
const addStashBtn = document.getElementById('addStashBtn');
if (addStashBtn) addStashBtn.addEventListener('click', () => {
  // switch to map tab
  menuButtons[0].click();
  stashFormContainer.style.display = 'block';
  document.getElementById('formTitle').textContent = 'Добавить тайник';
  stashForm.reset();
  stashIdInput.value = '';
  stashForm.dataset.mode = 'add';
  const center = map.getCenter();
  stashLat.value = center.lat.toFixed(6);
  stashLng.value = center.lng.toFixed(6);
  selectedLatLng = null;
  if (window.tempMarker) {
    map.removeLayer(window.tempMarker);
    window.tempMarker = null;
  }
});

// === HANDLE STASH FORM SUBMIT ===
if (stashForm) {
  stashForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (window.tempMarker) { map.removeLayer(window.tempMarker); window.tempMarker = null; }

    const id = stashIdInput.value || generateUUID();
    const lat = selectedLatLng ? selectedLatLng.lat : parseFloat(stashLat.value) || map.getCenter().lat;
    const lng = selectedLatLng ? selectedLatLng.lng : parseFloat(stashLng.value) || map.getCenter().lng;

    if (!validateCoordinates(lat, lng)) { alert('Некорректные координаты!'); return; }

    const stash = {
      id,
      name: stashName.value.trim() || 'Без названия',
      description: stashDesc.value.trim(),
      type: stashType.value || 'stash',
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6))
    };

    try {
      if (stashForm.dataset.mode === 'edit') {
        const { error } = await supabaseClient.from('stashes').update({
          name: stash.name,
          description: stash.description,
          type: stash.type,
          lat: stash.lat,
          lng: stash.lng,
          updated_at: new Date().toISOString()
        }).eq('id', stash.id);
        if (error) throw error;

        const index = stashes.findIndex(s => s.id === stash.id);
        if (index >= 0) stashes[index] = stash;

        if (markers[stash.id]) { map.removeLayer(markers[stash.id]); delete markers[stash.id]; }
        addStashMarker(stash);

      } else {
        const { data, error } = await supabaseClient.from('stashes').insert([{
          ...stash,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]).select();
        if (error) throw error;
        if (data && data[0]) {
          stashes.unshift(data[0]);
          addStashMarker(data[0]);
        } else {
          stashes.unshift(stash);
          addStashMarker(stash);
        }
      }

      updateStashList();
      stashFormContainer.style.display = 'none';
      selectedLatLng = null;
      if (document.getElementById('stashesSection').classList.contains('active')) menuButtons[0].click();
      map.setView([stash.lat, stash.lng], Math.max(map.getZoom(), 15));

    } catch (err) {
      console.error('Error saving stash:', err);
      alert('Ошибка сохранения тайника: ' + (err.message || err));
      saveToLocalStorage(stash, id);
    }
  });
}

// === LOCALSTORAGE FALLBACK ===
function saveToLocalStorage(stash, id) {
  const stashForLocal = { ...stash, desc: stash.description };
  delete stashForLocal.description;

  const index = stashes.findIndex(s => s.id === id);
  if (index >= 0) stashes[index] = stashForLocal; else stashes.unshift(stashForLocal);

  localStorage.setItem('stashes', JSON.stringify(stashes));

  if (markers[id]) { map.removeLayer(markers[id]); delete markers[id]; }
  addStashMarker(stashForLocal);
  updateStashList();
}

// === UPDATE LIST VIEW ===
function updateStashList() {
  const container = document.getElementById('stashList');
  if (!container) return;
  container.innerHTML = '';

  if (stashes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div>Нет сохраненных тайников</div>
        <div class="empty-hint">Нажмите на карту, чтобы добавить тайник</div>
      </div>
    `;
    return;
  }

  stashes.forEach(stash => {
    const config = typeConfig[stash.type] || typeConfig.stash;
    const description = stash.description || stash.desc || 'Нет описания';
    const card = document.createElement('div');
    card.className = 'stash-card';
    card.innerHTML = `
      <div class="stash-type ${config.class}">${config.name}</div>
      <div class="stash-name">${stash.name}</div>
      <div class="stash-desc">${description}</div>
      <div class="stash-coords">Координаты: ${stash.lat.toFixed(4)}, ${stash.lng.toFixed(4)}</div>
      ${stash.created_at ? `<div class="stash-date">Добавлен: ${new Date(stash.created_at).toLocaleDateString()}</div>` : ''}
    `;
    card.addEventListener('click', () => {
      menuButtons[0].click();
      map.setView([stash.lat, stash.lng], Math.max(map.getZoom(), 15));
    });
    container.appendChild(card);
  });
}

// === POPUP BUTTONS (ALT) ===
const popupEditBtn = document.getElementById('popupEdit');
if (popupEditBtn) popupEditBtn.addEventListener('click', function() {
  const stashId = popup.dataset.stashId;
  const stash = stashes.find(s => s.id === stashId);
  if (stash) { openEditForm(stash); popup.style.display = 'none'; }
});

const popupDeleteBtn = document.getElementById('popupDelete');
if (popupDeleteBtn) popupDeleteBtn.addEventListener('click', async function() {
  const stashId = popup.dataset.stashId;
  if (!confirm('Удалить этот тайник?')) return;
  try {
    const { error } = await supabaseClient.from('stashes').delete().eq('id', stashId);
    if (error) throw error;
    const index = stashes.findIndex(s => s.id === stashId);
    if (index >= 0) {
      if (markers[stashId]) { map.removeLayer(markers[stashId]); delete markers[stashId]; }
      stashes.splice(index, 1);
      updateStashList();
    }
  } catch (err) {
    console.error('Error deleting stash:', err);
    alert('Ошибка удаления тайника: ' + (err.message || err));
  }
  popup.style.display = 'none';
});

// Hide popup when clicking outside
document.addEventListener('click', (e) => {
  if (popup.style.display === 'block' && !popup.contains(e.target) && !e.target.closest('.stalker-marker')) {
    popup.style.display = 'none';
  }
});

// === MENU BUTTONS SWITCH ===
menuButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    menuButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    sections.forEach(s => s.classList.remove('active'));
    const sectionId = btn.dataset.section;
    if (sectionId) document.getElementById(sectionId).classList.add('active');
  });
});

// === STYLES FOR ANIMATIONS ===
const style = document.createElement('style');
style.textContent = `
  @keyframes marker-pulse {
    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  }
  @keyframes marker-rotate {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
  }
  .stash-date { font-size:12px;color:#888;margin-top:5px; }
  .btn { padding:8px 12px;border-radius:4px;border:2px solid #0f0;background:transparent;color:var(--stalker-green, #0f0);cursor:pointer;font-family: 'Courier New', monospace;font-weight:bold; }
  .btn-primary{ border-color:#0f0; } .btn-secondary{ border-color:#ff0;color:#ff0 } .btn-danger{ border-color:#f00;color:#f00; }
`;
document.head.appendChild(style);

// === INITIALIZE ON LOAD ===
document.addEventListener('DOMContentLoaded', function() {
  // Delay a bit to allow map tiles and DOM to settle
  setTimeout(() => {
    initNavigation();
    loadStashes();
    console.log('S.T.A.L.K.E.R. PDA with Supabase initialized');
  }, 600);
});
