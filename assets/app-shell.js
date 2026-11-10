/* Shared shell for Login / Home / Explore (and read by the dashboard).
   - PIS.state()/save()  -> {email, customer, dataset} kept in localStorage, mirrored in window.name so it survives file:// navigation
   - PIS.mountShell()    -> portal header + footer (Home, Explore)
   - PIS.mountMeta()     -> Customer / Dataset (+Edit dropdown) / Last Refresh                                       */
/* Auto-fit: the page is designed for a 1536 x 700 browser window (a typical laptop). On bigger windows it is scaled up
   in proportion, limited by BOTH width and height (so ultrawide / short windows never get cut off), max 3.6x.
   Windows at or below the design size are never shrunk, so text stays >= 12px. It reacts to window size and browser zoom. */
(function(){
  var root=document.documentElement,BW=1536,BH=700,MAX=3.6;
  function fit(){
    var z=Math.min(window.innerWidth/BW,window.innerHeight/BH,MAX);
    z=Math.max(1,Math.round(z*20)/20);
    root.style.zoom=z===1?'':z;
    root.style.setProperty('--z',z);
  }
  fit();window.addEventListener('resize',fit);
})();
(function(){
  const DASH='Optum_Dashboard_Payment_Integrity_Suite.html';
  const KEY='pis.state';
  const CUSTS=['Meridian Health Plan','Northwind Health Partners','Crestline Benefits Group','Summit Care Alliance','Bluepeak Assurance','Harborview Health Network','Maple Grove Payers','Cedar Ridge Health Plan','Lakeside Medical Trust','Willow Creek Insurance'];
  const DSETS=['2025-07 thru 2026-06, paid 2026-09, LS, 2026-11-04','2025-07 thru 2026-06, paid 2026-08, LS, 2026-10-06','2025-01 thru 2025-12, paid 2026-02, TH, 2026-03-02','2025-01 thru 2025-12, paid 2026-02, MK, 2026-03-02','2024-07 thru 2025-06, paid 2025-09, PN, 2025-10-14','2024-01 thru 2024-12, paid 2025-02, LS, 2025-03-11','Compare 3.0 vs 4.0 2026-09-29','Compare 3.0 vs 4.0 2026-10-13'];
  const FAVS=[CUSTS[0],CUSTS[3]];
  const DEFAULT={email:'',customer:CUSTS[0],dataset:DSETS[0]};
  const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function state(){
    let raw=null;
    try{raw=localStorage.getItem(KEY)}catch(e){}
    if(!raw){try{const n=JSON.parse(window.name||'null');if(n&&n.pis)raw=JSON.stringify(n.pis)}catch(e){}}
    try{return Object.assign({},DEFAULT,JSON.parse(raw||'{}'))}catch(e){return Object.assign({},DEFAULT)}
  }
  function save(patch){
    const s=Object.assign(state(),patch);
    try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}
    try{window.name=JSON.stringify({pis:s})}catch(e){}
    return s;
  }
  // "Last Refresh" = the refresh date that ends the dataset name (e.g. "..., LS, 2026-11-04")
  function lastRefresh(ds){
    const m=/(\d{4})-(\d{2})-(\d{2})\s*$/.exec(ds||'');
    if(!m)return '—';
    return new Date(Date.UTC(+m[1],+m[2]-1,+m[3])).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
  }
  function person(email){
    const local=(email||'').split('@')[0].replace(/[^A-Za-z0-9]+/g,' ').trim();
    if(!local)return{name:'Alex M.',ini:'AM'};
    const name=local.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ');
    return{name,ini:name.slice(0,2).toUpperCase()};
  }

  // opts.meta: put Customer/Dataset/Last Refresh in the header (Explore)
  function mountShell(active,opts){
    opts=opts||{};
    const s=state(),u=person(s.email);
    const nav=(href,label,key)=>href?`<a href="${href}"${active===key?' aria-current="page"':''}>${label}</a>`:`<a class="off" href="#" data-noop title="Not part of this wireframe">${label}</a>`;
    document.getElementById('app-header').outerHTML=
      `<header class="portal-head"><div class="ph-top">`+
      `<a class="ph-brand" href="Home.html" aria-label="Home"><img class="logo" src="assets/optum-logo.png" alt="Optum"><span class="ph-sep"></span><span class="ph-title">Health Plan Manager</span></a>`+
      `<div class="ph-right"><a class="gethelp" href="#" data-noop>Get Help</a><span class="welcome">Welcome, ${esc(u.name)}</span><span class="ph-avatar">${esc(u.ini)}<i></i></span></div></div>`+
      `<nav class="ph-nav" aria-label="Primary">${nav('Home.html','Home','home')}${nav('Home.html#explore','Explore','explore')}</nav>`+
      (opts.meta?`<div class="ph-meta" id="ph-meta"></div>`:'')+`</header>`;
    document.getElementById('app-footer').outerHTML=
      `<footer class="portal-foot"><img src="assets/optum-logo.png" alt="Optum"><span class="foot-sep"></span><span class="foot-name">Health Plan Manager</span></footer>`;
    document.querySelectorAll('[data-noop]').forEach(a=>a.addEventListener('click',e=>e.preventDefault()));
  }

  const SEARCH='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>';
  const STAR='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.8 2.8 6 6.5.8-4.8 4.5 1.3 6.5L12 17.4 6.2 20.6l1.3-6.5L2.7 9.6l6.5-.8z"/></svg>';
  const DOTS='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>';

  // Customer / Dataset / Last Refresh, with the Edit dropdown (Select Customer | Select Dataset).
  function mountMeta(host){
    host.classList.add('mt');
    host.innerHTML='<div class="mt-rows" data-rows></div><button class="mt-edit" type="button" data-edit aria-haspopup="dialog" aria-expanded="false" aria-label="Edit customer and dataset"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.4"/><path d="M2.8 20c.4-3.6 2.8-5.6 6.2-5.6 1.3 0 2.4.3 3.3.8"/><circle cx="17" cy="16" r="2.6"/><path d="m19 18 2 2"/></svg><span>Edit</span></button><div data-dd></div>';
    const rows=host.querySelector('[data-rows]'),edit=host.querySelector('[data-edit]'),ddHost=host.querySelector('[data-dd]');
    let open=false,q={customer:'',dataset:''},chip={customer:'all',dataset:'all'};

    function drawRows(){
      const s=state();
      rows.innerHTML=`<span class="k">Customer:</span><span class="v">${esc(s.customer)}</span><span class="k">Dataset:</span><span class="v">${esc(s.dataset)}</span>`;
    }
    function items(kind){
      const s=state(),base=kind==='customer'?CUSTS:DSETS,cur=s[kind],all=base.includes(cur)?base:[cur,...base];
      let l=all;
      if(chip[kind]==='last5')l=all.slice(0,5);
      if(chip[kind]==='fav'&&kind==='customer')l=all.filter(x=>FAVS.includes(x));
      if(chip[kind]==='mine'&&kind==='dataset')l=all.filter(x=>/, LS,/.test(x));
      const t=q[kind].toLowerCase();
      return {all,list:t?l.filter(x=>x.toLowerCase().includes(t)):l,cur};
    }
    function drawList(kind){
      const {all,list,cur}=items(kind),el=ddHost.querySelector(`[data-list="${kind}"]`);
      el.innerHTML=list.length?list.map(x=>`<button type="button" class="dd-item${x===cur?' sel':''}" data-kind="${kind}" data-i="${all.indexOf(x)}"><span>${esc(x)}</span>${kind==='customer'?(FAVS.includes(x)?STAR:''):DOTS}</button>`).join(''):'<div class="dd-empty">No matches</div>';
    }
    function chips(kind,defs){return `<div class="dd-chips">Show: ${defs.map(d=>`<button type="button" data-chip="${kind}:${d[0]}"${chip[kind]===d[0]?' class="on"':''}>${d[1]}</button>`).join('')}</div>`}
    function drawDD(){
      ddHost.innerHTML=open?
        `<div class="dd" role="dialog" aria-label="Select customer and dataset">`+
        `<div class="dd-col"><div class="dd-h"><h4>Select Customer</h4></div><label class="dd-search"><input data-q="customer" placeholder="Search by Customer Name" value="${esc(q.customer)}">${SEARCH}</label>${chips('customer',[['all','All'],['last5','Last 5'],['fav','Favorites']])}<div class="dd-list" data-list="customer"></div><div class="dd-spacer"></div></div>`+
        `<div class="dd-col"><div class="dd-h"><h4>Select Dataset</h4><button type="button" class="dd-create" data-noop>+ Create Dataset</button></div><label class="dd-search"><input data-q="dataset" placeholder="Search by Dataset Name" value="${esc(q.dataset)}">${SEARCH}</label>${chips('dataset',[['all','All'],['last5','Last 5'],['mine','My Datasets']])}<div class="dd-list" data-list="dataset"></div><div class="dd-foot"><button type="button" data-noop>Manage Datasets</button></div></div></div>`:'';
      if(open){drawList('customer');drawList('dataset')}
      edit.setAttribute('aria-expanded',open);
    }
    function close(){if(open){open=false;q={customer:'',dataset:''};chip={customer:'all',dataset:'all'};drawDD()}}

    host.addEventListener('click',e=>{
      const it=e.target.closest('.dd-item');
      if(it){
        const kind=it.dataset.kind,s=state(),base=kind==='customer'?CUSTS:DSETS,all=base.includes(s[kind])?base:[s[kind],...base];
        save({[kind]:all[+it.dataset.i]});drawRows();close();return;
      }
      const c=e.target.closest('[data-chip]');
      if(c){const [k,v]=c.dataset.chip.split(':');chip[k]=v;drawDD();return}
      if(e.target.closest('[data-noop]')){e.preventDefault();return}
      if(e.target.closest('[data-edit]')){open=!open;drawDD();const i=ddHost.querySelector('input');if(i)i.focus()}
    });
    host.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.q;if(k){q[k]=e.target.value;drawList(k)}});
    document.addEventListener('click',e=>{if(open&&!e.composedPath().includes(host))close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
    drawRows();
  }

  window.PIS={DASH,CUSTS,DSETS,state,save,lastRefresh,person,mountShell,mountMeta,esc};
})();
