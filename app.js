let mode='draw', results=[], autoReveal=false;
const $=id=>document.getElementById(id);

function tables(){return mode==='draw'?DATA.draws:[{name:'융합 확률표',items:DATA.fusion}]}
function selected(){const ts=tables();const i=Math.max(0,Math.min(ts.length-1,parseInt($('table').value)||0));return ts[i]}

function fillTables(){
  const ts=tables();
  $('table').innerHTML=ts.map((t,i)=>`<option value="${i}">${t.name}</option>`).join('');
  $('tableLabel').textContent=mode==='draw'?'드로우 종류':'융합 종류';
  $('rule').textContent=mode==='draw'?'티켓 1장 = 독립 룰렛 6회':'융합 1회 = 아이템 1개'; 
  updateInfo();
}

function updateInfo(){
  const t=selected();
  if(!t)return;
  $('tableInfo').innerHTML=`<b>${esc(t.name)}</b><br>항목 <b>${t.items.length}개</b> · 확률 합계 <b>${sum(t.items).toFixed(2)}%</b><br><span class="hint">${mode==='draw'?'이 선택한 드로우의 확률표만 사용합니다.':'융합 전용 확률표만 사용합니다.'}</span>`;
  updateFusionCalc();
} 

// [수식 계산 영역] 융합 천장 및 비용 산출 로직
function updateFusionCalc(){
  const box=$('fusionCalc');
  if(!box)return;
  box.style.display=mode==='fusion'?'block':'none';
  if(mode!=='fusion')return;
  
  const stack=Math.max(0,Math.min(9,parseInt($('fusionStack').value)||0));
  const mat=Math.max(0,parseInt($('fusionMat').value)||0);
  const itemPrice=Math.max(1,parseFloat($('fusionItemPrice').value)||200);
  const tPrice=Math.max(1,parseFloat($('fusionTPrice').value)||78);
  
  const remain=10-stack;
  const neededGross=remain*4;
  const reusableReturns=Math.max(0,remain-1);
  const additional=Math.max(0,neededGross-reusableReturns-mat);
  const tNeed=additional*itemPrice;
  const cash=tNeed*tPrice;
  const avgTrials=(1-Math.pow(.9,remain))/0.1;
  const cappedExpected=Math.min(remain,avgTrials);
  const expectedCash=cappedExpected*3*itemPrice*tPrice;
  const budget=132000;
  const budgetTrials=Math.floor((budget/tPrice)/(3*itemPrice));
  const effectiveTrials=Math.min(remain,budgetTrials);
  const budgetUProb=1-Math.pow(.9,effectiveTrials);
  const leftoverT=(budget/tPrice)-effectiveTrials*3*itemPrice;
  
  $('fusionCalcResult').innerHTML=`현재 <b>${stack}/10 스택</b> · 보유 SSS+ <b>${mat}개</b><br>천장까지 융합 <b>${remain}회</b> · 추가 구매 필요 <b>${additional}개</b><br>천장 비용 <b>${tNeed.toLocaleString()}T · ${Math.round(cash).toLocaleString()}원</b><br>랜덤 U 확률(천장 전까지) <b>${((1-Math.pow(.9,remain))*100).toFixed(3)}%</b><br>평균 예상 지출 <b>${Math.round(expectedCash).toLocaleString()}원</b><hr style="border:0;border-top:1px solid var(--border);margin:8px 0">132,000원 기준 <b>${effectiveTrials}회 융합</b> · U ${ (budgetUProb*100).toFixed(2)}% · 잔여 <b>${Math.floor(leftoverT).toLocaleString()}T</b>`;
}

function sum(a){return a.reduce((s,x)=>s+x.p,0)}

// [확률 추첨 수식] 독립 시행 확률 계산
function pick(items){
  let r=Math.random()*sum(items),acc=0;
  for(const x of items){
    acc+=x.p;
    if(r<acc)return x;
  }
  return items[items.length-1];
}

function run(){
  let n=Math.max(1,Math.min(100000,parseInt($('count').value)||1));
  const t=selected();
  if(!t||!Array.isArray(t.items)||!t.items.length)return;
  const times=mode==='draw'?n*6:n;
  const batch=[];
  for(let i=0;i<times;i++){
    const r=pick(t.items);
    batch.push(mode==='draw'?{...r,revealed:autoReveal}:r);
  }
  results=batch.concat(results);
  render();
  $('runInfo').textContent=mode==='draw'?`${n.toLocaleString()}장 · ${times.toLocaleString()}회 결과 추가`:`${n.toLocaleString()}회 융합 결과 추가`;
}

function counts(){
  const m={};
  for(const r of results){
    const k=r.grade;
    m[k]=(m[k]||0)+1;
  }
  return m;
}

function render(){
  const c=counts();
  $('total').textContent=results.length.toLocaleString();
  $('u').textContent=(c.U||0).toLocaleString();
  $('sssp').textContent=(c['SSS+']||0).toLocaleString();
  $('sss').textContent=(c.SSS||0).toLocaleString();
  $('ssp').textContent=(c['SS+']||0).toLocaleString();
  
  const grades=['U','SSS+','SSS','SS+','S','N'];
  $('gradeGrid').innerHTML=grades.map(g=>`<div class="gradebox"><strong>${g}</strong><small>${(c[g]||0).toLocaleString()}개</small></div>`).join('');
  
  const im={};
  for(const r of results) im[r.name]=(im[r.name]||0)+1;
  const arr=Object.entries(im).sort((a,b)=>b[1]-a[1]);
  $('itemCounts').innerHTML=arr.length?arr.map(([n,v])=>`<div class="item-row"><span>${esc(n)}</span><span>${v}</span></div>`).join(''):'<div class="hint">결과가 없습니다.</div>';
  
  const show=results.slice(0,6);
  $('results').innerHTML=show.length?show.map((r,i)=>{
    const hidden=mode==='draw'&&!r.revealed;
    return `<div class="result ${hidden?'hidden':''}" data-result-index="${i}" title="${hidden?'클릭해서 공개':''}"><div class="idx">#${i+1}</div><div class="secret"><div class="itemname">${hidden?'???':esc(r.name)}</div><div class="prob">${hidden?'결과를 클릭하면 공개됩니다.':'당첨 확률 '+r.p.toFixed(2)+'%'}</div></div><span class="badge ${hidden?'':r.grade}">${hidden?'???':r.grade}</span></div>`;
  }).join(''):'<div class="empty">아직 결과가 없습니다.</div>';
  
  const revealBtn=$('revealAll');
  const autoWrap=$('autoRevealWrap');
  if(autoWrap)autoWrap.style.display=mode==='draw'?'flex':'none';
  if(revealBtn)revealBtn.style.display=mode==='draw'&&show.some(r=>!r.revealed)?'inline-block':'none';
  
  $('results').querySelectorAll('.result.hidden').forEach(el=>el.onclick=()=>{
    const idx=Number(el.dataset.resultIndex);
    if(results[idx]){
      results[idx].revealed=true;
      render();
    }
  });
}

function esc(s){return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}

const savedTheme=localStorage.getItem('dm-theme');
if(savedTheme==='dark'||(!savedTheme&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)){
  document.body.classList.add('dark');
}

function updateThemeButton(){
  const dark=document.body.classList.contains('dark');
  $('themeIcon').textContent=dark?'☀':'☾';
  $('themeText').textContent=dark?'일반 모드':'눈 보호 모드';
  $('themeToggle').setAttribute('aria-label',dark?'일반 모드로 전환':'다크모드로 전환');
}

$('themeToggle').onclick=()=>{
  document.body.classList.toggle('dark');
  localStorage.setItem('dm-theme',document.body.classList.contains('dark')?'dark':'light');
  updateThemeButton();
};

updateThemeButton();

$('revealAll').onclick=()=>{
  if(mode==='draw'){
    results.slice(0,6).forEach(r=>r.revealed=true);
    render();
  }
};

$('autoReveal').onchange=e=>{
  autoReveal=e.target.checked;
  if(autoReveal&&mode==='draw') results.forEach(r=>r.revealed=true);
  render();
};

['fusionStack','fusionMat','fusionItemPrice','fusionTPrice'].forEach(id=>$(id).addEventListener('input',updateFusionCalc));
$('run').onclick=run;
$('clear').onclick=()=>{results=[];$('runInfo').textContent='결과를 초기화했습니다.';render();};
$('table').onchange=()=>{results=[];updateInfo();render();};
$('count').onkeydown=e=>{if(e.key==='Enter')run();};

document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{
  mode=b.dataset.mode;
  autoReveal=false;
  $('autoReveal').checked=false;
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));
  results=[];
  fillTables();
  render();
});

fillTables();
render();