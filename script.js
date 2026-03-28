// --- ОНОВЛЕНА ФУНКЦІЯ РЕНДЕРУ РИНКУ (ВИПРАВЛЕНО БАГ ЗАВАНТАЖЕННЯ) ---
function renderShop() {
    let list = document.getElementById('shop-list');
    let tabs = `<div class="shop-tabs">
        <div class="s-tab ${currentShopTab==='cases'?'active':''}" onclick="setShopTab('cases')">📦 Кейси</div>
        <div class="s-tab ${currentShopTab==='market'?'active':''}" onclick="setShopTab('market')">🛒 Ринок</div>
    </div>`;

    if(currentShopTab === 'cases') {
        let h = tabs; const now = Date.now();
        for(let k in CASES) {
            const c = CASES[k];
            if(c.limited && now > DEADLINE) continue;
            
            let badge = c.limited ? `<span class="badge-ltd">Лімітовано</span>` : "";
            let chancesHtml = c.drop.map(p => `<span style="color:${p.c}">${p.s} ${p.w}%</span>`).join(' • ');

            let timerHtml = "";
            if(c.limited) {
                let diff = DEADLINE - now;
                let d = Math.floor(diff / (1000 * 60 * 60 * 24));
                let hr = Math.floor((diff / (1000 * 60 * 60)) % 24);
                timerHtml = `<div class="case-timer">⏳ Залишилось: ${d}д ${hr}г</div>`;
            }

            h += `
            <div class="shop-card">
                <div class="case-info">
                    <div class="case-name">${c.n} ${badge}</div>
                    <div style="font-size:10px; margin:4px 0; opacity:0.8; font-weight:bold">${chancesHtml}</div>
                    ${timerHtml}
                </div>
                <button class="btn-s" style="background:var(--accent); min-width:85px" onclick="buyCase('${k}')">${c.p} BB</button>
            </div>`;
        }
        list.innerHTML = h;
    } else {
        list.innerHTML = tabs + '<div id="m-list" class="glass">Завантаження ринку...</div>';
        // Виправлено: додано обробку null (коли ринок порожній)
        db.ref('market').on('value', snap => {
            let h = "";
            let data = snap.val();
            if(data) {
                snap.forEach(child => {
                    let lot = child.val();
                    if(lot.sellerId == myId) return;
                    h += `<div class="market-item">
                        <div><span style="color:${lot.pet.c}">${lot.pet.s} ${lot.pet.n}</span><br><small>Від: ${lot.sellerName}</small></div>
                        <button class="btn-s" style="background:var(--success)" onclick="buyFromMarket('${child.key}')">${lot.price} BB</button>
                    </div>`;
                });
            }
            let mList = document.getElementById('m-list');
            if(mList) mList.innerHTML = h || "На ринку порожньо";
        });
    }
}

// --- ПОКРАЩЕНА АДМІНКА (ДОДАНО ПЕРЕГЛЯД ТА ВИДАЛЕННЯ ПЕТІВ) ---
function loadAdmin() {
    db.ref('players').once('value', snap => {
        let tabs = `<div class="admin-tabs">
            <div class="a-tab ${currentAdminTab==='balance'?'active':''}" onclick="setAdminTab('balance')">💰 Баланс</div>
            <div class="a-tab ${currentAdminTab==='pets'?'active':''}" onclick="setAdminTab('pets')">🐾 Пети</div>
            <div class="a-tab ${currentAdminTab==='manage_inv'?'active':''}" onclick="setAdminTab('manage_inv')">🎒 Інвентар</div>
        </div>`;
        let h = tabs;
        snap.forEach(c => {
            let p = c.val(); let uid = c.key;
            let invCount = p.inv ? p.inv.length : 0;
            
            h += `<div class="admin-card">
                <b>${p.name || 'Анонім'}</b> (ID: ${uid})<br>
                Баланс: ${p.b.toFixed(2)} BB | Петів: ${invCount}`;
            
            if(currentAdminTab === 'balance') {
                h += `<div class="admin-ctrl-grid">
                    <button class="btn-ctrl b-add" onclick="mathB('${uid}', 'add')">+ Додати</button>
                    <button class="btn-ctrl b-sub" onclick="mathB('${uid}', 'sub')">- Мінус</button>
                    <button class="btn-ctrl b-set" onclick="mathB('${uid}', 'set')">Задати</button>
                </div>`;
            } else if(currentAdminTab === 'pets') {
                h += `<button class="btn" style="padding:8px; font-size:12px; margin-top:10px; background:var(--purple)" onclick="adminGivePet('${uid}')">🎁 Подарувати пета</button>`;
            } else if(currentAdminTab === 'manage_inv') {
                if(p.inv && p.inv.length > 0) {
                    h += `<div style="margin-top:10px; border-top:1px solid #444; padding-top:5px">`;
                    p.inv.forEach((pet, idx) => {
                        h += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; font-size:11px">
                            <span>${pet.s} ${pet.n} (x${pet.m.toFixed(2)})</span>
                            <button onclick="adminTakePet('${uid}', ${idx})" style="background:var(--error); border:none; color:white; border-radius:4px; padding:2px 6px; font-size:10px">Вилучити</button>
                        </div>`;
                    });
                    h += `</div>`;
                } else {
                    h += `<div style="color:#8d99ae; font-size:11px; margin-top:5px">Інвентар порожній</div>`;
                }
            }
            h += `</div>`;
        });
        document.getElementById('admin-list').innerHTML = h;
    });
}

// Нова функція для вилучення пета адміном
window.adminTakePet = (targetId, petIdx) => {
    if(!confirm("Дійсно вилучити цього пета?")) return;
    db.ref('players/' + targetId + '/inv').once('value', snap => {
        let inv = snap.val() || [];
        inv.splice(petIdx, 1);
        db.ref('players/' + targetId + '/inv').set(inv).then(() => {
            alert("Пету вилучено!");
            loadAdmin();
        });
    });
};
