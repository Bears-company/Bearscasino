const tg = window.Telegram.WebApp;
const db = firebase.database();
const myId = tg.initDataUnsafe?.user?.id || 101;
const myName = tg.initDataUnsafe?.user?.first_name || "Гравець";

let s = { b: 25, inv: [], p: null, name: myName };
let selN = 1;

// ЗАВАНТАЖЕННЯ
db.ref('players/' + myId).on('value', snap => {
    let d = snap.val();
    if(d) {
        s.b = Number(d.b) || 25;
        s.inv = Array.isArray(d.inv) ? d.inv : [];
        s.p = d.p || null;
        s.name = d.name || myName;
    } else {
        db.ref('players/' + myId).set(s);
    }
    ren();
});

function save() { db.ref('players/' + myId).update(s); }

// ПРОКАЧУВАННЯ
function addXP(amt) {
    if(!s.p) return;
    let idx = s.inv.findIndex(i => i.id === s.p.id);
    if(idx === -1) return;
    
    let p = s.inv[idx];
    p.xp = (p.xp || 0) + amt;
    let need = (p.lvl || 1) * 500;
    
    if(p.xp >= need) {
        p.xp -= need;
        p.lvl = (p.lvl || 1) + 1;
        p.m = (p.m || 1) + 0.005;
        alert("LEVEL UP! " + p.s + " став " + p.lvl + " рівня!");
    }
    s.p = p; save();
}

function ren() {
    document.getElementById('bal-val').innerText = s.b.toFixed(2);
    if(s.p) {
        document.getElementById('p-img').innerText = s.p.s;
        document.getElementById('p-name').innerText = s.p.n;
        document.getElementById('p-m').innerText = s.p.m.toFixed(3);
        document.getElementById('p-l').innerText = s.p.lvl || 1;
        let need = (s.p.lvl || 1) * 500;
        document.getElementById('xp-f').style.width = ((s.p.xp || 0) / need * 100) + "%";
        document.getElementById('u-rank').innerText = "PET LVL: " + (s.p.lvl || 1);
    } else {
        document.getElementById('u-rank').innerText = "НЕМАЄ ПЕТА";
    }
    if(window.ADMINS && ADMINS.includes(Number(myId))) document.getElementById('admin-tab').style.display = 'block';
}

// ІГРИ
window.play = () => {
    let bt = parseFloat(document.getElementById('bet-a').value);
    if(bt > s.b || bt <= 0) return alert("Мало BB!");
    let g = document.getElementById('g-sel').value;
    
    if(g === 'f50') {
        let w = Math.random() > 0.5;
        gameRes(w, bt, 1.55, w ? "Перемога!" : "Програш");
    } else {
        let r = Math.floor(Math.random() * 6) + 1;
        gameRes(r === selN, bt, 2.05, "Випало: " + r);
    }
};

function gameRes(win, bt, m, msg) {
    let bon = s.p ? s.p.m : 1;
    if(win) {
        let winAmt = (bt * m - bt) * bon;
        s.b += winAmt; addXP(bt * 0.1);
        document.getElementById('g-stat').innerHTML = `<span style="color:#10b981">+${winAmt.toFixed(2)} BB</span>`;
    } else {
        s.b -= bt; addXP(bt * 0.02);
        document.getElementById('g-stat').innerHTML = `<span style="color:#ef4444">-${bt.toFixed(2)} BB</span>`;
    }
    save();
}

// НАВІГАЦІЯ
window.tab = (t, el) => {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('v-'+t).style.display = 'block';
    el.classList.add('active');
    if(t === 'inv') renderInv();
    if(t === 'top') renderTop();
};

window.renderInv = () => {
    document.getElementById('inv-list').innerHTML = s.inv.map(p => `
        <div class="item-inv">
            <span>${p.s} ${p.n} (Lvl ${p.lvl || 1})</span>
            <button class="btn-s" onclick="equip(${p.id})">${s.p?.id === p.id ? '✅' : 'Взяти'}</button>
        </div>
    `).join('') || "Порожньо";
};

window.equip = (id) => { s.p = s.inv.find(i => i.id === id); save(); renderInv(); };

window.renderTop = () => {
    db.ref('players').orderByChild('b').limitToLast(10).once('value', snap => {
        let arr = []; snap.forEach(c => arr.push(c.val()));
        document.getElementById('top-list').innerHTML = arr.reverse().map((p, i) => `
            <div class="item-inv"><span>${i+1}. ${p.name}</span><b>${Math.floor(p.b)} BB</b></div>
        `).join('');
    });
};

// АДМІНКА
window.setATab = (t) => {
    let c = document.getElementById('admin-content');
    if(t === 'stats') {
        db.ref('players').once('value', snap => {
            let total = 0; snap.forEach(c => total += (c.val().b || 0));
            c.innerHTML = `💰 Грошей в грі: ${Math.floor(total)} BB`;
        });
    } else {
        c.innerHTML = `<input id="search-id" placeholder="Telegram ID..." oninput="adminSearch()"> <div id="admin-res"></div>`;
    }
};

window.adminSearch = () => {
    let id = document.getElementById('search-id').value;
    db.ref('players/' + id).once('value', snap => {
        let u = snap.val();
        if(!u) return;
        document.getElementById('admin-res').innerHTML = `<b>${u.name}</b>: ${u.b} BB <button onclick="db.ref('players/${id}/b').set(0)">Обнулити</button>`;
    });
};

// Ініціалізація кнопок кубика
window.updUI = () => {
    let h = ""; for(let i=1; i<=6; i++) h += `<button class="btn-s ${i===selN?'active':''}" onclick="selN=${i};updUI()">${i}</button>`;
    document.getElementById('dice-btns').innerHTML = h;
};
updUI();
