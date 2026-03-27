// 1. КОНФІГУРАЦІЯ
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

let myId = tg.initDataUnsafe?.user?.id;
if (!myId) {
    myId = localStorage.getItem('casino_user_uuid') || ('u' + Math.floor(Math.random()*1e7));
    localStorage.setItem('casino_user_uuid', myId);
}
const myName = tg.initDataUnsafe?.user?.first_name || "Гість";

// Початкові дані з порожнім інвентарем
let s = { b: 5000, x: 0, r: 1, name: myName, p: null, inv: [] };

const EGG_COST = { wood: 2000, iron: 10000, diam: 50000 };
const SELL_RATE = { Common: 0.1, Rare: 0.2, Epic: 0.3, Legend: 0.5 };

const PETS_DB = {
    wood: [{n:'Песик', s:'🐶', r:'Common', m:1.2, c:'#94a3b8'}, {n:'Котик', s:'🐱', r:'Common', m:1.2, c:'#94a3b8'}],
    iron: [{n:'Єнот', s:'🦝', r:'Rare', m:1.8, c:'#3b82f6'}, {n:'Лисиця', s:'🦊', r:'Rare', m:2.0, c:'#3b82f6'}],
    diam: [{n:'Шарк', s:'🦈', r:'Epic', m:3.5, c:'#a855f7'}, {n:'Ведмідь', s:'🐻', r:'Legend', m:5.5, c:'#f43f5e'}]
};

// 2. БАЗА ДАНИХ
db.ref('players/' + myId).on('value', snap => {
    if(snap.exists()){ 
        let data = snap.val();
        // ПЕРЕВІРКА: якщо інвентарю немає в базі, додаємо порожній масив
        if(!data.inv) data.inv = []; 
        s = data;
        ren(); 
    } else { 
        save(); 
    }
});

function save() {
    if(s.x >= s.r * 1000) { s.x = 0; s.r++; alert("Новий Ранг!"); }
    db.ref('players/' + myId).set(s);
    ren();
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
        let t = document.getElementById('p-rarity'); 
        t.textContent = s.p.r; 
        t.style.background = s.p.c;
    }
}

// 3. МАГАЗИН ТА ІНВЕНТАР
window.buy = (t, c) => {
    if(s.b < c) return alert("Мало BB!");
    s.b -= c;
    let r = Math.random();
    let newPet = { ...(r > 0.5 ? PETS_DB[t][0] : PETS_DB[t][1]), lvl: 1, id: Date.now(), egg: t };
    
    if(!s.inv) s.inv = [];
    s.inv.push(newPet);
    
    if(!s.p) s.p = newPet; 
    save();
    alert("Ти вибив: " + newPet.n);
};

function renderInv() {
    let list = document.getElementById('inv-list');
    // Якщо інвентар порожній
    if(!s.inv || s.inv.length === 0) {
        list.innerHTML = "<div style='text-align:center; padding:20px; opacity:0.5'>Тут поки що порожньо. Купи яйце в магазині!</div>";
        return;
    }
    
    let h = "";
    s.inv.forEach(p => {
        let isEq = s.p && s.p.id === p.id;
        let sPrice = Math.floor(EGG_COST[p.egg] * SELL_RATE[p.r]);
        h += `<div class="glass" style="display:flex; align-items:center; gap:10px; border:1px solid ${p.c}">
            <div style="font-size:30px">${p.s}</div>
            <div style="flex:1">
                <div style="color:${p.c}; font-weight:bold">${p.n}</div>
                <div style="font-size:10px">Lvl ${p.lvl} | x${(p.m + p.lvl*0.1).toFixed(1)}</div>
            </div>
            <div style="display:flex; flex-direction:column; gap:5px">
                <button class="btn-s" style="padding:4px 8px; font-size:10px; background:${isEq?'#555':''}" onclick="equip(${p.id})">${isEq?'Активний':'Взяти'}</button>
                <button class="btn-sell" onclick="sell(${p.id}, ${sPrice})">💵 ${sPrice}</button>
            </div>
        </div>`;
    });
    list.innerHTML = h;
}

window.equip = (id) => {
    let found = s.inv.find(i => i.id === id);
    if(found) { 
        s.p = found; 
        save(); 
        renderInv(); 
    }
};

window.sell = (id, pr) => {
    if(s.p && s.p.id === id) return alert("Не можна продати активного пета!");
    s.inv = s.inv.filter(i => i.id !== id);
    s.b += pr;
    save();
    renderInv();
};

// 4. НАВІГАЦІЯ
window.tab = (t, el) => {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.nav-tab').forEach(n => n.classList.remove('active'));
    
    let targetPage = document.getElementById('v-'+t);
    if(targetPage) {
        targetPage.style.display = 'block';
        el.classList.add('active');
        if(t === 'inv') renderInv();
        if(t === 'admin') loadAdmin();
    }
};

// --- РЕШТА ФУНКЦІЙ (Ігри, Топ, Адмінка) ---
window.updUI = () => {
    let g = document.getElementById('g-sel').value;
    document.getElementById('ui-dice').style.display = (g==='dice')?'block':'none';
    document.getElementById('ui-wheel').style.display = (g==='wheel')?'block':'none';
    document.getElementById('ui-bj').style.display = (g==='bj')?'block':'none';
};

let selN_val = 1;
window.selN = (n, el) => { 
    selN_val = n; 
    document.querySelectorAll('.n-btn').forEach(b => b.classList.remove('active')); 
    el.classList.add('active'); 
};

window.play = () => {
    let bt = parseInt(document.getElementById('bet-a').value);
    if(isNaN(bt) || bt <= 0 || bt > s.b) return alert("Мало BB!");
    let g = document.getElementById('g-sel').value;
    if(g === 'f50') res(Math.random() > 0.5, bt, 1.45);
    else if(g === 'dice') { 
        let r = Math.floor(Math.random()*6)+1; 
        setTimeout(() => res(r === selN_val, bt, 1.45), 500); 
    }
    else if(g === 'wheel') {
        let w = document.getElementById('w-obj'); 
        let deg = 1800 + Math.floor(Math.random()*360);
        w.style.transform = `rotate(${deg}deg)`;
        setTimeout(() => { 
            let p = Math.random()*100; 
            let m = (p<45)?0 : (p<80)?1.25 : (p<95)?1.5 : 1.75; 
            res(m>0, bt, m); 
        }, 3000);
    }
    else if(g === 'bj') startBJ(bt);
};

function res(win, bt, m) {
    if(win) {
        let bon = s.p ? (s.p.m + s.p.lvl*0.1) : 1;
        let winSum = Math.floor((bt * m - bt) * bon);
        s.b += winSum; 
        s.x += Math.floor(bt/4);
        document.getElementById('g-stat').innerHTML = `<span style="color:var(--success)">+${winSum} BB</span>`;
    } else {
        s.b -= bt; 
        document.getElementById('g-stat').innerHTML = `<span style="color:var(--error)">-${bt} BB</span>`;
    }
    save();
}

function startBJ(bt){ bj={p:[dr(),dr()], d:[dr()], bt}; document.getElementById('bj-ctrl').style.display='flex'; reBJ(); }
function dr(){ return Math.floor(Math.random()*10)+2; }
function reBJ(){
    document.getElementById('bj-pc').innerHTML=bj.p.map(c=>`<div class="bj-c">${c}</div>`).join('');
    document.getElementById('bj-dc').innerHTML=bj.d.map(c=>`<div class="bj-c">${c}</div>`).join('');
    if(bj.p.reduce((a,b)=>a+b,0)>21){ res(false,bj.bt,0); endBJ(); }
}
window.bjDo=(a)=>{
    const sum=(x)=>x.reduce((v,z)=>v+z,0);
    if(a==='hit'){ bj.p.push(dr()); reBJ(); }
    else { while(sum(bj.d)<17) bj.d.push(dr()); reBJ(); res(sum(bj.d)>21||sum(bj.p)>sum(bj.d),bj.bt,2); endBJ(); }
};
function endBJ(){ document.getElementById('bj-ctrl').style.display='none'; }

function loadAdmin() {
    db.ref('players').on('value', snap => {
        let h = ""; snap.forEach(c => {
            let p = c.val(); let id = c.key;
            h += `<div class="glass" style="font-size:12px"><b>${p.name}</b>: ${Math.floor(p.b)} BB
                <div style="display:flex; gap:5px; margin-top:5px"><input type="number" id="adm-${id}" style="margin:0; flex:1"><button class="btn-s" onclick="setB('${id}')">OK</button></div>
            </div>`;
        });
        document.getElementById('admin-list').innerHTML = h;
    });
}
window.setB = (id) => { let v = parseInt(document.getElementById('adm-'+id).value); if(!isNaN(v)) db.ref('players/'+id+'/b').set(v).then(()=>alert("OK")); };

db.ref('players').orderByChild('b').limitToLast(10).on('value', snap => {
    let h = ""; let arr = []; snap.forEach(p => arr.push(p.val()));
    arr.reverse().forEach(v => h += `<div style="display:flex; justify-content:space-between; margin-bottom:5px"><span>${v.name}</span><b>${Math.floor(v.b)}</b></div>`);
    document.getElementById('leaderboard').innerHTML = h;
});

updUI();
