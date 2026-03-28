const firebaseConfig = {
    apiKey: "AIzaSyD7F2lrec5XWyMWG7J0uW6IhEKD-LJ4jRY",
    authDomain: "bearscasino-bcded.firebaseapp.com",
    projectId: "bearscasino-bcded",
    databaseURL: "https://bearscasino-bcded-default-rtdb.europe-west1.firebasedatabase.app"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const tg = window.Telegram.WebApp;

const ADMINS = [2067230442, 8216362223];
const myId = tg.initDataUnsafe?.user?.id || 101; 
const myName = tg.initDataUnsafe?.user?.first_name || "Гравець";

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
    document.getElementById('bal-val').innerText = Math.floor(s.b);
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

window.setShop = (mode, el) => {
    shopMode = mode;
    document.querySelectorAll('.s-tab').forEach(btn => btn.classList.remove('active'));
    el.classList.add('active');
    renderShop();
};

function renderShop() {
    let list = document.getElementById('shop-list');
    if(shopMode === 'cases') {
        list.innerHTML = `<div class="market-item"><span>Common Case 🐾</span><button class="btn-s" onclick="buyCase()">250 BB</button></div>`;
    } else {
        db.ref('market').once('value', snap => {
            let h = "";
            snap.forEach(l => {
                let lot = l.val();
                h += `<div class="market-item"><span>${lot.p.s} ${lot.p.n}</span><button class="btn-s" onclick="buyMarket('${l.key}')">${lot.price} BB</button></div>`;
            });
            list.innerHTML = h || "Ринок порожній";
        });
    }
}

window.loadAdmin = () => {
    db.ref('players').once('value', snap => {
        let h = "";
        snap.forEach(c => {
            let p = c.val();
            h += `<div class="market-item"><span>${p.name} (ID: ${c.key})</span><button class="btn-s" onclick="mathB('${c.key}')">БАЛАНС</button></div>`;
        });
        document.getElementById('admin-list').innerHTML = h;
    });
};

window.mathB = (id) => {
    let v = prompt("Введіть новий баланс:");
    if(v !== null) db.ref('players/'+id+'/b').set(Number(v));
};

window.play = () => {
    let bt = parseFloat(document.getElementById('bet-a').value);
    if(bt > s.b || bt <= 0) return alert("Недостатньо BB!");
    if(!s.p) return alert("Обери пета!");
    let g = document.getElementById('g-sel').value;
    if(g==='f50') res(Math.random()>0.5, bt, 1.55, "50/50");
    else if(g==='dice') res(Math.floor(Math.random()*6)+1 === selN_val, bt, 2.05, "Кубик");
    else if(g==='wheel') spinWheel(bt);
    else if(g==='bj') startBJ(bt);
};

function res(win, bt, m, msg) {
    if(win) {
        let w = (bt * m - bt) * s.p.m; s.b += w;
        s.p.xp = (s.p.xp || 0) + Math.floor(bt);
        let nx = Math.floor(1000 * Math.pow(1.2, (s.p.lvl||1)-1));
        if(s.p.xp >= nx) { s.p.xp -= nx; s.p.lvl++; s.p.m += 0.005; }
        document.getElementById('g-stat').innerHTML = `<span style="color:var(--success)">+${w.toFixed(1)} BB</span>`;
    } else {
        s.b -= bt;
        document.getElementById('g-stat').innerHTML = `<span style="color:var(--error)">-${bt} BB</span>`;
    }
    db.ref('players/'+myId).set(s);
}

function spinWheel(bt) {
    let deg = 720 + Math.floor(Math.random()*360);
    let obj = document.getElementById('w-obj');
    obj.style.transition = "transform 3s cubic-bezier(0.1, 0, 0.2, 1)";
    obj.style.transform = `rotate(${deg}deg)`;
    setTimeout(() => {
        let f = deg % 360; let m = 0;
        if(f<72) m=0; else if(f<144) m=2; else if(f<216) m=0.5; else if(f<288) m=1.5; else m=0;
        res(m>0, bt, m, "Колесо");
        obj.style.transition = "none"; obj.style.transform = `rotate(${f}deg)`;
    }, 3000);
}

function startBJ(bt) {
    bj = {p:[dr(),dr()], d:[dr()], bt};
    document.getElementById('bj-ctrl').style.display='flex';
    reBJ();
}
function bjDo(a) {
    if(a==='hit') { bj.p.push(dr()); if(sum(bj.p)>21) finishBJ(false); else reBJ(); }
    else { while(sum(bj.d)<17) bj.d.push(dr()); finishBJ(sum(bj.p)>sum(bj.d) || sum(bj.d)>21); }
}
function sum(a) { return a.reduce((x,y)=>x+y,0); }
function dr() { return Math.floor(Math.random()*10)+2; }
function reBJ() {
    document.getElementById('bj-pc').innerHTML = bj.p.map(c=>`<div class="card">${c}</div>`).join('');
    document.getElementById('bj-dc').innerHTML = bj.d.map(c=>`<div class="card">${c}</div>`).join('');
}
function finishBJ(w) {
    document.getElementById('bj-ctrl').style.display='none';
    res(w, bj.bt, 2, "Блекджек");
}

function loadTop() {
    db.ref('players').once('value', snap => {
        let a = []; snap.forEach(c => { if(c.val().name) a.push(c.val()); });
        a.sort((x,y)=>y.b-x.b);
        document.getElementById('leaderboard').innerHTML = a.slice(0,10).map((p,i)=>`
            <div class="market-item"><span>${i+1}. ${p.name}</span><b>${Math.floor(p.b)} BB</b></div>
        `).join('');
    });
}

function renderInv() {
    document.getElementById('inv-list').innerHTML = s.inv.map((p, i) => `
        <div class="market-item"><span>${p.s} ${p.n}</span><button class="btn-s" onclick="equip(${i})">${s.p?.id===p.id?'✅':'ВЗЯТИ'}</button></div>
    `).join('');
}
window.equip = (i) => { s.p = s.inv[i]; db.ref('players/'+myId).set(s); renderInv(); };
window.selN = (n, el) => {
    selN_val = n;
    document.querySelectorAll('.d-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
};
window.updUI = () => {
    let g = document.getElementById('g-sel').value;
    document.getElementById('ui-dice').style.display = g==='dice'?'block':'none';
    document.getElementById('ui-wheel').style.display = g==='wheel'?'block':'none';
    document.getElementById('ui-bj').style.display = g==='bj'?'block':'none';
};
