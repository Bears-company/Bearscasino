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
const myId = Number(tg.initDataUnsafe?.user?.id) || 101;

let s = { b: 0, p: null, inv: [] };
let selD = 1;
let bj = null;

// ЗАВАНТАЖЕННЯ (Відновлюємо твоїх петів)
db.ref('players/' + myId).on('value', snap => {
    let d = snap.val();
    if(d) {
        s = d;
        if(!s.inv) s.inv = [];
    } else {
        db.ref('players/' + myId).set(s);
    }
    renderUI();
});

function renderUI() {
    document.getElementById('bal-val').innerText = Math.floor(s.b);
    if(s.p) {
        document.getElementById('p-name').innerText = s.p.n;
        document.getElementById('p-img').innerText = s.p.s || '🥚';
        document.getElementById('p-l').innerText = s.p.lvl || 1;
        let nx = Math.floor(1000 * Math.pow(1.2, (s.p.lvl||1)-1));
        document.getElementById('xp-f').style.width = ((s.p.xp||0)/nx*100) + "%";
    }
    if(ADMINS.includes(myId)) document.getElementById('adm-nav').style.display = 'flex';
}

// НАВІГАЦІЯ
window.tab = (t, el) => {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.n-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('v-'+t).style.display = 'block';
    el.classList.add('active');
    if(t === 'inv') renderInv();
    if(t === 'admin') renderAdmin();
};

// МАГАЗИН (Купівля як ти хотів)
window.buyEgg = () => {
    if(s.b < 250) return alert("Немає BB!");
    s.b -= 250;
    let newPet = { n: "Ведмідь", s: "🧸", r: "Common", c: "#aaa", lvl: 1, xp: 0, m: 1.05 };
    s.inv.push(newPet);
    db.ref('players/' + myId).set(s);
    alert("Яйце додано в інвентар!");
};

window.switchShop = (m) => {
    document.getElementById('shop-cases').style.display = m==='cases'?'block':'none';
    document.getElementById('shop-market').style.display = m==='market'?'block':'none';
};

// АДМІНКА (Збільшити, зменшити, задати)
function renderAdmin() {
    db.ref('players').limitToFirst(10).once('value', snap => {
        let h = "";
        snap.forEach(u => {
            h += `<div class="item"><span>${u.val().name || u.key}</span><button onclick="admOp('${u.key}')">КЕРУВАТИ</button></div>`;
        });
        document.getElementById('admin-list').innerHTML = h;
    });
}

window.admOp = (id) => {
    let mode = prompt("1: Додати, 2: Відняти, 3: Задати баланс");
    let val = Number(prompt("Введіть суму:"));
    if(!val && mode !== '3') return;
    let r = db.ref('players/'+id+'/b');
    if(mode === '1') r.transaction(b => (b || 0) + val);
    if(mode === '2') r.transaction(b => (b || 0) - val);
    if(mode === '3') r.set(val);
};

// ІГРИ
window.playGame = () => {
    let bt = Number(document.getElementById('bet-a').value);
    if(bt > s.b || bt <= 0) return alert("Мало BB!");
    if(!s.p) return alert("Обери пета в інвентарі!");

    let g = document.getElementById('g-sel').value;
    if(g==='dice') finalize(Math.floor(Math.random()*6)+1 === selD, bt, 2.05);
    if(g==='wheel') spinWheel(bt);
    if(g==='bj') startBJ(bt);
};

function finalize(win, bt, m) {
    let res = document.getElementById('g-res');
    if(win) {
        let winSum = (bt * m - bt) * (s.p.m || 1);
        s.b += winSum; s.p.xp += Math.floor(bt);
        res.innerHTML = `<span style="color:#2ea043">+${winSum.toFixed(1)} BB</span>`;
    } else {
        s.b -= bt;
        res.innerHTML = `<span style="color:#f85149">-${bt} BB</span>`;
    }
    db.ref('players/'+myId).set(s);
}

function spinWheel(bt) {
    let deg = 720 + Math.floor(Math.random()*360);
    let w = document.getElementById('w-obj');
    w.style.transition = "3s cubic-bezier(0.1,0,0.2,1)";
    w.style.transform = `rotate(${deg}deg)`;
    setTimeout(() => {
        let f = deg % 360; let m = 0;
        if(f>=72 && f<144) m=2; else if(f>=144 && f<216) m=0.5; else if(f>=216 && f<288) m=1.5;
        finalize(m>0, bt, m);
    }, 3000);
}

function startBJ(bt) {
    bj = { p: [rc(), rc()], d: [rc()], bt: bt };
    document.getElementById('bj-ctrl').style.display = 'flex';
    renderBJ();
}
function rc() { return Math.floor(Math.random()*10)+2; }
function renderBJ() {
    document.getElementById('bj-pc').innerHTML = bj.p.map(c=>`<div class="card">${c}</div>`).join('');
    document.getElementById('bj-dc').innerHTML = bj.d.map(c=>`<div class="card">${c}</div>`).join('');
}
window.bjStep = (a) => {
    if(a==='hit') {
        bj.p.push(rc());
        if(bj.p.reduce((a,b)=>a+b,0)>21) finishBJ(false); else renderBJ();
    } else {
        while(bj.d.reduce((a,b)=>a+b,0)<17) bj.d.push(rc());
        let ps = bj.p.reduce((a,b)=>a+b,0), ds = bj.d.reduce((a,b)=>a+b,0);
        finishBJ(ds>21 || ps>ds);
    }
};
function finishBJ(w) { document.getElementById('bj-ctrl').style.display='none'; finalize(w, bj.bt, 2); }

// ІНВЕНТАР
function renderInv() {
    document.getElementById('inv-list').innerHTML = s.inv.map((p, i) => `
        <div class="item"><span>${p.s} ${p.n} (x${p.m})</span><button onclick="equip(${i})">ВЗЯТИ</button></div>
    `).join('');
}
window.equip = (i) => { s.p = s.inv[i]; db.ref('players/'+myId).set(s); };

window.switchGame = () => {
    let g = document.getElementById('g-sel').value;
    document.getElementById('ui-dice').style.display = g==='dice'?'block':'none';
    document.getElementById('ui-wheel').style.display = g==='wheel'?'block':'none';
    document.getElementById('ui-bj').style.display = g==='bj'?'block':'none';
};
window.selDice = (n, el) => {
    selD = n;
    document.querySelectorAll('.d-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
};
