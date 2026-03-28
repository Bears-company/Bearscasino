const firebaseConfig = {
    apiKey: "AIzaSyD7F2lrec5XWyMWG7J0uW6IhEKD-LJ4jRY",
    authDomain: "bearscasino-bcded.firebaseapp.com",
    projectId: "bearscasino-bcded",
    databaseURL: "https://bearscasino-bcded-default-rtdb.europe-west1.firebasedatabase.app"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const tg = window.Telegram.WebApp;

// ПЕРЕВІРКА АДМІНІВ
const ADMINS = [2067230442, 8216362223];
const myId = Number(tg.initDataUnsafe?.user?.id) || 101; 
const myName = tg.initDataUnsafe?.user?.first_name || "Гравець";

let s = { b: 0, name: myName, p: null, inv: [] };
let currentShop = 'cases';
let selN_val = 1;

// ЗАВАНТАЖЕННЯ ДАНИХ
db.ref('players/' + myId).on('value', snap => {
    let d = snap.val();
    if(d) { 
        s = d; 
        if(!s.inv) s.inv = []; 
    } else { 
        db.ref('players/' + myId).set(s); 
    }
    ren();
});

function ren() {
    document.getElementById('bal-val').innerText = Math.floor(s.b);
    if(s.p) {
        document.getElementById('p-img').innerText = s.p.s || "🥚";
        document.getElementById('p-name').innerText = s.p.n || "Пет";
        document.getElementById('p-m').innerText = (s.p.m || 1).toFixed(3);
        document.getElementById('p-l').innerText = s.p.lvl || 1;
        let nx = Math.floor(1000 * Math.pow(1.2, (s.p.lvl||1)-1));
        document.getElementById('xp-f').style.width = ((s.p.xp||0)/nx*100) + "%";
        document.getElementById('xp-num').innerText = `${s.p.xp||0}/${nx}`;
        let t = document.getElementById('p-rarity'); 
        t.innerText = s.p.r || "Common"; 
        t.style.background = s.p.c || "#333";
    }
    // Вмикаємо адмінку
    if(ADMINS.includes(myId)) {
        document.getElementById('admin-tab').style.display = 'block';
    }
}

// НАВІГАЦІЯ
window.tab = (t, el) => {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.nav-tab').forEach(n => n.classList.remove('active'));
    document.getElementById('v-'+t).style.display = 'block';
    el.classList.add('active');
    if(t==='shop') renderShopUI();
    if(t==='inv') renderInv();
    if(t==='top') loadTop();
    if(t==='admin') loadAdmin();
};

// РИНОК ТА МАГАЗИН (ВИПРАВЛЕНО)
window.setShopMode = (mode) => {
    currentShop = mode;
    document.querySelectorAll('.s-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + mode).classList.add('active');
    renderShopUI();
};

function renderShopUI() {
    let cont = document.getElementById('shop-content');
    if(currentShop === 'cases') {
        cont.innerHTML = `<div class="market-item"><span>Common Case 🐾</span><button class="btn-s" onclick="alert('У розробці')">250 BB</button></div>`;
    } else {
        db.ref('market').once('value', snap => {
            let h = "";
            snap.forEach(l => {
                let lot = l.val();
                h += `<div class="market-item"><span>${lot.p.s} ${lot.p.n}</span><button class="btn-s" onclick="buyLot('${l.key}')">${lot.price} BB</button></div>`;
            });
            cont.innerHTML = h || "<p style='text-align:center; opacity:0.5'>Ринок порожній</p>";
        });
    }
}

// АДМІНКА
window.loadAdmin = () => {
    db.ref('players').limitToFirst(20).once('value', snap => {
        let h = "";
        snap.forEach(c => {
            let p = c.val();
            h += `<div class="market-item"><span>${p.name || 'User'}</span><button class="btn-s" style="background:var(--success)" onclick="adminSetB('${c.key}')">EDIT</button></div>`;
        });
        document.getElementById('admin-list').innerHTML = h;
    });
};

window.adminSetB = (id) => {
    let v = prompt("Введіть новий баланс:");
    if(v !== null) db.ref('players/' + id + '/b').set(Number(v));
};

// ГРА
window.play = () => {
    let bt = parseFloat(document.getElementById('bet-a').value);
    if(bt > s.b || bt <= 0) return alert("Недостатньо BB!");
    if(!s.p) return alert("Спершу візьми пета в інвентарі!");

    let g = document.getElementById('g-sel').value;
    if(g==='f50') gameRes(Math.random()>0.5, bt, 1.55, "50/50");
    else if(g==='dice') gameRes(Math.floor(Math.random()*6)+1 === selN_val, bt, 2.05, "DICE");
    else if(g==='wheel') { /* колесо тут */ }
};

function gameRes(win, bt, m, msg) {
    let stat = document.getElementById('g-stat');
    if(win) {
        let winAmount = (bt * m - bt) * (s.p.m || 1);
        s.b += winAmount;
        s.p.xp = (s.p.xp || 0) + Math.floor(bt);
        stat.innerHTML = `<div class="win-msg">+${winAmount.toFixed(1)} BB</div>`;
    } else {
        s.b -= bt;
        stat.innerHTML = `<div class="lose-msg">-${bt} BB</div>`;
    }
    db.ref('players/' + myId).set(s);
}

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
