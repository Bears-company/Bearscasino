const firebaseConfig = {
    apiKey: "AIzaSyD7F2lrec5XWyMWG7J0uW6IhEKD-LJ4jRY",
    authDomain: "bearscasino-bcded.firebaseapp.com",
    projectId: "bearscasino-bcded",
    databaseURL: "https://bearscasino-bcded-default-rtdb.europe-west1.firebasedatabase.app"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const tg = window.Telegram.WebApp;

const ADMINS = [8216362223, 2067230442];
const myId = tg.initDataUnsafe?.user?.id || 101; 
const myName = tg.initDataUnsafe?.user?.first_name || "Гравець";

const CASES = {
    basic: { n: "Common Case 🐾", p: 250, drop: [{n:'Собака',s:'🐶',r:'Звичайний',m:1.05,c:'#94a3b8',w:70},{n:'Кролик',s:'🐰',r:'Рідкісний',m:1.1,c:'#3b82f6',w:30}] }
};

let s = { b: 0, name: myName, p: null, inv: [] };
let shopMode = 'cases';
let selN_val = 1;
let bj = null;

db.ref('players/' + myId).on('value', snap => {
    let d = snap.val();
    if(d) { s = d; if(!s.inv) s.inv = []; } 
    else { db.ref('players/' + myId).set(s); }
    ren();
});

function ren() {
    document.getElementById('bal-val').innerText = s.b.toFixed(2);
    if(s.p) {
        document.getElementById('p-img').innerText = s.p.s;
        document.getElementById('p-name').innerText = s.p.n;
        document.getElementById('p-m').innerText = (s.p.m || 1).toFixed(3);
        document.getElementById('p-l').innerText = s.p.lvl || 1;
        let nx = Math.floor(1000 * Math.pow(1.2, (s.p.lvl||1)-1));
        document.getElementById('xp-f').style.width = ((s.p.xp||0)/nx*100) + "%";
        document.getElementById('xp-num').innerText = `${s.p.xp||0}/${nx}`;
        let t = document.getElementById('p-rarity'); t.innerText = s.p.r; t.style.background = s.p.c;
    }
    if(ADMINS.includes(Number(myId))) document.getElementById('admin-tab').style.display = 'block';
}

window.tab = (t, el) => {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.nav-tab').forEach(n => n.classList.remove('active'));
    document.getElementById('v-'+t).style.display = 'block';
    el.classList.add('active');
    if(t==='shop') renderShop();
    if(t==='inv') renderInv();
    if(t==='top') loadTop();
    if(t==='admin') loadAdmin();
};

// --- РИНОК ТА МАГАЗИН ---
window.setShop = (m, el) => {
    shopMode = m;
    document.querySelectorAll('.s-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    renderShop();
};

function renderShop() {
    let h = "";
    if(shopMode === 'cases') {
        for(let k in CASES) {
            h += `<div class="market-item"><span>${CASES[k].n}</span><button class="btn-s" onclick="buyCase('${k}')">${CASES[k].p} BB</button></div>`;
        }
    } else {
        db.ref('market').once('value', snap => {
            let list = "";
            snap.forEach(l => {
                let lot = l.val();
                list += `<div class="market-item"><span>${lot.p.s} ${lot.p.n}</span><button class="btn-s" onclick="buyMarket('${l.key}')">${lot.price} BB</button></div>`;
            });
            document.getElementById('shop-list').innerHTML = list || "На ринку порожньо";
        });
        return;
    }
    document.getElementById('shop-list').innerHTML = h;
}

window.sellPet = (idx) => {
    let price = prompt("Введіть ціну продажу:");
    if(!price || isNaN(price)) return;
    let pet = s.inv[idx];
    db.ref('market').push({p: pet, price: Number(price), seller: myId});
    s.inv.splice(idx, 1);
    if(s.p && s.p.id === pet.id) s.p = null;
    db.ref('players/'+myId).set(s);
    renderInv();
};

// --- ІГРИ ---
window.play = () => {
    let bt = parseFloat(document.getElementById('bet-a').value);
    if(bt > s.b || bt <= 0 || isNaN(bt)) return alert("Немає грошей!");
    if(!s.p) return alert("Обери пета!");

    let g = document.getElementById('g-sel').value;
    if(g==='f50') res(Math.random()>0.5, bt, 1.55, "Монетка");
    if(g==='dice') res(Math.floor(Math.random()*6)+1 === selN_val, bt, 2.05, "Кубик");
    if(g==='wheel') spinWheel(bt);
    if(g==='bj') startBJ(bt);
};

function spinWheel(bt) {
    let deg = 720 + Math.floor(Math.random()*360);
    let obj = document.getElementById('w-obj');
    obj.style.transition = "transform 3s cubic-bezier(0.1, 0, 0.2, 1)";
    obj.style.transform = `rotate(${deg}deg)`;
    setTimeout(() => {
        let final = (deg % 360);
        let m = 0;
        if(final < 72) m = 0; else if(final < 144) m = 2; else if(final < 216) m = 0.5; else if(final < 288) m = 1.5; else m = 0;
        res(m > 0, bt, m, "Колесо");
        obj.style.transition = "none";
        obj.style.transform = `rotate(${final}deg)`;
    }, 3000);
}

function startBJ(bt) {
    bj = {p:[dr(),dr()], d:[dr()], bt};
    document.getElementById('bj-ctrl').style.display='flex';
    reBJ();
}

function bjDo(act) {
    if(act==='hit') { bj.p.push(dr()); if(sum(bj.p)>21) finishBJ(false); else reBJ(); }
    else { while(sum(bj.d)<17) bj.d.push(dr()); finishBJ(sum(bj.p)>sum(bj.d) || sum(bj.d)>21); }
}

function sum(arr) { return arr.reduce((a,b)=>a+b,0); }
function dr() { return Math.floor(Math.random()*10)+2; }

function reBJ() {
    document.getElementById('bj-pc').innerHTML = bj.p.map(c=>`<div class="card">${c}</div>`).join('');
    document.getElementById('bj-dc').innerHTML = bj.d.map(c=>`<div class="card">${c}</div>`).join('');
}

function finishBJ(win) {
    document.getElementById('bj-ctrl').style.display='none';
    res(win, bj.bt, 2, "Блекджек");
}

function res(win, bt, m, msg) {
    if(win) {
        let wAmount = (bt * m - bt) * s.p.m;
        s.b += wAmount;
        s.p.xp = (s.p.xp || 0) + Math.floor(bt);
        let nx = Math.floor(1000 * Math.pow(1.2, (s.p.lvl||1)-1));
        if(s.p.xp >= nx) { s.p.xp -= nx; s.p.lvl++; s.p.m += 0.005; alert("LEVEL UP!"); }
        document.getElementById('g-stat').innerHTML = `<span style="color:var(--success)">+${wAmount.toFixed(2)} BB (${msg})</span>`;
    } else {
        s.b -= bt;
        document.getElementById('g-stat').innerHTML = `<span style="color:var(--error)">-${bt.toFixed(2)} BB (${msg})</span>`;
    }
    db.ref('players/'+myId).set(s);
}

function loadTop() {
    db.ref('players').once('value', snap => {
        let arr = [];
        snap.forEach(c => { if(c.val().name) arr.push(c.val()); });
        arr.sort((a,b) => b.b - a.b);
        document.getElementById('leaderboard').innerHTML = arr.slice(0,10).map((p,i) => `
            <div class="market-item"><span>${i+1}. ${p.name}</span><b>${Math.floor(p.b)}</b></div>
        `).join('');
    });
}

function renderInv() {
    document.getElementById('inv-list').innerHTML = s.inv.map((p, i) => `
        <div class="market-item">
            <span>${p.s} ${p.n} (Lvl ${p.lvl||1})</span>
            <div style="display:flex; gap:5px">
                <button class="btn-s" onclick="equip(${i})">${s.p?.id===p.id?'✅':'ВЗЯТИ'}</button>
                <button class="btn-s" style="background:var(--warning)" onclick="sellPet(${i})">💰</button>
            </div>
        </div>
    `).join('');
}

window.equip = (idx) => { s.p = s.inv[idx]; db.ref('players/'+myId).set(s); renderInv(); };
window.updUI = () => {
    let g = document.getElementById('g-sel').value;
    document.getElementById('ui-dice').style.display = g==='dice'?'block':'none';
    document.getElementById('ui-wheel').style.display = g==='wheel'?'block':'none';
    document.getElementById('ui-bj').style.display = g==='bj'?'block':'none';
};
