// --- КОНФІГУРАЦІЯ FIREBASE ---
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
const db = firebase.database();
const tg = window.Telegram.WebApp;

// --- НАЛАШТУВАННЯ ТА ДАНІ ---
const ADMINS = [8216362223, 2067230442];
const myId = tg.initDataUnsafe?.user?.id || 101; 
const myName = tg.initDataUnsafe?.user?.first_name || "Гравець";
const DEADLINE = new Date("2026-04-04T00:00:00+03:00").getTime();

const CASES = {
    basic: { n: "Common Case 🐾", p: 285, drop: [
        {n:'Собака', s:'🐶', r:'Звичайний', m:1.05, w:40, c:'#94a3b8'},
        {n:'Кіт', s:'🐱', r:'Звичайний', m:1.05, w:40, c:'#94a3b8'},
        {n:'Кролик', s:'🐰', r:'Незвичайний', m:1.08, w:20, c:'#3b82f6'}
    ]},
    uncommon: { n: "Rare Case 🌟", p: 525, drop: [
        {n:'Кролик', s:'🐰', r:'Незвичайний', m:1.08, w:46, c:'#3b82f6'},
        {n:'Лисиця', s:'🦊', r:'Незвичайний', m:1.09, w:40, c:'#3b82f6'},
        {n:'Вовк', s:'🐺', r:'Рідкісний', m:1.11, w:14, c:'#a855f7'}
    ]},
    rare: { n: "Epic Case 💎", p: 875, drop: [
        {n:'Вовк', s:'🐺', r:'Рідкісний', m:1.11, w:50, c:'#a855f7'},
        {n:'Бджола', s:'🐝', r:'Рідкісний', m:1.12, w:40, c:'#a855f7'},
        {n:'Панда', s:'🐼', r:'Епічний', m:1.14, w:10, c:'#f59e0b'}
    ]},
    legend: { n: "Legendary Case 👑", p: 1200, drop: [
        {n:'Панда', s:'🐼', r:'Епічний', m:1.14, w:56, c:'#f59e0b'},
        {n:'Лев', s:'🦁', r:'Легендарний', m:1.16, w:24, c:'#f43f5e'},
        {n:'Дракон', s:'🐲', r:'Легендарний', m:1.17, w:20, c:'#f43f5e'}
    ]},
    ocean: { n: "Ocean Case 🌊", p: 1500, limited: true, drop: [
        {n:'Рибка', s:'🐟', r:'Рідкісний', m:1.16, w:45, c:'#a855f7'},
        {n:'Тропічна рибка', s:'🐠', r:'Епічний', m:1.19, w:35, c:'#f59e0b'},
        {n:'Акула', s:'🦈', r:'Легендарний', m:1.23, w:15, c:'#f43f5e'},
        {n:'Восьминіг', s:'🐙', r:'Міфічний', m:1.3, w:5, c:'#bf40bf'}
    ]}
};

let s = { b: 0, x: 0, r: 1, name: myName, p: null, inv: [], v: 3.1 };
let currentShopTab = 'cases';
let currentAdminTab = 'balance';
let adminInvUserId = null;
let adminInvUserName = '';
let selN_val = 1;

// --- БАЗОВА ЛОГІКА ---
db.ref('players/' + myId).on('value', snap => {
    let d = snap.val();
    if(d) { s = d; if(!s.inv) s.inv = []; } 
    else { db.ref('players/' + myId).set(s); }
    ren();
});
function save() { db.ref('players/' + myId).set(s); }

function ren() {
    let disp = Number.isInteger(s.b) ? s.b : s.b.toFixed(2);
    document.getElementById('bal-val').innerText = disp;
    document.getElementById('u-rank').innerText = "РАНГ: " + s.r;
    document.getElementById('xp-f').style.width = Math.min((s.x/(s.r*1000)*100), 100) + "%";
    
    if(s.p) {
        document.getElementById('p-img').innerText = s.p.s;
        document.getElementById('p-name').innerText = s.p.n;
        document.getElementById('p-m').innerText = s.p.m.toFixed(2);
        document.getElementById('p-l').innerText = s.p.lvl || 1;
        let t = document.getElementById('p-rarity'); 
        t.innerText = s.p.r; t.style.background = s.p.c;
    }
    if(ADMINS.includes(Number(myId))) document.getElementById('admin-tab').style.display = 'block';
}

window.tab = (t, el) => {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.nav-tab').forEach(n => n.classList.remove('active'));
    document.getElementById('v-'+t).style.display = 'block';
    el.classList.add('active');
    if(t === 'shop') renderShop();
    if(t === 'inv') renderInv();
    if(t === 'top') loadTop();
    if(t === 'admin') loadAdmin();
};

// --- МАГАЗИН ТА РИНОК ---
window.setShopTab = (t) => { currentShopTab = t; renderShop(); };

function renderShop() {
    let list = document.getElementById('shop-list');
    let tabs = `<div class="shop-tabs">
        <div class="s-tab ${currentShopTab==='cases'?'active':''}" onclick="setShopTab('cases')">📦 Кейси</div>
        <div class="s-tab ${currentShopTab==='market'?'active':''}" onclick="setShopTab('market')">🛒 Ринок</div>
    </div>`;

    if(currentShopTab === 'cases') {
        let h = tabs; const now = Date.now();
        for(let k in CASES) {
            const c = CASES[k];
            if(c.limited && now > DEADLINE) continue;
            
            let badge = c.limited ? `<span class="badge-ltd">Лімітовано</span>` : "";
            let chancesHtml = c.drop.map(p => `<span style="color:${p.c}">${p.s} ${p.w}%</span>`).join(' • ');

            let timerHtml = "";
            if(c.limited) {
                let diff = DEADLINE - now;
                let d = Math.floor(diff / (1000 * 60 * 60 * 24));
                let hr = Math.floor((diff / (1000 * 60 * 60)) % 24);
                timerHtml = `<div class="case-timer">⏳ Залишилось: ${d}д ${hr}г</div>`;
            }

            h += `
            <div class="shop-card">
                <div class="case-info">
                    <div class="case-name">${c.n} ${badge}</div>
                    <div style="font-size:10px; margin:4px 0; opacity:0.8; font-weight:bold">${chancesHtml}</div>
                    ${timerHtml}
                </div>
                <button class="btn-s" style="background:var(--accent); min-width:85px" onclick="buyCase('${k}')">${c.p} BB</button>
            </div>`;
        }
        list.innerHTML = h;
    } else {
        list.innerHTML = tabs + '<div id="m-list" class="glass">Завантаження ринку...</div>';
        db.ref('market').on('value', snap => {
            let h = "";
            snap.forEach(child => {
                let lot = child.val();
                if(lot.sellerId == myId) return;
                h += `<div class="market-item">
                    <div><span style="color:${lot.pet.c}">${lot.pet.s} ${lot.pet.n}</span><br><small>Від: ${lot.sellerName}</small></div>
                    <button class="btn-s" style="background:var(--success)" onclick="buyFromMarket('${child.key}')">${lot.price} BB</button>
                </div>`;
            });
            document.getElementById('m-list').innerHTML = h || "На ринку порожньо";
        });
    }
}

window.buyFromMarket = (lotId) => {
    db.ref('market/' + lotId).once('value', snap => {
        let lot = snap.val();
        if(!lot || s.b < lot.price) return alert("Помилка купівлі!");
        s.b -= lot.price; s.inv.push(lot.pet); save();
        db.ref('players/' + lot.sellerId + '/b').transaction(c => (c || 0) + lot.price);
        db.ref('market/' + lotId).remove();
        alert("Куплено!");
    });
};

window.listOnMarket = (petId) => {
    if(s.p && s.p.id === petId) return alert("Зніми пета!");
    let pr = prompt("Ціна продажу (BB):");
    if(!pr || isNaN(pr) || pr <= 0) return;
    let idx = s.inv.findIndex(p => p.id === petId);
    let pet = s.inv[idx];
    db.ref('market').push({ pet, price: Number(pr), sellerId: myId, sellerName: myName }).then(() => {
        s.inv.splice(idx, 1); save(); renderInv();
    });
};

// --- ІНВЕНТАР ---
function renderInv() {
    let h = "";
    s.inv.forEach(p => {
        let isEq = s.p && s.p.id === p.id;
        h += `<div class="market-item">
            <div><span style="color:${p.c}">${p.s} ${p.n}</span><br><small>Бонус: x${p.m.toFixed(2)}</small></div>
            <div style="display:flex; gap:5px">
                <button class="btn-s" onclick="equip(${p.id})">${isEq?'✅':'ВЗЯТИ'}</button>
                <button class="btn-s" style="background:var(--purple)" onclick="listOnMarket(${p.id})">🏪</button>
            </div>
        </div>`;
    });
    document.getElementById('inv-list').innerHTML = h || "Інвентар порожній";
}
window.equip = (id) => { s.p = s.inv.find(i => i.id === id); save(); renderInv(); };

// --- ГЕЙМПЛЕЙ ---
window.updUI = () => {
    let g = document.getElementById('g-sel').value;
    document.getElementById('ui-dice').style.display = (g==='dice')?'block':'none';
    document.getElementById('ui-wheel').style.display = (g==='wheel')?'block':'none';
    document.getElementById('ui-bj').style.display = (g==='bj')?'block':'none';
    if(g==='dice'){
        let h=""; for(let i=1;i<=6;i++) h+=`<button class="btn-s ${i===selN_val?'active':''}" style="padding:15px; margin:2px" onclick="selN(${i})">${i}</button>`;
        document.querySelector('.dice-grid').innerHTML=h;
    }
};
window.selN=(n)=>{ selN_val=n; updUI(); };

window.play = () => {
    let bt = parseFloat(document.getElementById('bet-a').value);
    if(bt > s.b || bt <= 0 || isNaN(bt)) return alert("Мало BB!");
    let g = document.getElementById('g-sel').value;
    document.getElementById('g-stat').innerText = "⏳ Очікування...";

    if(g==='f50'){ let w=Math.random()>0.5; res(w, bt, 1.55, w?"Виграв!":"Програв"); }
    else if(g==='dice'){ let r=Math.floor(Math.random()*6)+1; res(r===selN_val, bt, 2.05, `Випало ${r}`); }
    else if(g==='wheel'){
        let wh = document.getElementById('w-obj'); wh.style.transition="none"; wh.style.transform="rotate(0deg)";
        let p = Math.random()*100; let m, deg;
        if(p<55){ m=0; deg=Math.random()*198; }
        else if(p<80){ m=1.4; deg=198+Math.random()*90; }
        else if(p<95){ m=1.6; deg=288+Math.random()*54; }
        else { m=1.8; deg=342+Math.random()*18; }
        setTimeout(()=>{
            wh.style.transition="transform 4s cubic-bezier(0.1, 0, 0.1, 1)";
            wh.style.transform=`rotate(${1800+(360-deg)}deg)`;
            setTimeout(()=>res(m>0, bt, m, `Множник x${m}`), 4100);
        }, 50);
    }
    else if(g==='bj') startBJ(bt);
};

function res(win, bt, m, msg) {
    let bon = s.p ? s.p.m : 1;
    if(win) {
        let winAmount = (bt * m - bt) * bon;
        s.b += winAmount; s.x += Math.floor(bt/2);
        document.getElementById('g-stat').innerHTML = `<span style="color:var(--success)">+${winAmount.toFixed(2)} BB</span><br><small>${msg}</small>`;
    } else {
        s.b -= bt;
        document.getElementById('g-stat').innerHTML = `<span style="color:var(--error)">-${bt.toFixed(2)} BB</span><br><small>${msg}</small>`;
    }
    save();
}

// --- КЕЙСИ ---
window.buyCase = (k) => {
    let c = CASES[k]; if(s.b < c.p) return alert("Мало BB!");
    s.b -= c.p; save();
    document.getElementById('case-modal').style.display='flex';
    let rand = Math.random()*100; let win, cur=0;
    for(let p of c.drop){ cur+=p.w; if(rand<=cur){ win={...p}; break; } }
    let scr = document.getElementById('case-scroll');
    let pool = []; for(let key in CASES) pool.push(...CASES[key].drop);
    let h = ""; for(let i=0; i<55; i++){
        let it = (i===40)?win:pool[Math.floor(Math.random()*pool.length)];
        h += `<div class="case-item">${it.s}</div>`;
    }
    scr.innerHTML=h; scr.style.transition="0s"; scr.style.left="0px";
    setTimeout(()=>{
        scr.style.transition="5s cubic-bezier(0.1, 0, 0.1, 1)";
        scr.style.left = `-${40*90 - (window.innerWidth/2 - 45)}px`;
    }, 50);
    setTimeout(()=>{
        document.getElementById('case-res').innerHTML=`<span style="color:${win.c}">${win.n}</span>`;
        document.getElementById('case-close').style.display='block';
        win.id=Date.now(); win.lvl=1; s.inv.push(win); save();
    }, 5600);
};
window.closeCase=()=>{ document.getElementById('case-modal').style.display='none'; document.getElementById('case-close').style.display='none'; document.getElementById('case-res').innerText=''; };

// --- АДМІНКА (ТАБИ + ФУНКЦІЇ) ---
window.setAdminTab = (t) => { currentAdminTab = t; loadAdmin(); };

function loadAdmin() {
    if(currentAdminTab === 'inv' && adminInvUserId) {
        loadAdminUserInv(adminInvUserId, adminInvUserName);
        return;
    }
    db.ref('players').once('value', snap => {
        let tabs = `<div class="admin-tabs">
            <div class="a-tab ${currentAdminTab==='balance'?'active':''}" onclick="setAdminTab('balance')">💰 Баланс</div>
            <div class="a-tab ${currentAdminTab==='pets'?'active':''}" onclick="setAdminTab('pets')">🐾 Пети</div>
            <div class="a-tab ${currentAdminTab==='inv'?'active':''}" onclick="setAdminTab('inv')">🎒 Інвентар</div>
        </div>`;
        let h = tabs;
        snap.forEach(c => {
            let p = c.val(); let uid = c.key;
            h += `<div class="admin-card">
                <b>${p.name || 'Анонім'}</b><br>Баланс: ${p.b.toFixed(2)} BB`;
            if(currentAdminTab === 'balance') {
                h += `<div class="admin-ctrl-grid">
                    <button class="btn-ctrl b-add" onclick="mathB('${uid}', 'add')">+ Додати</button>
                    <button class="btn-ctrl b-sub" onclick="mathB('${uid}', 'sub')">- Мінус</button>
                    <button class="btn-ctrl b-set" onclick="mathB('${uid}', 'set')">Задати</button>
                </div>`;
            } else if(currentAdminTab === 'pets') {
                h += `<button class="btn" style="padding:8px; font-size:12px; margin-top:10px; background:var(--purple)" onclick="adminGivePet('${uid}')">🎁 Подарувати пета</button>`;
            } else if(currentAdminTab === 'inv') {
                let invCount = (p.inv || []).length;
                h += `<br><small style="color:#8d99ae">Петів в інвентарі: ${invCount}</small>
                <button class="btn" style="padding:8px; font-size:12px; margin-top:10px; background:#1c4a8a" onclick="openAdminInv('${uid}', '${(p.name||'Анонім').replace(/'/g,"\\'")}')">🎒 Переглянути інвентар</button>`;
            }
            h += `</div>`;
        });
        document.getElementById('admin-list').innerHTML = h;
    });
}

window.openAdminInv = (uid, name) => {
    adminInvUserId = uid;
    adminInvUserName = name;
    loadAdminUserInv(uid, name);
};

function loadAdminUserInv(uid, name) {
    db.ref('players/' + uid).once('value', snap => {
        let p = snap.val();
        let inv = (p && p.inv) ? p.inv : [];
        let tabs = `<div class="admin-tabs">
            <div class="a-tab" onclick="setAdminTab('balance')">💰 Баланс</div>
            <div class="a-tab" onclick="setAdminTab('pets')">🐾 Пети</div>
            <div class="a-tab active" onclick="setAdminTab('inv')">🎒 Інвентар</div>
        </div>`;
        let h = tabs;
        h += `<div style="display:flex; align-items:center; gap:10px; margin-bottom:12px">
            <button class="btn-s" onclick="adminInvUserId=null; adminInvUserName=''; loadAdmin()" style="background:#30363d; font-size:16px; padding:8px 14px">← Назад</button>
            <div>
                <div style="font-weight:bold; font-size:15px">${name}</div>
                <div style="font-size:11px; color:#8d99ae">Петів: ${inv.length}</div>
            </div>
        </div>`;
        if(inv.length === 0) {
            h += `<div class="admin-card" style="text-align:center; color:#8d99ae">Інвентар порожній</div>`;
        } else {
            inv.forEach((pet, idx) => {
                let isEquipped = p.p && p.p.id === pet.id;
                h += `<div class="admin-card" style="display:flex; justify-content:space-between; align-items:center; padding:12px 15px">
                    <div style="display:flex; align-items:center; gap:10px">
                        <span style="font-size:28px">${pet.s}</span>
                        <div>
                            <div style="font-weight:bold">${pet.n} ${isEquipped ? '<span style="font-size:10px; background:var(--success); padding:1px 5px; border-radius:4px">Активний</span>' : ''}</div>
                            <div style="font-size:11px; color:${pet.c}">${pet.r}</div>
                            <div style="font-size:11px; color:#8d99ae">Бонус: x${pet.m.toFixed(2)} • LVL ${pet.lvl || 1}</div>
                        </div>
                    </div>
                    <button class="btn-ctrl b-sub" style="padding:8px 12px; font-size:12px; min-width:70px" onclick="adminRemovePet('${uid}', ${idx}, '${name}')">🗑 Видалити</button>
                </div>`;
            });
        }
        document.getElementById('admin-list').innerHTML = h;
    });
}

window.adminRemovePet = (uid, petIdx, name) => {
    db.ref('players/' + uid).once('value', snap => {
        let p = snap.val();
        let inv = p.inv ? [...p.inv] : [];
        let pet = inv[petIdx];
        if(!pet) return alert("Пет не знайдений!");
        if(!confirm(`Видалити ${pet.s} ${pet.n} з інвентаря гравця ${name}?`)) return;
        // Якщо це активний пет — прибираємо
        if(p.p && p.p.id === pet.id) {
            db.ref('players/' + uid + '/p').set(null);
        }
        inv.splice(petIdx, 1);
        db.ref('players/' + uid + '/inv').set(inv).then(() => {
            loadAdminUserInv(uid, name);
        });
    });
};

window.mathB = (id, type) => {
    let v = prompt("Сума:"); if(!v || isNaN(v)) return;
    v = Number(v); let ref = db.ref('players/'+id+'/b');
    if(type==='add') ref.transaction(c=>(c||0)+v);
    else if(type==='sub') ref.transaction(c=>(c||0)-v);
    else ref.set(v);
    loadAdmin();
};

window.adminGivePet = (tid) => {
    let unique = []; let seen = new Set();
    for(let k in CASES) CASES[k].drop.forEach(p => { if(!seen.has(p.n)){ unique.push(p); seen.add(p.n); } });
    let list = unique.map((p,i)=>`${i}: ${p.s} ${p.n}`).join("\n");
    let ch = prompt(list);
    if(ch !== null && unique[ch]){
        let p = {...unique[ch], id:Date.now(), lvl:1};
        db.ref('players/'+tid+'/inv').once('value', sn=>{ let inv=sn.val()||[]; inv.push(p); db.ref('players/'+tid+'/inv').set(inv); });
        alert("Видано!");
    }
};

// --- ТОП ТА ІГРИ ---
function loadTop(){
    db.ref('players').once('value', snap => {
        let l=[]; snap.forEach(c=>{ let val=c.val(); if(val.name) l.push(val); });
        l.sort((a,b)=>b.b-a.b);
        document.getElementById('leaderboard').innerHTML = l.slice(0,10).map((p,i)=>`
            <div class="market-item"><span>${i+1}. ${p.name}</span><b>${Math.floor(p.b)} BB</b></div>
        `).join('');
    });
}

let bj=null;
function startBJ(bt){ bj={p:[dr(),dr()], d:[dr()], bt}; document.getElementById('bj-ctrl').style.display='flex'; reBJ(); }
function dr(){ return Math.floor(Math.random()*10)+2; }
function reBJ(){
    document.getElementById('bj-pc').innerHTML=bj.p.map(c=>`<div style="padding:10px; background:#fff; color:#000; border-radius:8px; font-weight:bold">${c}</div>`).join('');
    document.getElementById('bj-dc').innerHTML=bj.d.map(c=>`<div style="padding:10px; background:#fff; color:#000; border-radius:8px; font-weight:bold">${c}</div>`).join('');
    if(bj.p.reduce((a,b)=>a+b,0)>21){ res(false,bj.bt,0,"Перебір!"); endBJ(); }
}
window.bjDo=(a)=>{
    if(a==='hit'){ bj.p.push(dr()); reBJ(); }
    else { while(bj.d.reduce((a,b)=>a+b,0)<17) bj.d.push(dr()); reBJ(); let ps=bj.p.reduce((a,b)=>a+b,0), ds=bj.d.reduce((a,b)=>a+b,0); let w=ds>21||ps>ds; res(w,bj.bt,2, w?"Виграш!":"Програш"); endBJ(); }
};
function endBJ(){ document.getElementById('bj-ctrl').style.display='none'; }

updUI();
