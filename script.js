// 1. CONFIG
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
const myId = tg.initDataUnsafe?.user?.id || 0;
const myName = tg.initDataUnsafe?.user?.first_name || "Гість";

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
    ocean: { n: "Океан", p: 1500, drop: [
        {n:'Рибка', s:'🐟', r:'Незвичайний', m:1.1, w:40, c:'#3b82f6'},
        {n:'Тропічна рибка', s:'🐠', r:'Рідкісний', m:1.12, w:30, c:'#a855f7'},
        {n:'Акула', s:'🦈', r:'Епічний', m:1.15, w:20, c:'#f59e0b'},
        {n:'Восьминіг', s:'🐙', r:'Легендарний', m:1.19, w:10, c:'#f43f5e'}
    ]}
};

let s = { b: 10, x: 0, r: 1, name: myName, p: null, inv: [], v: 2.0 };

// СИНХРОНІЗАЦІЯ
db.ref('players/' + myId).on('value', snap => {
    if(snap.exists()){ 
        let d = snap.val();
        if(!d.v || d.v < 2.0) { s = { b: 10, x: 0, r: 1, name: myName, p: null, inv: [], v: 2.0 }; save(); }
        else { s = d; }
        ren(); 
    } else { save(); }
});

function save() { db.ref('players/' + myId).set(s); }

function ren() {
    document.getElementById('bal-val').textContent = Math.floor(s.b).toLocaleString();
    document.getElementById('u-rank').textContent = "РАНГ: " + s.r;
    document.getElementById('xp-f').style.width = Math.min((s.x/(s.r*1000)*100), 100) + "%";
    if(s.p) {
        document.getElementById('p-img').textContent = s.p.s;
        document.getElementById('p-name').textContent = s.p.n;
        document.getElementById('p-l').textContent = s.p.lvl;
        document.getElementById('p-m').textContent = "x" + s.p.m.toFixed(2);
        let t = document.getElementById('p-rarity'); t.textContent = s.p.r; t.style.background = s.p.c;
    }
    if(ADMINS.includes(Number(myId))) document.getElementById('admin-tab').style.display = 'block';
}

// МАГАЗИН
function renderShop() {
    let h = "";
    for(let k in CASES) {
        h += `<div class="shop-item"><span>${CASES[k].n} <button class="btn-s" style="padding:2px 5px; font-size:10px" onclick="showOdds('${k}')">?</button></span><button class="btn-s" onclick="buyCase('${k}')">${CASES[k].p} BB</button></div>`;
    }
    document.getElementById('shop-list').innerHTML = h;
}

window.showOdds = (k) => {
    let c = CASES[k]; document.getElementById('odds-title').textContent = c.n;
    let h = ""; c.drop.forEach(p => h += `<div style="display:flex; justify-content:space-between; margin-bottom:5px"><span>${p.s} ${p.n}</span><b>${p.w}%</b></div>`);
    document.getElementById('odds-list').innerHTML = h;
    document.getElementById('odds-modal').style.display = 'flex';
};
window.closeOdds = () => document.getElementById('odds-modal').style.display = 'none';

window.buyCase = (k) => {
    let c = CASES[k]; if(s.b < c.p) return alert("Мало BB!");
    s.b -= c.p; save();
    document.getElementById('case-modal').style.display = 'flex';
    document.getElementById('case-close').style.display = 'none';
    let rand = Math.random() * 100; let win = null; let cur = 0;
    for(let p of c.drop) { cur += p.w; if(rand <= cur) { win = {...p}; break; } }
    let scroll = document.getElementById('case-scroll');
    let pool = []; for(let key in CASES) pool.push(...CASES[key].drop);
    let h = ""; for(let i=0; i<45; i++) h += `<div class="case-item">${pool[Math.floor(Math.random()*pool.length)].s}</div>`;
    scroll.innerHTML = h; scroll.style.transition = "0s"; scroll.style.left = "0px";
    setTimeout(() => {
        let all = document.querySelectorAll('.case-item');
        all[40].innerHTML = win.s; all[40].style.borderColor = win.c;
        scroll.style.transition = "5s cubic-bezier(0.1, 0, 0.1, 1)";
        scroll.style.left = `-${40 * 90 - 120}px`;
    }, 100);
    setTimeout(() => {
        document.getElementById('case-res').innerHTML = `<span style="color:${win.c}">${win.n} (x${win.m})</span>`;
        document.getElementById('case-close').style.display = 'block';
        win.id = Date.now(); win.from = k; win.lvl = 1; s.inv.push(win); save();
    }, 5500);
};
window.closeCase = () => document.getElementById('case-modal').style.display = 'none';

// ІНВЕНТАР
function renderInv() {
    let list = document.getElementById('inv-list');
    if(!s.inv || s.inv.length === 0) return list.innerHTML = "Порожньо";
    let h = "";
    s.inv.forEach(p => {
        let isEq = s.p && s.p.id === p.id;
        h += `<div class="shop-item"><span>${p.s} ${p.n} (x${p.m})</span><div style="display:flex; gap:5px"><button class="btn-s" onclick="equip(${p.id})">${isEq?'ВЗЯТО':'ВЗЯТИ'}</button><button class="btn-s" style="background:var(--error)" onclick="sellPet(${p.id})">💰</button></div></div>`;
    });
    list.innerHTML = h;
}
window.equip = (id) => { s.p = s.inv.find(i => i.id === id); save(); renderInv(); };
window.sellPet = (id) => {
    let idx = s.inv.findIndex(p => p.id === id); let p = s.inv[idx];
    let pr = Math.floor(CASES[p.from].p * 0.5);
    if(confirm(`Продати за ${pr} BB?`)) { s.b += pr; s.inv.splice(idx, 1); if(s.p?.id === id) s.p = null; save(); renderInv(); }
};

// ТОП ТА АДМІН
function loadTop() {
    db.ref('players').once('value', snap => {
        let l = []; snap.forEach(c => l.push(c.val()));
        l.sort((a,b) => b.b - a.b);
        let h = ""; l.slice(0,10).forEach((p, i) => h += `<div style="display:flex; justify-content:space-between; margin-bottom:8px"><span>${i+1}. ${p.name}</span><b>${Math.floor(p.b)}</b></div>`);
        document.getElementById('leaderboard').innerHTML = h;
    });
}
function loadAdmin() {
    if(!ADMINS.includes(Number(myId))) return;
    db.ref('players').on('value', snap => {
        let h = ""; snap.forEach(c => h += `<div style="font-size:12px; margin-bottom:10px">${c.val().name} (${c.key}) <button class="btn-s" onclick="setB('${c.key}')">SET</button></div>`);
        document.getElementById('admin-list').innerHTML = h;
    });
}
window.setB = (id) => { let v = prompt("Введіть баланс:"); if(v) db.ref('players/'+id+'/b').set(Number(v)); };

// НАВІГАЦІЯ
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

// ІГРИ
window.updUI = () => {
    let g = document.getElementById('g-sel').value;
    document.getElementById('ui-dice').style.display = (g==='dice')?'block':'none';
    document.getElementById('ui-wheel').style.display = (g==='wheel')?'block':'none';
    document.getElementById('ui-bj').style.display = (g==='bj')?'block':'none';
    if(g==='dice' && !document.querySelector('.dice-grid').innerHTML) {
        let h=""; for(let i=1; i<=6; i++) h+=`<button class="n-btn ${i===1?'active':''}" onclick="selN(${i}, this)">${i}</button>`;
        document.querySelector('.dice-grid').innerHTML=h;
    }
};
let selN_val = 1; window.selN = (n, el) => { selN_val = n; document.querySelectorAll('.n-btn').forEach(b => b.classList.remove('active')); el.classList.add('active'); };
window.play = () => {
    let bt = parseInt(document.getElementById('bet-a').value); if(bt > s.b || bt <= 0) return alert("Невірна ставка!");
    let g = document.getElementById('g-sel').value;
    document.getElementById('g-stat').textContent = "Гра...";
    if(g==='f50') { let w=Math.random()>0.5; setTimeout(()=>res(w, bt, 1.45, w?"Перемога!":"Програш"), 500); }
    else if(g==='dice') { let r=Math.floor(Math.random()*6)+1; setTimeout(()=>res(r===selN_val, bt, 1.45, `Випало 🎲 ${r}`), 500); }
    else if(g==='wheel') {
        let w=document.getElementById('w-obj'); let d=1800+Math.floor(Math.random()*360);
        w.style.transform=`rotate(${d}deg)`;
        setTimeout(() => { let p=Math.random()*100; let m=(p<45)?0:(p<80)?1.25:(p<95)?1.5:1.75; let txt = m===0?"🔴 0x":m===1.25?"🟢 1.25x":m===1.5?"🔵 1.5x":"🟡 1.75x"; res(m>0, bt, m, `Випало ${txt}`); }, 3000);
    }
    else if(g==='bj') startBJ(bt);
};
function res(win, bt, m, msg) {
    let st = document.getElementById('g-stat');
    if(win) {
        let bon = s.p ? s.p.m : 1; let wSum = Math.floor((bt*m-bt)*bon);
        s.b += wSum; s.x += Math.floor(bt/4); st.innerHTML = `<span style="color:var(--success)">+${wSum} BB</span><br><small>${msg}</small>`;
    } else { s.b -= bt; st.innerHTML = `<span style="color:var(--error)">-${bt} BB</span><br><small>${msg}</small>`; }
    save();
}

// BJ
function startBJ(bt){ bj={p:[dr(),dr()], d:[dr()], bt}; document.getElementById('bj-ctrl').style.display='flex'; reBJ(); }
function dr(){ return Math.floor(Math.random()*10)+2; }
function reBJ(){
    document.getElementById('bj-pc').innerHTML=bj.p.map(c=>`<div style="padding:5px 10px; background:#fff; color:#000; border-radius:4px">${c}</div>`).join('');
    document.getElementById('bj-dc').innerHTML=bj.d.map(c=>`<div style="padding:5px 10px; background:#fff; color:#000; border-radius:4px">${c}</div>`).join('');
    if(bj.p.reduce((a,b)=>a+b,0)>21){ res(false,bj.bt,0,"Перебір!"); endBJ(); }
}
window.bjDo=(a)=>{
    const sum=(x)=>x.reduce((v,z)=>v+z,0);
    if(a==='hit'){ bj.p.push(dr()); reBJ(); }
    else { while(sum(bj.d)<17) bj.d.push(dr()); reBJ(); let win=sum(bj.d)>21||sum(bj.p)>sum(bj.d); res(win,bj.bt,2, win?"Перемога!":"Програш"); endBJ(); }
};
function endBJ(){ document.getElementById('bj-ctrl').style.display='none'; }

updUI();
