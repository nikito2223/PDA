// ==================================================
// === S.T.A.L.K.E.R. PDA - ОСНОВНОЙ ЗАГРУЗЧИК ===
// ==================================================

// === ГЛОБАЛЬНЫЙ ОБЪЕКТ ПРИЛОЖЕНИЯ ===
window.STALKER_PDA = {
  modules: {},
  isInitialized: false,
  initTime: null
};



// === ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ ПРИЛОЖЕНИЯ ===
async function initSTALKERPDA() {
  console.log('🚀 Инициализация S.T.A.L.K.E.R. PDA...');
  STALKER_PDA.initTime = Date.now();
  
  try {
    // 1. Проверяем зависимости
    if (!window.L || !window.supabase) {
      console.error('❌ Отсутствуют необходимые библиотеки (Leaflet или Supabase)');
      showError('Для работы PDA необходимы библиотеки Leaflet и Supabase');
      return;
    }
    
    // 2. Инициализируем модули последовательно
    console.log('📦 Загрузка модулей...');
    
    // Модуль 1: Карты и GPS
    if (typeof window.mapModule !== 'undefined') {
      STALKER_PDA.modules.map = window.mapModule;
      const map = window.mapModule.initMap();
      if (!map) {
        throw new Error('Не удалось инициализировать карту');
      }
      console.log('✅ Модуль карт загружен');
    } else {
      throw new Error('Модуль карт не найден');
    }
    
    // Модуль 2: Интерфейс
    if (typeof window.uiModule !== 'undefined') {
      STALKER_PDA.modules.ui = window.uiModule;
      window.uiModule.initUI();
      console.log('✅ Модуль интерфейса загружен');
    } else {
      throw new Error('Модуль интерфейса не найден');
    }
    
    // Модуль 3: База данных
    if (typeof window.dbModule !== 'undefined') {
      STALKER_PDA.modules.db = window.dbModule;
      await window.dbModule.loadStashes();
      console.log('✅ Модуль базы данных загружен');
    } else {
      throw new Error('Модуль базы данных не найден');
    }
    
    // 3. Настраиваем связи между модулями
    setupModuleConnections();
    
    // 4. Запускаем обновления интерфейса
    startUIUpdates();
    
    // 5. Настраиваем обработчики событий карты
    setupMapEventHandlers();
    
    // 6. Завершаем инициализацию
    completeInitialization();
    
  } catch (error) {
    console.error('❌ Ошибка инициализации PDA:', error);
    showError(`Ошибка загрузки: ${error.message}`);
  }
}

// === НАСТРОЙКА СВЯЗЕЙ МЕЖДУ МОДУЛЯМИ ===
function setupModuleConnections() {
  console.log('🔗 Настройка связей между модулями...');
  
  // Кнопка переключения маркеров
  const toggleMarkersBtn = document.getElementById('toggleMarkers');
  if (toggleMarkersBtn && STALKER_PDA.modules.map && STALKER_PDA.modules.db) {
    toggleMarkersBtn.addEventListener('click', function() {
      const newState = STALKER_PDA.modules.map.toggleMarkers();
      STALKER_PDA.modules.db.updateMarkersVisibility();
      this.textContent = newState ? 'Скрыть метки' : 'Показать метки';
      STALKER_PDA.modules.db.updateCounters();
    });
  }
  // Кнопка центрирования карты
  const centerMapBtn = document.getElementById('centerMap');
  if (centerMapBtn && STALKER_PDA.modules.map && STALKER_PDA.modules.db) {
    centerMapBtn.addEventListener('click', function() {
      const stashes = STALKER_PDA.modules.db.getStashes();
      const map = STALKER_PDA.modules.map.getMap();
      
      if (stashes.length > 0) {
        const bounds = L.latLngBounds(stashes.map(s => [s.lat, s.lng]));
        map.fitBounds(bounds, { padding: [50, 50] });
      } else {
        const currentLocation = STALKER_PDA.modules.map.getCurrentLocation();
        const location = window.mapModule.locations[currentLocation];
        if (location) {
          map.setView(location.center, location.zoom);
        }
      }
    });
  }
  
  // Кнопка очистки временных маркеров
  const clearTempMarkersBtn = document.getElementById('clearTempMarkers');
  if (clearTempMarkersBtn) {
    clearTempMarkersBtn.addEventListener('click', () => {
      const map = STALKER_PDA.modules.map ? STALKER_PDA.modules.map.getMap() : null;
      if (window.tempMarker && map) {
        map.removeLayer(window.tempMarker);
        window.tempMarker = null;
      }
      const stashFormContainer = document.getElementById('stashFormContainer');
      if (stashFormContainer) {
        stashFormContainer.style.display = 'none';
      }
    });
  }
  
  console.log('✅ Связи между модулями настроены');
}

// === ЗАПУСК ОБНОВЛЕНИЙ ИНТЕРФЕЙСА ===
function startUIUpdates() {
  // Обновление статус-бара
  if (STALKER_PDA.modules.ui) {
    setInterval(() => STALKER_PDA.modules.ui.updateStatusBar(), 1000);
    STALKER_PDA.modules.ui.updateStatusBar();
    
    // Обновление статуса локации
    if (STALKER_PDA.modules.map) {
      STALKER_PDA.modules.map.updateLocationStatus();
    }
  }
  
  // Обновление зума при изменении
  const map = STALKER_PDA.modules.map ? STALKER_PDA.modules.map.getMap() : null;
  if (map && STALKER_PDA.modules.ui) {
    map.on('zoomend', () => STALKER_PDA.modules.ui.updateStatusBar());
  }
  
  // Обновление координат в форме при клике на карту
  if (map) {
    map.on('click', function(e) {
      const stashFormContainer = document.getElementById('stashFormContainer');
      const coordLat = document.getElementById('coordLat');
      const coordLng = document.getElementById('coordLng');
      
      if (stashFormContainer && stashFormContainer.style.display === 'block' && coordLat && coordLng) {
        coordLat.textContent = e.latlng.lat.toFixed(6);
        coordLng.textContent = e.latlng.lng.toFixed(6);
      }
    });
  }
}

// === НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ КАРТЫ ===
function setupMapEventHandlers() {
  const map = STALKER_PDA.modules.map ? STALKER_PDA.modules.map.getMap() : null;
  if (!map) return;
  
  map.on('click', function (e) {
    if (STALKER_PDA.modules.map && STALKER_PDA.modules.map.isNavigating()) return;
    
    const popup = document.getElementById('stashPopup');
    if (popup) popup.style.display = 'none';
    
    // Проверяем режим навигации
    const navToggleBtn = document.getElementById('toggleNavMode');
    const navigationMode = navToggleBtn && navToggleBtn.classList.contains('active');
    
    if (navigationMode) {
      const target = { 
        lat: e.latlng.lat, 
        lng: e.latlng.lng, 
        name: 'Точка на карте' 
      };
      if (STALKER_PDA.modules.map && STALKER_PDA.modules.map.startNavigationTo) {
        STALKER_PDA.modules.map.startNavigationTo(target);
      }
      return;
    }
    
    // Режим создания тайника
    selectedLatLng = e.latlng;
    if (window.tempMarker) {
      map.removeLayer(window.tempMarker);
    }
    
    const typeConfig = STALKER_PDA.modules.ui ? STALKER_PDA.modules.ui.getTypeConfig() : {};
    const config = typeConfig.stash || { icon: '▩', color: '#8b9d6b' };
    
    window.tempMarker = L.marker(e.latlng, { 
      icon: createTempMarkerIcon(config),
      opacity: 0.7 
    }).addTo(map);
    
    const stashFormContainer = document.getElementById('stashFormContainer');
    const stashForm = document.getElementById('stashForm');
    const stashLat = document.getElementById('stashLat');
    const stashLng = document.getElementById('stashLng');
    const coordLat = document.getElementById('coordLat');
    const coordLng = document.getElementById('coordLng');
    const stashIdInput = document.getElementById('stashId');
    const formTitle = document.getElementById('formTitle');
    
    if (stashFormContainer && stashForm && stashLat && stashLng && coordLat && coordLng && stashIdInput && formTitle) {
      stashFormContainer.style.display = 'block';
      stashForm.dataset.mode = 'add';
      formTitle.textContent = 'Добавить тайник';
      stashForm.reset();
      stashIdInput.value = '';
      
      stashLat.value = e.latlng.lat.toFixed(6);
      stashLng.value = e.latlng.lng.toFixed(6);
      coordLat.textContent = e.latlng.lat.toFixed(6);
      coordLng.textContent = e.latlng.lng.toFixed(6);
      
      // Переключаемся на карту, если не на ней
      if (!document.getElementById('mapSection').classList.contains('active')) {
        const mapBtn = document.querySelector('.menu-item[data-section="mapSection"]');
        if (mapBtn) mapBtn.click();
      }
    }
  });
  
  // Обработка изменения ориентации
  window.addEventListener('orientationchange', function() {
    setTimeout(() => {
      if (map) map.invalidateSize();
      if (STALKER_PDA.modules.ui) STALKER_PDA.modules.ui.updateMobileUI();
    }, 300);
  });
  
  // Обработка изменения размера окна
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (map) map.invalidateSize();
      if (STALKER_PDA.modules.ui) STALKER_PDA.modules.ui.updateMobileUI();
    }, 250);
  });
}

function createTempMarkerIcon(config) {
  const currentMapStyle = STALKER_PDA.modules.map ? STALKER_PDA.modules.map.getCurrentMapStyle() : 'normal';
  
  return L.divIcon({
    className: `stalker-marker marker-temp ${currentMapStyle === 'satellite' ? 'satellite-mode' : ''}`,
    html: `
      <div class="marker-container">
        <div class="marker-glow" style="background: rgba(${hexToRgb(config.color || '#8b9d6b')}, 0.3); border-color: ${config.color || '#8b9d6b'};"></div>
        <div class="marker-icon">+</div>
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

// === ЗАВЕРШЕНИЕ ИНИЦИАЛИЗАЦИИ ===
function completeInitialization() {
  STALKER_PDA.isInitialized = true;
  const initDuration = Date.now() - STALKER_PDA.initTime;
  
  console.log(`✨ S.T.A.L.K.E.R. PDA успешно инициализирован за ${initDuration}ms`);
  
  // Показываем приветственное сообщение
  showWelcomeMessage();
  
  // Запускаем GPS
  if (STALKER_PDA.modules.map && STALKER_PDA.modules.map.initNavigation) {
    setTimeout(() => {
      STALKER_PDA.modules.map.initNavigation();
    }, 1000);
  }
  
  // Обновляем счетчики
  if (STALKER_PDA.modules.db) {
    STALKER_PDA.modules.db.updateCounters();
  }
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'pda-error';
  errorDiv.innerHTML = `
    <div class="error-content">
      <h3>Ошибка загрузки PDA</h3>
      <p>${message}</p>
      <button onclick="location.reload()">Перезагрузить</button>
    </div>
  `;
  document.body.appendChild(errorDiv);
}

function showWelcomeMessage() {
  console.log('Добро пожаловать в S.T.A.L.K.E.R. PDA!');
  
  // Можно добавить визуальное приветствие
  if (STALKER_PDA.modules.db) {
    const stashCount = STALKER_PDA.modules.db.getStashes().length;
    console.log(`Загружено тайников: ${stashCount}`);
  }
}

// === ГЛОБАЛЬНЫЕ ЭКСПОРТНЫЕ ФУНКЦИИ ===
window.startNavigationToStash = function(stashId) {
  if (STALKER_PDA.modules.db && STALKER_PDA.modules.map) {
    const stashes = STALKER_PDA.modules.db.getStashes();
    const stash = stashes.find(s => s.id === stashId);
    if (stash && STALKER_PDA.modules.map.startNavigationTo) {
      STALKER_PDA.modules.map.startNavigationTo(stash);
    }
  }
};

window.startNavigationToPoint = function(lat, lng) {
  if (STALKER_PDA.modules.map && STALKER_PDA.modules.map.startNavigationTo) {
    STALKER_PDA.modules.map.startNavigationTo({ lat, lng, name: 'Точка на карте' });
  }
};

// === ЗАПУСК ПРИЛОЖЕНИЯ ПРИ ЗАГРУЗКЕ ===
document.addEventListener('DOMContentLoaded', function() {
  console.log('📱 DOM загружен, запуск инициализации...');
  
  // Небольшая задержка для полной загрузки библиотек
  setTimeout(() => {
    initSTALKERPDA();
  }, 100);
});

// === РЕЖИМ ОТЛАДКИ ===
if (window.location.search.includes('debug=1')) {
  console.log('🔧 Режим отладки активирован');
  window.debugPDA = {
    getState: () => STALKER_PDA,
    reloadModules: () => {
      console.log('Перезагрузка модулей...');
      // Можно добавить логику перезагрузки модулей
    }
  };
}