// ==================================================
// === МОДУЛЬ 1: КАРТЫ И GPS ===
// ==================================================

// === НАСТРОЙКИ ЛОКАЦИЙ ===
const locations = {
  дорогобуж: {
    name: 'Дорогобуж',
    center: [54.915, 33.2972],
    zoom: 13,
    bounds: [[54.87, 33.25], [54.96, 33.35]],
    description: 'Зона "Дорогобуж"'
  },
  чернобыль: {
    name: 'Чернобыль',
    center: [51.389, 30.099],
    zoom: 13,
    bounds: [[51.25, 29.95], [51.45, 30.25]],
    description: 'Чернобыльская зона отчуждения'
  },
  припять: {
    name: 'Припять',
    center: [51.405, 30.056],
    zoom: 15,
    bounds: [[51.38, 30.03], [51.43, 30.08]],
    description: 'Город-призрак Припять'
  },
  пинтагон: {
    name: 'Пинтагон',
    center: [52.6059, 39.5877],
    zoom: 15,
    bounds: [[38.870855, -77.056335], [51.43, 30.08]],
    description: 'Пинтагон Ошибка'
  }
};

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ КАРТЫ ===
let map = null;
let userPosition = null;
let userMarker = null;
let routeLayer = null;
let isNavigating = false;
let navigationTarget = null;
let watchId = null;
let destinationMarker = null;
let routingControl = null;
let currentLocation = 'дорогобуж';
let showMarkers = true;
let currentMapStyle = 'normal';

// Слои карты
let normalTiles, darkTiles, satelliteTiles, currentBaseLayer;

// === ИНИЦИАЛИЗАЦИЯ КАРТЫ ===
function initMap() {
  console.log('Инициализация карты...');
  map = L.map('map').setView(locations[currentLocation].center, locations[currentLocation].zoom);
  
  // Создаем слои карты
  normalTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 18
  });
  
  darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 18
  });
  
  satelliteTiles = L.tileLayer('https://wayback-a.maptiles.arcgis.com/arcgis/rest/services/world_imagery/wmts/1.0.0/default028mm/mapserver/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18
  });
  
  // Инициализация базового слоя
  currentBaseLayer = normalTiles;
  currentBaseLayer.addTo(map);
  
  // Восстанавливаем сохраненный стиль
  const savedStyle = localStorage.getItem('pda_map_style');
  if (savedStyle && ['normal', 'dark', 'satellite'].includes(savedStyle)) {
    currentMapStyle = savedStyle;
    switchMapStyle(savedStyle);
  }
  
  // Восстанавливаем сохраненную локацию
  const savedLocation = localStorage.getItem('pda_location');
  if (savedLocation && locations[savedLocation]) {
    currentLocation = savedLocation;
    switchLocation(savedLocation);
  }
  
  console.log('Карта инициализирована');
  return map;
}

// === ФУНКЦИИ УПРАВЛЕНИЯ КАРТОЙ ===
function switchMapStyle(style) {
  if (!map || !currentBaseLayer) return;
  
  // Удаляем текущий базовый слой
  map.removeLayer(currentBaseLayer);
  
  // Добавляем новый слой
  switch(style) {
    case 'dark':
      currentBaseLayer = darkTiles;
      break;
    case 'satellite':
      currentBaseLayer = satelliteTiles;
      break;
    case 'normal':
    default:
      currentBaseLayer = normalTiles;
      break;
  }
  
  currentBaseLayer.addTo(map);
  currentMapStyle = style;
  
  // Сохраняем выбор пользователя
  localStorage.setItem('pda_map_style', style);
  
  // Обновляем текст кнопки
  const toggleMapStyleBtn = document.getElementById('toggleMapStyle');
  if (toggleMapStyleBtn) {
    const styleNames = {
      'normal': 'Обычная',
      'dark': 'Ночная',
      'satellite': 'Спутник'
    };
    toggleMapStyleBtn.textContent = `Стиль: ${styleNames[style]}`;
  }
  
  // Обновляем маркеры для лучшей видимости на спутнике
  if (style === 'satellite') {
    document.body.classList.add('satellite-mode');
  } else {
    document.body.classList.remove('satellite-mode');
  }
}

function switchLocation(locationName) {
  if (!map || !locations[locationName]) {
    console.error('Неизвестная локация:', locationName);
    return;
  }
  
  const location = locations[locationName];
  currentLocation = locationName;
  
  map.setView(location.center, location.zoom);
  
  // Обновляем текст кнопки
  const locationToggleBtn = document.getElementById('toggleLocation');
  if (locationToggleBtn) {
    locationToggleBtn.textContent = `Локация: ${location.name}`;
  }
  
  // Обновляем статус в статус-баре
  updateLocationStatus();
  
  // Сохраняем выбор пользователя
  localStorage.setItem('pda_location', locationName);
  
  // Показываем уведомление о смене локации
  showLocationNotification(location);
  
  console.log(`Локация изменена на: ${location.name}`);
}

function updateLocationStatus() {
  const locationStatus = document.getElementById('locationStatus');
  if (locationStatus) {
    const location = locations[currentLocation];
    locationStatus.textContent = `Локация: ${location.name}`;
  }
}

function showLocationNotification(location) {
  const notification = document.createElement('div');
  notification.className = 'location-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <h3>${location.name}</h3>
      <p>${location.description}</p>
      <div class="notification-coords">
        Координаты: ${location.center[0].toFixed(4)}, ${location.center[1].toFixed(4)}
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Анимация появления
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Автоматическое скрытие через 3 секунды
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 500);
  }, 3000);
}

// === GPS ФУНКЦИИ ===
function initNavigation() {
  // Кнопка "Моя позиция"
  const myPositionBtn = document.getElementById('myPositionBtn');
  if (myPositionBtn) myPositionBtn.addEventListener('click', centerOnUserPosition);

  // Панель навигации
  const closeNav = document.getElementById('closeNav');
  if (closeNav) closeNav.addEventListener('click', stopNavigation);

  const stopNavBtn = document.getElementById('stopNavigation');
  if (stopNavBtn) stopNavBtn.addEventListener('click', stopNavigation);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
        updateUserPositionMarker();
        updateGPSStatus('active');
        console.log('GPS позиция получена:', userPosition);
      },
      (error) => {
        console.warn('GPS недоступен:', error.message);
        userPosition = map.getCenter();
        updateGPSStatus('error');
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
        updateGPSStatus('error');
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
  } else {
    console.warn('Geolocation не поддерживается браузером');
    userPosition = map.getCenter();
    updateGPSStatus('error');
  }
}

function updateUserPositionMarker() {
  if (!map || !userPosition) return;
  if (userMarker) {
    userMarker.setLatLng(userPosition);
  } else {
    userMarker = L.marker(userPosition, {
      icon: L.divIcon({
        className: `my-position-marker ${currentMapStyle === 'satellite' ? 'satellite-mode' : ''}`,
        html: `
          <div style="position:relative;width:32px;height:32px;">
            <div class="marker-glow" style="
              background: rgba(199, 254, 199, 0.3);
              border: 2px solid #c7fec7;
            "></div>
            <div class="marker-icon">▼</div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      }),
      zIndexOffset: 1000
    }).addTo(map);
    userMarker.bindPopup('<b>Ваша текущая позиция</b>');
  }
}

function centerOnUserPosition() {
  if (!map || !userPosition) {
    alert('GPS позиция не определена. Разрешите доступ к геолокации.');
    return;
  }
  
  map.setView(userPosition, 16);
  if (userMarker) userMarker.openPopup();
}

function updateGPSStatus(status) {
  const gpsStatusEl = document.getElementById('gpsStatus');
  if (!gpsStatusEl) return;
  
  switch(status) {
    case 'active':
      gpsStatusEl.textContent = '✓';
      gpsStatusEl.style.color = '#8b9d6b';
      break;
    case 'error':
      gpsStatusEl.textContent = '✗';
      gpsStatusEl.style.color = '#d94343';
      break;
    default:
      gpsStatusEl.textContent = '⏳';
      gpsStatusEl.style.color = '#d9b443';
  }
}

// === НАВИГАЦИОННЫЕ ФУНКЦИИ ===
function calculateAndDisplayRoute(from, to) {
  if (!map || !from || !to) {
    console.warn('Нет начальной или конечной точки');
    return;
  }

  // Удаляем старый маршрут
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }

  const navStatus = document.getElementById('navStatus');
  if (navStatus) navStatus.textContent = 'Построение маршрута...';

  routingControl = L.Routing.control({
    waypoints: [
      L.latLng(from.lat, from.lng),
      L.latLng(to.lat, to.lng)
    ],
    routeWhileDragging: false,
    addWaypoints: false,
    draggableWaypoints: false,
    show: false,
    createMarker: () => null,
    lineOptions: {
      styles: [{ 
        weight: 4, 
        opacity: 0.9,
        color: '#8b9d6b'
      }]
    }
  }).addTo(map);

  // Когда маршрут построен
  routingControl.on('routesfound', function (e) {
    const route = e.routes[0];
    const distanceKm = route.summary.totalDistance / 1000;
    
    const realisticSpeedKmh = 5; // км/ч
    const realisticTimeMin = Math.ceil(distanceKm / realisticSpeedKmh * 60);

    const navDistance = document.getElementById('navDistance');
    const navTime = document.getElementById('navTime');
    const navStatus = document.getElementById('navStatus');
    
    if (navDistance) navDistance.textContent = distanceKm.toFixed(2) + ' км';
    if (navTime) navTime.textContent = realisticTimeMin + ' мин';
    if (navStatus) navStatus.textContent = 'Пешком';
  });

  // Если ошибка
  routingControl.on('routingerror', function () {
    const navStatus = document.getElementById('navStatus');
    const navDistance = document.getElementById('navDistance');
    const navTime = document.getElementById('navTime');
    
    if (navStatus) navStatus.textContent = 'Ошибка маршрута';
    if (navDistance) navDistance.textContent = '-';
    if (navTime) navTime.textContent = '-';
  });
}

function startNavigationTo(target) {
  if (!map) return;
  
  navigationTarget = target;

  if (destinationMarker) map.removeLayer(destinationMarker);
  destinationMarker = L.marker([target.lat, target.lng], {
    icon: L.divIcon({
      className: `destination-marker ${currentMapStyle === 'satellite' ? 'satellite-mode' : ''}`,
      html: `
        <div style="position:relative;width:32px;height:32px;">
          <div class="marker-glow" style="
            background: rgba(255, 100, 100, 0.3);
            border: 2px solid #ff6464;
          "></div>
          <div class="marker-icon">📍</div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    })
  }).addTo(map);

  const panel = document.getElementById('navigationPanel');
  if (panel) panel.style.display = 'block';

  const navStatus = document.getElementById('navStatus');
  const navTarget = document.getElementById('navTarget');
  
  if (navStatus) navStatus.textContent = 'Готово к старту';
  if (navTarget) navTarget.textContent = target.name || 'Точка назначения';
  
  if (userPosition) {
    isNavigating = true;
    calculateAndDisplayRoute(userPosition, navigationTarget);
  }
}

function stopNavigation() {
  if (!map) return;
  
  isNavigating = false;

  const navStatus = document.getElementById('navStatus');
  const navDistance = document.getElementById('navDistance');
  const navTime = document.getElementById('navTime');
  
  if (navStatus) navStatus.textContent = 'Остановлено';
  if (navDistance) navDistance.textContent = '-';
  if (navTime) navTime.textContent = '-';

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

// === ФУНКЦИИ ДЛЯ УПРАВЛЕНИЯ МАРКЕРАМИ ===
function isMarkersVisible() {
  return showMarkers;
}

function toggleMarkers() {
  showMarkers = !showMarkers;
  return showMarkers;
}

function setShowMarkers(value) {
  showMarkers = value;
}

// === ЭКСПОРТ ОБЩИХ ФУНКЦИЙ ===
window.mapModule = {
  // Карта
  initMap,
  getMap: () => map,
  
  // Стили и локации
  switchMapStyle,
  switchLocation,
  updateLocationStatus,
  getCurrentLocation: () => currentLocation,
  getCurrentMapStyle: () => currentMapStyle,
  locations, // экспортируем объект locations
  
  // GPS и навигация
  initNavigation,
  startNavigationTo,
  stopNavigation,
  centerOnUserPosition,
  updateGPSStatus,
  calculateAndDisplayRoute,
  getUserPosition: () => userPosition,
  isNavigating: () => isNavigating,
  
  // Маркеры
  isMarkersVisible,
  toggleMarkers,
  setShowMarkers
};