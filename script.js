// 1. НАЛАШТУВАННЯ
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

let s = { b: 5000, x: 0, r: 1, name: myName, p: null, inv: [] };

const PETS_DB = {
    wood: [{n:'Песик', s:'🐶', r:'Common', m:1.2, c:'#94a3b8'}, {n:'Котик', s:'🐱', r:'Common', m:1.2, c:'#94a3b8'}],
    iron: [{n:'Єнот', s:'🦝', r:'Rare', m:1.8, c:'#3b82f6'}, {n:'Лисиця', s:'🦊', r:'Rare', m:2.0, c:'#3b82f6'}],
    diam: [{n:'Шарк', s:'🦈', r:'Epic', m:3.5, c:'#a855f7'}, {n:'Ведмідь', s:'🐻', r:'Legend', m:5.5, c:'#f43f5e'}]
};

// 2. СИНХРОНІЗАЦІЯ З БАЗОЮ
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
        let t = document.getElementById('p-rarity'); t.textContent = s.p.r; t.style.background = s.p.c;
    }
}

// 3. СИСТЕМА КЕЙСІВ (РУЛЕТКА)
window.buy = (t, c) => {
    if(s.b < c) return alert("Мало BB!");
    s.b -= c;
    save();
    
    const modal = document.getElementById('case-modal');
    const scroll = document.getElementById('case-scroll');
    const resText = document.getElementById('case-res');
    const closeBtn = document.getElementById('case-close');
    
    modal.style.display = 'flex';
    resText.textContent = "";
    closeBtn.style.display = 'none';
    
    // Візуал прокрутки
    let pool = [...PETS_DB.wood, ...PETS_DB.iron, ...PETS_DB.diam];
    let itemsHTML = "";
    for(let i=0; i<45; i++) {
        let p = pool[Math.floor(Math.random()*pool.length)];
        itemsHTML += `<div class="case-item" style="border-color:${p.c}">${p.s}</div>`;
    }
    scroll.innerHTML = itemsHTML;
    scroll.style.transition = "0s";
    scroll.style.left = "0px";

    // Результат (визначається наперед)
    let winPet = { ...(Math.random() > 0.5 ? PETS_DB[t][0] : PETS_DB[t][1]), lvl: 1, id: Date.now(), egg: t };
    
    // Вставляємо результат у 40-ву позицію
    setTimeout(() => {
        let all = document.querySelectorAll('.case-item');
        all[40].innerHTML = winPet.s;
        all[40].style.borderColor = winPet.c;
        all[40].style.background = "rgba(255,183,3,0.1)";
        
        scroll.style.transition = "5s cubic-bezier(0.1, 0, 0.1, 1)";
        scroll.style.left = `-${40 * 90 - 120}px`;
    }, 50);

    setTimeout(() => {
        resText.innerHTML = `<span style="color:${winPet.c}">${winPet.n.toUpperCase()}!</span>`;
        closeBtn.style.display = "block";
        if(!s.inv) s.inv = [];
        s.inv.push(winPet);
        save();
    }, 5500);
};

window.closeCase = () => document.getElementById('case-modal').style.display = 'none';

// 4. ІНВЕНТАР ТА РИНОК
function renderInv() {
    let list = document.getElementById('inv-list');
    if(!s.inv || s.inv.length === 0) return list.innerHTML = "Порожньо...";
    let h = "";
    s.inv.forEach(p => {
        let isEq = s.p && s.p.id === p.id;
        h += `<div class="market-card" style="border-color:${p.c}">
            <div style="font-size:30px">${p.s}</div>
            <div style="flex:1">
                <b style="color:${p.c}">${p.n}</b><br><small>Lvl ${p.lvl}</small>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px">
                <button class="btn-s" style="padding:4px 8px; font-size:10px; background:${isEq?'#444':''}" onclick="equip(${p.id})">${isEq?'АКТИВ':'ВЗЯТИ'}</button>
                <button class="btn-s" style="padding:4px 8px; font-size:10px; background:var(--success)" onclick="marketSell(${p.id})">РИНОК</button>
            </div>
        </div>`;
    });
    list.innerHTML = h;
}

window.equip = (id) => {
    let f = s.inv.find(i => i.id === id);
    if(f) { s.p = f; save(); renderInv(); }
};

// Продаж на ринок
window.marketSell = (id) => {
    if(s.p && s.p.id === id) return alert("Зніміть пета спочатку!");
    let price = prompt("Введіть ціну (BB):");
    price = parseInt(price);
    if(isNaN(price) || price <= 0) return;

    let idx = s.inv.findIndex(p => p.id === id);
    let pet = s.inv[idx];

    db.ref('market/' + id).set({
        pet: pet, price: price, sellerId: myId, sellerName: s.name
    }).then(() => {
        s.inv.splice(idx, 1);
        save();
        renderInv();
        alert("Лот виставлено!");
    });
};

function renderMarket() {
    db.ref('market').on('value', snap => {
        let h = "";
        if(!snap.exists()) h = "<center>Лотів немає</center>";
        snap.forEach(l => {
            let lot = l.val();
            h += `<div class="market-card">
                <div style="font-size:30px">${lot.pet.s}</div>
                <div style="flex:1"><b>${lot.pet.n}</b><br><small>Продавець: ${lot.sellerName}</small></div>
                <button class="btn-s" onclick="buyLot('${l.key}', ${lot.price})">${lot.price}</button>
            </div>`;
        });
        document.getElementById('market-list').innerHTML = h;
    });
}

window.buyLot = (lId, pr) => {
    if(s.b < pr) return alert("Мало BB!");
    db.ref('market/' + lId).once('value', snap => {
        let lot = snap.val();
        if(lot.sellerId === myId) return alert("Це твій лот!");
        
        s.b -= pr;
        if(!s.inv) s.inv = [];
        s.inv.push(lot.pet);
        save();
        
        db.ref('players/' + lot.sellerId + '/b').transaction(c => (c||0) + pr);
        db.ref('market/' + lId).remove();
        alert("КУПЛЕНО!");
    });
};

// 5. НАВІГАЦІЯ
window.tab = (t, el) => {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.nav-tab').forEach(n => n.classList.remove('active'));
    document.getElementById('v-'+t).style.display = 'block';
    el.classList.add('active');
    if(t === 'inv') renderInv();
    if(t === 'market') renderMarket();
    if(t === 'admin') loadAdmin();
};

// 6. ІГРОВА ЛОГІКА (БЕЗ ЗМІН)
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
    if(g === 'f50') res(Math.random() > 0.5, bt, 1.45);
    else if(g === 'dice') { let r = Math.floor(Math.random()*6)+1; setTimeout(() => res(r === selN_val, bt, 1.45), 500); }
    else if(g === 'wheel') {
        let w = document.getElementById('w-obj'); let deg = 1800 + Math.floor(Math.random()*360);
        w.style.transform = `rotate(${deg}deg)`;
        setTimeout(() => { let p = Math.random()*100; let m = (p<45)?0 : (p<80)?1.25 : (p<95)?1.5 : 1.75; res(m>0, bt, m); }, 3000);
    }
    else if(g === 'bj') startBJ(bt);
};

function res(win, bt, m) {
    if(win) {
        let bon = s.p ? (s.p.m + s.p.lvl*0.1) : 1;
        let winSum = Math.floor((bt * m - bt) * bon);
        s.b += winSum; s.x += Math.floor(bt/4);
        document.getElementById('g-stat').innerHTML = `<span style="color:var(--success)">+${winSum} BB</span>`;
    } else {
        s.b -= bt; document.getElementById('g-stat').innerHTML = `<span style="color:var(--error)">-${bt} BB</span>`;
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

updUI();
