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

let myId = tg.initDataUnsafe?.user?.id || 'guest';
const myName = tg.initDataUnsafe?.user?.first_name || "Гість";

let s = { b: 5000, x: 0, r: 1, name: myName, p: null, inv: [] };

const PETS_DB = {
    wood: [{n:'Песик', s:'🐶', r:'Common', m:1.2, c:'#94a3b8'}, {n:'Котик', s:'🐱', r:'Common', m:1.2, c:'#94a3b8'}],
    iron: [{n:'Єнот', s:'🦝', r:'Rare', m:1.8, c:'#3b82f6'}, {n:'Лисиця', s:'🦊', r:'Rare', m:2.0, c:'#3b82f6'}],
    diam: [{n:'Шарк', s:'🦈', r:'Epic', m:3.5, c:'#a855f7'}, {n:'Ведмідь', s:'🐻', r:'Legend', m:5.5, c:'#f43f5e'}]
};

// 2. DB SYNC
db.ref('players/' + myId).on('value', snap => {
    if(snap.exists()){ 
        let d = snap.val();
        if(!d.inv) d.inv = [];
        s = d; ren(); 
    } else { save(); }
});

function save() {
    if(s.x >= s.r * 1000) { s.x = 0; s.r++; alert("НОВИЙ РАНГ!"); }
    db.ref('players/' + myId).set(s);
}

function ren() {
    document.getElementById('bal-val').textContent = Math.floor(s.b).toLocaleString();
    document.getElementById('u-rank').textContent = "РАНГ: " + s.r;
    document.getElementById('xp-f').style.width = Math.min((s.x/(s.r*1000)*100), 100) + "%";
    if(s.p) {
        document.getElementById('p-img').textContent = s.p.s;
        document.getElementById('p-name').textContent = s.p.n;
        document.getElementById('p-l').textContent = s.p.lvl;
        document.getElementById('p-m').textContent = "x" + (s.p.m + s.p.lvl*0.1).toFixed(1);
        let t = document.getElementById('p-rarity'); t.textContent = s.p.r; t.style.background = s.p.c;
    }
}

// 3. ІГРИ (ОНОВЛЕНО)
window.updUI = () => {
    let g = document.getElementById('g-sel').value;
    document.getElementById('ui-dice').style.display = (g==='dice')?'block':'none';
    document.getElementById('ui-wheel').style.display = (g==='wheel')?'block':'none';
    document.getElementById('ui-bj').style.display = (g==='bj')?'block':'none';
    if(g === 'dice' && !document.querySelector('.dice-grid').innerHTML) {
        let h = ""; for(let i=1; i<=6; i++) h += `<button class="n-btn ${i===1?'active':''}" onclick="selN(${i}, this)">${i}</button>`;
        document.querySelector('.dice-grid').innerHTML = h;
    }
};

let selN_val = 1;
window.selN = (n, el) => { selN_val = n; document.querySelectorAll('.n-btn').forEach(b => b.classList.remove('active')); el.classList.add('active'); };

window.play = () => {
    let bt = parseInt(document.getElementById('bet-a').value);
    if(isNaN(bt) || bt <= 0 || bt > s.b) return alert("Мало BB!");
    let g = document.getElementById('g-sel').value;
    document.getElementById('g-stat').innerHTML = "Граємо...";

    if(g === 'f50') {
        setTimeout(() => {
            let win = Math.random() > 0.5;
            res(win, bt, 1.45, win ? "Ви вгадали сторінку!" : "Не пощастило...");
        }, 500);
    }
    else if(g === 'dice') {
        let r = Math.floor(Math.random()*6)+1;
        setTimeout(() => {
            let win = (r === selN_val);
            res(win, bt, 1.45, `Випало 🎲 ${r}. ${win ? 'Перемога!' : 'Спробуй ще!'}`);
        }, 800);
    }
    else if(g === 'wheel') {
        let w = document.getElementById('w-obj'); 
        let deg = 1800 + Math.floor(Math.random()*360);
        w.style.transform = `rotate(${deg}deg)`;
        setTimeout(() => {
            let p = Math.random()*100;
            let m = (p<45)?0 : (p<80)?1.25 : (p<95)?1.5 : 1.75;
            let txt = (m===0)?"🔴 Випало 0x":"🟢 Випало 1.25x";
            if(m===1.5) txt = "🔵 Випало 1.5x"; if(m===1.75) txt = "🟡 Випало 1.75x";
            res(m>0, bt, m, txt);
        }, 3000);
    }
    else if(g === 'bj') startBJ(bt);
};

function res(win, bt, m, msg) {
    let stat = document.getElementById('g-stat');
    if(win) {
        let bon = s.p ? (s.p.m + s.p.lvl*0.1) : 1;
        let winSum = Math.floor((bt * m - bt) * bon);
        s.b += winSum; s.x += Math.floor(bt/4);
        stat.innerHTML = `<div style="font-size:12px; opacity:0.8">${msg}</div><span style="color:var(--success)">+${winSum} BB</span>`;
    } else {
        s.b -= bt;
        stat.innerHTML = `<div style="font-size:12px; opacity:0.8">${msg}</div><span style="color:var(--error)">-${bt} BB</span>`;
    }
    save();
}

// 4. CASES & INV
window.buy = (t, cost) => {
    if(s.b < cost) return alert("Мало BB!");
    s.b -= cost; save();
    const modal = document.getElementById('case-modal');
    const scroll = document.getElementById('case-scroll');
    modal.style.display = 'flex';
    document.getElementById('case-res').textContent = "";
    document.getElementById('case-close').style.display = 'none';
    
    let pool = [...PETS_DB.wood, ...PETS_DB.iron, ...PETS_DB.diam];
    let html = ""; for(let i=0; i<45; i++) html += `<div class="case-item" style="border-color:${pool[Math.floor(Math.random()*pool.length)].c}">${pool[Math.floor(Math.random()*pool.length)].s}</div>`;
    scroll.innerHTML = html; scroll.style.transition = "0s"; scroll.style.left = "0px";

    let winPet = { ...(Math.random() > 0.5 ? PETS_DB[t][0] : PETS_DB[t][1]), lvl: 1, id: Date.now(), egg: t };
    setTimeout(() => {
        let all = document.querySelectorAll('.case-item');
        all[40].innerHTML = winPet.s; all[40].style.borderColor = winPet.c;
        scroll.style.transition = "5s cubic-bezier(0.1, 0, 0.1, 1)";
        scroll.style.left = `-${40 * 90 - 120}px`;
    }, 100);
    setTimeout(() => {
        document.getElementById('case-res').innerHTML = `<span style="color:${winPet.c}">${winPet.n}</span>`;
        document.getElementById('case-close').style.display = "block";
        s.inv.push(winPet); save();
    }, 5500);
};

window.closeCase = () => document.getElementById('case-modal').style.display = 'none';

function renderInv() {
    let list = document.getElementById('inv-list');
    if(!s.inv || s.inv.length === 0) return list.innerHTML = "Порожньо...";
    let h = "";
    s.inv.forEach(p => {
        let isEq = s.p && s.p.id === p.id;
        h += `<div class="shop-item">
            <span>${p.s} <b>${p.n}</b></span>
            <button class="btn-s" style="background:${isEq?'#444':''}" onclick="equip(${p.id})">${isEq?'АКТИВ':'ВЗЯТИ'}</button>
        </div>`;
    });
    list.innerHTML = h;
}
window.equip = (id) => { let f = s.inv.find(i => i.id === id); if(f) { s.p = f; save(); renderInv(); } };

// 5. TOP & ADMIN
function loadTop() {
    db.ref('players').orderByChild('b').limitToLast(10).on('value', snap => {
        let h = ""; let arr = []; snap.forEach(p => arr.push(p.val()));
        arr.reverse().forEach((v, i) => h += `<div style="display:flex; justify-content:space-between; margin-bottom:8px"><span>${i+1}. ${v.name}</span><b>${Math.floor(v.b)}</b></div>`);
        document.getElementById('leaderboard').innerHTML = h;
    });
}
function loadAdmin() {
    db.ref('players').on('value', snap => {
        let h = ""; snap.forEach(c => {
            h += `<div style="font-size:12px; margin-bottom:10px">${c.val().name} <button class="btn-s" onclick="setB('${c.key}')">SET</button></div>`;
        });
        document.getElementById('admin-list').innerHTML = h;
    });
}
window.setB = (id) => { let v = prompt("Введіть баланс:"); if(v) db.ref('players/'+id+'/b').set(parseInt(v)); };

// 6. TABS
window.tab = (t, el) => {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.nav-tab').forEach(n => n.classList.remove('active'));
    document.getElementById('v-'+t).style.display = 'block';
    el.classList.add('active');
    if(t === 'inv') renderInv();
    if(t === 'top') loadTop();
    if(t === 'admin') loadAdmin();
};

// BJ Logic (Shortened)
function startBJ(bt){ bj={p:[dr(),dr()], d:[dr()], bt}; document.getElementById('bj-ctrl').style.display='flex'; reBJ(); }
function dr(){ return Math.floor(Math.random()*10)+2; }
function reBJ(){
    document.getElementById('bj-pc').innerHTML=bj.p.map(c=>`<div class="bj-c">${c}</div>`).join('');
    document.getElementById('bj-dc').innerHTML=bj.d.map(c=>`<div class="bj-c">${c}</div>`).join('');
    if(bj.p.reduce((a,b)=>a+b,0)>21){ res(false,bj.bt,0,"Перебір!"); endBJ(); }
}
window.bjDo=(a)=>{
    const sum=(x)=>x.reduce((v,z)=>v+z,0);
    if(a==='hit'){ bj.p.push(dr()); reBJ(); }
    else { while(sum(bj.d)<17) bj.d.push(dr()); reBJ(); let win = sum(bj.d)>21||sum(bj.p)>sum(bj.d); res(win,bj.bt,2, win?"Ви обіграли дилера!":"Дилер переміг"); endBJ(); }
};
function endBJ(){ document.getElementById('bj-ctrl').style.display='none'; }

updUI();
