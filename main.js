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

// Фильтры
let activeFilters = {
  stash: true,
  quest: true,
  danger: true,
  anomaly: true
};

// Основные элементы интерфейса
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
const coordLat = document.getElementById('coordLat');
const coordLng = document.getElementById('coordLng');

const startNavBtn = document.getElementById('startNavigation');
const stopNavBtn = document.getElementById('stopNavigation');
const navStatusText = document.getElementById('navStatus');
const stashCancelBtn = document.getElementById('stashCancel');

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImM1ZTA3NDFhYzZkMjRlMmE4MzkzMDdiMzdhMjYzZjUyIiwiaCI6Im11cm11cjY0In0=';

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

// === MOBILE DETECTION & OPTIMIZATION ===
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// Функция для оптимизации под мобильные устройства
function optimizeForMobile() {
  if (!isMobile && !isTouchDevice) return;
  
  console.log('Optimizing for mobile/touch device');
  
  // Создаем мобильный переключатель меню
  createMobileMenuToggle();
  
  // Оптимизируем карту для мобильных
  optimizeMapForMobile();
  
  // Увеличиваем области касания
  increaseTouchTargets();
  
  // Оптимизируем события для касаний
  optimizeTouchEvents();
  
  // Добавляем свайп-жесты
  addSwipeGestures();
  
  // Предотвращаем контекстное меню на долгое касание
  preventLongPressContextMenu();
  
  // Обновляем интерфейс для мобильных
  updateMobileUI();
}

function createMobileMenuToggle() {
  // Создаем кнопку переключения меню
  const menuToggle = document.createElement('button');
  menuToggle.className = 'mobile-menu-toggle';
  menuToggle.innerHTML = '☰';
  menuToggle.setAttribute('aria-label', 'Toggle menu');
  document.body.appendChild(menuToggle);
  
  // Создаем фон для меню
  const backdrop = document.createElement('div');
  backdrop.className = 'mobile-backdrop';
  document.body.appendChild(backdrop);
  
  const menu = document.getElementById('menu');
  
  // Функция переключения меню
  function toggleMenu() {
    menu.classList.toggle('mobile-open');
    backdrop.classList.toggle('active');
    document.body.style.overflow = menu.classList.contains('mobile-open') ? 'hidden' : '';
  }
  
  // Обработчики событий
  menuToggle.addEventListener('click', toggleMenu);
  backdrop.addEventListener('click', toggleMenu);
  
  // Закрываем меню при клике на пункт меню
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
      if (menu.classList.contains('mobile-open')) {
        toggleMenu();
      }
    });
  });
}

function optimizeMapForMobile() {
  // Оптимизация карты для мобильных
  map.touchZoom.enable();
  map.doubleClickZoom.disable(); // Отключаем двойной клик на мобильных
  
  // Увеличиваем чувствительность касаний
  map.dragging._touchMoved = function(e) {
    return Math.abs(e.touches[0].pageX - this._touchStart.x) > 10 ||
           Math.abs(e.touches[0].pageY - this._touchStart.y) > 10;
  };
  
  // Добавляем обработку касаний для маркеров
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      layer.options.title = layer.options.title || '';
      layer.options.alt = layer.options.alt || '';
    }
  });
}

function increaseTouchTargets() {
  // Увеличиваем минимальные размеры для элементов касания
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 768px) {
      .btn, .map-control-btn, .stash-action-btn {
        min-height: 44px !important;
      }
      
      .leaflet-control-zoom a {
        width: 44px !important;
        height: 44px !important;
        line-height: 44px !important;
      }
      
      .menu-item {
        padding: 12px 15px !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function optimizeTouchEvents() {
  // Заменяем hover-события на touch-события
  if (isTouchDevice) {
    // Убираем hover-эффекты
    document.querySelectorAll('*').forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.transition) {
        el.style.transition = 'none';
      }
    });
    
    // Добавляем активные состояния при касании
    document.addEventListener('touchstart', function(e) {
      if (e.target.classList.contains('btn') || 
          e.target.classList.contains('map-control-btn') ||
          e.target.classList.contains('menu-item')) {
        e.target.classList.add('touch-active');
      }
    }, { passive: true });
    
    document.addEventListener('touchend', function(e) {
      document.querySelectorAll('.touch-active').forEach(el => {
        el.classList.remove('touch-active');
      });
    }, { passive: true });
  }
}

function addSwipeGestures() {
  if (!isTouchDevice) return;
  
  let touchStartX = 0;
  let touchStartY = 0;
  
  document.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  
  document.addEventListener('touchend', function(e) {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    
    // Определяем свайп
    if (Math.abs(diffX) > Math.abs(diffY)) {
      // Горизонтальный свайп
      if (Math.abs(diffX) > 50) {
        if (diffX > 0) {
          // Свайп влево
          handleSwipeLeft();
        } else {
          // Свайп вправо
          handleSwipeRight();
        }
      }
    } else {
      // Вертикальный свайп
      if (Math.abs(diffY) > 50) {
        if (diffY > 0) {
          // Свайп вверх
          handleSwipeUp();
        } else {
          // Свайп вниз
          handleSwipeDown();
        }
      }
    }
  }, { passive: true });
  
  function handleSwipeLeft() {
    // Переход к следующей вкладке
    const activeBtn = document.querySelector('.menu-item.active');
    const activeIndex = Array.from(menuButtons).indexOf(activeBtn);
    if (activeIndex < menuButtons.length - 1) {
      menuButtons[activeIndex + 1].click();
    }
  }
  
  function handleSwipeRight() {
    // Переход к предыдущей вкладке
    const activeBtn = document.querySelector('.menu-item.active');
    const activeIndex = Array.from(menuButtons).indexOf(activeBtn);
    if (activeIndex > 0) {
      menuButtons[activeIndex - 1].click();
    }
  }
  
  function handleSwipeUp() {
    // Закрытие попапов и панелей
    if (popup.style.display === 'block') {
      popup.style.display = 'none';
    }
    if (stashFormContainer.style.display === 'block') {
      stashFormContainer.style.display = 'none';
    }
    if (document.getElementById('navigationPanel').style.display === 'block') {
      stopNavigation();
    }
  }
  
  function handleSwipeDown() {
    // Показать GPS кнопку если скрыта
    const gpsBtn = document.getElementById('myPositionBtn');
    if (gpsBtn.style.opacity === '0') {
      gpsBtn.style.opacity = '1';
    }
  }
}

function preventLongPressContextMenu() {
  // Предотвращаем контекстное меню при долгом нажатии
  document.addEventListener('contextmenu', function(e) {
    if (isTouchDevice) {
      e.preventDefault();
    }
  });
  
  // Также предотвращаем выделение текста при долгом нажатии
  document.addEventListener('selectstart', function(e) {
    if (isTouchDevice) {
      e.preventDefault();
    }
  });
}

function updateMobileUI() {
  // Скрываем ненужные элементы на мобильных
  if (window.innerWidth < 768) {
    // Упрощаем заголовки
    document.querySelectorAll('.stash-list-title, .form-header').forEach(el => {
      el.style.fontSize = '16px';
    });
    
    // Уменьшаем отступы
    document.querySelectorAll('.stash-card, .journal-entry').forEach(el => {
      el.style.padding = '12px';
    });
    
    // Упрощаем кнопки
    document.querySelectorAll('.btn').forEach(btn => {
      btn.style.borderWidth = '1px';
      btn.style.borderRadius = '4px';
    });
  }
  
  // Адаптируем форму под мобильные
  const formInputs = document.querySelectorAll('.form-input, .form-select');
  formInputs.forEach(input => {
    input.addEventListener('focus', function() {
      // Прокручиваем к полю ввода при фокусе на мобильных
      if (isMobile) {
        setTimeout(() => {
          this.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    });
  });
  
  // Оптимизируем попапы для мобильных
  const adjustPopupForMobile = () => {
    if (window.innerWidth < 768) {
      popup.style.maxWidth = '90vw';
      popup.style.width = '90vw';
    }
  };
  
  window.addEventListener('resize', adjustPopupForMobile);
  adjustPopupForMobile();
}

// === ОБНОВЛЕННЫЙ INITIALIZE ON LOAD ===
document.addEventListener('DOMContentLoaded', function() {
  // Оптимизация под мобильные устройства
  if (isMobile || isTouchDevice) {
    document.body.classList.add('mobile-device');
    if (isMobile) {
      document.body.classList.add('is-mobile');
    }
    if (isTouchDevice) {
      document.body.classList.add('is-touch');
    }
  }
  
  // Delay a bit to allow map tiles and DOM to settle
  setTimeout(() => {
    initNavigation();
    loadStashes();
    initFilterControls();
    
    // Оптимизация для мобильных
    optimizeForMobile();
    
    // Обновление статус-бара
    setInterval(updateStatusBar, 1000);
    updateStatusBar();
    
    // Обновление зума при изменении
    map.on('zoomend', updateStatusBar);
    
    // Обновление координат в форме при клике на карту
    map.on('click', function(e) {
      if (stashFormContainer.style.display === 'block') {
        coordLat.textContent = e.latlng.lat.toFixed(6);
        coordLng.textContent = e.latlng.lng.toFixed(6);
      }
    });
    
    // Обработка изменения ориентации
    window.addEventListener('orientationchange', function() {
      setTimeout(() => {
        map.invalidateSize();
        updateMobileUI();
      }, 300);
    });
    
    // Обработка изменения размера окна
    let resizeTimeout;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        map.invalidateSize();
        updateMobileUI();
      }, 250);
    });
    
    console.log('S.T.A.L.K.E.R. PDA initialized with mobile optimization');
  }, 600);
});

// === ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ МОБИЛЬНЫХ ===

// Определение поддержки PWA
function checkPWACompatibility() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    console.log('PWA features available');
    // Можно добавить установку PWA
  }
}

// Сохранение состояния приложения при сворачивании
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    // Приложение скрыто
    if (isMobile) {
      // Сохраняем состояние для быстрого восстановления
      localStorage.setItem('pda_last_view', map.getCenter().toString());
    }
  } else {
    // Приложение снова видимо
    if (isMobile) {
      // Восстанавливаем состояние
      const lastView = localStorage.getItem('pda_last_view');
      if (lastView) {
        const [lat, lng] = lastView.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          map.setView([lat, lng], map.getZoom());
        }
      }
    }
  }
});

// Предотвращение блокировки сна для навигации
let wakeLock = null;
async function requestWakeLock() {
  if ('wakeLock' in navigator && isNavigating) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake Lock активен для навигации');
    } catch (err) {
      console.log('Wake Lock не поддерживается:', err);
    }
  }
}

async function releaseWakeLock() {
  if (wakeLock !== null) {
    await wakeLock.release();
    wakeLock = null;
    console.log('Wake Lock освобожден');
  }
}

// Обновляем функции навигации для работы с Wake Lock
const originalStartNavigation = startNavigation;
const originalStopNavigation = stopNavigation;

startNavigation = function() {
  if (!navigationTarget || !userPosition) return;

  isNavigating = true;
  document.getElementById('navStatus').textContent = 'В пути';
  
  // Запрашиваем Wake Lock на мобильных
  if (isMobile) {
    requestWakeLock();
  }

  calculateAndDisplayRoute(userPosition, navigationTarget);
};

stopNavigation = function() {
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
  
  // Освобождаем Wake Lock
  if (isMobile) {
    releaseWakeLock();
  }
};

// Проверяем поддержку PWA при загрузке
checkPWACompatibility();

// === TYPE CONFIG ===
const typeConfig = {
  stash: { 
    name: 'Тайник', 
    class: 'type-stash',
    color: '#8b9d6b',
    icon: '▩'
  },
  quest: { 
    name: 'Задание', 
    class: 'type-quest',
    color: '#d9b443',
    icon: '!'
  },
  danger: { 
    name: 'Опасность', 
    class: 'type-danger',
    color: '#d94343',
    icon: '☠'
  },
  anomaly: { 
    name: 'Аномалия', 
    class: 'type-anomaly',
    color: '#6b9d8b',
    icon: '⚠'
  }
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
  const config = typeConfig[type] || typeConfig.stash;
  return L.divIcon({
    className: `stalker-marker marker-${type}`,
    html: `
      <div class="marker-container">
        <div class="marker-glow" style="background: rgba(${hexToRgb(config.color)}, 0.5); border-color: ${config.color};"></div>
        <div class="marker-icon">${config.icon}</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
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
  if (userPosition) {
    map.setView(userPosition, 16);
    if (userMarker) userMarker.openPopup();
  } else {
    alert('GPS позиция не определена. Разрешите доступ к геолокации.');
  }
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

// === NAVIGATION FUNCTIONS ===
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

function startNavigationTo(target) {
  navigationTarget = target;

  if (destinationMarker) map.removeLayer(destinationMarker);
  destinationMarker = L.marker([target.lat, target.lng]).addTo(map);

  const panel = document.getElementById('navigationPanel');
  if (panel) panel.style.display = 'block';

  document.getElementById('navStatus').textContent = 'Готово к старту';
  document.getElementById('navTarget').textContent = target.name || 'Точка назначения';
  
  if (userPosition) {
    isNavigating = true;
    calculateAndDisplayRoute(userPosition, navigationTarget);
  }
}

let routingControl = null;

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

    document.getElementById('navDistance').textContent = distanceKm.toFixed(2) + ' км';
    document.getElementById('navTime').textContent = realisticTimeMin + ' мин';
    document.getElementById('navStatus').textContent = 'Пешком';
  });

  // Если ошибка
  routingControl.on('routingerror', function () {
    document.getElementById('navStatus').textContent = 'Ошибка маршрута';
    document.getElementById('navDistance').textContent = '-';
    document.getElementById('navTime').textContent = '-';
  });
}

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

// === FILTER MANAGEMENT ===
function initFilterControls() {
  // Чекбоксы в меню
  const filters = ['stash', 'quest', 'danger', 'anomaly'];
  filters.forEach(type => {
    const checkbox = document.getElementById(`filter${type.charAt(0).toUpperCase() + type.slice(1)}`);
    if (checkbox) {
      checkbox.addEventListener('change', function() {
        activeFilters[type] = this.checked;
        updateMarkersVisibility();
        updateStashList();
        updateCounters();
      });
    }
  });
  
  // Кнопки фильтрации в списке
  const filterAllBtn = document.getElementById('filterAll');
  if (filterAllBtn) {
    filterAllBtn.addEventListener('click', () => {
      Object.keys(activeFilters).forEach(key => {
        activeFilters[key] = true;
        const checkbox = document.getElementById(`filter${key.charAt(0).toUpperCase() + key.slice(1)}`);
        if (checkbox) checkbox.checked = true;
      });
      updateMarkersVisibility();
      updateStashList();
      updateCounters();
    });
  }
  
  const filterStashesBtn = document.getElementById('filterStashes');
  if (filterStashesBtn) {
    filterStashesBtn.addEventListener('click', () => {
      Object.keys(activeFilters).forEach(key => {
        activeFilters[key] = key === 'stash';
        const checkbox = document.getElementById(`filter${key.charAt(0).toUpperCase() + key.slice(1)}`);
        if (checkbox) checkbox.checked = key === 'stash';
      });
      updateMarkersVisibility();
      updateStashList();
      updateCounters();
    });
  }
  
  const filterQuestsBtn = document.getElementById('filterQuests');
  if (filterQuestsBtn) {
    filterQuestsBtn.addEventListener('click', () => {
      Object.keys(activeFilters).forEach(key => {
        activeFilters[key] = key === 'quest';
        const checkbox = document.getElementById(`filter${key.charAt(0).toUpperCase() + key.slice(1)}`);
        if (checkbox) checkbox.checked = key === 'quest';
      });
      updateMarkersVisibility();
      updateStashList();
      updateCounters();
    });
  }
}

function updateMarkersVisibility() {
  Object.keys(markers).forEach(key => {
    const marker = markers[key];
    const stash = stashes.find(s => s.id === key);
    if (stash && activeFilters[stash.type]) {
      if (showMarkers && !map.hasLayer(marker)) {
        marker.addTo(map);
      } else if (!showMarkers && map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    } else {
      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    }
  });
}

function updateCounters() {
  // Общее количество тайников
  const stashCount = document.getElementById('stashCount');
  if (stashCount) stashCount.textContent = stashes.length;
  
  // Количество в списке с учетом фильтров
  const stashListCount = document.getElementById('stashListCount');
  if (stashListCount) {
    const filteredCount = stashes.filter(stash => activeFilters[stash.type]).length;
    stashListCount.textContent = `(${filteredCount})`;
  }
  
  // Количество видимых маркеров
  const markerCount = document.getElementById('markerCount');
  if (markerCount) {
    const visibleCount = Object.keys(markers).filter(key => {
      const stash = stashes.find(s => s.id === key);
      return stash && activeFilters[stash.type] && showMarkers;
    }).length;
    markerCount.textContent = visibleCount;
  }
}

// === POPUP / STASH UI ===
function showStashPopup(stash, latlng) {
  const config = typeConfig[stash.type] || typeConfig.stash;
  const description = stash.description || stash.desc || 'Нет описания';

  // Обновляем содержимое попапа
  document.getElementById('popupName').textContent = stash.name;
  document.getElementById('popupDesc').textContent = description;
  document.getElementById('popupCoords').textContent = `Координаты: ${stash.lat.toFixed(4)}, ${stash.lng.toFixed(4)}`;
  
  const popupTypeBadge = document.getElementById('popupTypeBadge');
  popupTypeBadge.textContent = config.name;
  popupTypeBadge.className = `popup-type-badge ${config.class}`;
  
  const popupDate = document.getElementById('popupDate');
  if (stash.created_at) {
    popupDate.textContent = `Добавлен: ${new Date(stash.created_at).toLocaleDateString('ru-RU')}`;
    popupDate.style.display = 'block';
  } else {
    popupDate.style.display = 'none';
  }

  popup.dataset.stashId = stash.id;

  // Обновляем обработчики кнопок
  const popupNavigate = document.getElementById('popupNavigate');
  const popupEdit = document.getElementById('popupEdit');
  const popupDelete = document.getElementById('popupDelete');

  // Удаляем старые обработчики
  const newNavigate = popupNavigate.cloneNode(true);
  const newEdit = popupEdit.cloneNode(true);
  const newDelete = popupDelete.cloneNode(true);

  popupNavigate.parentNode.replaceChild(newNavigate, popupNavigate);
  popupEdit.parentNode.replaceChild(newEdit, popupEdit);
  popupDelete.parentNode.replaceChild(newDelete, popupDelete);

  // Добавляем новые обработчики
  newNavigate.addEventListener('click', (e) => {
    e.stopPropagation();
    startNavigationTo(stash);
    popup.style.display = 'none';
  });

  newEdit.addEventListener('click', (e) => {
    e.stopPropagation();
    openEditForm(stash);
    popup.style.display = 'none';
  });

  newDelete.addEventListener('click', async (e) => {
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
      updateCounters();
      popup.style.display = 'none';
    } catch (err) {
      console.error(err);
      alert('Ошибка удаления тайника');
    }
  });

  // Показываем и позиционируем попап
  popup.style.display = 'block';
  const point = map.latLngToContainerPoint(latlng);
  const popupWidth = popup.offsetWidth || 320;
  const popupHeight = popup.offsetHeight || 200;
  const mapRect = map.getContainer().getBoundingClientRect();
  
  let left = Math.min(Math.max(10, point.x - popupWidth / 2), mapRect.width - popupWidth - 10);
  let top = point.y - popupHeight - 30;
  
  if (top < 10) {
    top = point.y + 30;
  }
  
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
  coordLat.textContent = stash.lat.toFixed(6);
  coordLng.textContent = stash.lng.toFixed(6);
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
    
    // Очищаем старые маркеры
    Object.values(markers).forEach(m => map.removeLayer(m));
    Object.keys(markers).forEach(k => delete markers[k]);
    
    // Добавляем новые маркеры
    stashes.forEach(addStashMarker);
    
    // Обновляем видимость согласно фильтрам
    updateMarkersVisibility();
    updateStashList();
    updateCounters();
    
    console.log('Loaded', stashes.length, 'stashes from Supabase');
  } catch (err) {
    console.error('Error loading stashes:', err);
    // Fallback to localStorage
    const localStashes = JSON.parse(localStorage.getItem('stashes') || '[]');
    stashes = localStashes;
    stashes.forEach(addStashMarker);
    updateMarkersVisibility();
    updateStashList();
    updateCounters();
  }
}

function addStashMarker(stash) {
  const marker = L.marker([stash.lat, stash.lng], { 
    icon: createCustomIcon(stash.type),
    title: stash.name
  });
  
  // Добавляем маркер на карту только если соответствующий фильтр включен
  if (showMarkers && activeFilters[stash.type]) {
    marker.addTo(map);
  }
  
  marker.on('click', (e) => showStashPopup(stash, e.latlng));
  markers[stash.id] = marker;
  return marker;
}

// === MAP CLICK - ADD STASH OR NAVIGATE ===
map.on('click', function (e) {
  if (isNavigating) return;
  popup.style.display = 'none';

  if (navigationMode) {
    const target = { 
      lat: e.latlng.lat, 
      lng: e.latlng.lng, 
      name: 'Точка на карте' 
    };
    startNavigationTo(target);
    return;
  }

  selectedLatLng = e.latlng;
  if (window.tempMarker) {
    map.removeLayer(window.tempMarker);
  }
  window.tempMarker = L.marker(e.latlng, { 
    icon: createCustomIcon('stash'), 
    opacity: 0.7 
  }).addTo(map);
  
  stashFormContainer.style.display = 'block';
  stashForm.dataset.mode = 'add';
  document.getElementById('formTitle').textContent = 'Добавить тайник';
  stashForm.reset();
  stashIdInput.value = '';
  
  stashLat.value = e.latlng.lat.toFixed(6);
  stashLng.value = e.latlng.lng.toFixed(6);
  coordLat.textContent = e.latlng.lat.toFixed(6);
  coordLng.textContent = e.latlng.lng.toFixed(6);
  
  // Переключаемся на карту, если не на ней
  if (!document.getElementById('mapSection').classList.contains('active')) {
    menuButtons[0].click();
  }
});

// === UI BUTTONS / CONTROLS ===
const toggleMapStyleBtn = document.getElementById('toggleMapStyle');
if (toggleMapStyleBtn) {
  toggleMapStyleBtn.addEventListener('click', function() {
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
}

const toggleMarkersBtn = document.getElementById('toggleMarkers');
if (toggleMarkersBtn) {
  toggleMarkersBtn.addEventListener('click', function() {
    showMarkers = !showMarkers;
    updateMarkersVisibility();
    this.textContent = showMarkers ? 'Скрыть метки' : 'Показать метки';
    updateCounters();
  });
}

const centerMapBtn = document.getElementById('centerMap');
if (centerMapBtn) {
  centerMapBtn.addEventListener('click', function() {
    if (stashes.length > 0) {
      const bounds = L.latLngBounds(stashes.map(s => [s.lat, s.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView([54.915, 33.2972], 13);
    }
  });
}

const clearTempMarkersBtn = document.getElementById('clearTempMarkers');
if (clearTempMarkersBtn) {
  clearTempMarkersBtn.addEventListener('click', () => {
    if (window.tempMarker) {
      map.removeLayer(window.tempMarker);
      window.tempMarker = null;
    }
    stashFormContainer.style.display = 'none';
    selectedLatLng = null;
  });
}

// Add stash button
const addStashBtn = document.getElementById('addStashBtn');
if (addStashBtn) {
  addStashBtn.addEventListener('click', () => {
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
    coordLat.textContent = center.lat.toFixed(6);
    coordLng.textContent = center.lng.toFixed(6);
    selectedLatLng = null;
    if (window.tempMarker) {
      map.removeLayer(window.tempMarker);
      window.tempMarker = null;
    }
  });
}

// Cancel button
stashCancelBtn.addEventListener('click', () => {
  stashFormContainer.style.display = 'none';
  stashForm.reset();
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
    if (window.tempMarker) { 
      map.removeLayer(window.tempMarker); 
      window.tempMarker = null; 
    }

    const id = stashIdInput.value || generateUUID();
    const lat = selectedLatLng ? selectedLatLng.lat : parseFloat(stashLat.value) || map.getCenter().lat;
    const lng = selectedLatLng ? selectedLatLng.lng : parseFloat(stashLng.value) || map.getCenter().lng;

    if (!validateCoordinates(lat, lng)) { 
      alert('Некорректные координаты!'); 
      return; 
    }

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

        if (markers[stash.id]) { 
          map.removeLayer(markers[stash.id]); 
          delete markers[stash.id]; 
        }
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
      updateCounters();
      stashFormContainer.style.display = 'none';
      selectedLatLng = null;
      
      if (document.getElementById('stashesSection').classList.contains('active')) {
        menuButtons[0].click();
      }
      
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
  const stashForLocal = { 
    ...stash, 
    desc: stash.description,
    created_at: new Date().toISOString()
  };
  delete stashForLocal.description;

  const index = stashes.findIndex(s => s.id === id);
  if (index >= 0) {
    stashes[index] = stashForLocal;
  } else {
    stashes.unshift(stashForLocal);
  }

  localStorage.setItem('stashes', JSON.stringify(stashes));

  if (markers[id]) { 
    map.removeLayer(markers[id]); 
    delete markers[id]; 
  }
  addStashMarker(stashForLocal);
  updateStashList();
  updateCounters();
}

// === UPDATE LIST VIEW ===
function updateStashList() {
  const container = document.getElementById('stashList');
  if (!container) return;
  
  const filteredStashes = stashes.filter(stash => activeFilters[stash.type]);
  
  if (filteredStashes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div>${stashes.length > 0 ? 'Нет тайников с выбранными фильтрами' : 'Нет сохраненных тайников'}</div>
        <div class="empty-hint">
          ${stashes.length > 0 ? 'Измените фильтры для отображения' : 'Нажмите на карту, чтобы добавить тайник'}
        </div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  filteredStashes.forEach(stash => {
    const config = typeConfig[stash.type] || typeConfig.stash;
    const description = stash.description || stash.desc || 'Нет описания';
    const card = document.createElement('div');
    card.className = 'stash-card';
    card.dataset.stashId = stash.id;
    card.innerHTML = `
      <div class="stash-type ${config.class}">${config.name}</div>
      <div class="stash-name">${stash.name}</div>
      <div class="stash-desc">${description}</div>
      <div class="stash-coords">Координаты: ${stash.lat.toFixed(4)}, ${stash.lng.toFixed(4)}</div>
      ${stash.created_at ? `<div class="stash-date">${new Date(stash.created_at).toLocaleDateString('ru-RU')}</div>` : ''}
      <div class="stash-actions">
        <button class="stash-action-btn" data-action="navigate">Маршрут</button>
        <button class="stash-action-btn" data-action="view">На карту</button>
      </div>
    `;
    
    // Обработчики для кнопок в карточке
    card.querySelectorAll('.stash-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === 'navigate') {
          startNavigationTo(stash);
        } else if (action === 'view') {
          // Переключаемся на карту и центрируем
          document.querySelector('.menu-item[data-section="mapSection"]').click();
          map.setView([stash.lat, stash.lng], Math.max(map.getZoom(), 15));
        }
      });
    });
    
    // Клик по карточке - открываем попап
    card.addEventListener('click', () => {
      const latlng = L.latLng(stash.lat, stash.lng);
      showStashPopup(stash, latlng);
    });
    
    container.appendChild(card);
  });
}

// === STATUS BAR UPDATES ===
function updateStatusBar() {
  const currentPosition = document.getElementById('currentPosition');
  const currentZoom = document.getElementById('currentZoom');
  const currentTime = document.getElementById('currentTime');
  
  if (currentPosition && userPosition) {
    currentPosition.textContent = `Координаты: ${userPosition.lat.toFixed(4)}, ${userPosition.lng.toFixed(4)}`;
  }
  
  if (currentZoom) {
    currentZoom.textContent = `Масштаб: ${map.getZoom()}x`;
  }
  
  if (currentTime) {
    const now = new Date();
    currentTime.textContent = now.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'});
  }
}

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

// === HIDE POPUP WHEN CLICKING OUTSIDE ===
document.addEventListener('click', (e) => {
  if (popup.style.display === 'block' && 
      !popup.contains(e.target) && 
      !e.target.closest('.stalker-marker')) {
    popup.style.display = 'none';
  }
});

// === INITIALIZE ON LOAD ===
document.addEventListener('DOMContentLoaded', function() {
  // Delay a bit to allow map tiles and DOM to settle
  setTimeout(() => {
    initNavigation();
    loadStashes();
    initFilterControls();
    
    // Обновление статус-бара
    setInterval(updateStatusBar, 1000);
    updateStatusBar();
    
    // Обновление зума при изменении
    map.on('zoomend', updateStatusBar);
    
    // Обновление координат в форме при клике на карту
    map.on('click', function(e) {
      if (stashFormContainer.style.display === 'block') {
        coordLat.textContent = e.latlng.lat.toFixed(6);
        coordLng.textContent = e.latlng.lng.toFixed(6);
      }
    });
    
    console.log('S.T.A.L.K.E.R. PDA initialized with filters');
  }, 600);
});

// === EXPORT FUNCTIONS FOR GLOBAL USE ===
window.startNavigationToStash = function(stashId) {
  const stash = stashes.find(s => s.id === stashId);
  if (stash) startNavigationTo(stash);
};

window.startNavigationToPoint = function(lat, lng) {
  startNavigationTo({ lat, lng, name: 'Точка на карте' });
};