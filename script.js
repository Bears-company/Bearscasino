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
const myId = tg.initDataUnsafe?.user?.id || 1;
const myName = tg.initDataUnsafe?.user?.first_name || "Гравець";


// ===== ПЕТИ =====
const PETS = {
    dog:{n:'Собака',s:'🐶',r:'Звичайний',m:1.05,c:'#94a3b8'},
    cat:{n:'Кіт',s:'🐱',r:'Звичайний',m:1.05,c:'#94a3b8'},
    rabbit:{n:'Кролик',s:'🐰',r:'Незвичайний',m:1.08,c:'#3b82f6'},
    fox:{n:'Лисиця',s:'🦊',r:'Незвичайний',m:1.09,c:'#3b82f6'},
    wolf:{n:'Вовк',s:'🐺',r:'Рідкісний',m:1.11,c:'#6366f1'},
    bee:{n:'Бджола',s:'🐝',r:'Рідкісний',m:1.12,c:'#6366f1'},
    panda:{n:'Панда',s:'🐼',r:'Епік',m:1.14,c:'#a855f7'},
    lion:{n:'Лев',s:'🦁',r:'Легендарний',m:1.16,c:'#f59e0b'},
    dragon:{n:'Дракон',s:'🐉',r:'Легендарний',m:1.17,c:'#f59e0b'},
    fish:{n:'Рибка',s:'🐟',r:'Рідкісний',m:1.16,c:'#6366f1'},
    tfish:{n:'Тропічна рибка',s:'🐠',r:'Епік',m:1.19,c:'#a855f7'},
    shark:{n:'Акула',s:'🦈',r:'Легендарний',m:1.23,c:'#f59e0b'},
    octo:{n:'Восьминіг',s:'🐙',r:'Міфічний',m:1.3,c:'#ef4444'}
};


// ===== КЕЙСИ =====
const CASES = {
    basic:{n:"Базовий",p:285,drop:[{...PETS.dog,w:40},{...PETS.cat,w:40},{...PETS.rabbit,w:20}]},
    uncommon:{n:"Незвичайний",p:525,drop:[{...PETS.rabbit,w:46},{...PETS.fox,w:40},{...PETS.wolf,w:14}]},
    rare:{n:"Рідкісний",p:875,drop:[{...PETS.wolf,w:50},{...PETS.bee,w:40},{...PETS.panda,w:10}]},
    legend:{n:"Легендарний",p:1200,drop:[{...PETS.panda,w:56},{...PETS.lion,w:24},{...PETS.dragon,w:20}]},
    ocean:{n:"Океан",p:1500,drop:[{...PETS.fish,w:45},{...PETS.tfish,w:35},{...PETS.shark,w:15},{...PETS.octo,w:5}]}
};


// ===== СТАН =====
let s = { b:0, name: myName, p:null, inv:[] };
let shopMode = 'cases';
let selN_val = 1;


// ===== LOAD =====
db.ref('players/' + myId).on('value', snap => {
    let d = snap.val();
    if(d){ s = d; if(!s.inv) s.inv=[]; }
    else db.ref('players/' + myId).set(s);
    render();
});


// ===== UI =====
function render(){
    document.getElementById('bal-val').innerText = s.b.toFixed(2);

    if(s.p){
        document.getElementById('p-img').innerText = s.p.s;
        document.getElementById('p-name').innerText = s.p.n;
        document.getElementById('p-m').innerText = s.p.m;
    }

    if(ADMINS.includes(Number(myId))){
        document.getElementById('admin-tab').style.display = 'block';
    }
}


// ===== SHOP =====
function renderShop(){
    let h="";
    for(let k in CASES){
        h+=`<div class="market-item">
        <span>${CASES[k].n}</span>
        <button class="btn-s" onclick="buyCase('${k}')">${CASES[k].p}</button>
        </div>`;
    }
    document.getElementById('shop-list').innerHTML=h;
}


// ===== КЕЙС =====
window.buyCase = (key)=>{
    let c = CASES[key];
    if(s.b < c.p) return alert("Немає грошей");

    s.b -= c.p;

    let total=c.drop.reduce((a,b)=>a+b.w,0);
    let rand=Math.random()*total;
    let cur=0, win;

    for(let d of c.drop){
        cur+=d.w;
        if(rand<=cur){ win=d; break; }
    }

    let pet={...win,id:Date.now()};
    s.inv.push(pet);

    db.ref('players/'+myId).set(s);

    alert("Випав: "+pet.n);
};


// ===== ІНВ =====
function renderInv(){
    document.getElementById('inv-list').innerHTML = s.inv.map((p,i)=>`
        <div class="market-item">
            <span>${p.s} ${p.n}</span>
            <button onclick="equip(${i})">Взяти</button>
        </div>
    `).join('');
}

window.equip = (i)=>{
    s.p=s.inv[i];
    db.ref('players/'+myId).set(s);
};


// ===== ІГРИ =====
window.play = ()=>{
    let bt = parseFloat(document.getElementById('bet-a').value);
    if(bt > s.b) return;

    let g=document.getElementById('g-sel').value;

    if(g==='f50') res(Math.random()>0.5,bt,1.55);
    if(g==='dice') res(Math.floor(Math.random()*6)+1===selN_val,bt,2.05);

    if(g==='wheel'){
        let r=Math.random()*100;
        let m=0;
        if(r<55)m=0;
        else if(r<80)m=1.4;
        else if(r<95)m=1.6;
        else m=1.8;

        res(m>0,bt,m);
    }
};

function res(win,bt,m){
    if(win){
        let w=(bt*m-bt)*(s.p?.m||1);
        s.b+=w;
    } else s.b-=bt;

    db.ref('players/'+myId).set(s);
}


// ===== ADMIN =====
function loadAdmin(){
    document.getElementById('admin-list').innerHTML=`
    <div class="glass">
        <button onclick="giveBal()">+</button>
        <button onclick="takeBal()">-</button>
    </div>`;
}

window.giveBal=()=>{
    let id=prompt("ID");
    let sum=Number(prompt("Сума"));
    db.ref('players/'+id).once('value',s2=>{
        let u=s2.val();
        u.b+=sum;
        db.ref('players/'+id).set(u);
    });
};

window.takeBal=()=>{
    let id=prompt("ID");
    let sum=Number(prompt("Сума"));
    db.ref('players/'+id).once('value',s2=>{
        let u=s2.val();
        u.b-=sum;
        db.ref('players/'+id).set(u);
    });
};