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
        {n:'Восьминіг', s:'🐙', r:'Міфічний', m:1.3, w:5, c:'#ff00ff'}
    ]}
};

let s = { b: 0, x: 0, name: myName, p: null, inv: [], v: 3.5 };
let currentShopTab = 'cases';
let currentAdminTab = 'balance';
let selN_val = 1;

db.ref('players/' + myId).on('value', snap => {
    let d = snap.val();
    if(d) { s = d; if(!s.inv) s.inv = []; } 
    else { db.ref('players/' + myId).set(s); }
    ren();
});

function save() { db.ref('players/' + myId).set(s); }

function getNeedXP(lvl) {
    return Math.floor(1000 * Math.pow(1.2, (lvl || 1) - 1));
}

function ren() {
    document.getElementById('bal-val').innerText = s.b.toFixed(2);
    if(s.p) {
        document.getElementById('p-img').innerText = s.p.s;
        document.getElementById('p-name').innerText = s.p.n;
        document.getElementById('p-m').innerText = s.p.m.toFixed(3);
        document.getElementById('p-l').innerText = s.p.lvl || 1;
        let curXP = s.p.xp || 0;
        let need = getNeedXP(s.p.lvl);
        document.getElementById('xp-f').style.width = Math.min((curXP/need*100), 100) + "%";
        document.getElementById('xp-num').innerText = `${curXP}/${need} XP`;
        let t = document.getElementById('p-rarity'); t.innerText = s.p.r; t.style.background = s.p.c;
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

function renderShop() {
    let list = document.getElementById('shop-list');
    let tabs = `<div class="shop-tabs">
        <div class="s-tab ${currentShopTab==='cases'?'active':''}" onclick="currentShopTab='cases';renderShop()">📦 Кейси</div>
        <div class="s-tab ${currentShopTab==='market'?'active':''}" onclick="currentShopTab='market';renderShop()">🛒 Ринок</div>
    </div>`;

    if(currentShopTab === 'cases') {
        let h = tabs; for(let k in CASES) {
            const c = CASES[k]; if(c.limited && Date.now() > DEADLINE) continue;
            let ch = c.drop.map(p => `<span style="color:${p.c}">${p.s} ${p.w}%</span>`).join(' • ');
            h += `<div class="shop-card">
                <div class="case-info"><div class="case-name">${c.n}</div><div style="font-size:10px; opacity:0.7">${ch}</div></div>
                <button class="btn-s" style="background:var(--accent)" onclick="buyCase('${k}')">${c.p} BB</button>
            </div>`;
        }
        list.innerHTML = h;
    } else {
        list.innerHTML = tabs + '<div id="m-list" class="glass">Завантаження...</div>';
        db.ref('market').on('value', snap => {
            let h = ""; snap.forEach(child => {
                let lot = child.val(); if(lot.sellerId == myId) return;
                h += `<div class="market-item">
                    <div><span style="color:${lot.pet.c}">${lot.pet.s} ${lot.pet.n}</span><br><small>${lot.sellerName}</small></div>
                    <button class="btn-s" style="background:var(--success)" onclick="buyFromMarket('${child.key}')">${lot.price} BB</button>
                </div>`;
            });
            document.getElementById('m-list').innerHTML = h || "Ринок порожній";
        });
    }
}

function res(win, bt, m, msg) {
    if(!s.p) return alert("Обери пета!");
    if(win) {
        let winAmount = (bt * m - bt) * s.p.m; s.b += winAmount;
        if(!s.p.xp) s.p.xp = 0; if(!s.p.lvl) s.p.lvl = 1;
        s.p.xp += Math.floor(bt);
        let need = getNeedXP(s.p.lvl);
        while(s.p.xp >= need) {
            s.p.xp -= need; s.p.lvl++; s.p.m += 0.005; need = getNeedXP(s.p.lvl);
            alert(`🎉 Твій пет ${s.p.n} рівень ${s.p.lvl}!`);
        }
        let idx = s.inv.findIndex(i => i.id === s.p.id);
        if(idx !== -1) s.inv[idx] = s.p;
        document.getElementById('g-stat').innerHTML = `<span style="color:var(--success)">+${winAmount.toFixed(2)} BB</span>`;
    } else {
        s.b -= bt; document.getElementById('g-stat').innerHTML = `<span style="color:var(--error)">-${bt.toFixed(2)} BB</span>`;
    }
    save();
}

window.loadAdmin = () => {
    db.ref('players').once('value', snap => {
        let h = `<div class="admin-tabs">
            <div class="a-tab ${currentAdminTab==='balance'?'active':''}" onclick="currentAdminTab='balance';loadAdmin()">💰 Баланс</div>
            <div class="a-tab ${currentAdminTab==='inv'?'active':''}" onclick="currentAdminTab='inv';loadAdmin()">🎒 Інвентарі</div>
        </div>`;
        snap.forEach(c => {
            let p = c.val(); let uid = c.key;
            h += `<div class="admin-card">
                <b>${p.name || 'Гравець'}</b><br>
                ${currentAdminTab === 'balance' ? 
                    `<div class="admin-ctrl-grid">
                        <button class="btn-ctrl b-add" onclick="mathB('${uid}', 'add')">+ BB</button>
                        <button class="btn-ctrl b-sub" onclick="mathB('${uid}', 'sub')">- BB</button>
                        <button class="btn-ctrl b-set" style="background:var(--purple)" onclick="adminGivePet('${uid}')">🎁</button>
                    </div>` : 
                    `<button class="btn-s" style="width:100%; margin-top:10px" onclick="adminViewInv('${uid}')">ДИВИТИСЬ ІНВЕНТАР</button>`
                }
            </div>`;
        });
        document.getElementById('admin-list').innerHTML = h;
    });
};

window.adminViewInv = (tid) => {
    db.ref('players/' + tid).once('value', snap => {
        let p = snap.val(); let inv = p.inv || [];
        let list = inv.map((pet, idx) => 
            `<div class="market-item"><span>${pet.s} ${pet.n} (Lvl ${pet.lvl || 1})</span><button class="btn-s" style="background:var(--error)" onclick="adminRemovePet('${tid}', ${idx})">❌</button></div>`
        ).join('');
        document.getElementById('admin-list').innerHTML = `<button class="btn-s" onclick="loadAdmin()">⬅️ НАЗАД</button><h4>${p.name}</h4>${list || "Порожньо"}`;
    });
};

window.adminRemovePet = (tid, idx) => {
    if(!confirm("Видалити пета?")) return;
    db.ref('players/' + tid + '/inv').once('value', sn => {
        let inv = sn.val() || []; inv.splice(idx, 1);
        db.ref('players/' + tid + '/inv').set(inv).then(() => adminViewInv(tid));
    });
};

// ... решта функцій (play, buyCase, startBJ, loadTop) залишаються стандартними ...
window.buyFromMarket = (lotId) => {
    db.ref('market/' + lotId).once('value', snap => {
        let lot = snap.val(); if(!lot || s.b < lot.price) return alert("Помилка!");
        s.b -= lot.price; s.inv.push(lot.pet); save();
        db.ref('players/' + lot.sellerId + '/b').transaction(c => (c || 0) + lot.price);
        db.ref('market/' + lotId).remove();
    });
};
window.renderInv = () => {
    let h = ""; s.inv.forEach(p => {
        let isEq = s.p && s.p.id === p.id;
        h += `<div class="market-item">
            <div><span style="color:${p.c}">${p.s} ${p.n}</span><br><small>Lvl ${p.lvl || 1} (x${p.m.toFixed(3)})</small></div>
            <button class="btn-s" onclick="equip(${p.id})">${isEq?'✅':'ВЗЯТИ'}</button>
        </div>`;
    });
    document.getElementById('inv-list').innerHTML = h || "Пусто";
};
window.equip = (id) => { s.p = s.inv.find(i => i.id === id); save(); renderInv(); };
function dr(){ return Math.floor(Math.random()*10)+2; }
window.mathB = (id, type) => {
    let v = prompt("Сума:"); if(!v || isNaN(v)) return;
    v = Number(v); let ref = db.ref('players/'+id+'/b');
    if(type==='add') ref.transaction(c=>(c||0)+v);
    else if(type==='sub') ref.transaction(c=>(c||0)-v);
    else ref.set(v); loadAdmin();
};
window.updUI = () => {
    let g = document.getElementById('g-sel').value;
    document.getElementById('ui-dice').style.display = (g==='dice')?'block':'none';
    document.getElementById('ui-wheel').style.display = (g==='wheel')?'block':'none';
    document.getElementById('ui-bj').style.display = (g==='bj')?'block':'none';
};
