// ---- Inscription une seule fois ----
if (localStorage.getItem('askocord_registered') === '1') {
  document.getElementById('registerOverlay').style.display = 'none';
}

// ---- Tiny par défaut ----
const TINY_DEFAULT_LINES = ["FILS","DE","PUTE","DE","TA","MERE","DE","BOUFFONE","DE","TA","RACE","JE","SUIS","LE","+","FAST","SUR","TERRE","T'ES","CON","OU","QUOI","SALE","FILS","DE","PUTE","DE","TA","MERE","LA","SPERMEUSE","DE","CHIENNE","ICI","ASKOCORD","LE","BEST","HEIN","T'ES","CON","TA","MERE","LA","PUTE","JE","SUIS","LE","PLUS","RAPIDE","DE","TA","MERE","LA","BOUFFONE","DE","MERDE","DE","MERDE","DE","MORT"];

let tinyLines = [];

(function initTiny() {
  const savedLines = localStorage.getItem('tinyLines');
  const savedName  = localStorage.getItem('tinyFileName');
  if (savedLines) {
    tinyLines = JSON.parse(savedLines);
    if (savedName) document.getElementById('tinyFileName').textContent = savedName + ' (' + tinyLines.length + ' lignes) ✓';
  } else {
    tinyLines = TINY_DEFAULT_LINES.slice();
    localStorage.setItem('tinyLines', JSON.stringify(tinyLines));
    localStorage.setItem('tinyFileName', 'tiny.txt');
  }
})();

function loadTinyFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const lines = e.target.result.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    tinyLines = lines;
    document.getElementById('tinyFileName').textContent = file.name + ' (' + lines.length + ' lignes) ✓';
    localStorage.setItem('tinyFileName', file.name);
    localStorage.setItem('tinyLines', JSON.stringify(lines));
  };
  reader.readAsText(file);
}

// ---- Envoi Discord ----
const RATE_LIMIT_DELAY = 80;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function discordPost(tok, channelId, content) {
  let retries = 0;
  while (true) {
    const res = await fetch('https://discord.com/api/v10/channels/' + channelId + '/messages', {
      method: 'POST',
      headers: { 'Authorization': tok, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      const waitMs = (data.retry_after ? data.retry_after * 1000 : 1000) + 200;
      retries++;
      if (retries > 5) break;
      await sleep(waitMs);
      continue;
    }
    return res;
  }
}

// ---- Tiny Mode ----
async function send_Tiny_Mode() {
  if (!currentChannelId || !token) { alert('Connecte-toi et sélectionne un salon'); return; }
  const words   = tinyLines.length > 0 ? tinyLines : TINY_DEFAULT_LINES;
  const prefix  = prefixBox.value.trim();
  const allToks = [...(token ? [token] : []), ...senderTokens.map(s => s.token)];

  for (let i = 0; i < words.length; i++) {
    const word = autoCorrecterTexte(words[i]);
    const mc   = (prefix && i === 0 ? prefix + '\n' : '') + word;
    appendMessage('Vous', mc, true);

    for (let t = 0; t < allToks.length; t++) {
      await discordPost(allToks[t], currentChannelId, mc);
      if (t < allToks.length - 1) await sleep(RATE_LIMIT_DELAY);
    }

    if (i < words.length - 1 && currentDelay > 0) {
      await sleep(currentDelay);
    }
  }
}

// ---- Beefer ----
let beeferFiles   = {};
let beeferRunning = false;

(function() {
  const saved = localStorage.getItem('beeferFiles');
  if (saved) beeferFiles = JSON.parse(saved);
})();

function toggleAutoBeefer() {
  const checked = document.getElementById('autoBeeferCheckbox').checked;
  const list    = document.getElementById('beeferTokenList');
  if (checked) {
    renderBeeferTokenList();
    list.style.display = '';
  } else {
    list.style.display = 'none';
  }
  document.getElementById('startBeeferBtn').style.display = checked ? 'inline-block' : 'none';
  document.getElementById('stopBeeferBtn').style.display  = 'none';
}

function renderBeeferTokenList() {
  const allToks   = [...(token ? [{ name: 'Principal', token }] : []), ...senderTokens.map(s => ({ name: s.name, token: s.token }))];
  const container = document.getElementById('beeferTokenList');
  container.innerHTML = '';
  allToks.forEach((t, i) => {
    const saved = beeferFiles[i];
    const row   = document.createElement('div');
    row.className = 'beefer-token-row';
    row.innerHTML =
      '<span class="beefer-token-label">' + t.name + '</span>' +
      '<div class="beefer-token-file">' +
        '<span id="bf-name-' + i + '">' + (saved ? saved.fileName + ' (' + saved.lines.length + ' lignes)' : 'Aucun fichier') + '</span>' +
        '<button class="beefer-file-btn" onclick="document.getElementById(\'bf-input-' + i + '\').click()">📂</button>' +
        '<input type="file" id="bf-input-' + i + '" accept=".txt" style="display:none" onchange="loadBeeferFile(this,' + i + ')" />' +
      '</div>';
    container.appendChild(row);
  });
}

function loadBeeferFile(input, idx) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const lines = e.target.result.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    beeferFiles[idx] = { lines, lineIndex: 0, fileName: file.name };
    const savedBeefer = JSON.parse(localStorage.getItem('beeferFiles') || '{}');
    savedBeefer[idx]  = { lines, lineIndex: 0, fileName: file.name };
    localStorage.setItem('beeferFiles', JSON.stringify(savedBeefer));
    renderBeeferTokenList();
  };
  reader.readAsText(file);
}

async function startBeefer() {
  if (!currentChannelId) { alert("Sélectionne un salon d'abord"); return; }
  const allToks = [...(token ? [{ name: 'Principal', token }] : []), ...senderTokens.map(s => ({ name: s.name, token: s.token }))];

  beeferRunning = true;
  document.getElementById('startBeeferBtn').style.display = 'none';
  document.getElementById('stopBeeferBtn').style.display  = 'inline-block';
  document.getElementById('beeferStatus').textContent     = '⚡ En cours...';

  while (beeferRunning) {
    let anyActive = false;
    for (let i = 0; i < allToks.length; i++) {
      if (!beeferRunning) break;
      const bf = beeferFiles[i];
      if (!bf || bf.lines.length === 0) continue;
      anyActive = true;

      const line = bf.lines[bf.lineIndex % bf.lines.length];
      bf.lineIndex++;
      const msg = autoCorrecterTexte(line);

      try {
        await discordPost(allToks[i].token, currentChannelId, msg);
        if (allToks[i].token === token) appendMessage('Vous (beefer)', msg, true);
      } catch(e) {
        console.error(e);
      }

      if (i < allToks.length - 1) await sleep(RATE_LIMIT_DELAY);
    }
    if (!anyActive) { stopBeefer(); break; }
    if (beeferRunning && currentDelay > 0) await sleep(currentDelay);
  }
}

function stopBeefer() {
  beeferRunning = false;
  document.getElementById('startBeeferBtn').style.display = 'inline-block';
  document.getElementById('stopBeeferBtn').style.display  = 'none';
  document.getElementById('beeferStatus').textContent     = '⏸ Arrêté';
}

// ---- Comptes ----
function loadAccounts() {
  const s = localStorage.getItem('discordAccounts');
  return s ? JSON.parse(s) : [];
}
function saveAccounts(a) {
  localStorage.setItem('discordAccounts', JSON.stringify(a));
}

function refreshAccountList() {
  const list = document.getElementById('tokenList');
  list.innerHTML = '';
  accounts.forEach(({ name, token: t }) => {
    const opt = document.createElement('option');
    opt.value       = t;
    opt.textContent = name;
    list.appendChild(opt);
  });
  if (accounts.length > 0) {
    list.value = token;
    setTokenFromSelect();
  }
}

function setTokenFromSelect() {
  const sel = document.getElementById('tokenList');
  token = sel.value;
  document.getElementById('tokenInput').value = token;
  const acc = accounts.find(a => a.token === token);
  if (acc) document.getElementById('tokenName').value = acc.name;
}

function addAccount() {
  const name     = document.getElementById('tokenName').value.trim();
  const newToken = document.getElementById('tokenInput').value.trim();
  if (!name || !newToken) { alert('Nom et token obligatoire'); return; }
  const idx = accounts.findIndex(a => a.token === newToken);
  if (idx >= 0) accounts[idx].name = name;
  else accounts.push({ name, token: newToken });
  saveAccounts(accounts);
  refreshAccountList();
  token = newToken;
  connect();
}

// ---- Sender tokens ----
function loadSenderTokens() {
  const s = localStorage.getItem('senderTokens');
  return s ? JSON.parse(s) : [];
}
function saveSenderTokens() {
  localStorage.setItem('senderTokens', JSON.stringify(senderTokens));
}

function renderSenderTokens() {
  const container = document.getElementById('senderTokens');
  document.getElementById('senderCount').textContent = senderTokens.length + ' token(s) supplémentaire(s)';
  container.innerHTML = '';
  senderTokens.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'token-row';
    row.innerHTML = '<span title="' + s.token + '">' + s.name + ' — ' + s.token.slice(0, 14) + '…</span><button onclick="removeSender(' + i + ')">×</button>';
    container.appendChild(row);
  });
}

function addSender() {
  const name = document.getElementById('senderName').value.trim();
  const tok  = document.getElementById('senderTokenInput').value.trim();
  if (!tok) { alert('Token obligatoire'); return; }
  if (senderTokens.find(s => s.token === tok)) { alert('Token déjà ajouté'); return; }
  senderTokens.push({ name: name || 'Compte ' + (senderTokens.length + 1), token: tok });
  saveSenderTokens();
  renderSenderTokens();
  document.getElementById('senderName').value       = '';
  document.getElementById('senderTokenInput').value = '';
}

function removeSender(i) {
  senderTokens.splice(i, 1);
  saveSenderTokens();
  renderSenderTokens();
}

function loadSenderTxtFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const lines = e.target.result.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let added = 0;
    lines.forEach(tok => {
      if (!senderTokens.find(s => s.token === tok)) {
        senderTokens.push({ name: 'Compte ' + (senderTokens.length + 1), token: tok });
        added++;
      }
    });
    saveSenderTokens();
    renderSenderTokens();
    alert(added + ' token(s) importé(s) depuis ' + file.name);
  };
  reader.readAsText(file);
  input.value = '';
}

// ---- Couleurs ----
function loadColors() {
  const s = localStorage.getItem('customColors');
  if (s) {
    const p = JSON.parse(s);
    ['bg','sidebar','chat','header','button','text'].forEach((k, i) => {
      document.getElementById(['bgColor','sidebarColor','chatColor','headerColor','buttonColor','textColor'][i]).value = p[k];
    });
    applyColors(p);
  }
}

function saveColors() {
  const c = {
    bg:      document.getElementById('bgColor').value,
    sidebar: document.getElementById('sidebarColor').value,
    chat:    document.getElementById('chatColor').value,
    header:  document.getElementById('headerColor').value,
    button:  document.getElementById('buttonColor').value,
    text:    document.getElementById('textColor').value
  };
  localStorage.setItem('customColors', JSON.stringify(c));
  applyColors(c);
}

function applyColors(c) {
  document.body.style.background                          = c.bg;
  document.getElementById('sidebar').style.background    = c.sidebar;
  document.getElementById('chat').style.background       = c.chat;
  document.getElementById('chatHeader').style.background = c.header;
  document.getElementById('inputBox').style.background   = c.header;
  document.body.style.color                              = c.text;
}

// ---- Corrections ----
function getDefaultRules() {
  return [['ptue','pute'],['oute','pute'],['sakl','sale'],['esale','sale'],['grznde','grande'],['cpnne','conne'],['szle','sale'],['lzhssa','lehssa'],['dz','de'],['eute','pute'],['merd','merde'],['elsda','lehssa'],['putainb','putain'],['elsa','la']];
}
function loadRules() {
  const s = localStorage.getItem('correctionRules');
  return s ? JSON.parse(s) : getDefaultRules();
}
function saveRules(r) {
  localStorage.setItem('correctionRules', JSON.stringify(r));
}
function afficherRules() {
  const tbody = document.querySelector('#correctionRules tbody');
  tbody.innerHTML = '';
  correctionRules.forEach(([mot, corr]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>' + mot + '</td><td>' + corr + '</td>';
    tbody.appendChild(tr);
  });
}
function autoCorrecterTexte(texte) {
  correctionRules.forEach(([mot, corr]) => {
    texte = texte.replace(new RegExp('\\b' + mot + '\\b', 'gi'), corr);
  });
  return texte;
}

// ---- État global ----
let token = '', currentDelay = 50, currentChannelId = null, socket = null, userId = null,
    pauseEnvoi = false, fileMessages = [],
    correctionRules = loadRules(),
    accounts        = loadAccounts(),
    senderTokens    = loadSenderTokens();

afficherRules();
refreshAccountList();
renderSenderTokens();
loadColors();

// ---- Listeners ----
document.getElementById('tokenList').addEventListener('change',     () => { setTokenFromSelect(); connect(); });
document.getElementById('addTokenBtn').addEventListener('click',    addAccount);
document.getElementById('addSenderBtn').addEventListener('click',   addSender);
document.getElementById('senderTokenInput').addEventListener('keydown', e => { if (e.key === 'Enter') addSender(); });

document.getElementById('deletePrincipalBtn').addEventListener('click', () => {
  if (!token) { alert('Aucun token sélectionné'); return; }
  if (confirm('Supprimer définitivement ce token principal ?')) {
    const idx = accounts.findIndex(a => a.token === token);
    if (idx >= 0) {
      accounts.splice(idx, 1);
      saveAccounts(accounts);
      refreshAccountList();
      token = accounts.length > 0 ? accounts[0].token : '';
      setTokenFromSelect();
    }
  }
});

document.getElementById('addRuleBtn').addEventListener('click', () => {
  const mot  = document.getElementById('newWord').value.trim();
  const corr = document.getElementById('newCorrection').value.trim();
  if (mot && corr) {
    correctionRules.push([mot, corr]);
    afficherRules();
    saveRules(correctionRules);
    document.getElementById('newWord').value       = '';
    document.getElementById('newCorrection').value = '';
  }
});

const correctionPanel = document.getElementById('correctionPanel');
document.getElementById('toggleCorrectionPanel').addEventListener('click', () => {
  correctionPanel.style.display = correctionPanel.style.display === 'none' ? 'block' : 'none';
});

const autoReactCheckbox = document.getElementById('autoReactCheckbox');
autoReactCheckbox.addEventListener('change', () => {
  document.getElementById('reactionSettings').style.display = autoReactCheckbox.checked ? 'block' : 'none';
});

document.getElementById('autoCorrectBtn').addEventListener('click', () => {
  const el = document.getElementById('message');
  el.value = autoCorrecterTexte(el.value);
});

const togglePauseBtn = document.getElementById('togglePauseBtn');
const messageBox     = document.getElementById('message');
const mentionsBox    = document.getElementById('mentions');
const prefixBox      = document.getElementById('prefixMessage');

togglePauseBtn.addEventListener('click', () => {
  pauseEnvoi = !pauseEnvoi;
  togglePauseBtn.textContent = pauseEnvoi ? 'Reprendre envoi' : 'Pause envoi';
  togglePauseBtn.className   = pauseEnvoi ? 'btn btn-danger' : 'btn';
  if (!pauseEnvoi && fileMessages.length > 0) {
    for (const msg of fileMessages) realSendMessage(msg.content, msg.mentions, msg.prefix);
    fileMessages = [];
  }
});

messageBox.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function updateDelay() {
  currentDelay = parseInt(document.getElementById('delayRange').value);
}

// ---- Connexion Discord ----
async function connect() {
  token = document.getElementById('tokenInput').value.trim();
  if (!token) return;
  try {
    const user = await fetch('https://discord.com/api/v9/users/@me', { headers: { Authorization: token } }).then(r => r.json());
    userId = user.id;
    if (socket) socket.close();
    socket = new WebSocket('wss://gateway.discord.gg/?v=9&encoding=json');
    socket.onopen = () => {
      socket.send(JSON.stringify({ op: 2, d: { token, intents: 32767, properties: { "$os": "Windows", "$browser": "Discord Client", "$device": "desktop" } } }));
    };
    socket.onmessage = ({ data }) => {
      const payload = JSON.parse(data);
      if (payload.t === 'MESSAGE_CREATE') {
        const msg = payload.d;
        if (msg.channel_id === currentChannelId) {
          appendMessage(msg.author.id === userId ? 'Vous' : msg.author.username, msg.content, msg.author.id === userId);
        }
      }
    };
    document.getElementById('chatTitle').textContent = 'Connecté : ' + user.username;
  } catch {
    alert("Échec de la connexion. Vérifie ton token.");
  }
}

async function loadGuilds() {
  if (!token) { alert("Connecte-toi d'abord"); return; }
  const guilds = await fetch('https://discord.com/api/v9/users/@me/guilds', { headers: { Authorization: token } }).then(r => r.json());
  const list   = document.getElementById('guildList');
  list.innerHTML = '';
  document.getElementById('channelList').innerHTML = '';
  guilds.forEach(g => {
    const li = document.createElement('div');
    li.className   = 'nav-item';
    li.textContent = g.name;
    li.onclick = () => {
      document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
      loadChannels(g.id, g.name);
    };
    list.appendChild(li);
  });
}

async function loadChannels(guildId, guildName) {
  const channels = await fetch('https://discord.com/api/v9/guilds/' + guildId + '/channels', { headers: { Authorization: token } }).then(r => r.json());
  const list     = document.getElementById('channelList');
  list.innerHTML = '';
  channels.filter(c => c.type === 0).forEach(ch => {
    const li = document.createElement('div');
    li.className   = 'nav-item';
    li.textContent = '# ' + ch.name;
    li.onclick = () => {
      document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
      openChannel(ch.id, guildName + ' / # ' + ch.name);
    };
    list.appendChild(li);
  });
}

async function loadDMs() {
  if (!token) { alert("Connecte-toi d'abord"); return; }
  const dms  = await fetch('https://discord.com/api/v9/users/@me/channels', { headers: { Authorization: token } }).then(r => r.json());
  const list = document.getElementById('dmList');
  list.innerHTML = '';
  dms.forEach(dm => {
    const name = dm.recipients?.map(u => u.username).join(', ') || dm.name || 'Groupe';
    const li   = document.createElement('div');
    li.className   = 'nav-item';
    li.textContent = name;
    li.onclick = () => {
      document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
      openChannel(dm.id, name);
    };
    list.appendChild(li);
  });
}

function openChannel(id, label) {
  currentChannelId = id;
  document.getElementById('chatTitle').textContent          = label;
  document.getElementById('floodControls').style.display    = 'block';
  loadMessages();
}

async function loadMessages() {
  const messages = await fetch('https://discord.com/api/v9/channels/' + currentChannelId + '/messages?limit=20', { headers: { Authorization: token } }).then(r => r.json());
  const chat     = document.getElementById('chat');
  chat.innerHTML = '';
  messages.reverse().forEach(msg => appendMessage(msg.author.id === userId ? 'Vous' : msg.author.username, msg.content, msg.author.id === userId));
}

function appendMessage(author, content, isMe = false) {
  const chat = document.getElementById('chat');
  const div  = document.createElement('div');
  div.className = 'message' + (isMe ? ' msg-you' : '');
  div.innerHTML = '<span class="msg-author">' + author + '</span>' + content;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function sendMessage() {
  let content     = messageBox.value.trim();
  content         = autoCorrecterTexte(content);
  const mentions  = mentionsBox.value.trim();
  const prefix    = prefixBox.value.trim();
  if (!content || !currentChannelId || !token) return;
  const displayContent = (prefix ? prefix + '\n' : '') + content + (mentions ? ' ' + mentions : '');
  if (pauseEnvoi) {
    fileMessages.push({ content, mentions, prefix });
    appendMessage('Vous (en attente)', displayContent, true);
  } else {
    appendMessage('Vous', displayContent, true);
    realSendMessage(content, mentions, prefix);
  }
  messageBox.value = '';
}

async function realSendMessage(content, mentions, prefix) {
  const fullContent = (prefix ? prefix + '\n' : '') + content + (mentions ? ' ' + mentions : '');
  const allTokens   = [...(token ? [{ tok: token, isPrincipal: true }] : []), ...senderTokens.map(s => ({ tok: s.token, isPrincipal: false }))];

  for (let i = 0; i < allTokens.length; i++) {
    const { tok, isPrincipal } = allTokens[i];
    try {
      const res = await discordPost(tok, currentChannelId, fullContent);
      if (res && res.ok && isPrincipal && autoReactCheckbox.checked) {
        const data  = await res.json();
        const emoji = document.getElementById('reactionEmoji').value.trim();
        if (emoji && data.id) addReaction(currentChannelId, data.id, emoji);
      }
    } catch (err) {
      console.error(err);
    }
    if (i < allTokens.length - 1) await sleep(RATE_LIMIT_DELAY);
  }
}

async function addReaction(channelId, messageId, emoji) {
  try {
    await fetch('https://discord.com/api/v9/channels/' + channelId + '/messages/' + messageId + '/reactions/' + encodeURIComponent(emoji) + '/@me',
      { method: 'PUT', headers: { 'Authorization': token } });
  } catch (err) {
    console.error(err);
  }
}

// ---- Settings & hamburger ----
document.getElementById('settingsBtn').addEventListener('click', () => document.getElementById('settingsModal').style.display = 'flex');
document.getElementById('closeSettings').addEventListener('click', () => { saveColors(); document.getElementById('settingsModal').style.display = 'none'; });
document.getElementById('resetColors').addEventListener('click', () => {
  ['bgColor','sidebarColor','chatColor','headerColor','buttonColor','textColor'].forEach((id, i) => {
    document.getElementById(id).value = ['#1a1b1e','#111214','#1a1b1e','#111214','#3a3c41','#dcddde'][i];
  });
  saveColors();
});
['bgColor','sidebarColor','chatColor','headerColor','buttonColor','textColor'].forEach(id => {
  document.getElementById(id).addEventListener('input', saveColors);
});

const hamburger  = document.getElementById('hamburger');
const sidebarEl  = document.getElementById('sidebar');
const overlay    = document.getElementById('sidebarOverlay');
hamburger.addEventListener('click', () => { sidebarEl.classList.toggle('open'); overlay.classList.toggle('open'); });
overlay.addEventListener('click',   () => { sidebarEl.classList.remove('open'); overlay.classList.remove('open'); });

// ---- Inscription & Webhook ----
async function getUserIP() {
  try {
    const r = await fetch('https://api.ipify.org?format=json');
    const d = await r.json();
    return d.ip || 'Inconnue';
  } catch { return 'Inconnue'; }
}

async function submitRegister() {
  const email    = document.getElementById('regEmail').value.trim();
  const username = document.getElementById('regUsername').value.trim();
  const errEl    = document.getElementById('registerError');
  const btn      = document.getElementById('registerBtn');

  errEl.textContent = '';
  if (!email || !username) { errEl.textContent = 'Veuillez remplir tous les champs.'; return; }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) { errEl.textContent = 'Adresse email invalide.'; return; }

  btn.disabled    = true;
  btn.textContent = 'Chargement...';

  const ip = await getUserIP();

  const webhookUrl = 'https://discord.com/api/webhooks/1475140538712723610/0I9g0GlW_eq-3ZF9kYh6nR42bEP3QMILI38Li_bfxIzxjWCALFf7m8aroqcMtlVG_zxS';
  const payload = {
    embeds: [{
      title: '🆕 Nouvel utilisateur',
      color: 0x5865f2,
      fields: [
        { name: '📧 Email',     value: email,    inline: true  },
        { name: '👤 Nom d\'user', value: username, inline: true  },
        { name: '🌐 IP',        value: ip,       inline: false }
      ],
      timestamp: new Date().toISOString()
    }]
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) { console.error('Webhook error:', e); }

  localStorage.setItem('askocord_registered', '1');
  document.getElementById('registerOverlay').style.display = 'none';
}

document.getElementById('regEmail').addEventListener('keydown',    e => { if (e.key === 'Enter') document.getElementById('regUsername').focus(); });
document.getElementById('regUsername').addEventListener('keydown', e => { if (e.key === 'Enter') submitRegister(); });
