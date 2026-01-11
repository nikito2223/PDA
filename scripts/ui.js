// ==================================================
// === МОДУЛЬ 2: ИНТЕРФЕЙС И ЛОГИКА ===
// ==================================================

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
const menuButtons = document.querySelectorAll(".menu-item");
const sections = document.querySelectorAll(".section");
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

let navigationMode = false;
let selectedLatLng = null;

// Фильтры
let activeFilters = {
  stash: true,
  quest: true,
  danger: true,
  anomaly: true
};

// Конфигурация типов
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

// Детекция устройств
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// === ОСНОВНАЯ ИНИЦИАЛИЗАЦИЯ ===
function initUI() {
  console.log('Инициализация интерфейса...');
  
  // Оптимизация под мобильные устройства
  if (isMobile || isTouchDevice) {
    document.body.classList.add('mobile-device');
    if (isMobile) document.body.classList.add('is-mobile');
    if (isTouchDevice) document.body.classList.add('is-touch');
  }
  
  // Инициализация кнопки смены локации
  const locationToggleBtn = document.getElementById('toggleLocation');
  if (locationToggleBtn && window.mapModule && window.mapModule.locations) {
    locationToggleBtn.addEventListener('click', function() {
      const locationNames = Object.keys(window.mapModule.locations);
      const currentLocation = window.mapModule.getCurrentLocation();
      const currentIndex = locationNames.indexOf(currentLocation);
      const nextIndex = (currentIndex + 1) % locationNames.length;
      window.mapModule.switchLocation(locationNames[nextIndex]);
    });
  }
  
  // Инициализация кнопки стиля карты
  const toggleMapStyleBtn = document.getElementById('toggleMapStyle');
  if (toggleMapStyleBtn && window.mapModule && window.mapModule.switchMapStyle) {
    toggleMapStyleBtn.addEventListener('click', function() {
      const styles = ['normal', 'dark', 'satellite'];
      const currentStyle = window.mapModule.getCurrentMapStyle();
      const currentIndex = styles.indexOf(currentStyle);
      const nextIndex = (currentIndex + 1) % styles.length;
      window.mapModule.switchMapStyle(styles[nextIndex]);
    });
  }
  
  // Инициализация кнопки навигации/создания
  const navToggleBtn = document.getElementById('toggleNavMode');
  if (navToggleBtn) {
    navToggleBtn.addEventListener('click', () => setNavigationMode(!navigationMode));
  }
  
  // Инициализация меню
  initMenu();
  
  // Инициализация фильтров
  initFilterControls();
  
  // Инициализация формы
  initFormControls();
  
  // Инициализация попапа
  initPopup();
  
  // Оптимизация для мобильных
  optimizeForMobile();
  
  console.log('Интерфейс инициализирован');
  return true;
}

// === МЕНЮ И НАВИГАЦИЯ ===
function initMenu() {
  if (!menuButtons.length) return;
  
  menuButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      menuButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sections.forEach(s => s.classList.remove('active'));
      const sectionId = btn.dataset.section;
      if (sectionId) {
        const section = document.getElementById(sectionId);
        if (section) section.classList.add('active');
      }
    });
  });
}

function setNavigationMode(enabled) {
  navigationMode = enabled;
  const navToggleBtn = document.getElementById('toggleNavMode');
  if (navToggleBtn) {
    navToggleBtn.classList.toggle('active', enabled);
    navToggleBtn.textContent = enabled ? 'Режим: НАВИГАЦИЯ' : 'Режим: СОЗДАНИЕ';
  }
}

// === ФИЛЬТРЫ ===
function initFilterControls() {
  // Чекбоксы в меню
  const filters = ['stash', 'quest', 'danger', 'anomaly'];
  filters.forEach(type => {
    const checkbox = document.getElementById(`filter${type.charAt(0).toUpperCase() + type.slice(1)}`);
    if (checkbox) {
      checkbox.addEventListener('change', function() {
        activeFilters[type] = this.checked;
        if (window.dbModule) {
          window.dbModule.updateMarkersVisibility();
          window.dbModule.updateStashList();
          window.dbModule.updateCounters();
        }
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
      if (window.dbModule) {
        window.dbModule.updateMarkersVisibility();
        window.dbModule.updateStashList();
        window.dbModule.updateCounters();
      }
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
      if (window.dbModule) {
        window.dbModule.updateMarkersVisibility();
        window.dbModule.updateStashList();
        window.dbModule.updateCounters();
      }
    });
  }
}

// === ФОРМА И ПОПАП ===
function initFormControls() {
  // Кнопка добавления тайника
  const addStashBtn = document.getElementById('addStashBtn');
  if (addStashBtn) {
    addStashBtn.addEventListener('click', () => {
      // Переключаемся на карту
      const mapBtn = document.querySelector('.menu-item[data-section="mapSection"]');
      if (mapBtn) mapBtn.click();
      
      if (stashFormContainer) stashFormContainer.style.display = 'block';
      
      const formTitle = document.getElementById('formTitle');
      if (formTitle) formTitle.textContent = 'Добавить тайник';
      
      if (stashForm) {
        stashForm.reset();
        stashForm.dataset.mode = 'add';
      }
      
      if (stashIdInput) stashIdInput.value = '';
      
      const map = window.mapModule ? window.mapModule.getMap() : null;
      if (map) {
        const center = map.getCenter();
        if (stashLat) stashLat.value = center.lat.toFixed(6);
        if (stashLng) stashLng.value = center.lng.toFixed(6);
        if (coordLat) coordLat.textContent = center.lat.toFixed(6);
        if (coordLng) coordLng.textContent = center.lng.toFixed(6);
      }
      
      selectedLatLng = null;
      const mapInstance = window.mapModule ? window.mapModule.getMap() : null;
      if (window.tempMarker && mapInstance) {
        mapInstance.removeLayer(window.tempMarker);
        window.tempMarker = null;
      }
    });
  }
  
  // Кнопка отмены
  const stashCancelBtn = document.getElementById('stashCancel');
  if (stashCancelBtn) {
    stashCancelBtn.addEventListener('click', () => {
      if (stashFormContainer) stashFormContainer.style.display = 'none';
      if (stashForm) stashForm.reset();
      selectedLatLng = null;
      const map = window.mapModule ? window.mapModule.getMap() : null;
      if (window.tempMarker && map) {
        map.removeLayer(window.tempMarker);
        window.tempMarker = null;
      }
    });
  }
  
  // Отправка формы
  if (stashForm) {
    stashForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (window.dbModule && window.dbModule.handleStashFormSubmit) {
        await window.dbModule.handleStashFormSubmit(
          stashForm, 
          stashName, 
          stashDesc, 
          stashType, 
          stashLat, 
          stashLng, 
          stashIdInput, 
          selectedLatLng
        );
        if (stashFormContainer) stashFormContainer.style.display = 'none';
        selectedLatLng = null;
      }
    });
  }
}

function initPopup() {
  if (!popup) return;
  
  // Скрытие попапа при клике снаружи
  document.addEventListener('click', (e) => {
    if (popup.style.display === 'block' && 
        !popup.contains(e.target) && 
        !e.target.closest('.stalker-marker')) {
      popup.style.display = 'none';
    }
  });
}

function showStashPopup(stash, latlng) {
  if (!popup) return;
  
  const config = typeConfig[stash.type] || typeConfig.stash;
  const description = stash.description || stash.desc || 'Нет описания';

  // Обновляем содержимое попапа
  const popupName = document.getElementById('popupName');
  const popupDesc = document.getElementById('popupDesc');
  const popupCoords = document.getElementById('popupCoords');
  const popupTypeBadge = document.getElementById('popupTypeBadge');
  const popupDate = document.getElementById('popupDate');
  
  if (popupName) popupName.textContent = stash.name;
  if (popupDesc) popupDesc.textContent = description;
  if (popupCoords) popupCoords.textContent = `Координаты: ${stash.lat.toFixed(4)}, ${stash.lng.toFixed(4)}`;
  
  if (popupTypeBadge) {
    popupTypeBadge.textContent = config.name;
    popupTypeBadge.className = `popup-type-badge ${config.class}`;
  }
  
  if (popupDate) {
    if (stash.created_at) {
      popupDate.textContent = `Добавлен: ${new Date(stash.created_at).toLocaleDateString('ru-RU')}`;
      popupDate.style.display = 'block';
    } else {
      popupDate.style.display = 'none';
    }
  }

  popup.dataset.stashId = stash.id;

  // Обновляем обработчики кнопок
  const popupNavigate = document.getElementById('popupNavigate');
  const popupEdit = document.getElementById('popupEdit');
  const popupDelete = document.getElementById('popupDelete');

  if (popupNavigate && popupEdit && popupDelete) {
    // Удаляем старые обработчики через клонирование
    const newNavigate = popupNavigate.cloneNode(true);
    const newEdit = popupEdit.cloneNode(true);
    const newDelete = popupDelete.cloneNode(true);

    popupNavigate.parentNode.replaceChild(newNavigate, popupNavigate);
    popupEdit.parentNode.replaceChild(newEdit, popupEdit);
    popupDelete.parentNode.replaceChild(newDelete, popupDelete);

    // Добавляем новые обработчики
    newNavigate.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.mapModule && window.mapModule.startNavigationTo) {
        window.mapModule.startNavigationTo(stash);
      }
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
      if (window.dbModule && window.dbModule.deleteStash) {
        await window.dbModule.deleteStash(stash.id);
      }
      popup.style.display = 'none';
    });
  }

  // Показываем и позиционируем попап
  popup.style.display = 'block';
  const map = window.mapModule ? window.mapModule.getMap() : null;
  if (!map) return;
  
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
  if (!stashFormContainer) return;
  
  stashFormContainer.style.display = 'block';
  
  const formTitle = document.getElementById('formTitle');
  if (formTitle) formTitle.textContent = 'Изменить тайник';
  
  if (stashName) stashName.value = stash.name;
  if (stashDesc) stashDesc.value = stash.description || stash.desc || '';
  if (stashType) stashType.value = stash.type;
  if (stashLat) stashLat.value = stash.lat;
  if (stashLng) stashLng.value = stash.lng;
  if (coordLat) coordLat.textContent = stash.lat.toFixed(6);
  if (coordLng) coordLng.textContent = stash.lng.toFixed(6);
  if (stashIdInput) stashIdInput.value = stash.id;
  if (stashForm) stashForm.dataset.mode = 'edit';
  
  selectedLatLng = L.latLng(stash.lat, stash.lng);
}

// === МОБИЛЬНАЯ ОПТИМИЗАЦИЯ ===
function optimizeForMobile() {
  if (!isMobile && !isTouchDevice) return;
  
  console.log('Оптимизация для мобильных устройств...');
  
  // Создаем мобильный переключатель меню
  createMobileMenuToggle();
  
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
  
  // Проверяем поддержку PWA
  checkPWACompatibility();
  
  return true;
}

function createMobileMenuToggle() {
  const menu = document.getElementById('menu');
  if (!menu) return;
  
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

function increaseTouchTargets() {
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
  if (!isTouchDevice) return;
  
  // Заменяем hover-события на touch-события
  const allElements = document.querySelectorAll('*');
  if (allElements && allElements.length) {
    allElements.forEach(el => {
      if (el && el.style) {
        el.style.transition = 'none';
      }
    });
  }
  
  // Добавляем активные состояния при касании
  document.addEventListener('touchstart', function(e) {
    if (e.target && (e.target.classList.contains('btn') || 
        e.target.classList.contains('map-control-btn') ||
        e.target.classList.contains('menu-item'))) {
      e.target.classList.add('touch-active');
    }
  }, { passive: true });
  
  document.addEventListener('touchend', function(e) {
    const touchActiveElements = document.querySelectorAll('.touch-active');
    if (touchActiveElements && touchActiveElements.length) {
      touchActiveElements.forEach(el => {
        el.classList.remove('touch-active');
      });
    }
  }, { passive: true });
}

function addSwipeGestures() {
  if (!isTouchDevice) return;
  
  let touchStartX = 0;
  let touchStartY = 0;
  
  document.addEventListener('touchstart', function(e) {
    if (e.touches && e.touches.length > 0) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });
  
  document.addEventListener('touchend', function(e) {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    
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
    const activeBtn = document.querySelector('.menu-item.active');
    if (!activeBtn) return;
    
    const activeIndex = Array.from(menuButtons).indexOf(activeBtn);
    if (activeIndex < menuButtons.length - 1) {
      menuButtons[activeIndex + 1].click();
    }
  }
  
  function handleSwipeRight() {
    const activeBtn = document.querySelector('.menu-item.active');
    if (!activeBtn) return;
    
    const activeIndex = Array.from(menuButtons).indexOf(activeBtn);
    if (activeIndex > 0) {
      menuButtons[activeIndex - 1].click();
    }
  }
  
  function handleSwipeUp() {
    if (popup && popup.style.display === 'block') {
      popup.style.display = 'none';
    }
    if (stashFormContainer && stashFormContainer.style.display === 'block') {
      stashFormContainer.style.display = 'none';
    }
    const navPanel = document.getElementById('navigationPanel');
    if (navPanel && navPanel.style.display === 'block') {
      if (window.mapModule && window.mapModule.stopNavigation) {
        window.mapModule.stopNavigation();
      }
    }
  }
  
  function handleSwipeDown() {
    const gpsBtn = document.getElementById('myPositionBtn');
    if (gpsBtn && gpsBtn.style.opacity === '0') {
      gpsBtn.style.opacity = '1';
    }
  }
}

function preventLongPressContextMenu() {
  if (!isTouchDevice) return;
  
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });
  
  document.addEventListener('selectstart', function(e) {
    e.preventDefault();
  });
}

function updateMobileUI() {
  if (window.innerWidth < 768) {
    const titles = document.querySelectorAll('.stash-list-title, .form-header');
    if (titles && titles.length) {
      titles.forEach(el => {
        el.style.fontSize = '16px';
      });
    }
    
    const cards = document.querySelectorAll('.stash-card, .journal-entry');
    if (cards && cards.length) {
      cards.forEach(el => {
        el.style.padding = '12px';
      });
    }
    
    const buttons = document.querySelectorAll('.btn');
    if (buttons && buttons.length) {
      buttons.forEach(btn => {
        btn.style.borderWidth = '1px';
        btn.style.borderRadius = '4px';
      });
    }
  }
  
  // Адаптируем форму под мобильные
  const formInputs = document.querySelectorAll('.form-input, .form-select');
  if (formInputs && formInputs.length) {
    formInputs.forEach(input => {
      input.addEventListener('focus', function() {
        if (isMobile) {
          setTimeout(() => {
            this.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      });
    });
  }
  
  // Оптимизируем попапы для мобильных
  const adjustPopupForMobile = () => {
    if (window.innerWidth < 768 && popup) {
      popup.style.maxWidth = '90vw';
      popup.style.width = '90vw';
    }
  };
  
  window.addEventListener('resize', adjustPopupForMobile);
  adjustPopupForMobile();
}

function checkPWACompatibility() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    console.log('PWA функции доступны');
  }
}

// === СТАТУС-БАР ===
function updateStatusBar() {
  const currentPosition = document.getElementById('currentPosition');
  const currentZoom = document.getElementById('currentZoom');
  const currentTime = document.getElementById('currentTime');
  
  if (window.mapModule) {
    const userPosition = window.mapModule.getUserPosition();
    const map = window.mapModule.getMap();
    
    if (currentPosition && userPosition) {
      currentPosition.textContent = `Координаты: ${userPosition.lat.toFixed(4)}, ${userPosition.lng.toFixed(4)}`;
    }
    
    if (currentZoom && map) {
      currentZoom.textContent = `Масштаб: ${map.getZoom()}x`;
    }
  }
  
  if (currentTime) {
    const now = new Date();
    currentTime.textContent = now.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'});
  }
}

// === ОБРАБОТЧИКИ СОБЫТИЙ ===
document.addEventListener('visibilitychange', function() {
  if (document.hidden && isMobile) {
    // Сохраняем состояние при сворачивании
    if (window.mapModule) {
      const map = window.mapModule.getMap();
      if (map) {
        localStorage.setItem('pda_last_view', map.getCenter().toString());
        localStorage.setItem('pda_map_style', window.mapModule.getCurrentMapStyle());
        localStorage.setItem('pda_location', window.mapModule.getCurrentLocation());
      }
    }
  }
});

// === ЭКСПОРТ ФУНКЦИЙ ===
window.uiModule = {
  initUI,
  showStashPopup,
  openEditForm,
  updateStatusBar,
  optimizeForMobile,
  getActiveFilters: () => activeFilters,
  getTypeConfig: () => typeConfig,
  isMobile: () => isMobile,
  isTouchDevice: () => isTouchDevice
};