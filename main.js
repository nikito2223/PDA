// === SUPABASE INITIALIZATION ===
const SUPABASE_URL = 'https://jezvycdhlfrjitqydhur.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DL_SkwBCIrHB0f7oIhwWAA_r7B2VMut';

// Используем другое имя переменной, чтобы избежать конфликта
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === PDA MENU LOGIC ===
const menuButtons = document.querySelectorAll(".menu-item");
const sections = document.querySelectorAll(".section");

menuButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    menuButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    sections.forEach(s => s.classList.remove("active"));
    document.getElementById(btn.dataset.section).classList.add("active");
  });
});

// === LEAFLET MAP SETUP ===
const map = L.map('map').setView([54.915, 33.2972], 13);

// Normal map tiles for building visibility
const normalTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap',
  maxZoom: 18
});

// Dark theme for map (optional)
const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap',
  maxZoom: 18
});

// Add normal tiles by default
normalTiles.addTo(map);

// === MAP CONTROLS ===
let showMarkers = true;
let isDarkStyle = false;

document.getElementById('toggleMapStyle').addEventListener('click', function() {
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

document.getElementById('toggleMarkers').addEventListener('click', function() {
  showMarkers = !showMarkers;
  Object.values(markers).forEach(marker => {
    if (showMarkers) {
      map.addLayer(marker);
    } else {
      map.removeLayer(marker);
    }
  });
  this.textContent = showMarkers ? 'Скрыть метки' : 'Показать метки';
});

document.getElementById('centerMap').addEventListener('click', function() {
  if (stashes.length > 0) {
    const bounds = L.latLngBounds(stashes.map(s => [s.lat, s.lng]));
    map.fitBounds(bounds, { padding: [50, 50] });
  } else {
    map.setView([54.915, 33.2972], 13);
  }
});

// === CUSTOM CSS MARKERS ===
function createCustomIcon(type) {
  const iconColors = {
    stash: '#4CAF50',
    quest: '#2196F3', 
    danger: '#F44336',
    anomaly: '#9C27B0'
  };
  
  const icons = {
    stash: '',
    quest: '',
    danger: '',
    anomaly: ''
  };
  
  return L.divIcon({
    className: 'stalker-marker',
    html: `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
      ">
        <div style="
          position: absolute;
          top: 20px;
          left: 20px;
          width: 20px;
          height: 20px;
          background: ${iconColors[type] || '#4CAF50'};
          border: 3px solid white;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          z-index: 2;
          animation: pulse 2s infinite;
        "></div>
        <div style="
          position: absolute;
          top: 0;
          left: 20px;
          transform: translateX(-50%);
          font-size: 24px;
          z-index: 1;
          filter: drop-shadow(0 0 2px black);
        ">${icons[type] || ''}</div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
}

// Load stashes from Supabase
let stashes = [];
const markers = {};

// Type translations and styles
const typeConfig = {
  stash: { name: 'Тайник', class: 'type-stash' },
  quest: { name: 'Задание', class: 'type-quest' },
  danger: { name: 'Опасность', class: 'type-danger' },
  anomaly: { name: 'Аномалия', class: 'type-anomaly' }
};

// Load stashes from Supabase
async function loadStashes() {
  try {
    const { data, error } = await supabaseClient
      .from('stashes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    stashes = data || [];
    
    // Clear existing markers
    Object.values(markers).forEach(marker => {
      map.removeLayer(marker);
    });
    Object.keys(markers).forEach(key => delete markers[key]);
    
    // Add markers to map
    stashes.forEach(stash => {
      addStashMarker(stash);
    });
    
    updateStashList();
    
    console.log('Loaded', stashes.length, 'stashes from Supabase');
  } catch (error) {
    console.error('Error loading stashes:', error);
    // Fallback to localStorage if Supabase fails
    const localStashes = JSON.parse(localStorage.getItem('stashes') || '[]');
    stashes = localStashes;
    stashes.forEach(addStashMarker);
    updateStashList();
  }
}

// Add stash marker to map
function addStashMarker(stash) {
  const marker = L.marker([stash.lat, stash.lng], {
    icon: createCustomIcon(stash.type)
  });
  
  if (showMarkers) {
    marker.addTo(map);
  }
  
  marker.on('click', (e) => {
    showStashPopup(stash, e.latlng);
  });
  
  markers[stash.id] = marker;
  return marker;
}

// === MAP CLICK TO ADD STASH ===
let selectedLatLng = null;

map.on('click', function(e) {
  selectedLatLng = e.latlng;
  document.getElementById('stashFormContainer').style.display = 'block';
  document.getElementById('formTitle').textContent = 'Добавить тайник';
  document.getElementById('stashLat').value = e.latlng.lat.toFixed(6);
  document.getElementById('stashLng').value = e.latlng.lng.toFixed(6);
  document.getElementById('stashForm').reset();
  document.getElementById('stashId').value = '';
  document.getElementById('stashForm').dataset.mode = 'add';
  
  // Удаляем временную метку, если она есть
  if (window.tempMarker) {
    map.removeLayer(window.tempMarker);
  }
  
  // Добавляем временную метку для предпросмотра
  window.tempMarker = L.marker(e.latlng, {
    icon: createCustomIcon('stash'),
    opacity: 0.7
  }).addTo(map);
  
  // Фокусируем карту на выбранной точке
  map.setView(e.latlng, map.getZoom());
});

// Add Stash button in list view
document.getElementById('addStashBtn').addEventListener('click', () => {
  // Переключаемся на карту
  menuButtons[0].click();
  
  // Показываем форму
  document.getElementById('stashFormContainer').style.display = 'block';
  document.getElementById('formTitle').textContent = 'Добавить тайник';
  document.getElementById('stashForm').reset();
  document.getElementById('stashId').value = '';
  document.getElementById('stashForm').dataset.mode = 'add';
  
  // Устанавливаем координаты центра карты по умолчанию
  const center = map.getCenter();
  document.getElementById('stashLat').value = center.lat.toFixed(6);
  document.getElementById('stashLng').value = center.lng.toFixed(6);
  selectedLatLng = null;
  
  // Удаляем временную метку
  if (window.tempMarker) {
    map.removeLayer(window.tempMarker);
    window.tempMarker = null;
  }
});

// === HANDLE STASH FORM ===
document.getElementById('stashForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  // Удаляем временную метку предпросмотра
  if (window.tempMarker) {
    map.removeLayer(window.tempMarker);
    window.tempMarker = null;
  }
  
  const id = document.getElementById('stashId').value || generateUUID();
  const lat = selectedLatLng ? selectedLatLng.lat : parseFloat(document.getElementById('stashLat').value) || map.getCenter().lat;
  const lng = selectedLatLng ? selectedLatLng.lng : parseFloat(document.getElementById('stashLng').value) || map.getCenter().lng;
  
  // Валидация координат
  if (!validateCoordinates(lat, lng)) {
    alert('Некорректные координаты!');
    return;
  }
  
  const stash = {
    id,
    name: document.getElementById('stashName').value.trim(),
    description: document.getElementById('stashDesc').value.trim(), // Изменено с desc на description
    type: document.getElementById('stashType').value,
    lat: parseFloat(lat.toFixed(6)),
    lng: parseFloat(lng.toFixed(6))
  };

  try {
    if (document.getElementById('stashForm').dataset.mode === 'edit') {
      // Update existing stash in Supabase
      const { error } = await supabaseClient
        .from('stashes')
        .update({
          name: stash.name,
          description: stash.description, // Изменено
          type: stash.type,
          lat: stash.lat,
          lng: stash.lng,
          updated_at: new Date().toISOString()
        })
        .eq('id', stash.id);
      
      if (error) throw error;
      
      // Update local data
      const index = stashes.findIndex(s => s.id === stash.id);
      if (index >= 0) {
        stashes[index] = stash;
      }
      
      // Update marker
      if (markers[stash.id]) {
        map.removeLayer(markers[stash.id]);
        delete markers[stash.id];
      }
      addStashMarker(stash);
      
    } else {
      // Add new stash to Supabase
      const { data, error } = await supabaseClient
        .from('stashes')
        .insert([{
          ...stash,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();
      
      if (error) throw error;
      
      // Add to local data
      if (data && data[0]) {
        stashes.push(data[0]);
        addStashMarker(data[0]);
      } else {
        stashes.push(stash);
        addStashMarker(stash);
      }
    }
    
    // Update UI
    updateStashList();
    document.getElementById('stashFormContainer').style.display = 'none';
    selectedLatLng = null;
    
    // Если мы были в режиме просмотра списка, показываем карту с новой меткой
    if (document.getElementById('stashesSection').classList.contains('active')) {
      menuButtons[0].click();
    }
    
    // Фокусируем карту на новой метке
    map.setView([stash.lat, stash.lng], Math.max(map.getZoom(), 15));
    
  } catch (error) {
    console.error('Error saving stash:', error);
    alert('Ошибка сохранения тайника: ' + error.message);
    // Fallback to localStorage
    saveToLocalStorage(stash, id);
  }
});

// Fallback to localStorage (нужно также обновить для desc → description)
function saveToLocalStorage(stash, id) {
  // Сохраняем с правильным полем desc для совместимости
  const stashForLocal = {
    ...stash,
    desc: stash.description // Конвертируем для localStorage
  };
  delete stashForLocal.description;
  
  const index = stashes.findIndex(s => s.id === id);
  if (index >= 0) {
    stashes[index] = stashForLocal;
  } else {
    stashes.push(stashForLocal);
  }
  
  localStorage.setItem('stashes', JSON.stringify(stashes));
  
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
  addStashMarker(stashForLocal);
  updateStashList();
}

document.getElementById('stashCancel').addEventListener('click', () => {
  document.getElementById('stashFormContainer').style.display = 'none';
  if (window.tempMarker) {
    map.removeLayer(window.tempMarker);
    window.tempMarker = null;
  }
  selectedLatLng = null;
});

// === ВАЛИДАЦИЯ КООРДИНАТ ===
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

// === UPDATE STASH LIST VIEW ===
function updateStashList() {
  const container = document.getElementById('stashList');
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
    const description = stash.description || stash.desc || 'Нет описания'; // Поддержка обоих полей
    
    const card = document.createElement('div');
    card.className = 'stash-card';
    card.innerHTML = `
      <div class="stash-type ${config.class}">${config.name}</div>
      <div class="stash-name">${stash.name}</div>
      <div class="stash-desc">${description}</div>
      <div class="stash-coords">Координаты: ${stash.lat.toFixed(4)}, ${stash.lng.toFixed(4)}</div>
      ${stash.created_at ? `<div class="stash-date">Добавлен: ${new Date(stash.created_at).toLocaleDateString()}</div>` : ''}
    `;
    
    card.onclick = () => {
      // Переключаемся на карту
      menuButtons[0].click();
      // Центрируем карту на тайнике
      map.setView([stash.lat, stash.lng], Math.max(map.getZoom(), 15));
    };
    
    container.appendChild(card);
  });
}

// === STASH POPUP FUNCTIONS ===
const popup = document.getElementById('stashPopup');

function showStashPopup(stash, latlng) {
  const config = typeConfig[stash.type] || typeConfig.stash;
  const description = stash.description || stash.desc || 'Нет описания'; // Поддержка обоих полей
  
  document.getElementById('popupName').textContent = stash.name;
  document.getElementById('popupDesc').textContent = description;
  document.getElementById('popupCoords').textContent = `Координаты: ${stash.lat.toFixed(4)}, ${stash.lng.toFixed(4)}`;
  
  const typeElement = document.getElementById('popupType');
  typeElement.textContent = config.name;
  typeElement.className = `popup-type ${config.class}`;
  
  popup.style.display = 'block';
  popup.dataset.stashId = stash.id;
  
  // Позиционируем попап рядом с меткой
  const point = map.latLngToContainerPoint(latlng);
  const popupWidth = popup.offsetWidth;
  const popupHeight = popup.offsetHeight;
  const mapRect = document.getElementById('map').getBoundingClientRect();
  
  // Проверяем, чтобы попап не выходил за границы карты
  let left = point.x - popupWidth / 2;
  let top = point.y - popupHeight - 20;
  
  // Корректируем позицию, если попап выходит за границы
  if (left < 10) left = 10;
  if (left + popupWidth > mapRect.width - 10) left = mapRect.width - popupWidth - 10;
  if (top < 10) top = point.y + 20;
  
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
}

// Popup button handlers
document.getElementById('popupEdit').addEventListener('click', function() {
  const stashId = popup.dataset.stashId;
  const stash = stashes.find(s => s.id === stashId);
  
  if (stash) {
    document.getElementById('stashFormContainer').style.display = 'block';
    document.getElementById('formTitle').textContent = 'Изменить тайник';
    document.getElementById('stashName').value = stash.name;
    document.getElementById('stashDesc').value = stash.description || stash.desc || ''; // Поддержка обоих полей
    document.getElementById('stashType').value = stash.type;
    document.getElementById('stashLat').value = stash.lat;
    document.getElementById('stashLng').value = stash.lng;
    document.getElementById('stashId').value = stash.id;
    document.getElementById('stashForm').dataset.mode = 'edit';
    
    // Устанавливаем выбранные координаты
    selectedLatLng = L.latLng(stash.lat, stash.lng);
    
    popup.style.display = 'none';
  }
}); 

document.getElementById('popupDelete').addEventListener('click', async function() {
  const stashId = popup.dataset.stashId;
  
  if (confirm('Удалить этот тайник?')) {
    try {
      // Delete from Supabase
      const { error } = await supabaseClient
        .from('stashes')
        .delete()
        .eq('id', stashId);
      
      if (error) throw error;
      
      // Remove from local data
      const index = stashes.findIndex(s => s.id === stashId);
      if (index >= 0) {
        if (markers[stashId]) {
          map.removeLayer(markers[stashId]);
          delete markers[stashId];
        }
        stashes.splice(index, 1);
        updateStashList();
      }
      
    } catch (error) {
      console.error('Error deleting stash:', error);
      alert('Ошибка удаления тайника: ' + error.message);
      // Fallback to localStorage
      const index = stashes.findIndex(s => s.id === stashId);
      if (index >= 0) {
        if (markers[stashId]) {
          map.removeLayer(markers[stashId]);
          delete markers[stashId];
        }
        stashes.splice(index, 1);
        localStorage.setItem('stashes', JSON.stringify(stashes));
        updateStashList();
      }
    }
  }
  popup.style.display = 'none';
});

// Hide popup when clicking on map
map.on('click', (e) => {
  if (!e.originalEvent.target.closest('.stalker-marker')) {
    popup.style.display = 'none';
  }
});

// Hide popup when clicking outside
document.addEventListener('click', (e) => {
  if (popup.style.display === 'block' && 
      !popup.contains(e.target) && 
      !e.target.closest('.stalker-marker')) {
    popup.style.display = 'none';
  }
});

// Utility function to generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Добавляем стили для анимации меток
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% { 
      transform: translate(-50%, -50%) scale(1); 
      opacity: 1; 
    }
    50% { 
      transform: translate(-50%, -50%) scale(1.1); 
      opacity: 0.8; 
    }
    100% { 
      transform: translate(-50%, -50%) scale(1); 
      opacity: 1; 
    }
  }
  
  .stash-date {
    font-size: 12px;
    color: #888;
    margin-top: 5px;
  }
`;
document.head.appendChild(style);

// Load stashes on page load
loadStashes();

// Инициализация завершена
console.log('S.T.A.L.K.E.R. PDA with Supabase initialized');