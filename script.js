const firebaseConfig = {
apiKey:"AIzaSy...",
databaseURL:"https://bearscasino-bcded-default-rtdb.europe-west1.firebasedatabase.app"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const tg = window.Telegram.WebApp;
const myId = tg.initDataUnsafe?.user?.id || 1;

const ADMINS = [8216362223];

const PETS = {
dog:{n:'Собака',s:'🐶',m:1.05},
cat:{n:'Кіт',s:'🐱',m:1.05},
rabbit:{n:'Кролик',s:'🐰',m:1.08},
fox:{n:'Лисиця',s:'🦊',m:1.09},
wolf:{n:'Вовк',s:'🐺',m:1.11},
bee:{n:'Бджола',s:'🐝',m:1.12},
panda:{n:'Панда',s:'🐼',m:1.14},
lion:{n:'Лев',s:'🦁',m:1.16},
dragon:{n:'Дракон',s:'🐉',m:1.17},
fish:{n:'Рибка',s:'🐟',m:1.16},
tfish:{n:'🐠',s:'🐠',m:1.19},
shark:{n:'Акула',s:'🦈',m:1.23},
octo:{n:'Восьминіг',s:'🐙',m:1.3}
};

const CASES = {
basic:{p:285,drop:[{...PETS.dog,w:40},{...PETS.cat,w:40},{...PETS.rabbit,w:20}]},
uncommon:{p:525,drop:[{...PETS.rabbit,w:46},{...PETS.fox,w:40},{...PETS.wolf,w:14}]},
rare:{p:875,drop:[{...PETS.wolf,w:50},{...PETS.bee,w:40},{...PETS.panda,w:10}]},
legend:{p:1200,drop:[{...PETS.panda,w:56},{...PETS.lion,w:24},{...PETS.dragon,w:20}]},
ocean:{p:1500,drop:[{...PETS.fish,w:45},{...PETS.tfish,w:35},{...PETS.shark,w:15},{...PETS.octo,w:5}]}
};

let s = {b:1000,inv:[],p:null};

function tab(t){
document.querySelectorAll('.page').forEach(e=>e.style.display='none');
document.getElementById('v-'+t).style.display='block';
if(t==='shop') renderShop();
if(t==='inv') renderInv();
if(t==='admin') loadAdmin();
}

function renderShop(){
let h="";
for(let k in CASES){
h+=`<div class="market-item">
<span>${k}</span>
<button onclick="buyCase('${k}')">${CASES[k].p}</button>
</div>`;
}
document.getElementById('shop-list').innerHTML=h;
}

function renderInv(){
document.getElementById('inv-list').innerHTML=s.inv.map((p,i)=>`
<div class="market-item">
<span>${p.s} ${p.n}</span>
<button onclick="equip(${i})">Взяти</button>
<button onclick="sell(${i})">Продати</button>
</div>`).join('');
}

function equip(i){s.p=s.inv[i];}

function sell(i){
s.b+=100;
s.inv.splice(i,1);
}

function play(){
let b=1;
if(!s.p) return alert("обери пета");

let win=Math.random()>0.5;
if(win) s.b+=b*s.p.m;
else s.b-=b;
}

window.buyCase=(key)=>{
let c=CASES[key];
if(s.b<c.p) return alert("нема");

s.b-=c.p;

let line=document.getElementById('case-line');
let wrap=document.getElementById('case-open');

line.innerHTML="";
wrap.style.display="flex";

let items=[];
for(let i=0;i<50;i++){
items.push(c.drop[Math.floor(Math.random()*c.drop.length)]);
}

let win=c.drop[Math.floor(Math.random()*c.drop.length)];
items[40]=win;

items.forEach(p=>{
line.innerHTML+=`<div class="case-item">${p.s}</div>`;
});

setTimeout(()=>{
line.style.transform="translateX(-3200px)";
},100);

setTimeout(()=>{
s.inv.push({...win,id:Date.now()});
wrap.style.display="none";
line.style.transform="translateX(0)";
},4000);
};