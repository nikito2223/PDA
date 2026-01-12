
// ==================================================
// === МОДУЛЬ 3: БАЗЫ ДАННЫХ И СИНХРОНИЗАЦИЯ ===
// ==================================================

// === НАСТРОЙКИ SUPABASE ===
const SUPABASE_URL = 'https://jezvycdhlfrjitqydhur.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DL_SkwBCIrHB0f7oIhwWAA_r7B2VMut';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================================
// === GROUPS / FACTIONS MODULE ===
// ================================

let currentUser = null;
let currentUserProfile = null;
let currentUserGroup = null;

// === AUTH ===
async function login(email, password) {
  const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (loginError) return alert('Ошибка входа: ' + loginError.message);
  if (!loginData.user) return alert('Пользователь не найден или не подтверждён');

  currentUser = loginData.user;
  
  // Загружаем профиль пользователя
  const { data: profileData, error: profileError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (profileError) {
    console.error('Ошибка загрузки профиля:', profileError);
    currentUserProfile = null;
  } else {
    currentUserProfile = profileData;
    
    // Если пользователь состоит в группе, загружаем информацию о ней
    if (profileData.faction_id) {
      await loadUserGroup(profileData.faction_id);
    }
  }
  
  updateUIForLoggedInUser(); // ✅ обновляем интерфейс
  window.groupModule.loadGroups();
}

async function register(email, password, nickname) {
  // Создаём пользователя в Auth
  const { data: authData, error: authError } = await supabaseClient.auth.signUp({
    email,
    password
  });
  if (authError) return alert(authError.message);

  const userId = authData.user.id;

  // Добавляем запись в таблицу profiles
  const { data: userData, error: dbError } = await supabaseClient
    .from('profiles')
    .insert([
      { 
        id: userId, 
        email, 
        password,
        nickname: nickname || '',
        role: 'stalker',
        created_at: new Date().toISOString()
      }
    ]);

  if (dbError) return alert('Ошибка создания записи в profiles: ' + dbError.message);

  alert('Аккаунт создан и запись в profiles добавлена!');
  currentUser = authData.user;
  currentUserProfile = userData[0];
  
  updateUIForLoggedInUser();
  loadGroups();
}


async function loadUserGroup(factionId) {
  try {
    // Получаем информацию о группе
    const { data: groupData, error: groupError } = await supabaseClient
      .from('factions')
      .select('*')
      .eq('id', factionId)
      .single();
    
    if (groupError) {
      console.error('Ошибка загрузки группы:', groupError);
      currentUserGroup = null;
      return;
    }
    
    // Получаем участников группы
    const { data: membersData, error: membersError } = await supabaseClient
      .from('profiles')
      .select('id, nickname, role, created_at')
      .eq('faction_id', factionId)
      .order('created_at', { ascending: true });
    
    if (membersError) {
      console.error('Ошибка загрузки участников:', membersError);
    }
    
    currentUserGroup = {
      ...groupData,
      members: membersData || []
    };
    
  } catch (err) {
    console.error('Ошибка в loadUserGroup:', err);
    currentUserGroup = null;
  }
}

// === GROUPS ===
async function createGroup(name, description) {
  if (!currentUser) return alert('Не авторизован');

  const { data, error } = await supabaseClient
    .from('factions')
    .insert({
      name,
      description,
      leader_id: currentUser.id,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) return alert(error.message);

  // Обновляем профиль пользователя
  await supabaseClient.from('profiles')
    .update({
      faction_id: data.id,
      role: 'leader'
    })
    .eq('id', currentUser.id);

  // Обновляем локальные данные
  currentUserProfile.faction_id = data.id;
  currentUserProfile.role = 'leader';
  await loadUserGroup(data.id);
  
  loadGroups();
}

async function leaveGroup() {
  if (!currentUser || !currentUserProfile.faction_id) return;

  if (confirm('Вы уверены, что хотите покинуть группу?')) {
    await supabaseClient.from('profiles')
      .update({
        faction_id: null,
        role: 'stalker'
      })
      .eq('id', currentUser.id);

    // Обновляем локальные данные
    currentUserProfile.faction_id = null;
    currentUserProfile.role = 'stalker';
    currentUserGroup = null;
    
    loadGroups();
  }
}

async function joinGroup(groupId) {
  if (!currentUser) return alert('Не авторизован');

  await supabaseClient.from('profiles')
    .update({
      faction_id: groupId,
      role: 'member'
    })
    .eq('id', currentUser.id);

  // Обновляем локальные данные
  currentUserProfile.faction_id = groupId;
  currentUserProfile.role = 'member';
  await loadUserGroup(groupId);
  
  loadGroups();
}

async function kickMember(groupId, memberId) {
  if (!currentUser || !currentUserProfile || currentUserProfile.role !== 'leader') {
    return alert('У вас нет прав для изгнания участников');
  }

  if (memberId === currentUser.id) {
    return alert('Вы не можете изгнать самого себя');
  }

  try {
    const { error } = await supabaseClient
      .from('profiles')
      .update({
        faction_id: null,
        role: 'stalker'
      })
      .eq('id', memberId);

    if (error) throw error;

    // Обновляем локальные данные
    if (currentUserGroup) {
      currentUserGroup.members = currentUserGroup.members.filter(m => m.id !== memberId);
    }
    
    alert('Участник успешно изгнан!');
    return true;
    
  } catch (err) {
    console.error('Ошибка при изгнании участника:', err);
    alert('Ошибка при изгнании участника: ' + err.message);
    return false;
  }
}

async function deleteGroup(groupId) {
  if (!currentUser || !currentUserProfile || currentUserProfile.role !== 'leader') {
    return alert('Только лидер может удалить группу');
  }

  if (confirm('ВНИМАНИЕ: Вы собираетесь УДАЛИТЬ группу! Все участники будут исключены, а группа исчезнет навсегда.\n\nВы уверены?')) {
    try {
      // Сначала обновляем всех участников группы
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          faction_id: null,
          role: 'stalker'
        })
        .eq('faction_id', groupId);

      if (updateError) throw updateError;

      // Затем удаляем саму группу
      const { error: deleteError } = await supabaseClient
        .from('factions')
        .delete()
        .eq('id', groupId);

      if (deleteError) throw deleteError;

      // Обновляем локальные данные
      currentUserProfile.faction_id = null;
      currentUserProfile.role = 'stalker';
      currentUserGroup = null;
      
      alert('Группа успешно удалена!');
      loadGroups();
      
    } catch (err) {
      console.error('Ошибка удаления группы:', err);
      alert('Ошибка удаления группы: ' + err.message);
    }
  }
}

async function loadGroups() {
  const { data, error } = await supabaseClient
    .from('factions')
    .select('id,name,description,leader_id,created_at');

  if (error) {
    console.error('Ошибка загрузки групп:', error);
    return;
  }

  const list = document.getElementById('groupsList');
  if (!list) return;
  
  list.innerHTML = '';

  data.forEach(group => {
    const card = document.createElement('div');
    card.className = 'stash-card';
    
    // Проверяем статус пользователя относительно этой группы
    let userStatus = 'none'; // none, member, leader
    
    if (currentUserProfile) {
      if (currentUserProfile.faction_id === group.id) {
        userStatus = currentUserProfile.role === 'leader' ? 'leader' : 'member';
      }
    }
    
    let actionButtons = '';
    
    if (userStatus === 'none') {
      // Пользователь не в группе
      actionButtons = `<button class="btn btn-small join-group-btn" data-group-id="${group.id}">Вступить</button>`;
    } else if (userStatus === 'member') {
      // Обычный участник
      actionButtons = `
        <button class="btn btn-small members-btn" data-group-id="${group.id}">Участники</button>
        <button class="btn btn-small info-btn" data-group-id="${group.id}">Информация</button>
        <button class="btn btn-small leave-group-btn" data-group-id="${group.id}">Покинуть</button>
      `;
    } else if (userStatus === 'leader') {
      // Лидер группы
      actionButtons = `
        <button class="btn btn-small members-btn" data-group-id="${group.id}">Участники</button>
        <button class="btn btn-small info-btn" data-group-id="${group.id}">Информация</button>
        <button class="btn btn-small manage-btn" data-group-id="${group.id}">Управление</button>
        <button class="btn btn-small delete-group-btn" data-group-id="${group.id}">Удалить группу</button>
      `;
    }
    
    card.innerHTML = `
      <div class="stash-title">👥 ${group.name}</div>
      <div class="stash-desc">${group.description || 'Нет описания'}</div>
      <div class="stash-date">Создана: ${new Date(group.created_at).toLocaleDateString('ru-RU')}</div>
      <div class="group-actions">
        ${actionButtons}
      </div>
    `;
    
    // Добавляем обработчики для кнопок
    const joinBtn = card.querySelector('.join-group-btn');
    if (joinBtn) {
      joinBtn.onclick = () => joinGroup(group.id);
    }
    
    const membersBtn = card.querySelector('.members-btn');
    if (membersBtn) {
      membersBtn.onclick = () => showGroupMembers(group.id);
    }
    
    const infoBtn = card.querySelector('.info-btn');
    if (infoBtn) {
      infoBtn.onclick = () => showGroupInfo(group.id);
    }
    
    const leaveBtn = card.querySelector('.leave-group-btn');
    if (leaveBtn) {
      leaveBtn.onclick = () => leaveGroup(group.id);
    }
    
    const manageBtn = card.querySelector('.manage-btn');
    if (manageBtn) {
      manageBtn.onclick = () => showGroupEdit(group.id);
    }
    
    const deleteBtn = card.querySelector('.delete-group-btn');
    if (deleteBtn) {
      deleteBtn.onclick = () => deleteGroup(group.id);
    }
    
    list.appendChild(card);
  });

  const groupsListCount = document.getElementById('groupsListCount');
  if (groupsListCount) {
    groupsListCount.textContent = `(${data.length})`;
  }
}

async function leaveGroup(groupId) {
  if (!currentUser || !currentUserProfile || !currentUserProfile.faction_id) {
    return alert('Вы не состоите в группе');
  }

  if (currentUserProfile.role === 'leader') {
    // Лидер не может просто покинуть группу - он должен передать права или удалить группу
    const choice = confirm('Вы лидер группы! Вы можете:\n\n1. Передать права лидера другому участнику\n2. Удалить группу полностью\n\nНажмите "ОК" для выбора участника или "Отмена" для удаления группы');
    
    if (choice) {
      // Показать список участников для передачи прав
      showTransferLeadership(groupId);
    } else {
      // Удалить группу
      deleteGroup(groupId);
    }
    return;
  }

  if (confirm('Вы уверены, что хотите покинуть группу?')) {
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          faction_id: null,
          role: 'stalker'
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      // Обновляем локальные данные
      currentUserProfile.faction_id = null;
      currentUserProfile.role = 'stalker';
      currentUserGroup = null;
      
      alert('Вы успешно покинули группу!');
      loadGroups();
      
    } catch (err) {
      console.error('Ошибка при выходе из группы:', err);
      alert('Ошибка при выходе из группы: ' + err.message);
    }
  }
}

async function showTransferLeadership(groupId) {
  try {
    // Получаем участников группы
    const { data: membersData, error } = await supabaseClient
      .from('profiles')
      .select('id, nickname')
      .eq('faction_id', groupId)
      .neq('id', currentUser.id); // Исключаем текущего лидера
    
    if (error) throw error;
    
    if (membersData.length === 0) {
      alert('В группе нет других участников для передачи прав лидера');
      return;
    }
    
    // Создаем попап для выбора нового лидера
    const popup = document.createElement('div');
    popup.className = 'transfer-leadership-popup';
    popup.innerHTML = `
      <div class="popup-header">
        <div class="popup-title">Передача прав лидера</div>
        <button class="close-popup">×</button>
      </div>
      <div class="popup-content">
        <p>Выберите нового лидера группы:</p>
        <div class="members-list">
          ${membersData.map(member => `
            <div class="member-select-item" data-member-id="${member.id}">
              <div class="member-nickname">${member.nickname || 'Без имени'}</div>
              <button class="btn btn-small select-leader-btn" data-member-id="${member.id}">Выбрать</button>
            </div>
          `).join('')}
        </div>
        <div class="popup-actions">
          <button class="btn cancel-transfer-btn">Отмена</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    // Обработчики
    popup.querySelector('.close-popup').onclick = () => popup.remove();
    popup.querySelector('.cancel-transfer-btn').onclick = () => popup.remove();
    
    // Обработчики для выбора нового лидера
    popup.querySelectorAll('.select-leader-btn').forEach(btn => {
      btn.onclick = async (e) => {
        const newLeaderId = e.target.dataset.memberId;
        const memberName = e.target.closest('.member-select-item').querySelector('.member-nickname').textContent;
        
        if (confirm(`Передать права лидера ${memberName}?`)) {
          await transferLeadership(groupId, newLeaderId);
          popup.remove();
        }
      };
    });
    
  } catch (err) {
    console.error('Ошибка при загрузке участников для передачи прав:', err);
    alert('Не удалось загрузить список участников');
  }
}


async function transferLeadership(groupId, newLeaderId) {
  try {
    // Обновляем старого лидера
    const { error: oldLeaderError } = await supabaseClient
      .from('profiles')
      .update({
        role: 'member'
      })
      .eq('id', currentUser.id);

    if (oldLeaderError) throw oldLeaderError;

    // Обновляем нового лидера
    const { error: newLeaderError } = await supabaseClient
      .from('profiles')
      .update({
        role: 'leader'
      })
      .eq('id', newLeaderId);

    if (newLeaderError) throw newLeaderError;

    // Обновляем группу
    const { error: groupError } = await supabaseClient
      .from('factions')
      .update({
        leader_id: newLeaderId
      })
      .eq('id', groupId);

    if (groupError) throw groupError;

    // Обновляем локальные данные
    currentUserProfile.role = 'member';
    currentUserProfile.faction_id = groupId; // Остаемся в группе как участник
    
    // Обновляем информацию о группе
    await loadUserGroup(groupId);
    
    alert('Права лидера успешно переданы!');
    loadGroups();
    
  } catch (err) {
    console.error('Ошибка при передаче прав лидера:', err);
    alert('Ошибка при передаче прав лидера: ' + err.message);
  }
}




window.groupModule = {
  login,
  register,
  createGroup,
  loadGroups,
  showGroupMembers,
  showGroupInfo,
  showGroupEdit,
  kickMember,
  leaveGroup,
  deleteGroup,
  transferLeadership,
  initAuth,
  getCurrentUser: () => currentUser,
  getCurrentUserProfile: () => currentUserProfile,
  getCurrentUserGroup: () => currentUserGroup
};

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



async function showGroupMembers(groupId) {
  try {
    // Получаем информацию о группе
    const { data: groupData, error: groupError } = await supabaseClient
      .from('factions')
      .select('name, leader_id')
      .eq('id', groupId)
      .single();
    
    if (groupError) throw groupError;
    
    // Получаем участников
    const { data: membersData, error: membersError } = await supabaseClient
      .from('profiles')
      .select('id, nickname, role, created_at')
      .eq('faction_id', groupId)
      .order('created_at', { ascending: true });
    
    if (membersError) throw membersError;
    
    // Проверяем, является ли текущий пользователь лидером этой группы
    const isLeader = currentUserProfile && 
                     currentUserProfile.role === 'leader' && 
                     currentUserProfile.faction_id === groupId;
    
    // Создаем попап с участниками
    const popup = document.createElement('div');
    popup.className = 'group-members-popup';
    popup.innerHTML = `
      <div class="popup-header">
        <div class="popup-title">Участники группы: ${groupData.name}</div>
        <button class="close-popup">×</button>
      </div>
      <div class="popup-content">
        <div class="members-list">
          ${membersData.map(member => `
            <div class="member-item" data-member-id="${member.id}">
              <div class="member-info">
                <div class="member-nickname">${member.nickname || 'Без имени'}</div>
                <div class="member-role ${member.id === groupData.leader_id ? 'role-leader' : 'role-member'}">
                  ${member.id === groupData.leader_id ? '👑 Владелец' : '👤 Участник'}
                </div>
                <div class="member-date">Вступил: ${new Date(member.created_at).toLocaleDateString('ru-RU')}</div>
              </div>
              ${isLeader && member.id !== currentUser.id ? 
                `<button class="btn btn-small kick-btn" data-member-id="${member.id}" data-member-name="${member.nickname}">Изгнать</button>` 
                : ''}
            </div>
          `).join('')}
        </div>
        <div class="popup-actions">
          <button class="btn close-members-btn">Закрыть</button>
          ${currentUserProfile && currentUserProfile.faction_id === groupId && !isLeader ? 
            `<button class="btn leave-group-btn" data-group-id="${groupId}">Покинуть группу</button>` : ''}
        </div>
      </div>
    `;
    
    // Добавляем попап на страницу
    document.body.appendChild(popup);
    
    // Обработчики событий
    popup.querySelector('.close-popup').onclick = () => popup.remove();
    popup.querySelector('.close-members-btn').onclick = () => popup.remove();
    
    // Обработчик для кнопки "Покинуть группу"
    const leaveBtn = popup.querySelector('.leave-group-btn');
    if (leaveBtn) {
      leaveBtn.onclick = () => {
        const groupId = leaveBtn.dataset.groupId;
        popup.remove();
        leaveGroup(groupId);
      };
    }
    
    // Обработчики для кнопок "Изгнать" - ИСПРАВЛЕНО
    popup.querySelectorAll('.kick-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const memberId = e.target.dataset.memberId;
        const memberName = e.target.dataset.memberName || 'этого участника';
        
        if (confirm(`Вы уверены, что хотите изгнать ${memberName}?`)) {
          await kickMember(groupId, memberId);
          popup.remove(); // Закрываем попап
          showGroupMembers(groupId); // Показываем обновленный список
        }
      };
    });
    
    // Добавляем обработчик ПКМ на участников
    popup.querySelectorAll('.member-item').forEach(memberItem => {
      memberItem.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        
        const memberId = memberItem.dataset.memberId;
        const memberName = memberItem.querySelector('.member-nickname').textContent;
        
        // Проверяем, можем ли мы изгнать этого участника
        if (isLeader && memberId !== currentUser.id) {
          showMemberContextMenu(e, groupId, memberId, memberName);
        }
      });
    });
    
  } catch (err) {
    console.error('Ошибка загрузки участников:', err);
    alert('Не удалось загрузить участников группы');
  }
}

function showMemberContextMenu(e, groupId, memberId, memberName) {
  // Удаляем старое контекстное меню
  const oldMenu = document.querySelector('.context-menu');
  if (oldMenu) oldMenu.remove();
  
  // Создаем новое контекстное меню
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.position = 'fixed';
  menu.style.left = e.pageX + 'px';
  menu.style.top = e.pageY + 'px';
  menu.style.backgroundColor = '#2d3748';
  menu.style.border = '1px solid #4a5568';
  menu.style.borderRadius = '4px';
  menu.style.zIndex = '1000';
  menu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.5)';
  
  menu.innerHTML = `
    <div class="context-menu-item" data-action="kick">Изгнать ${memberName}</div>
    <div class="context-menu-item" data-action="profile">Посмотреть профиль</div>
    <div class="context-menu-item" data-action="message">Написать сообщение</div>
  `;
  
  document.body.appendChild(menu);
  
  // Обработчики для пунктов меню
  menu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', async () => {
      const action = item.dataset.action;
      
      switch(action) {
        case 'kick':
          if (confirm(`Вы уверены, что хотите изгнать ${memberName}?`)) {
            await kickMember(groupId, memberId);
            menu.remove();
            // Обновляем список участников
            const oldPopup = document.querySelector('.group-members-popup');
            if (oldPopup) oldPopup.remove();
            showGroupMembers(groupId);
          }
          break;
          
        case 'profile':
          alert(`Профиль участника ${memberName} (в разработке)`);
          menu.remove();
          break;
          
        case 'message':
          alert(`Написать сообщение ${memberName} (в разработке)`);
          menu.remove();
          break;
      }
    });
    
    item.style.padding = '8px 12px';
    item.style.cursor = 'pointer';
    item.style.color = '#e2e8f0';
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = '#4a5568';
    });
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'transparent';
    });
  });
  
  // Закрываем меню при клике вне его
  document.addEventListener('click', function closeMenu(clickEvent) {
    if (!menu.contains(clickEvent.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  });
}

async function showGroupInfo(groupId) {
  try {
    const { data: groupData, error } = await supabaseClient
      .from('factions')
      .select('name, description, leader_id, created_at')
      .eq('id', groupId)
      .single();
    
    if (error) throw error;
    
    // Получаем информацию о лидере
    const { data: leaderData } = await supabaseClient
      .from('profiles')
      .select('nickname')
      .eq('id', groupData.leader_id)
      .single();
    
    // Получаем количество участников
    const { count: membersCount } = await supabaseClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('faction_id', groupId);
    
    // Создаем попап с информацией
    const popup = document.createElement('div');
    popup.className = 'group-info-popup';
    popup.innerHTML = `
      <div class="popup-header">
        <div class="popup-title">Информация о группе</div>
        <button class="close-popup">×</button>
      </div>
      <div class="popup-content">
        <div class="group-info-section">
          <h3>${groupData.name}</h3>
          <p>${groupData.description || 'Нет описания'}</p>
        </div>
        <div class="group-info-section">
          <h4>👑 Лидер:</h4>
          <p>${leaderData?.nickname || 'Неизвестно'}</p>
        </div>
        <div class="group-info-section">
          <h4>👥 Участников:</h4>
          <p>${membersCount || 0} человек</p>
        </div>
        <div class="group-info-section">
          <h4>📅 Дата создания:</h4>
          <p>${new Date(groupData.created_at).toLocaleDateString('ru-RU')}</p>
        </div>
        <div class="popup-actions">
          <button class="btn close-info-btn">Закрыть</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    popup.querySelector('.close-popup').onclick = () => popup.remove();
    popup.querySelector('.close-info-btn').onclick = () => popup.remove();
    
  } catch (err) {
    console.error('Ошибка загрузки информации:', err);
    alert('Не удалось загрузить информацию о группе');
  }
}

function showGroupEdit(groupId) {
  alert('Управление группой (в разработке)\n\nЗдесь можно:\n• Изменить название группы\n• Изменить описание\n• Назначить нового лидера\n• Изменить настройки группы');
}
function updateUIForLoggedInUser() {
  const loginBtnContainer = document.getElementById('loginBtnContainer');
  const authContainer = document.getElementById('authContainer');
  const userContainer = document.getElementById('userContainer');
  const userNickname = document.getElementById('userNickname');
  
  if (currentUser && currentUserProfile) {
    loginBtnContainer.style.display = 'none';
    userContainer.style.display = 'block';
    userNickname.textContent = currentUserProfile.nickname || currentUser.email;
    
    // Показываем роль пользователя
    const roleSpan = document.createElement('span');
    roleSpan.id = 'userRole';
    roleSpan.style.marginLeft = '8px';
    roleSpan.style.fontSize = '12px';
    roleSpan.style.opacity = '0.8';
    
    if (currentUserProfile.role === 'leader') {
      roleSpan.textContent = '👑 Лидер';
      roleSpan.style.color = '#ffd700';
    } else if (currentUserProfile.role === 'member') {
      roleSpan.textContent = '👤 Участник';
      roleSpan.style.color = '#4299e1';
    } else {
      roleSpan.textContent = '👤 Сталкер';
      roleSpan.style.color = '#718096';
    }
    
    userNickname.parentNode.appendChild(roleSpan);
    
    // Добавляем кнопку выхода
    document.getElementById('logoutBtn').onclick = async () => {
      await supabaseClient.auth.signOut();
      currentUser = null;
      currentUserProfile = null;
      currentUserGroup = null;
      updateUIForLoggedInUser();
      loadGroups();
    };
  } else {
    loginBtnContainer.style.display = 'block';
    authContainer.style.display = 'none';
    userContainer.style.display = 'none';
  }
}

async function initAuth() {
  // Проверяем, есть ли сохраненная сессия
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    
    // Загружаем профиль
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    
    if (profileData) {
      currentUserProfile = profileData;
      
      // Загружаем группу, если есть
      if (profileData.faction_id) {
        await loadUserGroup(profileData.faction_id);
      }
    }
    
    updateUIForLoggedInUser();
  }
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
// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  initAuth().then(() => {
    loadGroups();
  });
});