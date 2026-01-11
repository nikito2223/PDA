// ==================================================
// === МОДУЛЬ 3: БАЗЫ ДАННЫХ И СИНХРОНИЗАЦИЯ ===
// ==================================================

// === НАСТРОЙКИ SUPABASE ===
const SUPABASE_URL = 'https://jezvycdhlfrjitqydhur.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DL_SkwBCIrHB0f7oIhwWAA_r7B2VMut';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let stashes = [];
const markers = {};
// УБИРАЕМ объявление showMarkers здесь, так как оно уже есть в map-gps.js
// let showMarkers = true;

// === ОСНОВНЫЕ ФУНКЦИИ БАЗЫ ДАННЫХ ===
async function loadStashes() {
  try {
    console.log('Загрузка тайников из Supabase...');
    const { data, error } = await supabaseClient
      .from('stashes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    stashes = data || [];
    
    // Очищаем старые маркеры
    Object.values(markers).forEach(m => {
      const map = window.mapModule ? window.mapModule.getMap() : null;
      if (map && m) map.removeLayer(m);
    });
    Object.keys(markers).forEach(k => delete markers[k]);
    
    // Добавляем новые маркеры
    stashes.forEach(addStashMarker);
    
    // Обновляем видимость согласно фильтрам
    updateMarkersVisibility();
    updateStashList();
    updateCounters();
    
    console.log('Загружено', stashes.length, 'тайников из Supabase');
    return stashes;
  } catch (err) {
    console.error('Ошибка загрузки тайников:', err);
    // Fallback к localStorage
    return loadFromLocalStorage();
  }
}

function loadFromLocalStorage() {
  console.log('Загрузка тайников из localStorage...');
  try {
    const localStashes = JSON.parse(localStorage.getItem('stashes') || '[]');
    stashes = localStashes;
    
    // Добавляем маркеры
    stashes.forEach(addStashMarker);
    
    updateMarkersVisibility();
    updateStashList();
    updateCounters();
    
    console.log('Загружено', stashes.length, 'тайников из localStorage');
    return stashes;
  } catch (err) {
    console.error('Ошибка загрузки из localStorage:', err);
    stashes = [];
    return [];
  }
}

async function saveStash(stash, isEdit = false) {
  try {
    let result;
    
    if (isEdit) {
      // Обновление существующего тайника
      const { data, error } = await supabaseClient
        .from('stashes')
        .update({
          name: stash.name,
          description: stash.description,
          type: stash.type,
          lat: stash.lat,
          lng: stash.lng,
          updated_at: new Date().toISOString()
        })
        .eq('id', stash.id)
        .select();
      
      if (error) throw error;
      result = data ? data[0] : stash;
      
      // Обновляем в локальном массиве
      const index = stashes.findIndex(s => s.id === stash.id);
      if (index >= 0) stashes[index] = result;
      
    } else {
      // Добавление нового тайника
      const { data, error } = await supabaseClient
        .from('stashes')
        .insert([{
          ...stash,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();
      
      if (error) throw error;
      result = data ? data[0] : stash;
      stashes.unshift(result);
    }
    
    // Обновляем маркер
    if (markers[stash.id]) {
      const map = window.mapModule ? window.mapModule.getMap() : null;
      if (map) map.removeLayer(markers[stash.id]);
      delete markers[stash.id];
    }
    
    addStashMarker(result);
    updateStashList();
    updateCounters();
    
    // Сохраняем в localStorage как backup
    saveToLocalStorage();
    
    return result;
  } catch (err) {
    console.error('Ошибка сохранения тайника:', err);
    // Fallback к localStorage
    return saveToLocalStorageFallback(stash, isEdit);
  }
}

async function deleteStash(stashId) {
  try {
    const { error } = await supabaseClient
      .from('stashes')
      .delete()
      .eq('id', stashId);
    
    if (error) throw error;
    
    // Удаляем из локального массива
    stashes = stashes.filter(s => s.id !== stashId);
    
    // Удаляем маркер
    const map = window.mapModule ? window.mapModule.getMap() : null;
    if (markers[stashId] && map) {
      map.removeLayer(markers[stashId]);
    }
    delete markers[stashId];
    
    updateStashList();
    updateCounters();
    
    // Обновляем localStorage
    saveToLocalStorage();
    
    console.log('Тайник удален:', stashId);
    return true;
  } catch (err) {
    console.error('Ошибка удаления тайника:', err);
    alert('Ошибка удаления тайника: ' + (err.message || err));
    return false;
  }
}

// === МАРКЕРЫ НА КАРТЕ ===
function addStashMarker(stash) {
  const map = window.mapModule ? window.mapModule.getMap() : null;
  if (!map) return null;
  
  const config = window.uiModule ? window.uiModule.getTypeConfig()[stash.type] : { icon: '▩' };
  const marker = L.marker([stash.lat, stash.lng], { 
    icon: createCustomIcon(stash.type, config),
    title: stash.name
  });
  
  // Получаем значение showMarkers из глобального состояния
  const showMarkers = window.mapModule ? window.mapModule.isMarkersVisible() : true;
  const activeFilters = window.uiModule ? window.uiModule.getActiveFilters() : { stash: true };
  
  // Добавляем маркер на карту только если соответствующий фильтр включен
  if (showMarkers && activeFilters[stash.type]) {
    marker.addTo(map);
  }
  
  marker.on('click', (e) => {
    if (window.uiModule && window.uiModule.showStashPopup) {
      window.uiModule.showStashPopup(stash, e.latlng);
    }
  });
  
  markers[stash.id] = marker;
  return marker;
}

function createCustomIcon(type, config) {
  const currentMapStyle = window.mapModule ? window.mapModule.getCurrentMapStyle() : 'normal';
  
  return L.divIcon({
    className: `stalker-marker marker-${type} ${currentMapStyle === 'satellite' ? 'satellite-mode' : ''}`,
    html: `
      <div class="marker-container">
        <div class="marker-glow" style="background: rgba(${hexToRgb(config.color || '#8b9d6b')}, 0.5); border-color: ${config.color || '#8b9d6b'};"></div>
        <div class="marker-icon">${config.icon || '▩'}</div>
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

function updateMarkersVisibility() {
  const map = window.mapModule ? window.mapModule.getMap() : null;
  if (!map) return;
  
  const activeFilters = window.uiModule ? window.uiModule.getActiveFilters() : { stash: true };
  const showMarkers = window.mapModule ? window.mapModule.isMarkersVisible() : true;
  
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

// === ОБНОВЛЕНИЕ СПИСКА ТАЙНИКОВ ===
function updateStashList() {
  const container = document.getElementById('stashList');
  if (!container) return;
  
  const activeFilters = window.uiModule ? window.uiModule.getActiveFilters() : { stash: true };
  const filteredStashes = stashes.filter(stash => activeFilters[stash.type]);
  const typeConfig = window.uiModule ? window.uiModule.getTypeConfig() : {};
  
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
    const config = typeConfig[stash.type] || typeConfig.stash || { name: 'Тайник', class: 'type-stash' };
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
          if (window.mapModule && window.mapModule.startNavigationTo) {
            window.mapModule.startNavigationTo(stash);
          }
        } else if (action === 'view') {
          const map = window.mapModule ? window.mapModule.getMap() : null;
          if (map) {
            document.querySelector('.menu-item[data-section="mapSection"]').click();
            map.setView([stash.lat, stash.lng], Math.max(map.getZoom(), 15));
          }
        }
      });
    });
    
    // Клик по карточке - открываем попап
    card.addEventListener('click', () => {
      const latlng = L.latLng(stash.lat, stash.lng);
      if (window.uiModule && window.uiModule.showStashPopup) {
        window.uiModule.showStashPopup(stash, latlng);
      }
    });
    
    container.appendChild(card);
  });
}

function updateCounters() {
  // Общее количество тайников
  const stashCount = document.getElementById('stashCount');
  if (stashCount) stashCount.textContent = stashes.length;
  
  // Количество в списке с учетом фильтров
  const stashListCount = document.getElementById('stashListCount');
  if (stashListCount) {
    const activeFilters = window.uiModule ? window.uiModule.getActiveFilters() : { stash: true };
    const filteredCount = stashes.filter(stash => activeFilters[stash.type]).length;
    stashListCount.textContent = `(${filteredCount})`;
  }
  
  // Количество видимых маркеров
  const markerCount = document.getElementById('markerCount');
  if (markerCount) {
    const activeFilters = window.uiModule ? window.uiModule.getActiveFilters() : { stash: true };
    const showMarkers = window.mapModule ? window.mapModule.isMarkersVisible() : true;
    const visibleCount = Object.keys(markers).filter(key => {
      const stash = stashes.find(s => s.id === key);
      return stash && activeFilters[stash.type] && showMarkers;
    }).length;
    markerCount.textContent = visibleCount;
  }
}

// === ОБРАБОТКА ФОРМЫ ===
async function handleStashFormSubmit(form, nameEl, descEl, typeEl, latEl, lngEl, idEl, selectedLatLng) {
  const map = window.mapModule ? window.mapModule.getMap() : null;
  if (window.tempMarker && map) { 
    map.removeLayer(window.tempMarker); 
    window.tempMarker = null; 
  }

  const id = idEl.value || generateUUID();
  const lat = selectedLatLng ? selectedLatLng.lat : parseFloat(latEl.value) || (map ? map.getCenter().lat : 0);
  const lng = selectedLatLng ? selectedLatLng.lng : parseFloat(lngEl.value) || (map ? map.getCenter().lng : 0);

  if (!validateCoordinates(lat, lng)) { 
    alert('Некорректные координаты!'); 
    return; 
  }

  const stash = {
    id,
    name: nameEl.value.trim() || 'Без названия',
    description: descEl.value.trim(),
    type: typeEl.value || 'stash',
    lat: parseFloat(lat.toFixed(6)),
    lng: parseFloat(lng.toFixed(6))
  };

  const isEdit = form.dataset.mode === 'edit';
  const savedStash = await saveStash(stash, isEdit);
  
  if (savedStash && map) {
    map.setView([stash.lat, stash.lng], Math.max(map.getZoom(), 15));
  }
}

// === LOCALSTORAGE ФУНКЦИИ ===
function saveToLocalStorage() {
  try {
    const stashesForLocal = stashes.map(stash => ({
      ...stash,
      desc: stash.description,
      created_at: stash.created_at || new Date().toISOString()
    }));
    localStorage.setItem('stashes', JSON.stringify(stashesForLocal));
  } catch (err) {
    console.error('Ошибка сохранения в localStorage:', err);
  }
}

function saveToLocalStorageFallback(stash, isEdit) {
  const stashForLocal = { 
    ...stash, 
    desc: stash.description,
    created_at: new Date().toISOString()
  };
  delete stashForLocal.description;

  if (isEdit) {
    const index = stashes.findIndex(s => s.id === stash.id);
    if (index >= 0) {
      stashes[index] = stashForLocal;
    }
  } else {
    stashes.unshift(stashForLocal);
  }

  localStorage.setItem('stashes', JSON.stringify(stashes));

  if (markers[stash.id]) { 
    const map = window.mapModule ? window.mapModule.getMap() : null;
    if (map) map.removeLayer(markers[stash.id]); 
    delete markers[stash.id]; 
  }
  
  addStashMarker(stashForLocal);
  updateStashList();
  updateCounters();
  
  return stashForLocal;
}

// === УТИЛИТЫ ===
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

// === ЭКСПОРТ ФУНКЦИЙ ===
window.dbModule = {
  loadStashes,
  saveStash,
  deleteStash,
  updateMarkersVisibility,
  updateStashList,
  updateCounters,
  handleStashFormSubmit,
  getStashes: () => stashes,
  getMarkers: () => markers,
  // Убираем setShowMarkers, так как управление должно быть в mapModule
};