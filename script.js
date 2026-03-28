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
    basic: { n: "Базовий", p: 300, drop: [
        {n:'Собака', s:'🐶', r:'Звичайний', m:1.05, w:40, c:'#94a3b8'},
        {n:'Кіт', s:'🐱', r:'Звичайний', m:1.05, w:40, c:'#94a3b8'},
        {n:'Кролик', s:'🐰', r:'Незвичайний', m:1.07, w:20, c:'#3b82f6'}
    ]},
    uncommon: { n: "Незвичайний", p: 550, drop: [
        {n:'Кролик', s:'🐰', r:'Незвичайний', m:1.07, w:43, c:'#3b82f6'},
        {n:'Лисиця', s:'🦊', r:'Незвичайний', m:1.07, w:43, c:'#3b82f6'},
        {n:'Вовк', s:'🐺', r:'Рідкісний', m:1.09, w:14, c:'#a855f7'}
    ]},
    rare: { n: "Рідкісний", p: 850, drop: [
        {n:'Вовк', s:'🐺', r:'Рідкісний', m:1.09, w:45, c:'#a855f7'},
        {n:'Бджола', s:'🐝', r:'Рідкісний', m:1.09, w:45, c:'#a855f7'},
        {n:'Панда', s:'🐼', r:'Епічний', m:1.12, w:10, c:'#f59e0b'}
    ]},
    legend: { n: "Легендарний", p: 1250, drop: [
        {n:'Панда', s:'🐼', r:'Епічний', m:1.12, w:56, c:'#f59e0b'},
        {n:'Лев', s:'🦁', r:'Легендарний', m:1.14, w:20, c:'#f43f5e'},
        {n:'Дракон', s:'🐲', r:'Легендарний', m:1.16, w:24, c:'#f43f5e'}
    ]},
    ocean: { n: "Океан 🌊", p: 1500, limited: true, drop: [
        {n:'Рибка', s:'🐟', r:'Незвичайний', m:1.1, w:40, c:'#3b82f6'},
        {n:'Акула', s:'🦈', r:'Епічний', m:1.15, w:20, c:'#f59e0b'},
        {n:'Восьминіг', s:'🐙', r:'Легендарний', m:1.19, w:10, c:'#f43f5e'}
    ]}
};

let s = { b: 0, x: 0, r: 1, name: myName, p: null, inv: [], v: 3.0 };
let currentShopTab = 'cases';
let selN_val = 1;

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
            let timer = c.limited ? `<span class="timer-tag">До 04.04 00:00</span>` : "";
            h += `<div class="shop-item"><div><span>${c.n}</span>${timer}</div><button class="btn-s" onclick="buyCase('${k}')">${c.p} BB</button></div>`;
        }
        list.innerHTML = h;
    } else {
        list.innerHTML = tabs + '<div id="m-list">Завантаження...</div>';
        db.ref('market').on('value', snap => {
            let h = "";
            snap.forEach(child => {
                let lot = child.val();
                if(lot.sellerId == myId) return;
                h += `<div class="market-item"><div><span style="color:${lot.pet.c}">${lot.pet.s} ${lot.pet.n}</span><br><small>Від: ${lot.sellerName}</small></div>
                <button class="btn-s" style="background:var(--success)" onclick="buyFromMarket('${child.key}')">${lot.price} BB</button></div>`;
            });
            document.getElementById('m-list').innerHTML = h || "Ринок порожній";
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
    let price = prompt("Ціна продажу (BB):");
    if(!price || isNaN(price) || price <= 0) return;
    let idx = s.inv.findIndex(p => p.id === petId);
    let pet = s.inv[idx];
    db.ref('market').push({ pet, price: Number(price), sellerId: myId, sellerName: myName }).then(() => {
        s.inv.splice(idx, 1); save(); renderInv();
    });
};

// --- ІНВЕНТАР ---
function renderInv() {
    let h = "";
    s.inv.forEach(p => {
        let isEq = s.p && s.p.id === p.id;
        h += `<div class="shop-item"><span>${p.s} ${p.n}</span>
        <div style="display:flex; gap:5px">
            <button class="btn-s" onclick="equip(${p.id})">${isEq?'✅':'ВЗЯТИ'}</button>
            <button class="btn-s" style="background:var(--purple)" onclick="listOnMarket(${p.id})">🛒</button>
        </div></div>`;
    });
    document.getElementById('inv-list').innerHTML = h || "Порожньо";
}
window.equip = (id) => { s.p = s.inv.find(i => i.id === id); save(); renderInv(); };

// --- ГРИ ---
window.updUI = () => {
    let g = document.getElementById('g-sel').value;
    document.getElementById('ui-dice').style.display = (g==='dice')?'block':'none';
    document.getElementById('ui-wheel').style.display = (g==='wheel')?'block':'none';
    document.getElementById('ui-bj').style.display = (g==='bj')?'block':'none';
    if(g==='dice'){
        let h=""; for(let i=1;i<=6;i++) h+=`<button class="btn-s ${i===selN_val?'active':''}" style="padding:15px" onclick="selN(${i})">${i}</button>`;
        document.querySelector('.dice-grid').innerHTML=h;
    }
};
window.selN=(n)=>{ selN_val=n; updUI(); };

window.play = () => {
    let bt = parseFloat(document.getElementById('bet-a').value);
    if(bt > s.b || bt <= 0 || isNaN(bt)) return alert("Мало BB!");
    let g = document.getElementById('g-sel').value;
    document.getElementById('g-stat').innerText = "⏳ Очікуємо...";

    if(g==='f50'){ let w=Math.random()>0.5; res(w, bt, 1.45, w?"Орел":"Решка"); }
    else if(g==='dice'){ let r=Math.floor(Math.random()*6)+1; res(r===selN_val, bt, 1.45, `Випало ${r}`); }
    else if(g==='wheel'){
        let wheel = document.getElementById('w-obj'); wheel.style.transition="none"; wheel.style.transform="rotate(0deg)";
        let p = Math.random()*100; let m, deg;
        if(p<45){ m=0; deg=Math.random()*162; }
        else if(p<80){ m=1.25; deg=162+Math.random()*126; }
        else if(p<95){ m=1.5; deg=288+Math.random()*54; }
        else { m=1.75; deg=342+Math.random()*18; }
        setTimeout(()=>{
            wheel.style.transition="transform 4s cubic-bezier(0.1, 0, 0.1, 1)";
            wheel.style.transform=`rotate(${1800+(360-deg)}deg)`;
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
    let scroll = document.getElementById('case-scroll');
    let pool = []; for(let key in CASES) pool.push(...CASES[key].drop);
    let h = ""; for(let i=0; i<55; i++){
        let item = (i===40)?win:pool[Math.floor(Math.random()*pool.length)];
        h += `<div class="case-item">${item.s}</div>`;
    }
    scroll.innerHTML=h; scroll.style.transition="0s"; scroll.style.left="0px";
    setTimeout(()=>{
        scroll.style.transition="5s cubic-bezier(0.1, 0, 0.1, 1)";
        scroll.style.left = `-${40*90 - (window.innerWidth/2 - 45)}px`;
    }, 50);
    setTimeout(()=>{
        document.getElementById('case-res').innerHTML=`Випав: <span style="color:${win.c}">${win.n}</span>`;
        document.getElementById('case-close').style.display='block';
        win.id=Date.now(); win.lvl=1; s.inv.push(win); save();
    }, 5600);
};
window.closeCase=()=>{ document.getElementById('case-modal').style.display='none'; document.getElementById('case-close').style.display='none'; };

// --- АДМІНКА ТА ТОП ---
function loadTop(){
    db.ref('players').once('value', snap => {
        let l=[]; snap.forEach(c=>{ if(c.val().name) l.push(c.val()); });
        l.sort((a,b)=>b.b-a.b);
        document.getElementById('leaderboard').innerHTML = l.slice(0,10).map((p,i)=>`<div class="market-item"><span>${i+1}. ${p.name}</span><b>${Math.floor(p.b)} BB</b></div>`).join('');
    });
}
function loadAdmin(){
    db.ref('players').limitToLast(20).once('value', snap => {
        let h=""; snap.forEach(c=>{
            let p=c.val(); h+=`<div class="admin-card"><b>${p.name}</b><br>Баланс: ${p.b.toFixed(2)}<br>
            <button class="btn-s" onclick="setB('${c.key}')">BB</button> <button class="btn-s" onclick="adminGivePet('${c.key}')">PET</button></div>`;
        });
        document.getElementById('admin-list').innerHTML=h;
    });
}
window.setB=(id)=>{ let v=prompt("BB:"); if(v) db.ref('players/'+id+'/b').set(Number(v)); };
window.adminGivePet=(tid)=>{
    let all=[]; for(let k in CASES) all.push(...CASES[k].drop);
    let choice=prompt(all.map((p,i)=>i+":"+p.n).join("\n"));
    if(choice && all[choice]){
        let p={...all[choice], id:Date.now(), lvl:1};
        db.ref('players/'+tid+'/inv').once('value', sn=>{ let inv=sn.val()||[]; inv.push(p); db.ref('players/'+tid+'/inv').set(inv); });
    }
};

// Блекджек (спрощено)
let bj=null;
function startBJ(bt){ bj={p:[dr(),dr()], d:[dr()], bt}; document.getElementById('bj-ctrl').style.display='flex'; reBJ(); }
function dr(){ return Math.floor(Math.random()*10)+2; }
function reBJ(){
    document.getElementById('bj-pc').innerHTML=bj.p.map(c=>`<div style="padding:5px; background:#fff; color:#00; border-radius:4px">${c}</div>`).join('');
    document.getElementById('bj-dc').innerHTML=bj.d.map(c=>`<div style="padding:5px; background:#fff; color:#00; border-radius:4px">${c}</div>`).join('');
    if(bj.p.reduce((a,b)=>a+b,0)>21){ res(false,bj.bt,0,"Перебір"); endBJ(); }
}
window.bjDo=(a)=>{
    if(a==='hit'){ bj.p.push(dr()); reBJ(); }
    else { while(bj.d.reduce((a,b)=>a+b,0)<17) bj.d.push(dr()); reBJ(); let win=bj.d.reduce((a,b)=>a+b,0)>21||bj.p.reduce((a,b)=>a+b,0)>bj.d.reduce((a,b)=>a+b,0); res(win,bj.bt,2, win?"Перемога":"Поразка"); endBJ(); }
};
function endBJ(){ document.getElementById('bj-ctrl').style.display='none'; }

updUI();
