// --- ІНІЦІАЛІЗАЦІЯ ТА КОНФІГУРАЦІЯ ---
const tg = window.Telegram.WebApp;
const db = firebase.database();

const myId = tg.initDataUnsafe?.user?.id || 101; 
const myName = tg.initDataUnsafe?.user?.first_name || "Гравець";

// Початковий стан для НОВОГО гравця
let s = { 
    b: 25,            // Початковий баланс тепер 25
    inv: [],          
    p: null,          
    name: myName, 
    v: 4.2            
};

let selN_val = 1; 

// --- ЗАВАНТАЖЕННЯ ТА ЗБЕРЕЖЕННЯ ---
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

function save() { 
    db.ref('players/' + myId).update(s); 
}

// --- СИСТЕМА ПРОКАЧУВАННЯ ПЕТА (XP & LVL) ---
function addPetXP(amount) {
    if (!s.p) return; 

    let idx = s.inv.findIndex(i => i.id === s.p.id);
    if(idx === -1) return;

    let pet = s.inv[idx];
    pet.xp = (pet.xp || 0) + amount;
    
    // ФОРМУЛА: Базово 500 XP, кожен наступний рівень на 20% важче
    let lvl = pet.lvl || 1;
    let need = Math.floor(500 * Math.pow(1.2, lvl - 1));

    if (pet.xp >= need) {
        pet.xp -= need;
        pet.lvl = lvl + 1;
        pet.m += 0.005; // Бонус +0.005 до множника за рівень
        tg.HapticFeedback.notificationOccurred('success');
        alert(`🆙 LEVEL UP! ${pet.s} тепер ${pet.lvl} рівня!\nМножник став: x${pet.m.toFixed(3)}`);
    }
    
    s.p = pet; 
    save();
}

// --- РЕНДЕР ІНТЕРФЕЙСУ ---
function ren() {
    let disp = Number.isInteger(s.b) ? s.b : s.b.toFixed(2);
    document.getElementById('bal-val').innerText = disp;
    
    if(s.p) {
        document.getElementById('p-img').innerText = s.p.s;
        document.getElementById('p-name').innerText = s.p.n;
        document.getElementById('p-m').innerText = s.p.m.toFixed(3);
        document.getElementById('p-l').innerText = s.p.lvl || 1;
        
        // Розрахунок XP для прогрес-бару
        let lvl = s.p.lvl || 1;
        let need = Math.floor(500 * Math.pow(1.2, lvl - 1));
        let progress = ((s.p.xp || 0) / need) * 100;
        document.getElementById('xp-f').style.width = Math.min(progress, 100) + "%";
        
        document.getElementById('u-rank').innerText = "PET LVL: " + lvl;
        let t = document.getElementById('p-rarity'); 
        t.innerText = s.p.r; t.style.background = s.p.c;
    } else {
        document.getElementById('u-rank').innerText = "ОБЕРІТЬ ПЕТА";
        document.getElementById('xp-f').style.width = "0%";
    }

    // Показ вкладки адміна тільки для списку ADMINS з config.js
    if(typeof ADMINS !== 'undefined' && ADMINS.includes(Number(myId))) {
        document.getElementById('admin-tab').style.display = 'block';
    }
}

// --- ГЕЙМПЛЕЙ (МНОЖНИКИ З CONFIG.JS) ---
window.updUI = () => {
    let g = document.getElementById('g-sel').value;
    document.getElementById('ui-dice').style.display = (g==='dice')?'block':'none';
    document.getElementById('ui-wheel').style.display = (g==='wheel')?'block':'none';
    document.getElementById('ui-bj').style.display = (g==='bj')?'block':'none';
    
    if(g==='dice'){
        let h=""; 
        for(let i=1; i<=6; i++) {
            let activeClass = (i === selN_val) ? 'active' : '';
            h += `<button class="btn-s ${activeClass}" onclick="selN(${i})">${i}</button>`;
        }
        document.querySelector('.dice-grid').innerHTML = h;
    }
};

window.selN = (n) => { selN_val = n; updUI(); };

window.play = () => {
    let bt = parseFloat(document.getElementById('bet-a').value);
    if(bt > s.b || bt <= 0 || isNaN(bt)) return alert("Мало BB!");
    let g = document.getElementById('g-sel').value;
    document.getElementById('g-stat').innerText = "⏳ Граємо...";

    if(g === 'f50'){ 
        let w = Math.random() > 0.5; 
        res(w, bt, GAME_CONFIG.f50, w ? "Перемога!" : "Програш"); 
    }
    else if(g === 'dice'){ 
        let r = Math.floor(Math.random() * 6) + 1; 
        res(r === selN_val, bt, GAME_CONFIG.dice, `Випало ${r}`); 
    }
    else if(g === 'wheel'){
        let wh = document.getElementById('w-obj'); wh.style.transition = "none"; wh.style.transform = "rotate(0deg)";
        let p = Math.random() * 100; 
        let m, deg, cur = 0;
        
        for(let opt of GAME_CONFIG.wheel) {
            cur += opt.w;
            if(p <= cur) { m = opt.m; break; }
        }
        // Мапінг кутів для колеса
        deg = m === 0 ? 90 : (m === 1.4 ? 240 : 330);

        setTimeout(() => {
            wh.style.transition = "transform 4s cubic-bezier(0.1, 0, 0.1, 1)";
            wh.style.transform = `rotate(${1800 + (360 - deg)}deg)`;
            setTimeout(() => res(m > 0, bt, m, `Множник x${m}`), 4100);
        }, 50);
    }
};

function res(win, bt, m, msg) {
    let bon = s.p ? s.p.m : 1;
    if(win) {
        // Формула: Прибуток * бонус пета + ставка
        let winAmount = (bt * m - bt) * bon; 
        s.b += winAmount; 
        addPetXP(Math.floor(bt * 0.1)); // 10% XP від ставки
        document.getElementById('g-stat').innerHTML = `<span style="color:var(--success)">+${winAmount.toFixed(2)} BB</span><br><small>${msg}</small>`;
    } else {
        s.b -= bt;
        addPetXP(Math.floor(bt * 0.02)); // 2% XP при програші
        document.getElementById('g-stat').innerHTML = `<span style="color:var(--error)">-${bt.toFixed(2)} BB</span><br><small>${msg}</small>`;
    }
    save();
}

// --- КЕЙСИ ТА ІНВЕНТАР ---
window.buyCase = (k) => {
    let c = CASES[k]; 
    if(s.b < c.p) return alert("Мало BB!");
    s.b -= c.p; save();

    const modal = document.getElementById('case-modal');
    const scr = document.getElementById('case-scroll');
    const closeBtn = document.getElementById('case-close');
    modal.style.display = 'flex';
    closeBtn.style.display = 'none';
    document.getElementById('case-res').innerText = "";
    
    let rand = Math.random() * 100; 
    let win, cur = 0;
    for(let p of c.drop) { cur += p.w; if(rand <= cur) { win = {...p}; break; } }

    let pool = []; for(let key in CASES) pool.push(...CASES[key].drop);
    let h = ""; for(let i = 0; i < 60; i++) {
        let it = (i === 45) ? win : pool[Math.floor(Math.random() * pool.length)];
        h += `<div class="case-item">${it.s}</div>`;
    }
    scr.style.transition = "none"; scr.style.transform = "translateX(0px)"; scr.innerHTML = h;

    setTimeout(() => {
        scr.style.transition = "transform 5s cubic-bezier(0.15, 0, 0.15, 1)";
        let centerOffset = (window.innerWidth / 2) - 45;
        scr.style.transform = `translateX(-${(45 * 90) - centerOffset}px)`;
    }, 50);

    setTimeout(() => {
        document.getElementById('case-res').innerHTML = `Випав: <span style="color:${win.c}">${win.n}</span>`;
        closeBtn.style.display = 'block';
        win.id = Date.now(); win.lvl = 1; win.xp = 0; s.inv.push(win); save();
    }, 5500);
};

window.renderInv = () => {
    let h = s.inv.map(p => `
        <div class="glass market-item">
            <div>${p.s} <b>${p.n}</b> (Lvl ${p.lvl || 1})<br><small>Множник: x${p.m.toFixed(3)}</small></div>
            <button class="btn-s" onclick="equip(${p.id})">${s.p?.id === p.id ? '✅' : 'Взяти'}</button>
        </div>
    `).join('');
    document.getElementById('inv-list').innerHTML = h || "Інвентар порожній";
};

window.equip = (id) => { 
    s.p = s.inv.find(i => i.id === id); 
    save(); 
    renderInv(); 
};

// --- АДМІН-ПАНЕЛЬ ---
window.setATab = (tab) => {
    document.querySelectorAll('.a-tab').forEach(t => t.classList.remove('active'));
    if(event) event.target.classList.add('active');
    document.getElementById('a-sec-main').style.display = tab==='main'?'block':'none';
    document.getElementById('a-sec-stats').style.display = tab==='stats'?'block':'none';
    document.getElementById('a-sec-users').style.display = tab==='users'?'block':'none';
    if(tab === 'stats') renderGlobalStats();
};

function renderGlobalStats() {
    db.ref('players').once('value', snap => {
        let totalBB = 0, petCounts = {}, topPet = {lvl: 0};
        snap.forEach(child => {
            let p = child.val();
            totalBB += p.b || 0;
            if(p.inv) p.inv.forEach(pet => {
                petCounts[pet.n] = (petCounts[pet.n] || 0) + 1;
                if((pet.lvl || 1) > topPet.lvl) topPet = {lvl: pet.lvl, name: p.name, petName: pet.n};
            });
        });
        let h = `<h4>Глобальна статистика:</h4><div class="admin-card">💰 BB в обігу: ${totalBB.toFixed(0)}</div>`;
        h += `<div class="admin-card">🏆 Топ пет: ${topPet.petName || '—'} (${topPet.lvl} lvl) у ${topPet.name || '—'}</div>`;
        for(let n in petCounts) h += `<div class="inspect-item"><span>${n}</span><span>${petCounts[n]} шт.</span></div>`;
        document.getElementById('global-stats').innerHTML = h;
    });
}

window.searchUser = () => {
    let id = document.getElementById('user-search').value;
    if(id.length < 5) return;
    db.ref('players/' + id).once('value', snap => {
        let u = snap.val();
        if(!u) return document.getElementById('user-inspect-res').innerText = "Не знайдено";
        let invH = (u.inv || []).map(p => `
            <div class="inspect-item">
                <span>${p.s} ${p.n} (Lvl ${p.lvl})</span>
                <button class="btn-delete" onclick="removePlayerPet('${id}', ${p.id})">Видалити</button>
            </div>`).join('');
        document.getElementById('user-inspect-res').innerHTML = `<div class="admin-card"><b>${u.name}</b><br>Баланс: ${u.b.toFixed(2)}<hr>${invH}</div>`;
    });
};

window.removePlayerPet = (uid, pid) => {
    if(!confirm("Видалити пета у гравця?")) return;
    db.ref('players/' + uid + '/inv').once('value', snap => {
        let inv = snap.val() || [];
        let newInv = inv.filter(p => p.id !== pid);
        db.ref('players/' + uid + '/inv').set(newInv).then(() => searchUser());
    });
};

// --- НАВІГАЦІЯ ---
window.tab = (t, el) => {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.nav-tab').forEach(n => n.classList.remove('active'));
    document.getElementById('v-'+t).style.display = 'block';
    if(el) el.classList.add('active');
    if(t === 'inv') renderInv();
};

// Ініціалізація
updUI();
