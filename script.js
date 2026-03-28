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

let u = { b: 0, p: null, inv: [] };
let dVal = 1;
let bj = null;

// ЗАВАНТАЖЕННЯ ДАНИХ (БЕЗ ВТРАТИ ПЕТІВ)
db.ref('players/' + myId).on('value', snap => {
    let data = snap.val();
    if(data) { 
        u = data; 
        if(!u.inv) u.inv = []; 
    } else { 
        db.ref('players/' + myId).set(u); 
    }
    render();
});

function render() {
    document.getElementById('bal-val').innerText = Math.floor(u.b);
    if(u.p) {
        document.getElementById('p-img').innerText = u.p.s || '🥚';
        document.getElementById('p-name').innerText = u.p.n;
        document.getElementById('p-l').innerText = u.p.lvl || 1;
        let nx = Math.floor(1000 * Math.pow(1.2, (u.p.lvl||1)-1));
        document.getElementById('xp-f').style.width = ((u.p.xp||0)/nx*100) + "%";
        let r = document.getElementById('p-rarity'); r.innerText = u.p.r; r.style.color = u.p.c;
    }
    if(ADMINS.includes(myId)) document.getElementById('adm-nav').style.display = 'flex';
}

// НАВІГАЦІЯ
window.tab = (t, el) => {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.n-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('v-'+t).style.display = 'block';
    el.classList.add('active');
    if(t==='admin') loadAdmin();
    if(t==='inv') renderInv();
};

// МАГАЗИН
window.setS = (m) => {
    document.getElementById('s-c').style.display = m==='c'?'block':'none';
    document.getElementById('s-m').style.display = m==='m'?'block':'none';
    document.getElementById('ts1').classList.toggle('active', m==='c');
    document.getElementById('ts2').classList.toggle('active', m==='m');
};

window.buyEgg = (type) => {
    if(u.b < 250) return alert("Мало BB!");
    u.b -= 250;
    let newPet = { n: "Ведмідь", s: "🧸", r: "COMMON", c: "#fff", lvl: 1, xp: 0, m: 1.05, id: Date.now() };
    u.inv.push(newPet);
    db.ref('players/'+myId).set(u);
    alert("Ти купив яйце! Перевір інвентар.");
};

// АДМІНКА (ВИПРАВЛЕНО)
function loadAdmin() {
    db.ref('players').limitToFirst(10).once('value', snap => {
        let h = "";
        snap.forEach(s => {
            h += `<div class="item">
                <span>${s.val().name || s.key}</span>
                <button onclick="adminAction('${s.key}')">КЕРУВАТИ</button>
            </div>`;
        });
        document.getElementById('admin-users').innerHTML = h;
    });
}

window.adminAction = (id) => {
    let mode = prompt("1: Додати BB, 2: Відняти BB, 3: Встановити баланс");
    let val = Number(prompt("Введіть суму:"));
    if(!val) return;
    
    let ref = db.ref('players/'+id+'/b');
    if(mode === '1') ref.transaction(b => (b || 0) + val);
    if(mode === '2') ref.transaction(b => (b || 0) - val);
    if(mode === '3') ref.set(val);
};

// ІГРИ (БЛЕКДЖЕК ТА КОЛЕСО)
window.play = () => {
    let bt = Number(document.getElementById('bet-a').value);
    if(bt > u.b || bt <= 0) return alert("Мало BB!");
    if(!u.p) return alert("Обери пета!");

    let g = document.getElementById('g-sel').value;
    if(g==='dice') finalize(Math.floor(Math.random()*6)+1 === dVal, bt, 2.05);
    if(g==='wheel') spin(bt);
    if(g==='bj') startBJ(bt);
};

function finalize(win, bt, m) {
    if(win) {
        let p = (bt * m - bt) * (u.p.m || 1);
        u.b += p; u.p.xp += Math.floor(bt);
        document.getElementById('g-res').innerHTML = `<span style="color:var(--success)">+${p.toFixed(1)} BB</span>`;
    } else {
        u.b -= bt;
        document.getElementById('g-res').innerHTML = `<span style="color:var(--error)">-${bt} BB</span>`;
    }
    db.ref('players/'+myId).set(u);
}

function spin(bt) {
    let deg = 720 + Math.floor(Math.random()*360);
    let o = document.getElementById('w-obj');
    o.style.transition = "3s cubic-bezier(0.1,0,0.2,1)";
    o.style.transform = `rotate(${deg}deg)`;
    setTimeout(() => {
        let f = deg % 360; let m = 0;
        if(f<72) m=0; else if(f<144) m=2; else if(f<216) m=0.5; else if(f<288) m=1.5; else m=0;
        finalize(m>0, bt, m);
    }, 3000);
}

function startBJ(bt) {
    bj = { p: [rC(), rC()], d: [rC()], bt: bt };
    document.getElementById('bj-ctrl').style.display = 'flex';
    renderBJ();
}
function rC() { return Math.floor(Math.random()*10)+2; }
function renderBJ() {
    document.getElementById('bj-pc').innerHTML = bj.p.map(c=>`<div class="card">${c}</div>`).join('');
    document.getElementById('bj-dc').innerHTML = bj.d.map(c=>`<div class="card">${c}</div>`).join('');
}
window.bjStep = (a) => {
    if(a==='hit') {
        bj.p.push(rC());
        if(bj.p.reduce((a,b)=>a+b,0) > 21) finishBJ(false);
        else renderBJ();
    } else {
        while(bj.d.reduce((a,b)=>a+b,0) < 17) bj.d.push(rC());
        let pS = bj.p.reduce((a,b)=>a+b,0);
        let dS = bj.d.reduce((a,b)=>a+b,0);
        finishBJ(dS > 21 || pS > dS);
    }
};
function finishBJ(w) {
    document.getElementById('bj-ctrl').style.display = 'none';
    finalize(w, bj.bt, 2);
}

window.renderInv = () => {
    document.getElementById('inv-list').innerHTML = u.inv.map((p, i) => `
        <div class="item"><span>${p.s} ${p.n}</span><button onclick="equip(${i})">ВЗЯТИ</button></div>
    `).join('');
};
window.equip = (i) => { u.p = u.inv[i]; db.ref('players/'+myId).set(u); };
window.updUI = () => {
    let g = document.getElementById('g-sel').value;
    document.getElementById('ui-dice').style.display = g==='dice'?'block':'none';
    document.getElementById('ui-wheel').style.display = g==='wheel'?'block':'none';
    document.getElementById('ui-bj').style.display = g==='bj'?'block':'none';
};
window.selD = (n, el) => {
    dVal = n;
    document.querySelectorAll('.d-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
};
