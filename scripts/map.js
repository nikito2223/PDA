// ==================================================
// === МОДУЛЬ 1: КАРТЫ И GPS ===
// ==================================================

// === КОНФИГУРАЦИЯ ДОСТУПА ===
const ADMIN_ID = '4845c40c-d72e-4f5c-a8bb-59f5ca15dc14';
let currentUserId = null;

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

// Коллекция пользовательских маркеров с информацией о создателе
let customMarkers = new Map(); // key: markerId, value: { marker, creatorId, data }

// Слои карты
let normalTiles, darkTiles, satelliteTiles, currentBaseLayer;

// === ФУНКЦИИ АУТЕНТИФИКАЦИИ ===
function setCurrentUserId(userId) {
  currentUserId = userId;
  console.log(`Текущий пользователь установлен: ${userId}`);
  updateMarkerControls();
  
  // Показываем уведомление о правах
  if (isAdmin()) {
    showNotification('Администратор', 'У вас есть права на удаление всех меток', 'admin');
  } else {
    showNotification('Ограниченный доступ', 'Вы можете создавать метки, но не удалять их', 'info');
  }
}

function isAdmin() {
  return currentUserId === ADMIN_ID;
}

function canDeleteAnyMarker() {
  return isAdmin();
}

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
  
  // Восстанавливаем маркеры из localStorage
  loadMarkersFromStorage();
  
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

// === ФУНКЦИИ ДЛЯ РАБОТЫ С МАРКЕРАМИ ===
function addMarker(lat, lng, title, description, customData = {}) {
  if (!map) return null;
  
  const markerId = 'marker_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  // Определяем цвет маркера в зависимости от пользователя
  let markerColor = '#6495ed'; // Синий по умолчанию
  let markerIcon = '📍'; // Стандартная иконка
  
  if (isAdmin()) {
    markerColor = '#ff4444'; // Красный для админа
    markerIcon = '🔴'; // Красная точка для админа
  }
  
  const marker = L.marker([lat, lng], {
    icon: L.divIcon({
      className: `custom-marker ${currentMapStyle === 'satellite' ? 'satellite-mode' : ''}`,
      html: `
        <div style="position:relative;width:32px;height:32px;">
          <div class="marker-glow" style="
            background: rgba(${hexToRgb(markerColor)}, 0.3);
            border: 2px solid ${markerColor};
          "></div>
          <div class="marker-icon">${markerIcon}</div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    }),
    draggable: false // Отключаем перемещение для обычных пользователей
  }).addTo(map);
  
  // Добавляем контекстное меню для маркера (только для админа)
  if (isAdmin()) {
    marker.on('contextmenu', function(e) {
      showMarkerContextMenu(e, markerId);
    });
  }
  
  // Создаем popup с информацией
  const popupContent = createMarkerPopupContent(markerId, lat, lng, title, description);
  marker.bindPopup(popupContent);
  
  // Сохраняем информацию о маркере
  const markerInfo = {
    marker: marker,
    creatorId: currentUserId,
    creatorName: isAdmin() ? 'Администратор' : 'Пользователь',
    data: {
      id: markerId,
      lat: lat,
      lng: lng,
      title: title,
      description: description,
      createdAt: new Date().toISOString(),
      color: markerColor,
      icon: markerIcon,
      ...customData
    }
  };
  
  customMarkers.set(markerId, markerInfo);
  
  // Сохраняем в localStorage
  saveMarkersToStorage();
  
  // Показываем уведомление
  showNotification(
    'Метка создана', 
    `"${title || 'Без названия'}" добавлена на карту`,
    isAdmin() ? 'admin' : 'success'
  );
  
  return markerId;
}

function deleteMarker(markerId) {
  if (!customMarkers.has(markerId)) {
    console.warn('Маркер не найден:', markerId);
    return false;
  }
  
  // Проверяем права на удаление - ТОЛЬКО АДМИН
  if (!canDeleteAnyMarker()) {
    console.warn('Нет прав на удаление маркера. Только администратор может удалять метки.');
    showNotification('Отказано в доступе', 'Только администратор может удалять метки', 'error');
    return false;
  }
  
  const markerInfo = customMarkers.get(markerId);
  
  // Удаляем с карты
  if (markerInfo.marker && map) {
    map.removeLayer(markerInfo.marker);
  }
  
  // Удаляем из коллекции
  customMarkers.delete(markerId);
  
  // Обновляем хранилище
  saveMarkersToStorage();
  
  // Показываем уведомление
  showNotification(
    'Метка удалена', 
    `"${markerInfo.data.title || 'Метка'}" удалена администратором`,
    'warning'
  );
  
  return true;
}

function createMarkerPopupContent(markerId, lat, lng, title, description) {
  const markerInfo = customMarkers.get(markerId);
  const isAdminUser = isAdmin();
  
  let adminControls = '';
  if (isAdminUser) {
    adminControls = `
      <div class="admin-controls">
        <button onclick="window.mapModule.deleteMarker('${markerId}')" class="btn-delete">
          🗑️ Удалить метку (админ)
        </button>
      </div>
    `;
  }
  
  return `
    <div class="marker-popup">
      <h4>${title || 'Метка'}</h4>
      ${description ? `<p>${description}</p>` : ''}
      <div class="marker-info">
        <div class="marker-coords">
          <strong>Координаты:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}
        </div>
        <div class="marker-creator">
          <strong>Создатель:</strong> ${markerInfo?.creatorName || 'Неизвестно'}
        </div>
        ${markerInfo?.data.createdAt ? `
          <div class="marker-date">
            <strong>Создано:</strong> ${new Date(markerInfo.data.createdAt).toLocaleString()}
          </div>
        ` : ''}
      </div>
      <div class="marker-actions">
        <button onclick="window.mapModule.startNavigationTo({lat: ${lat}, lng: ${lng}, name: '${title || 'Метка'}'})" class="btn-navigate">
          🚶‍♂️ Начать навигацию
        </button>
        <button onclick="window.mapModule.centerOnMarker('${markerId}')" class="btn-center">
          🔍 Центрировать карту
        </button>
      </div>
      ${adminControls}
      ${!isAdminUser ? `
        <div class="access-note">
          <small>⚠️ Только администратор может удалять метки</small>
        </div>
      ` : ''}
    </div>
  `;
}

function showMarkerContextMenu(e, markerId) {
  // Контекстное меню только для админа
  if (!isAdmin()) return;
  
  e.originalEvent.preventDefault();
  
  const markerInfo = customMarkers.get(markerId);
  if (!markerInfo) return;
  
  // Создаем контекстное меню
  const contextMenu = document.createElement('div');
  contextMenu.className = 'marker-context-menu admin-context';
  contextMenu.style.position = 'absolute';
  contextMenu.style.left = e.originalEvent.clientX + 'px';
  contextMenu.style.top = e.originalEvent.clientY + 'px';
  contextMenu.style.zIndex = '10000';
  
  const menuContent = `
    <div class="context-menu-content">
      <h4>👑 Админ-панель</h4>
      <div class="menu-info">
        <strong>Метка:</strong> ${markerInfo.data.title || 'Без названия'}<br>
        <strong>Создатель:</strong> ${markerInfo.creatorName}<br>
        <strong>ID:</strong> ${markerId.substring(0, 8)}...
      </div>
      <div class="menu-actions">
        <button onclick="window.mapModule.deleteMarker('${markerId}')" class="menu-btn-delete">
          🗑️ Удалить метку
        </button>
        <button onclick="window.mapModule.startNavigationTo({lat: ${markerInfo.data.lat}, lng: ${markerInfo.data.lng}, name: '${markerInfo.data.title || 'Метка'}'})" class="menu-btn-navigate">
          🚶‍♂️ Навигация
        </button>
        <button onclick="window.mapModule.centerOnMarker('${markerId}')" class="menu-btn-center">
          🔍 Центрировать
        </button>
        <button onclick="this.parentElement.parentElement.parentElement.remove()" class="menu-btn-close">
          ✕ Закрыть
        </button>
      </div>
      <div class="menu-warning">
        ⚠️ Только вы можете удалять метки
      </div>
    </div>
  `;
  
  contextMenu.innerHTML = menuContent;
  document.body.appendChild(contextMenu);
  
  // Закрываем меню при клике вне его
  setTimeout(() => {
    const closeMenu = (clickEvent) => {
      if (!contextMenu.contains(clickEvent.target)) {
        contextMenu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    document.addEventListener('click', closeMenu);
  }, 10);
}

function centerOnMarker(markerId) {
  const markerInfo = customMarkers.get(markerId);
  if (!markerInfo || !map) return;
  
  map.setView([markerInfo.data.lat, markerInfo.data.lng], 16);
  if (markerInfo.marker) {
    markerInfo.marker.openPopup();
  }
}

function updateMarkerControls() {
  // Показываем/скрываем элементы управления в зависимости от прав
  const adminElements = document.querySelectorAll('[data-admin-only]');
  const userElements = document.querySelectorAll('[data-user-only]');
  
  if (isAdmin()) {
    // Показываем админ-элементы
    adminElements.forEach(el => {
      el.style.display = 'block';
      el.classList.add('admin-visible');
    });
    userElements.forEach(el => {
      el.style.display = 'none';
    });
    
    // Добавляем индикатор админа
    let adminIndicator = document.getElementById('adminIndicator');
    if (!adminIndicator) {
      adminIndicator = document.createElement('div');
      adminIndicator.id = 'adminIndicator';
      adminIndicator.className = 'admin-indicator';
      adminIndicator.innerHTML = '👑 АДМИНИСТРАТОР';
      adminIndicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: linear-gradient(135deg, #ff4444, #ff8888);
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(255, 68, 68, 0.3);
      `;
      document.body.appendChild(adminIndicator);
    }
  } else {
    // Скрываем админ-элементы
    adminElements.forEach(el => {
      el.style.display = 'none';
    });
    userElements.forEach(el => {
      el.style.display = 'block';
    });
    
    // Убираем индикатор админа
    const adminIndicator = document.getElementById('adminIndicator');
    if (adminIndicator) {
      adminIndicator.remove();
    }
  }
}

function showNotification(title, message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <h3>${title}</h3>
      <p>${message}</p>
    </div>
  `;
  
  // Стили для разных типов уведомлений
  const styles = {
    'admin': 'background: linear-gradient(135deg, #ff4444, #ff8888); color: white;',
    'success': 'background: linear-gradient(135deg, #4CAF50, #8BC34A); color: white;',
    'error': 'background: linear-gradient(135deg, #f44336, #e57373); color: white;',
    'warning': 'background: linear-gradient(135deg, #ff9800, #ffb74d); color: white;',
    'info': 'background: linear-gradient(135deg, #2196F3, #64B5F6); color: white;'
  };
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
    ${styles[type] || styles.info}
  `;
  
  document.body.appendChild(notification);
  
  // Автоматическое скрытие
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in forwards';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Вспомогательная функция для преобразования hex в rgb
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
    : '100, 149, 237';
}

// === ХРАНЕНИЕ МАРКЕРОВ ===
function saveMarkersToStorage() {
  const markersData = [];
  
  customMarkers.forEach((markerInfo, markerId) => {
    markersData.push({
      id: markerId,
      creatorId: markerInfo.creatorId,
      creatorName: markerInfo.creatorName,
      data: markerInfo.data
    });
  });
  
  localStorage.setItem('pda_custom_markers', JSON.stringify(markersData));
}

function loadMarkersFromStorage() {
  const savedMarkers = localStorage.getItem('pda_custom_markers');
  if (!savedMarkers) return;
  
  try {
    const markersData = JSON.parse(savedMarkers);
    
    markersData.forEach(markerData => {
      // Создаем маркер с соответствующим цветом
      const markerColor = markerData.data.color || '#6495ed';
      const markerIcon = markerData.data.icon || '📍';
      
      const marker = L.marker([markerData.data.lat, markerData.data.lng], {
        icon: L.divIcon({
          className: `custom-marker ${currentMapStyle === 'satellite' ? 'satellite-mode' : ''}`,
          html: `
            <div style="position:relative;width:32px;height:32px;">
              <div class="marker-glow" style="
                background: rgba(${hexToRgb(markerColor)}, 0.3);
                border: 2px solid ${markerColor};
              "></div>
              <div class="marker-icon">${markerIcon}</div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        }),
        draggable: false
      }).addTo(map);
      
      // Добавляем контекстное меню только если текущий пользователь - админ
      if (isAdmin()) {
        marker.on('contextmenu', function(e) {
          showMarkerContextMenu(e, markerData.id);
        });
      }
      
      // Восстанавливаем popup
      const popupContent = createMarkerPopupContent(
        markerData.id,
        markerData.data.lat,
        markerData.data.lng,
        markerData.data.title,
        markerData.data.description
      );
      
      marker.bindPopup(popupContent);
      
      // Сохраняем в коллекцию
      customMarkers.set(markerData.id, {
        marker: marker,
        creatorId: markerData.creatorId,
        creatorName: markerData.creatorName,
        data: markerData.data
      });
    });
    
    console.log(`Загружено ${markersData.length} маркеров из хранилища`);
  } catch (error) {
    console.error('Ошибка загрузки маркеров:', error);
  }
}

// === GPS ФУНКЦИИ ===
function initNavigation() {
  const myPositionBtn = document.getElementById('myPositionBtn');
  if (myPositionBtn) myPositionBtn.addEventListener('click', centerOnUserPosition);

  const closeNav = document.getElementById('closeNav');
  if (closeNav) closeNav.addEventListener('click', stopNavigation);

  const stopNavBtn = document.getElementById('stopNavigation');
  if (stopNavBtn) stopNavBtn.addEventListener('click', stopNavigation);

  // ✅ ЕСЛИ ELECTRON
  if (window.electronGeo && window.electronGeo.getCurrentPosition) {
    window.electronGeo.getCurrentPosition(
      (position) => {
        userPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        updateUserPositionMarker();
        updateGPSStatus('active');
      },
      (error) => {
        console.warn('Electron GPS ошибка:', error);
        updateGPSStatus('error');
      }
    );
  }

  // ✅ ЕСЛИ БРАУЗЕР
  else if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        updateUserPositionMarker();
        updateGPSStatus('active');
      },
      (error) => {
        console.warn('Browser GPS ошибка:', error.message);
        updateGPSStatus('error');
      },
      { enableHighAccuracy: true }
    );

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        userPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        updateUserPositionMarker();
        if (isNavigating && navigationTarget) {
          calculateAndDisplayRoute(userPosition, navigationTarget);
        }
      }
    );
  }

  // ❌ НИЧЕГО НЕТ
  else {
    console.warn('Geolocation не поддерживается');
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

// === ОЧИСТКА ВСЕХ МАРКЕРОВ (ТОЛЬКО ДЛЯ АДМИНА) ===
function clearAllMarkers() {
  if (!canDeleteAnyMarker()) {
    showNotification('Отказано в доступе', 'Только администратор может очищать все метки', 'error');
    return false;
  }
  
  const markerCount = customMarkers.size;
  
  // Удаляем все маркеры с карты
  customMarkers.forEach((markerInfo, markerId) => {
    if (markerInfo.marker && map) {
      map.removeLayer(markerInfo.marker);
    }
  });
  
  // Очищаем коллекцию
  customMarkers.clear();
  
  // Очищаем хранилище
  localStorage.removeItem('pda_custom_markers');
  
  // Показываем уведомление
  showNotification(
    'Все метки удалены', 
    `${markerCount} меток были удалены администратором`,
    'warning'
  );
  
  return true;
}

// === ЭКСПОРТ ОБЩИХ ФУНКЦИЙ ===
window.mapModule = {
  // Аутентификация
  setCurrentUserId,
  isAdmin,
  canDeleteAnyMarker,
  
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
  addMarker,
  deleteMarker,
  clearAllMarkers,
  centerOnMarker,
  getMarker: (markerId) => customMarkers.get(markerId),
  getAllMarkers: () => customMarkers,
  isMarkersVisible,
  toggleMarkers,
  setShowMarkers
};