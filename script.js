// ============================================================
// FIREBASE
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyD7F2lrec5XWyMWG7J0uW6IhEKD-LJ4jRY",
    authDomain: "bearscasino-bcded.firebaseapp.com",
    projectId: "bearscasino-bcded",
    storageBucket: "bearscasino-bcded.firebasestorage.app",
    messagingSenderId: "826765969101",
    appId: "1:826765969101:web:ee5e5da5057582f8ba4b84",
    measurementId: "G-J2BCGS7NVM",
    databaseURL: "https://bearscasino-bcded-default-rtdb.europe-west1.firebasedatabase.app"
};
firebase.initializeApp(firebaseConfig);
const db  = firebase.database();
const tg  = window.Telegram.WebApp;

// ============================================================
// КОНСТАНТИ
// ============================================================
const ADMINS         = [8216362223, 2067230442];
const myId           = tg.initDataUnsafe?.user?.id || 101;
const myName         = tg.initDataUnsafe?.user?.first_name || "Гравець";
const DEADLINE_OCEAN = new Date("2026-04-04T00:00:00+03:00").getTime();
const DEADLINE_FOOL  = new Date("2026-04-02T00:00:00+03:00").getTime();
const DEADLINE_CLOWN = new Date("2026-04-02T00:00:00+03:00").getTime();
const XP_PER_LEVEL   = 1000;

const CASES = {
    basic:    { n:"Common Case 🐾",    p:285,  drop:[
        {n:'Собака',s:'🐶',r:'Звичайний',  m:1.05,w:40,c:'#94a3b8'},
        {n:'Кіт',   s:'🐱',r:'Звичайний',  m:1.05,w:40,c:'#94a3b8'},
        {n:'Кролик',s:'🐰',r:'Незвичайний',m:1.08,w:20,c:'#3b82f6'}]},
    uncommon: { n:"Rare Case 🌟",      p:525,  drop:[
        {n:'Кролик',s:'🐰',r:'Незвичайний',m:1.08,w:46,c:'#3b82f6'},
        {n:'Лисиця',s:'🦊',r:'Незвичайний',m:1.09,w:40,c:'#3b82f6'},
        {n:'Вовк',  s:'🐺',r:'Рідкісний',  m:1.11,w:14,c:'#a855f7'}]},
    rare:     { n:"Epic Case 💎",      p:875,  drop:[
        {n:'Вовк',  s:'🐺',r:'Рідкісний',  m:1.11,w:50,c:'#a855f7'},
        {n:'Бджола',s:'🐝',r:'Рідкісний',  m:1.12,w:40,c:'#a855f7'},
        {n:'Панда', s:'🐼',r:'Епічний',    m:1.14,w:10,c:'#f59e0b'}]},
    legend:   { n:"Legendary Case 👑", p:1200, drop:[
        {n:'Панда', s:'🐼',r:'Епічний',    m:1.14,w:56,c:'#f59e0b'},
        {n:'Лев',   s:'🦁',r:'Легендарний',m:1.16,w:24,c:'#f43f5e'},
        {n:'Дракон',s:'🐲',r:'Легендарний',m:1.17,w:20,c:'#f43f5e'}]},
    ocean:    { n:"Ocean Case 🌊",     p:1500, limited:true, deadline:DEADLINE_OCEAN, drop:[
        {n:'Рибка',         s:'🐟',r:'Рідкісний',  m:1.16,w:45,c:'#a855f7'},
        {n:'Тропічна рибка',s:'🐠',r:'Епічний',    m:1.19,w:35,c:'#f59e0b'},
        {n:'Акула',         s:'🦈',r:'Легендарний',m:1.23,w:15,c:'#f43f5e'},
        {n:'Восьминіг',     s:'🐙',r:'Міфічний',   m:1.30,w:5, c:'#bf40bf'}]},
    fool:     { n:"Кейс Дурня 🤡",    p:1488, limited:true, deadline:DEADLINE_FOOL, drop:[
        {n:'Унітаз',   s:'🚽',r:'Епічний',   m:1.20,w:45,c:'#f59e0b'},
        {n:'Какашка',  s:'💩',r:'Легендарний',m:1.25,w:35,c:'#f43f5e'},
        {n:'Нокіа3310',s:'📱',r:'Міфічний',  m:1.32,w:20,c:'#bf40bf'}]}
};

const ADMIN_ONLY_PETS = [
    {n:'Клоун',  s:'🤡',r:'Смехуятина', m:1.67,c:'#ff6b35'},
    {n:'Гігачад',s:'🗿',r:'Міфічний',   m:5.20,c:'#bf40bf'},
    {n:'Смітник',s:'🗑️',r:'Легендарний',m:1.35,c:'#f43f5e'},
];

// ============================================================
// ТЕМИ
// ============================================================
const THEMES = {
    gold:   { name:'🏆 Золото',   a:'#f59e0b', a2:'#fbbf24', bg:'#050710', btnTxt:'#000' },
    blue:   { name:'💎 Сапфір',   a:'#58a6ff', a2:'#93c5fd', bg:'#030812', btnTxt:'#fff' },
    purple: { name:'🔮 Аметист',  a:'#a855f7', a2:'#c084fc', bg:'#070510', btnTxt:'#fff' },
    green:  { name:'🌿 Смарагд',  a:'#22c55e', a2:'#4ade80', bg:'#030c06', btnTxt:'#000' },
    red:    { name:'🔥 Рубін',    a:'#ef4444', a2:'#f87171', bg:'#0c0303', btnTxt:'#fff' },
};

let currentTheme = localStorage.getItem('bc_theme') || 'gold';
let currentLang  = localStorage.getItem('bc_lang')  || 'uk';

function applyTheme(key) {
    const t = THEMES[key] || THEMES.gold;
    const r = document.documentElement.style;
    r.setProperty('--accent',  t.a);
    r.setProperty('--accent2', t.a2);
    r.setProperty('--bg',      t.bg);
    r.setProperty('--btn-txt', t.btnTxt);
    const logo = document.querySelector('.logo');
    if (logo) logo.style.backgroundImage =
        `linear-gradient(90deg,${t.a},${t.a2},${t.a},${t.a2},${t.a})`;
    currentTheme = key;
    localStorage.setItem('bc_theme', key);
}

// ============================================================
// МОВА
// ============================================================
const LANGS = {
    uk: {
        chooseGame:'ОБЕРИ ГРУ', betLbl:'СТАВКА', betBtn:'ЗРОБИТИ СТАВКУ',
        win:'Переміг!', lose:'Програв!', waiting:'⏳ Очікування...',
        spinning:'🎰 Крутимо...', openCells:'⚡ Відкривай клітинки!',
        chooseDoor:'🚪 Обирай двері без клоуна!', tapBalloon:'🎈 Тисни на кульку!',
        minesBoom:'Бум! Міна!', clownBoom:'За тією дверью був клоун!',
        allRounds:'Виграв всі 4 раунди!', balloonBoom:'Кулька луснула!',
        take:'💰 ЗАБРАТИ', round:'РАУНД', prize:'Приз:',
        myPets:'🎒 МОЇ ПЕТИ', leaders:'🏆 ЛІДЕРИ', admin:'⚡ АДМІН',
        settings:'⚙️ Налаштування', theme:'Тема', lang:'Мова',
        invEmpty:'Інвентар порожній', invEmptySub:'Відкривай кейси в магазині!',
        loading:'Завантаження...', marketEmpty:'На ринку порожньо',
        saved:'✅ Збережено!', chosen:'ВИБРАНЕ ЧИСЛО',
        g_f50:'⚖️ 50/50 (x1.55)', g_dice:'🎲 Кубик (x2.05)',
        g_wheel:'🎡 Колесо (до x1.6)', g_slots:'🎰 Слоти (до x5.0)',
        g_mines:'💣 Міни (до x4.0)', g_clown:'🚪 Двері Клоуна (до x2.4) 🎉',
        g_balloon:'🎈 Клоунський Тир (до x2.5) 🎉', g_bj:'🃏 Блекджек (x2.0)',
        expired:'Ця гра вже недоступна (закінчилась 2 квітня)',
    },
    en: {
        chooseGame:'CHOOSE GAME', betLbl:'BET', betBtn:'PLACE BET',
        win:'Won!', lose:'Lost!', waiting:'⏳ Waiting...',
        spinning:'🎰 Spinning...', openCells:'⚡ Open cells!',
        chooseDoor:'🚪 Pick a door without the clown!', tapBalloon:'🎈 Tap the balloon!',
        minesBoom:'Boom! Mine!', clownBoom:'That door had the clown!',
        allRounds:'Won all 4 rounds!', balloonBoom:'Balloon popped!',
        take:'💰 TAKE', round:'ROUND', prize:'Prize:',
        myPets:'🎒 MY PETS', leaders:'🏆 LEADERS', admin:'⚡ ADMIN',
        settings:'⚙️ Settings', theme:'Theme', lang:'Language',
        invEmpty:'Inventory empty', invEmptySub:'Open cases in the shop!',
        loading:'Loading...', marketEmpty:'Market is empty',
        saved:'✅ Saved!', chosen:'CHOSEN NUMBER',
        g_f50:'⚖️ 50/50 (x1.55)', g_dice:'🎲 Dice (x2.05)',
        g_wheel:'🎡 Wheel (up to x1.6)', g_slots:'🎰 Slots (up to x5.0)',
        g_mines:'💣 Mines (up to x4.0)', g_clown:'🚪 Clown Doors (up to x2.4) 🎉',
        g_balloon:'🎈 Clown Shoot (up to x2.5) 🎉', g_bj:'🃏 Blackjack (x2.0)',
        expired:'This game is no longer available (ended April 2)',
    },
    ru: {
        chooseGame:'ВЫБЕРИ ИГРУ', betLbl:'СТАВКА', betBtn:'СДЕЛАТЬ СТАВКУ',
        win:'Победил!', lose:'Проиграл!', waiting:'⏳ Ожидание...',
        spinning:'🎰 Крутим...', openCells:'⚡ Открывай клетки!',
        chooseDoor:'🚪 Выбирай дверь без клоуна!', tapBalloon:'🎈 Нажимай на шарик!',
        minesBoom:'Бум! Мина!', clownBoom:'За той дверью был клоун!',
        allRounds:'Выиграл все 4 раунда!', balloonBoom:'Шарик лопнул!',
        take:'💰 ЗАБРАТЬ', round:'РАУНД', prize:'Приз:',
        myPets:'🎒 МОИ ПИТОМЦЫ', leaders:'🏆 ЛИДЕРЫ', admin:'⚡ АДМИН',
        settings:'⚙️ Настройки', theme:'Тема', lang:'Язык',
        invEmpty:'Инвентарь пуст', invEmptySub:'Открывай кейсы в магазине!',
        loading:'Загрузка...', marketEmpty:'Рынок пуст',
        saved:'✅ Сохранено!', chosen:'ВЫБРАННОЕ ЧИСЛО',
        g_f50:'⚖️ 50/50 (x1.55)', g_dice:'🎲 Кубик (x2.05)',
        g_wheel:'🎡 Колесо (до x1.6)', g_slots:'🎰 Слоты (до x5.0)',
        g_mines:'💣 Мины (до x4.0)', g_clown:'🚪 Двери Клоуна (до x2.4) 🎉',
        g_balloon:'🎈 Клоунский Тир (до x2.5) 🎉', g_bj:'🃏 Блекджек (x2.0)',
        expired:'Эта игра уже недоступна (закончилась 2 апреля)',
    },
};
function L(k) { return (LANGS[currentLang]||LANGS.uk)[k] || k; }

function applyLang(lang) {
    currentLang = lang;
    localStorage.setItem('bc_lang', lang);
    // оновлюємо тексти які є в DOM одразу
    const sel = document.getElementById('g-sel');
    if (sel) {
        const keys = ['g_f50','g_dice','g_wheel','g_slots','g_mines','g_clown','g_balloon','g_bj'];
        [...sel.options].forEach((o,i) => { if(keys[i]) o.text = L(keys[i]); });
    }
    document.querySelectorAll('[data-l]').forEach(el => {
        el.textContent = L(el.dataset.l);
    });
}

// ============================================================
// СТАН ГРАВЦЯ
// ============================================================
let s = { b:0, x:0, r:1, name:myName, p:null, inv:[], v:5.0 };
let currentShopTab   = 'cases';
let currentAdminTab  = 'balance';
let adminInvUserId   = null;
let adminInvUserName = '';

// ============================================================
// FIREBASE SYNC
// ============================================================
db.ref('players/'+myId).on('value', snap => {
    const d = snap.val();
    if (d) { s = d; if (!s.inv) s.inv = []; }
    else   { db.ref('players/'+myId).set(s); }
    ren();
});
function save() { db.ref('players/'+myId).set(s); }

// ============================================================
// XP / LEVELUP
// ============================================================
function checkPetLevelUp() {
    if (!s.p) return;
    const needed = (s.p.lvl||1) * XP_PER_LEVEL;
    if (s.x >= needed) {
        s.x -= needed;
        s.p.lvl = (s.p.lvl||1) + 1;
        s.p.m   = Math.round((s.p.m + 0.005)*1000)/1000;
        const idx = s.inv.findIndex(i => i.id === s.p.id);
        if (idx !== -1) s.inv[idx] = s.p;
        save();
        showToast(`${s.p.s} <b>${s.p.n}</b> — LVL ${s.p.lvl}! <span style="color:var(--accent)">+0.005</span>`);
    }
}

function showToast(html) {
    const t = document.createElement('div');
    t.innerHTML = html; t.className = 'toast';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// ============================================================
// РЕНДЕР ШАПКИ
// ============================================================
function ren() {
    document.getElementById('bal-val').innerText =
        Number.isInteger(s.b) ? s.b : s.b.toFixed(2);
    const petLvl = s.p ? (s.p.lvl||1) : 1;
    document.getElementById('xp-f').style.width =
        Math.min((s.x / (petLvl*XP_PER_LEVEL))*100, 100) + '%';
    if (s.p) {
        document.getElementById('p-img').innerText  = s.p.s;
        document.getElementById('p-name').innerText = s.p.n;
        document.getElementById('p-m').innerText    = s.p.m.toFixed(3);
        document.getElementById('p-l').innerText    = s.p.lvl||1;
        const t = document.getElementById('p-rarity');
        t.innerText = s.p.r; t.style.background = s.p.c;
    }
    if (ADMINS.includes(Number(myId)))
        document.getElementById('admin-tab').style.display = 'block';
}

// ============================================================
// НАВІГАЦІЯ
// ============================================================
window.tab = (t, el) => {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.nav-tab').forEach(n => n.classList.remove('active'));
    document.getElementById('v-'+t).style.display = 'block';
    el.classList.add('active');
    if (t==='shop')     renderShop();
    if (t==='inv')      renderInv();
    if (t==='top')      loadTop();
    if (t==='admin')    loadAdmin();
    if (t==='settings') renderSettings();
};

// ============================================================
// МАГАЗИН / РИНОК
// ============================================================
window.setShopTab = t => { currentShopTab = t; renderShop(); };

function renderShop() {
    const list = document.getElementById('shop-list');
    const tabs = `<div class="shop-tabs">
        <div class="s-tab ${currentShopTab==='cases'?'active':''}" onclick="setShopTab('cases')">📦 Кейси</div>
        <div class="s-tab ${currentShopTab==='market'?'active':''}" onclick="setShopTab('market')">🛒 Ринок</div>
    </div>`;
    if (currentShopTab === 'cases') {
        let h = tabs; const now = Date.now();
        for (const k in CASES) {
            const c = CASES[k];
            const dl = c.deadline || DEADLINE_OCEAN;
            if (c.limited && now > dl) continue;
            const badge   = c.limited ? '<span class="badge-ltd">Лімітовано</span>' : '';
            const chances = c.drop.map(p=>`<span style="color:${p.c}">${p.s} ${p.w}%</span>`).join(' · ');
            let timer = '';
            if (c.limited) {
                const diff = dl-now, d=Math.floor(diff/86400000), hr=Math.floor((diff/3600000)%24);
                timer = `<div class="case-timer">⏳ ${d}д ${hr}г</div>`;
            }
            h += `<div class="shop-card">
                <div class="case-info">
                    <div class="case-name">${c.n} ${badge}</div>
                    <div style="font-size:10px;margin:4px 0;font-weight:600;opacity:.85">${chances}</div>
                    ${timer}
                </div>
                <button class="btn-buy" onclick="buyCase('${k}')">${c.p} BB</button>
            </div>`;
        }
        list.innerHTML = h;
    } else {
        list.innerHTML = tabs + `<div id="m-list" class="glass" style="text-align:center;color:#8d99ae">${L('loading')}</div>`;
        db.ref('market').once('value', snap => {
            let h = '';
            snap.forEach(child => {
                const lot = child.val();
                if (!lot||!lot.pet) return;
                if (String(lot.sellerId)===String(myId)) return;
                h += `<div class="market-item">
                    <div>
                        <div style="font-weight:700;color:${lot.pet.c}">${lot.pet.s} ${lot.pet.n}</div>
                        <div style="font-size:11px;color:#8d99ae">LVL ${lot.pet.lvl||1} · x${lot.pet.m.toFixed(3)} · ${lot.sellerName}</div>
                    </div>
                    <button class="btn-buy" onclick="buyFromMarket('${child.key}')">${lot.price} BB</button>
                </div>`;
            });
            const el = document.getElementById('m-list');
            if (el) el.innerHTML = h || `<div style="padding:30px;text-align:center;color:#8d99ae">${L('marketEmpty')}</div>`;
        });
    }
}

window.buyFromMarket = lotId => {
    db.ref('market/'+lotId).once('value', snap => {
        const lot = snap.val();
        if (!lot) return alert('Лот недоступний!');
        if (s.b < lot.price) return alert(`Потрібно: ${lot.price} BB`);
        s.b -= lot.price; s.inv.push(lot.pet); save();
        db.ref('players/'+lot.sellerId+'/b').transaction(c=>(c||0)+lot.price);
        db.ref('market/'+lotId).remove();
        showToast(`✅ Куплено ${lot.pet.s} ${lot.pet.n}!`);
        renderShop();
    });
};

window.listOnMarket = petId => {
    if (s.p && s.p.id===petId) return alert('Спочатку зніми пета!');
    const pr = prompt('Ціна (BB):');
    if (!pr||isNaN(pr)||pr<=0) return;
    const idx = s.inv.findIndex(p=>p.id===petId);
    const pet = s.inv[idx];
    db.ref('market').push({pet, price:Number(pr), sellerId:myId, sellerName:myName}).then(() => {
        s.inv.splice(idx,1); save(); renderInv();
    });
};

// ============================================================
// ІНВЕНТАР
// ============================================================
function renderInv() {
    const el = document.getElementById('inv-list');
    if (!s.inv||!s.inv.length) {
        el.innerHTML = `<div class="inv-empty"><div style="font-size:52px;margin-bottom:12px">🥚</div>
            <div style="font-weight:bold;font-size:15px">${L('invEmpty')}</div>
            <div style="font-size:12px;opacity:.6;margin-top:4px">${L('invEmptySub')}</div></div>`;
        return;
    }
    let h = `<div style="font-size:11px;color:#8d99ae;font-weight:700;margin-bottom:10px;letter-spacing:.5px">${s.inv.length} ПЕТІВ</div>`;
    s.inv.forEach(p => {
        const eq = s.p && s.p.id===p.id;
        h += `<div class="pet-card${eq?' pet-eq':''}">
            <div class="pet-stripe" style="background:${p.c}"></div>
            <div class="pet-emo">${p.s}</div>
            <div class="pet-info">
                <div class="pet-badge" style="background:${p.c}25;color:${p.c};border:1px solid ${p.c}50">${p.r}</div>
                <div class="pet-name">${p.n}${eq?`<span class="pet-active-tag">✦ АКТИВНИЙ</span>`:''}</div>
                <div class="pet-stats">
                    <span>Бонус <b style="color:${p.c}">x${p.m.toFixed(3)}</b></span>
                    <span style="margin-left:10px">LVL <b style="color:#eee">${p.lvl||1}</b></span>
                </div>
            </div>
            <div class="pet-btns">
                <button class="pb-equip${eq?' pb-eq':''}" onclick="equip(${p.id})">${eq?'✅':'Взяти'}</button>
                <button class="pb-sell" onclick="listOnMarket(${p.id})">🏪</button>
            </div>
        </div>`;
    });
    el.innerHTML = h;
}
window.equip = id => { s.p = s.inv.find(i=>i.id===id); save(); renderInv(); ren(); };

// ============================================================
// КОЛЕСО (CANVAS)
// ============================================================
const WHEEL_SEGS = [
    { label:'0x',     color:'#c0392b', m:0,   start:0,   end:180 },
    { label:'1.4x',   color:'#27ae60', m:1.4, start:180, end:270 },
    { label:'1.6x',   color:'#2980b9', m:1.6, start:270, end:342 },
    { label:'🗑️',    color:'#8b5cf6', m:999, start:342, end:360 },
];
let wheelAngle = 0, wheelSpinning = false;

function drawWheel(rot) {
    const canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d'), cx=110, cy=110, r=100;
    ctx.clearRect(0,0,220,220);
    WHEEL_SEGS.forEach(seg => {
        const sa = (seg.start + rot - 90) * Math.PI/180;
        const ea = (seg.end   + rot - 90) * Math.PI/180;
        ctx.beginPath(); ctx.moveTo(cx,cy);
        ctx.arc(cx,cy,r,sa,ea); ctx.closePath();
        ctx.fillStyle = seg.color; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.stroke();
        const mid = ((seg.start+seg.end)/2 + rot - 90) * Math.PI/180;
        ctx.save();
        ctx.translate(cx+Math.cos(mid)*r*.65, cy+Math.sin(mid)*r*.65);
        ctx.rotate(mid + Math.PI/2);
        ctx.fillStyle='#fff'; ctx.font='bold 13px system-ui';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(seg.label, 0, 0);
        ctx.restore();
    });
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=3; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,16,0,Math.PI*2);
    ctx.fillStyle='#060810'; ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=2; ctx.stroke();
}

function spinWheel(resultM, onDone) {
    if (wheelSpinning) return;
    wheelSpinning = true;
    const seg     = WHEEL_SEGS.find(s=>s.m===resultM);
    const segMid  = (seg.start + seg.end) / 2;
    const halfArc = (seg.end - seg.start) / 2;
    const randOff = (Math.random()-.5) * halfArc * 0.7;
    const landAt  = segMid + randOff;
    const finalRot = ((360 - landAt % 360) + 360) % 360;
    const totalRot = 6*360 + finalRot - (wheelAngle%360);
    const a0 = wheelAngle, t0 = performance.now(), dur = 4500;
    function easeOut(t) { return 1 - Math.pow(1-t, 4); }
    function frame(now) {
        const t = Math.min((now-t0)/dur, 1);
        wheelAngle = a0 + totalRot * easeOut(t);
        drawWheel(wheelAngle%360);
        if (t < 1) requestAnimationFrame(frame);
        else { wheelAngle = wheelAngle%360; wheelSpinning = false; onDone(); }
    }
    requestAnimationFrame(frame);
}

// ============================================================
// СЛОТИ
// ============================================================
const SLOT_SYMS = ['🍒','🍋','🍊','🍇','⭐','💎','7'];
const SLOT_W    = [30,25,20,15,6,3,1];
let slotsSpinning = false;

function pickSlot() {
    let r=Math.random()*100, cur=0;
    for (let i=0;i<SLOT_SYMS.length;i++) { cur+=SLOT_W[i]; if(r<cur) return SLOT_SYMS[i]; }
    return SLOT_SYMS[0];
}
function slotMult(a,b,c) {
    if (a===b&&b===c) { if(a==='7') return 5; if(a==='💎') return 4; if(a==='⭐') return 3; return 2; }
    if (a===b||b===c||a===c) return 1.3;
    return 0;
}
function spinReel(id, final, onDone) {
    let t = 0;
    const iv = setInterval(() => {
        document.getElementById(id).innerText = SLOT_SYMS[Math.floor(Math.random()*SLOT_SYMS.length)];
        if (++t >= 14) { clearInterval(iv); document.getElementById(id).innerText = final; onDone(); }
    }, 75);
}
function runSlots(cb) {
    if (slotsSpinning) return;
    slotsSpinning = true;
    const r0=pickSlot(), r1=pickSlot(), r2=pickSlot();
    spinReel('reel-0',r0, ()=>spinReel('reel-1',r1, ()=>spinReel('reel-2',r2, ()=>{
        slotsSpinning=false; cb(r0,r1,r2);
    })));
}

// ============================================================
// МІНИ
// ============================================================
let minesState = null;

function calcMinesMult(opened, mineCount) {
    if (opened===0) return 1.0;
    const maxMult  = 1.0 + mineCount*0.25;
    const progress = opened / (25-mineCount);
    return Math.round((1.0 + (maxMult-1.0)*progress)*100)/100;
}
window.updateMinesCount = () => {
    const n = parseInt(document.getElementById('mines-count').value);
    document.getElementById('mines-count-label').innerText = n;
    document.getElementById('mines-mult-label').innerText  = (1+n*0.25).toFixed(2);
};
function buildMinesGrid() {
    if (!minesState) { document.getElementById('mines-grid').innerHTML=''; return; }
    let h = '';
    for (let i=0;i<25;i++) {
        const cell = minesState.cells[i];
        if (cell.revealed) {
            h += cell.mine
                ? `<div class="mc mc-boom">💣</div>`
                : `<div class="mc mc-safe">💚</div>`;
        } else if (minesState.alive) {
            h += `<div class="mc mc-btn" onclick="minesReveal(${i})">?</div>`;
        } else {
            h += `<div class="mc" style="opacity:.3">·</div>`;
        }
    }
    document.getElementById('mines-grid').innerHTML = h;
}
window.minesReveal = idx => {
    if (!minesState||!minesState.alive) return;
    const cell = minesState.cells[idx];
    cell.revealed = true;
    if (cell.mine) {
        minesState.alive = false;
        minesState.cells.forEach(c => { if(c.mine) c.revealed=true; });
        buildMinesGrid();
        document.getElementById('mines-ctrl').style.display='none';
        const bt = minesState.bet;
        s.b -= bt; save();
        setTimeout(() => {
            document.getElementById('g-stat').innerHTML =
                `<span style="color:var(--error)">-${bt.toFixed(2)} BB 💣</span><br><small>${L('minesBoom')}</small>`;
            minesState=null; buildMinesGrid();
        }, 600);
    } else {
        minesState.opened++;
        const mult = calcMinesMult(minesState.opened, minesState.mineCount);
        minesState.currentMult = mult;
        document.getElementById('mines-curr-mult').innerText = mult.toFixed(2);
        buildMinesGrid();
        if (minesState.opened >= minesState.safeCells) minesCashout();
    }
};
window.minesCashout = () => {
    if (!minesState||!minesState.alive||minesState.opened===0) return;
    const bt=minesState.bet, mult=minesState.currentMult;
    const win = (bt*mult-bt)*(s.p?s.p.m:1);
    s.b+=win; s.x+=Math.floor(bt/2); save(); checkPetLevelUp();
    document.getElementById('g-stat').innerHTML =
        `<span style="color:var(--success)">+${win.toFixed(2)} BB</span><br><small>Забрав x${mult.toFixed(2)} 💰</small>`;
    minesState.alive=false;
    minesState.cells.forEach(c=>c.revealed=true);
    buildMinesGrid();
    document.getElementById('mines-ctrl').style.display='none';
    minesState=null;
};
function startMines(bt) {
    const mineCount = parseInt(document.getElementById('mines-count').value);
    const safeCells = 25-mineCount;
    let pos = Array.from({length:25},(_,i)=>i);
    for (let i=pos.length-1;i>0;i--) {
        const j=Math.floor(Math.random()*(i+1)); [pos[i],pos[j]]=[pos[j],pos[i]];
    }
    const mineSet = new Set(pos.slice(0,mineCount));
    minesState = {
        bet:bt, mineCount, safeCells, opened:0, alive:true, currentMult:1.0,
        cells:Array.from({length:25},(_,i)=>({mine:mineSet.has(i),revealed:false}))
    };
    document.getElementById('mines-curr-mult').innerText='1.00';
    document.getElementById('mines-ctrl').style.display='block';
    document.getElementById('g-stat').innerHTML = `<span style="color:var(--accent)">${L('openCells')}</span>`;
    buildMinesGrid();
}

// ============================================================
// КУБИК
// ============================================================
const DICE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];
let selN_val = 1;

function buildDiceUI() {
    let h = `<div class="dice-display">
        <div id="dice-big" style="transition:transform .15s">${DICE_FACES[selN_val-1]}</div>
        <div style="font-size:10px;color:#8d99ae;font-weight:700;margin-top:6px;letter-spacing:.5px">${L('chosen')}</div>
    </div><div class="dice-grid">`;
    for (let i=1;i<=6;i++)
        h += `<button class="dice-btn${i===selN_val?' dice-sel':''}" onclick="selN(${i})">${DICE_FACES[i-1]}<span>${i}</span></button>`;
    h += `</div>`;
    document.getElementById('ui-dice').innerHTML = h;
}
window.selN = n => {
    selN_val = n; buildDiceUI();
    const big = document.getElementById('dice-big');
    if (big) {
        big.style.transform='scale(.8) rotate(-10deg)';
        setTimeout(()=>big.style.transform='scale(1.1) rotate(5deg)', 80);
        setTimeout(()=>big.style.transform='scale(1) rotate(0)', 160);
    }
};
function rollDiceAnim(onDone) {
    const big = document.getElementById('dice-big');
    if (!big) { onDone(Math.floor(Math.random()*6)+1); return; }
    let t=0;
    const iv = setInterval(() => {
        const r = Math.floor(Math.random()*6);
        big.innerText = DICE_FACES[r];
        big.style.transform = `rotate(${(Math.random()-.5)*30}deg) scale(${.85+Math.random()*.2})`;
        if (++t>12) {
            clearInterval(iv);
            const result = Math.floor(Math.random()*6)+1;
            big.innerText = DICE_FACES[result-1];
            big.style.transform = 'scale(1) rotate(0)';
            onDone(result);
        }
    }, 55);
}

// ============================================================
// ДВЕРІ КЛОУНА
// ============================================================
const CLOWN_MULTS = [1.1, 1.5, 2.0, 2.4];
let clownState = null;

function buildClownUI() {
    const el = document.getElementById('ui-clown');
    if (!el) return;
    if (!clownState) {
        el.innerHTML = `<div class="clown-info">
            <div style="font-size:13px;font-weight:700;color:#8d99ae;margin-bottom:10px">РАУНДИ ТА МНОЖНИКИ</div>
            <div class="clown-rounds-info">
                ${CLOWN_MULTS.map((m,i)=>`<div class="clown-ri">
                    <span>Раунд ${i+1}</span><b style="color:var(--accent)">x${m}</b><small>${5-i} дверей</small>
                </div>`).join('')}
            </div>
            <div style="font-size:11px;color:#8d99ae;margin-top:10px;text-align:center">Натисни ЗРОБИТИ СТАВКУ щоб почати</div>
        </div>`;
        return;
    }
    const {round, alive, doors, betweenRounds} = clownState;
    const totalDoors = 5 - round;
    let doorsHtml = '';
    for (let i=0;i<totalDoors;i++) {
        if (doors[i]==='clown')   doorsHtml+=`<div class="clown-door door-boom">🤡</div>`;
        else if (doors[i]==='ok') doorsHtml+=`<div class="clown-door door-ok">✅</div>`;
        else if (alive)           doorsHtml+=`<div class="clown-door door-closed" onclick="clownPick(${i})">🚪</div>`;
        else                      doorsHtml+=`<div class="clown-door" style="opacity:.3">🚪</div>`;
    }
    const mult = CLOWN_MULTS[round];
    const prevMult = round>0 ? CLOWN_MULTS[round-1] : null;
    const canCashout = round>0 && alive && betweenRounds;
    el.innerHTML = `<div class="clown-game">
        <div class="clown-header">
            <span style="color:#8d99ae;font-size:12px;font-weight:700">${L('round')} ${round+1}/4</span>
            <span style="color:var(--accent);font-weight:800">${L('prize')} x${mult}</span>
        </div>
        <div class="clown-doors">${doorsHtml}</div>
        <div style="font-size:11px;color:#8d99ae;text-align:center;margin-top:8px">${L('chooseDoor')}</div>
        ${canCashout?`<button class="btn" style="background:var(--success);margin-top:10px;padding:11px;font-size:13px" onclick="clownCashout()">${L('take')} x${prevMult}</button>`:''}
    </div>`;
}
window.clownPick = idx => {
    if (!clownState||!clownState.alive) return;
    clownState.betweenRounds = false;
    const {round, bet} = clownState;
    const totalDoors = 5-round;
    const clownDoor  = Math.floor(Math.random()*totalDoors);
    clownState.doors[idx] = (idx===clownDoor) ? 'clown' : 'ok';
    if (idx===clownDoor) {
        clownState.alive=false; buildClownUI();
        s.b-=bet; save();
        setTimeout(()=>{
            document.getElementById('g-stat').innerHTML =
                `<span style="color:var(--error)">-${bet.toFixed(2)} BB 🤡</span><br><small>${L('clownBoom')}</small>`;
            clownState=null; buildClownUI();
        }, 800);
    } else {
        if (round>=3) {
            const mult=CLOWN_MULTS[3], bon=s.p?s.p.m:1;
            const win=(bet*mult-bet)*bon;
            s.b+=win; s.x+=Math.floor(bet/2); save(); checkPetLevelUp();
            document.getElementById('g-stat').innerHTML =
                `<span style="color:var(--success)">+${win.toFixed(2)} BB 🎉</span><br><small>${L('allRounds')} x${mult}</small>`;
            clownState.alive=false; buildClownUI();
            setTimeout(()=>{clownState=null; buildClownUI();}, 1500);
        } else {
            clownState.round++; clownState.doors={}; clownState.betweenRounds=true;
            buildClownUI();
        }
    }
};
window.clownCashout = () => {
    if (!clownState||!clownState.alive) return;
    const {bet,round} = clownState;
    const mult = CLOWN_MULTS[round-1], bon=s.p?s.p.m:1;
    const win  = (bet*mult-bet)*bon;
    s.b+=win; s.x+=Math.floor(bet/2); save(); checkPetLevelUp();
    document.getElementById('g-stat').innerHTML =
        `<span style="color:var(--success)">+${win.toFixed(2)} BB 💰</span><br><small>${L('take')} x${mult}</small>`;
    clownState=null; buildClownUI();
};
function startClown(bt) {
    clownState = {bet:bt, round:0, alive:true, betweenRounds:false, doors:{}};
    document.getElementById('g-stat').innerHTML = `<span style="color:#f59e0b">${L('chooseDoor')}</span>`;
    buildClownUI();
}

// ============================================================
// КЛОУНСЬКИЙ ТИР (КУЛЬКА)
// ============================================================
const BALLOON_MAX = 15;
let balloonState = null;

function buildBalloonUI() {
    const el = document.getElementById('ui-balloon');
    if (!el) return;
    if (!balloonState) {
        el.innerHTML = `<div style="text-align:center;padding:10px 0">
            <div style="font-size:11px;color:#8d99ae;font-weight:700;margin-bottom:8px">ЗА КОЖНЕ ЛОПАННЯ +x0.1</div>
            <div style="font-size:11px;color:#8d99ae">Макс. ${BALLOON_MAX} лопань · Кулька може луснути будь-коли</div>
            <div style="font-size:11px;color:#8d99ae;margin-top:4px">Макс. приз: <b style="color:var(--accent)">x${(1+BALLOON_MAX*0.1).toFixed(1)}</b></div>
        </div>`;
        return;
    }
    const {pops, alive} = balloonState;
    const mult = (1+pops*0.1).toFixed(1);
    const size = Math.min(80+pops*8, 180);
    const col  = pops<5?'#ef4444':pops<10?'#f97316':'#dc2626';
    el.innerHTML = `<div class="balloon-game">
        <div class="balloon-mult">x${mult}</div>
        <div id="balloon-el" class="balloon-ball${!alive?' balloon-burst':''}"
             style="width:${size}px;height:${size}px;background:radial-gradient(circle at 35% 35%,${col}cc,${col});${alive?'cursor:pointer':''}"
             ${alive?'onclick="balloonPop()"':''}>${alive?'👆':'💥'}</div>
        <div style="font-size:11px;color:#8d99ae;margin-top:8px">Лопань: ${pops}</div>
        ${alive&&pops>0?`<button class="btn" style="background:var(--success);margin-top:10px;padding:11px;font-size:13px" onclick="balloonCashout()">${L('take')} x${mult}</button>`:''}
    </div>`;
}
window.balloonPop = () => {
    if (!balloonState||!balloonState.alive) return;
    balloonState.pops++;
    if (balloonState.pops >= balloonState.burstAt || balloonState.pops >= BALLOON_MAX) {
        balloonState.alive=false; buildBalloonUI();
        const bt=balloonState.bet; s.b-=bt; save();
        setTimeout(()=>{
            document.getElementById('g-stat').innerHTML =
                `<span style="color:var(--error)">-${bt.toFixed(2)} BB 💥</span><br><small>${L('balloonBoom')}</small>`;
            balloonState=null; buildBalloonUI();
        }, 700);
    } else {
        const el=document.getElementById('balloon-el');
        if(el){el.style.transform='scale(1.15)';setTimeout(()=>el.style.transform='scale(1)',150);}
        buildBalloonUI();
    }
};
window.balloonCashout = () => {
    if (!balloonState||!balloonState.alive||balloonState.pops===0) return;
    const {bet,pops}=balloonState, mult=1+pops*0.1, bon=s.p?s.p.m:1;
    const win=(bet*mult-bet)*bon;
    s.b+=win; s.x+=Math.floor(bet/2); save(); checkPetLevelUp();
    document.getElementById('g-stat').innerHTML =
        `<span style="color:var(--success)">+${win.toFixed(2)} BB 🎈</span><br><small>Забрав x${mult.toFixed(1)}</small>`;
    balloonState=null; buildBalloonUI();
};
function startBalloon(bt) {
    balloonState = { bet:bt, pops:0, burstAt:Math.floor(Math.random()*BALLOON_MAX)+1, alive:true };
    document.getElementById('g-stat').innerHTML = `<span style="color:#f59e0b">${L('tapBalloon')}</span>`;
    buildBalloonUI();
}

// ============================================================
// CANVAS КАРТОЧКИ ДЛЯ КЕЙСІВ
// ============================================================
const RARITY_GLOW = {
    'Звичайний':'#94a3b8','Незвичайний':'#3b82f6','Рідкісний':'#a855f7',
    'Епічний':'#f59e0b','Легендарний':'#f43f5e','Міфічний':'#bf40bf','Смехуятина':'#ff6b35',
};
function drawPetCard(canvas, pet) {
    const ctx=canvas.getContext('2d'), W=canvas.width, H=canvas.height;
    ctx.clearRect(0,0,W,H);
    const glow=RARITY_GLOW[pet.r]||'#94a3b8';
    const bg=ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#1a1f2e'); bg.addColorStop(1,'#0d1117');
    ctx.fillStyle=bg; roundRect(ctx,0,0,W,H,12); ctx.fill();
    ctx.strokeStyle=glow; ctx.lineWidth=2;
    ctx.shadowColor=glow; ctx.shadowBlur=8;
    roundRect(ctx,1,1,W-2,H-2,12); ctx.stroke(); ctx.shadowBlur=0;
    ctx.font=`${Math.floor(H*.45)}px serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(pet.s, W/2, H*.42);
    ctx.font=`bold ${Math.floor(H*.13)}px system-ui`;
    ctx.fillStyle='#fff'; ctx.textBaseline='alphabetic';
    ctx.fillText(pet.n.length>8?pet.n.slice(0,8)+'…':pet.n, W/2, H*.78);
    ctx.font=`bold ${Math.floor(H*.1)}px system-ui`;
    ctx.fillStyle=glow;
    ctx.fillText(pet.r, W/2, H*.92);
}
function roundRect(ctx,x,y,w,h,r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

// ============================================================
// КУПИТИ КЕЙС
// ============================================================
window.buyCase = k => {
    const c=CASES[k];
    if (s.b<c.p) return alert('Мало BB!');
    s.b-=c.p; save();
    document.getElementById('case-modal').style.display='flex';
    let rand=Math.random()*100, win, cur=0;
    for (const p of c.drop) { cur+=p.w; if(rand<=cur){win={...p};break;} }
    const CARD_W=90, COUNT=55, WIN_IDX=40;
    const pool=[]; for(const key in CASES) pool.push(...CASES[key].drop);
    const scr=document.getElementById('case-scroll');
    scr.innerHTML=''; scr.style.transition='none'; scr.style.left='0px';
    const items=[];
    for (let i=0;i<COUNT;i++) items.push(i===WIN_IDX?win:pool[Math.floor(Math.random()*pool.length)]);
    items.forEach(pet=>{
        const cv=document.createElement('canvas');
        cv.width=84; cv.height=104;
        cv.style.cssText='display:block;margin:3px;border-radius:12px;flex-shrink:0';
        scr.appendChild(cv); drawPetCard(cv,pet);
    });
    setTimeout(()=>{
        scr.style.transition='5s cubic-bezier(0.05,0,0.1,1)';
        scr.style.left=`-${WIN_IDX*CARD_W-(window.innerWidth/2-CARD_W/2)}px`;
    },50);
    const resEl=document.getElementById('case-res');
    const closeEl=document.getElementById('case-close');
    setTimeout(()=>{
        const bigCv=document.createElement('canvas');
        bigCv.width=160; bigCv.height=196;
        bigCv.style.cssText='border-radius:16px;display:block;margin:0 auto 10px';
        drawPetCard(bigCv,win); resEl.innerHTML=''; resEl.appendChild(bigCv);
        const label=document.createElement('div');
        label.innerHTML=`<span style="color:${RARITY_GLOW[win.r]||'#fff'};font-size:20px;font-weight:900">${win.n}</span><br><small style="color:#8d99ae">${win.r} · x${win.m.toFixed(3)}</small>`;
        resEl.appendChild(label); closeEl.style.display='block';
        win.id=Date.now(); win.lvl=1; s.inv.push(win); save();
    },5600);
};
window.closeCase = () => {
    document.getElementById('case-modal').style.display='none';
    document.getElementById('case-close').style.display='none';
    document.getElementById('case-res').innerText='';
};

// ============================================================
// updUI + play
// ============================================================
window.updUI = () => {
    const g=document.getElementById('g-sel').value;
    ['dice','wheel','slots','mines','bj','clown','balloon'].forEach(id=>{
        const el=document.getElementById('ui-'+id);
        if(el) el.style.display=(g===id)?'block':'none';
    });
    if(g==='dice')    buildDiceUI();
    if(g==='wheel')   setTimeout(()=>drawWheel(wheelAngle),50);
    if(g==='mines')   updateMinesCount();
    if(g==='clown')   buildClownUI();
    if(g==='balloon') buildBalloonUI();
};

window.play = () => {
    const bt=parseFloat(document.getElementById('bet-a').value);
    if(isNaN(bt)||bt<=0||bt>s.b) return alert('Мало BB!');
    const g=document.getElementById('g-sel').value;
    const now=Date.now();

    // Перевірка лімітованих ігор
    if ((g==='clown'||g==='balloon') && now>DEADLINE_CLOWN)
        return alert(L('expired'));
    if(g==='mines'&&minesState&&minesState.alive) return alert('Спочатку завершуй гру!');
    if(g==='clown'&&clownState&&clownState.alive) return alert('Спочатку завершуй гру!');
    if(g==='balloon'&&balloonState&&balloonState.alive) return alert('Спочатку завершуй гру!');

    document.getElementById('g-stat').innerText=L('waiting');

    if(g==='f50'){
        const w=Math.random()>.5; let ticks=0;
        document.getElementById('g-stat').innerHTML=
            '<div id="coin-anim" style="font-size:56px;display:inline-block;transition:transform .08s">🪙</div>';
        const iv=setInterval(()=>{
            const coin=document.getElementById('coin-anim');
            if(coin){
                coin.innerText=ticks%2===0?'✅':'❌';
                const sc=0.7+Math.abs(Math.sin(ticks*.45))*.5, rot=ticks%2===0?-15:15;
                coin.style.transform=`scale(${sc}) rotate(${rot}deg)`;
            }
            if(++ticks>16){
                clearInterval(iv);
                const coin2=document.getElementById('coin-anim');
                if(coin2){ coin2.innerText=w?'✅':'❌'; coin2.style.transform='scale(1.2)'; setTimeout(()=>coin2.style.transform='scale(1)',150); }
                setTimeout(()=>res(w,bt,1.55,w?L('win'):L('lose')),200);
            }
        },70);
    } else if(g==='dice'){
        rollDiceAnim(r=>res(r===selN_val,bt,2.05,`Випало ${r}`));
    } else if(g==='wheel'){
        if(wheelSpinning) return;
        let p=Math.random()*100, m;
        if(p<50)m=0; else if(p<75)m=1.4; else if(p<95)m=1.6; else m=999;
        spinWheel(m,()=>{
            if(m===999){
                const trash={n:'Смітник',s:'🗑️',r:'Легендарний',m:1.35,w:0,c:'#f43f5e',id:Date.now(),lvl:1};
                s.inv.push(trash); save();
                document.getElementById('g-stat').innerHTML=
                    `<span style="color:#8b5cf6">🎉 Ти виграв 🗑️ Смітник!</span><br><small>Перевір інвентар</small>`;
                showToast('🗑️ <b>Смітник</b> додано в інвентар!');
            } else { res(m>0,bt,m,`Множник x${m}`); }
        });
    } else if(g==='slots'){
        if(slotsSpinning) return;
        document.getElementById('g-stat').innerText=L('spinning');
        runSlots((a,b,c)=>res(slotMult(a,b,c)>0,bt,slotMult(a,b,c),`${a} ${b} ${c}`));
    } else if(g==='mines'){ startMines(bt); return;
    } else if(g==='clown'){ startClown(bt); return;
    } else if(g==='balloon'){ startBalloon(bt); return;
    } else if(g==='bj') startBJ(bt);
};

function res(win,bt,m,msg) {
    const bon=s.p?s.p.m:1;
    if(win){
        const w=(bt*m-bt)*bon;
        s.b+=w; s.x+=Math.floor(bt/2);
        document.getElementById('g-stat').innerHTML=
            `<span style="color:var(--success)">+${w.toFixed(2)} BB</span><br><small>${msg}</small>`;
        checkPetLevelUp();
    } else {
        s.b-=bt;
        document.getElementById('g-stat').innerHTML=
            `<span style="color:var(--error)">-${bt.toFixed(2)} BB</span><br><small>${msg}</small>`;
    }
    save();
}

// ============================================================
// БЛЕКДЖЕК
// ============================================================
let bj=null;
function dr(){ return Math.floor(Math.random()*10)+2; }
function startBJ(bt){ bj={p:[dr(),dr()],d:[dr()],bt}; document.getElementById('bj-ctrl').style.display='flex'; reBJ(); }
function reBJ(){
    const card=n=>`<div class="bj-card">${n}</div>`;
    document.getElementById('bj-pc').innerHTML=bj.p.map(card).join('');
    document.getElementById('bj-dc').innerHTML=bj.d.map(card).join('');
    if(bj.p.reduce((a,b)=>a+b,0)>21){res(false,bj.bt,0,'Перебір!');endBJ();}
}
window.bjDo=a=>{
    if(a==='hit'){ bj.p.push(dr()); reBJ(); }
    else {
        while(bj.d.reduce((a,b)=>a+b,0)<17) bj.d.push(dr()); reBJ();
        const ps=bj.p.reduce((a,b)=>a+b,0), ds=bj.d.reduce((a,b)=>a+b,0);
        const w=ds>21||ps>ds; res(w,bj.bt,2,w?'Виграш!':'Програш'); endBJ();
    }
};
function endBJ(){ document.getElementById('bj-ctrl').style.display='none'; }

// ============================================================
// ЛІДЕРИ
// ============================================================
function loadTop(){
    db.ref('players').once('value',snap=>{
        let l=[]; snap.forEach(c=>{const v=c.val();if(v.name)l.push(v);});
        l.sort((a,b)=>b.b-a.b);
        document.getElementById('leaderboard').innerHTML=l.slice(0,10).map((p,i)=>`
            <div class="market-item">
                <span>${['🥇','🥈','🥉'][i]||`${i+1}.`} ${p.name}</span>
                <b style="color:var(--accent)">${Math.floor(p.b)} BB</b>
            </div>`).join('');
    });
}

// ============================================================
// АДМІНКА
// ============================================================
window.setAdminTab=t=>{currentAdminTab=t;adminInvUserId=null;loadAdmin();};
function loadAdmin(){
    if(currentAdminTab==='inv'&&adminInvUserId){loadAdminUserInv(adminInvUserId,adminInvUserName);return;}
    db.ref('players').once('value',snap=>{
        let tabs=`<div class="admin-tabs">
            <div class="a-tab ${currentAdminTab==='balance'?'active':''}" onclick="setAdminTab('balance')">💰 Баланс</div>
            <div class="a-tab ${currentAdminTab==='pets'?'active':''}" onclick="setAdminTab('pets')">🐾 Пети</div>
            <div class="a-tab ${currentAdminTab==='inv'?'active':''}" onclick="setAdminTab('inv')">🎒 Інвентар</div>
        </div>`;
        let h=tabs;
        snap.forEach(c=>{
            const p=c.val(),uid=c.key;
            h+=`<div class="admin-card"><b>${p.name||'Анонім'}</b> <small style="color:#8d99ae">${(p.b||0).toFixed(2)} BB</small>`;
            if(currentAdminTab==='balance'){
                h+=`<div class="admin-ctrl-grid">
                    <button class="btn-ctrl b-add" onclick="mathB('${uid}','add')">+ Додати</button>
                    <button class="btn-ctrl b-sub" onclick="mathB('${uid}','sub')">− Мінус</button>
                    <button class="btn-ctrl b-set" onclick="mathB('${uid}','set')">Задати</button>
                </div>`;
            } else if(currentAdminTab==='pets'){
                h+=`<button class="btn" style="padding:8px;font-size:12px;margin-top:8px;background:#8b5cf6" onclick="adminGivePet('${uid}')">🎁 Подарувати пета</button>`;
            } else {
                h+=`<br><small style="color:#8d99ae">Петів: ${(p.inv||[]).length}</small>
                <button class="btn" style="padding:8px;font-size:12px;margin-top:8px;background:#1c4a8a" onclick="openAdminInv('${uid}','${(p.name||'Анонім').replace(/'/g,"\\'")}')">🎒 Переглянути</button>`;
            }
            h+=`</div>`;
        });
        document.getElementById('admin-list').innerHTML=h;
    });
}
window.openAdminInv=(uid,name)=>{adminInvUserId=uid;adminInvUserName=name;loadAdminUserInv(uid,name);};
function loadAdminUserInv(uid,name){
    db.ref('players/'+uid).once('value',snap=>{
        const p=snap.val(),inv=(p&&p.inv)?p.inv:[];
        let h=`<div class="admin-tabs">
            <div class="a-tab" onclick="setAdminTab('balance')">💰</div>
            <div class="a-tab" onclick="setAdminTab('pets')">🐾</div>
            <div class="a-tab active">🎒</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <button class="btn-s" onclick="adminInvUserId=null;loadAdmin()" style="font-size:15px;padding:8px 14px">← Назад</button>
            <div><b>${name}</b> <small style="color:#8d99ae">(${inv.length} петів)</small></div>
        </div>`;
        if(!inv.length){
            h+=`<div class="admin-card" style="text-align:center;color:#8d99ae;padding:20px">Порожньо</div>`;
        } else {
            inv.forEach((pet,idx)=>{
                const eq=p.p&&p.p.id===pet.id;
                h+=`<div class="admin-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px">
                    <div style="display:flex;align-items:center;gap:10px">
                        <span style="font-size:28px">${pet.s}</span>
                        <div>
                            <div style="font-weight:bold">${pet.n}${eq?' <span style="font-size:10px;background:var(--success);padding:1px 5px;border-radius:4px">Активний</span>':''}</div>
                            <div style="font-size:11px;color:${pet.c}">${pet.r} · x${pet.m.toFixed(3)} · LVL ${pet.lvl||1}</div>
                        </div>
                    </div>
                    <button class="btn-ctrl b-sub" onclick="adminRemovePet('${uid}',${idx},'${name}')">🗑</button>
                </div>`;
            });
        }
        document.getElementById('admin-list').innerHTML=h;
    });
}
window.adminRemovePet=(uid,idx,name)=>{
    db.ref('players/'+uid).once('value',snap=>{
        const p=snap.val(); let inv=p.inv?[...p.inv]:[];
        const pet=inv[idx];
        if(!pet) return alert('Не знайдено!');
        if(!confirm(`Видалити ${pet.s} ${pet.n} у ${name}?`)) return;
        if(p.p&&p.p.id===pet.id) db.ref('players/'+uid+'/p').set(null);
        inv.splice(idx,1);
        db.ref('players/'+uid+'/inv').set(inv).then(()=>loadAdminUserInv(uid,name));
    });
};
window.mathB=(id,type)=>{
    let v=prompt('Сума:'); if(!v||isNaN(v)) return;
    v=Number(v); const ref=db.ref('players/'+id+'/b');
    if(type==='add') ref.transaction(c=>(c||0)+v);
    else if(type==='sub') ref.transaction(c=>(c||0)-v);
    else ref.set(v);
    setTimeout(loadAdmin,500);
};
window.adminGivePet=tid=>{
    let unique=[],seen=new Set();
    for(const k in CASES) CASES[k].drop.forEach(p=>{if(!seen.has(p.n)){unique.push(p);seen.add(p.n);}});
    ADMIN_ONLY_PETS.forEach(p=>{if(!seen.has(p.n)){unique.push(p);seen.add(p.n);}});
    const list=unique.map((p,i)=>`${i}: ${p.s} ${p.n} (${p.r})`).join('\n');
    const ch=prompt(list);
    if(ch!==null&&unique[ch]){
        const p={...unique[ch],id:Date.now(),lvl:1};
        db.ref('players/'+tid+'/inv').once('value',sn=>{
            const inv=sn.val()||[]; inv.push(p); db.ref('players/'+tid+'/inv').set(inv);
        });
        alert(`Видано: ${unique[ch].s} ${unique[ch].n}!`);
    }
};

// ============================================================
// НАЛАШТУВАННЯ
// ============================================================
function renderSettings(){
    const el=document.getElementById('settings-body');
    if(!el) return;
    const themeHtml=Object.entries(THEMES).map(([k,t])=>`
        <div class="sett-card${currentTheme===k?' sett-active':''}" onclick="pickTheme('${k}')">
            <span>${t.name}</span>
            <div class="sett-dot" style="background:${t.a}"></div>
        </div>`).join('');
    const langHtml=[['uk','🇺🇦 Українська'],['en','🇬🇧 English'],['ru','🇷🇺 Русский']].map(([k,n])=>`
        <div class="sett-card${currentLang===k?' sett-active':''}" onclick="pickLang('${k}')">
            <span>${n}</span>
            ${currentLang===k?'<span style="color:var(--accent)">✓</span>':''}
        </div>`).join('');
    el.innerHTML=`
        <div class="glass">
            <div class="sett-section-title">${L('theme')}</div>
            <div class="sett-grid">${themeHtml}</div>
        </div>
        <div class="glass">
            <div class="sett-section-title">${L('lang')}</div>
            <div class="sett-list">${langHtml}</div>
        </div>`;
}
window.pickTheme=k=>{applyTheme(k);renderSettings();showToast(L('saved'));};
window.pickLang=k=>{applyLang(k);renderSettings();showToast(L('saved'));};

// ============================================================
// СТАРТ
// ============================================================
applyTheme(currentTheme);
updUI();
