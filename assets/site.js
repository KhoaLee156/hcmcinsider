/* HCMC Insider – small helpers shared by all pages: ♥ Save, offline pages (service worker), the order card,
   full-screen cards for sellers and drivers, and "open now" from the hours in tips.json. No server needed. */
(function(){
"use strict";
var HI=window.HI={};
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function $(s,el){return(el||document).querySelector(s)}
function $$(s,el){return Array.prototype.slice.call((el||document).querySelectorAll(s))}

/* ---- saved places: same storage key as the homepage */
HI.favs=function(){try{return JSON.parse(ls("hi_favs")||"[]")}catch(e){return[]}};
HI.setFav=function(id,slug,on){var f=HI.favs(),i=f.indexOf(id);if(on&&i<0)f.push(id);if(!on&&i>-1)f.splice(i,1);ls("hi_favs",JSON.stringify(f));if(slug)HI.keep(slug,on);return f};
/* Saved place pages go into their own cache so they open offline. */
HI.keep=function(slug,on){if(!("caches" in window)||!slug)return;var u="/places/"+slug+"/";
  caches.open("hi-saved").then(function(c){return on?c.add(u):c.delete(u)}).catch(function(){})};
HI.sync=function(slugs){if(!("caches" in window))return;
  caches.open("hi-saved").then(function(c){slugs.forEach(function(s){var u="/places/"+s+"/";c.match(u).then(function(r){if(!r)c.add(u).catch(function(){})})})}).catch(function(){})};

/* ---- opening hours (always Saigon time, UTC+7, no daylight saving) */
function vnNow(){var d=new Date(Date.now()+7*36e5);return{m:d.getUTCHours()*60+d.getUTCMinutes(),wd:d.getUTCDay()}}
function lunarDay(){try{return parseInt(new Intl.DateTimeFormat("en-u-ca-chinese",{day:"numeric",timeZone:"Asia/Ho_Chi_Minh"}).format(new Date()),10)||0}catch(e){return 0}}
function fmt(m){m=((m%1440)+1440)%1440;if(m===0)return"midnight";if(m===720)return"noon";var h=Math.floor(m/60),mm=m%60;
  return(h%12||12)+(mm?":"+(mm<10?"0":"")+mm:"")+(h<12?"am":"pm")}
HI.fmt=fmt;
HI.clock=function(){return fmt(vnNow().m)};
/* o: {r:[[start,end,about]], x:[weekdays], lo:[lunar days], lx:[lunar days]} → {k:"open"|"maybe"|"closed"|"unknown", t:label} */
HI.status=function(o,h){
  if(!o||!o.r)return{k:"unknown",t:h?"Hours: "+h:"Hours not listed"};
  var n=vnNow(),ld;
  if(o.lo){ld=lunarDay();if(!ld)return{k:"unknown",t:"Only on lunar days "+o.lo.join(" and ")};if(o.lo.indexOf(ld)<0)return{k:"closed",t:"Closed · opens only on lunar days "+o.lo.join(" and ")}}
  if(o.lx){ld=lunarDay();if(ld&&o.lx.indexOf(ld)>-1)return{k:"closed",t:"Closed today (lunar day "+ld+")"}}
  if(o.x&&o.x.indexOf(n.wd)>-1)return{k:"closed",t:"Closed today"};
  var next=null;
  for(var i=0;i<o.r.length;i++){var s=o.r[i][0],e=o.r[i][1],soft=e==null,E=soft?s+300:e;
    if((n.m>=s&&n.m<E)||(E>1440&&n.m<E-1440)){
      if(s===0&&E===1440)return{k:"open",t:"Open 24 hours"};
      if(o.r[i][2]===2)return{k:"maybe",t:"Mornings only · often sold out by about "+fmt(e)};
      return soft?{k:"maybe",t:"Opened "+fmt(s)+" · until sold out"}:{k:o.r[i][2]?"maybe":"open",t:"Open now · until "+(o.r[i][2]?"about ":"")+fmt(e)}}
    if(s>n.m&&(next===null||s<next))next=o.r[i][2]===2?-1:s}
  return{k:"closed",t:next===-1?"Closed · opens in the morning":next!==null?"Closed · opens "+fmt(next):"Closed now"}};
HI.km=function(a,b,c,d){var R=6371,r=Math.PI/180,x=Math.sin((c-a)*r/2),y=Math.sin((d-b)*r/2);
  return 2*R*Math.asin(Math.sqrt(x*x+Math.cos(a*r)*Math.cos(c*r)*y*y))};

/* ---- full-screen card (seller, driver) */
var lock=null,lastFocus=null;
HI.show=function(vi,en,title){HI.hide();lastFocus=document.activeElement;
  var d=document.createElement("div");d.className="bigcard";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");d.setAttribute("aria-label",title||"Show this screen");
  d.innerHTML='<div class="bctop"><span>'+esc(title||"")+'</span><button class="btn" type="button" data-close>Close</button></div><div class="bcbody"><p class="bcvi" lang="vi">'+vi+'</p>'+(en?'<p class="bcen">'+en+'</p>':'')+'</div>';
  document.body.appendChild(d);document.documentElement.classList.add("noscroll");$("[data-close]",d).focus();
  try{if(navigator.wakeLock)navigator.wakeLock.request("screen").then(function(l){lock=l},function(){})}catch(e){}};
HI.hide=function(){var d=$(".bigcard");if(!d)return;d.remove();document.documentElement.classList.remove("noscroll");
  try{if(lock){lock.release();lock=null}}catch(e){}if(lastFocus&&lastFocus.focus)lastFocus.focus()};
document.addEventListener("click",function(e){if(e.target.closest(".bigcard [data-close]"))HI.hide()});
document.addEventListener("keydown",function(e){if(e.key==="Escape")HI.hide()});
function driverCard(vi,addr,addrEn){HI.show(esc(vi)+(addr?'<span class="bcaddr">'+esc(addr)+'</span>':''),addrEn?esc(addrEn):"","Show this to your driver")}

/* ---- order card on place pages */
var OPTS=[["không hành","No spring onion","food"],["không ngò","No coriander","food"],["ít cay","A little spicy","food","spice"],["không cay","Not spicy","food","spice"],
  ["không bột ngọt","No MSG","food"],["ít đường","Less sugar","cafe"],["không đá","No ice","cafe"],["mang về","Take away","all","where"],["ăn ở đây","Eat here","all","where"],
  ["đậu phộng","Peanut allergy","food","allergy"],["hải sản","Seafood allergy","food","allergy"]];
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function initOrder(box){var kind=box.getAttribute("data-kind")==="cafe"?"cafe":"food",on={},KEY="hi_order"+location.pathname;
  /* Picks survive leaving the page (e.g. to Directions) for the rest of this browser session. */
  var saved;try{saved=JSON.parse(sessionStorage.getItem(KEY)||"null")}catch(e){saved=null}
  var store=function(){try{sessionStorage.setItem(KEY,JSON.stringify({q:$$(".omenu output",box).map(function(o){return +o.value||0}),on:Object.keys(on)}))}catch(e){}};
  $(".oopts",box).innerHTML=OPTS.map(function(o,i){return(o[2]==="all"||o[2]===kind)?'<button type="button" class="chip" data-o="'+i+'" aria-pressed="false">'+esc(o[1])+'</button>':""}).join("");
  if(saved){$$(".omenu output",box).forEach(function(o,i){var n=saved.q[i]||0;o.value=n;o.textContent=n;o.closest("li").classList.toggle("on",n>0)});
    (saved.on||[]).forEach(function(i){var b=$('[data-o="'+i+'"]',box);if(b){b.setAttribute("aria-pressed","true");on[i]=1}})}
  box.hidden=false;
  box.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;
    if(b.hasAttribute("data-d")){var out=$("output",b.parentNode),n=Math.max(0,Math.min(20,(+out.value||0)+(+b.getAttribute("data-d"))));out.value=n;out.textContent=n;b.closest("li").classList.toggle("on",n>0);store();return}
    if(b.hasAttribute("data-o")){var i=+b.getAttribute("data-o"),g=OPTS[i][3],now=b.getAttribute("aria-pressed")!=="true";
      if(now&&g&&g!=="allergy")$$("[data-o]",box).forEach(function(x){if(OPTS[+x.getAttribute("data-o")][3]===g){x.setAttribute("aria-pressed","false");delete on[x.getAttribute("data-o")]}});
      b.setAttribute("aria-pressed",String(now));if(now)on[i]=1;else delete on[i];store();return}
    if(b.getAttribute("data-show")==="bill"){HI.show("Tính tiền giùm tôi.<br>Cảm ơn!","Check, please. Thank you!","Ask for the bill");return}
    if(b.getAttribute("data-show")==="order"){
      var vi=[],en=[];
      $$(".omenu li",box).forEach(function(li){var n=+$("output",li).value||0;if(!n)return;
        vi.push(n+" "+li.getAttribute("data-cl")+" "+li.getAttribute("data-vi"));en.push(n+" × "+li.getAttribute("data-vi")+" ("+$("em",li).textContent+")")});
      var mods=[],where="",allergy=[],enOpt=[];
      Object.keys(on).forEach(function(i){var o=OPTS[i];enOpt.push(o[1]);if(o[3]==="where")where=o[0];else if(o[3]==="allergy")allergy.push(o[0]);else mods.push(o[0])});
      if(!vi.length&&!mods.length&&!where&&!allergy.length){var p=$(".ohint",box)||box.insertBefore(document.createElement("p"),$(".acts",box));p.className="ohint";p.textContent="Tap + next to a dish first.";return}
      var h=$(".ohint",box);if(h)h.remove();
      var txt=(vi.length?"Cho tôi:<br>"+vi.map(esc).join("<br>"):"")+
        (mods.length?'<span class="bcopt">'+esc(cap(mods.join(", ")))+".</span>":"")+
        (where?'<span class="bcopt">'+esc(cap(where))+".</span>":"")+
        (allergy.length?'<span class="bcopt">Tôi bị dị ứng '+esc(allergy.join(" và "))+".</span>":"")+
        '<span class="bcopt">Cảm ơn!</span>';
      HI.show(txt,esc(en.concat(enOpt).join(" · ")),"Show this to the seller")}
  })}

/* ---- saved page */
function renderSaved(el){var all;try{all=JSON.parse($("#hi-places").textContent)}catch(e){all=[]}
  var by={};all.forEach(function(p){by[p.id]=p});
  var list=HI.favs().map(function(id){return by[id]}).filter(Boolean);
  HI.sync(list.map(function(p){return p.slug}));
  if(!list.length){el.innerHTML='<div class="box"><p>No saved places yet. Tap <b>♡ Save</b> on a place page or on the <a href="/#eat">homepage</a> and it will show up here, ready to use offline.</p></div>';return}
  el.innerHTML='<p class="small">Saigon time now: '+esc(HI.clock())+'. Hours come from creators\' videos and can change.</p>'+list.map(function(p){var st=HI.status(p.o,p.h);
    return '<article class="saved" data-id="'+esc(p.id)+'"><p class="kicker">'+esc(p.dish)+' · '+esc(p.area)+'</p><h2><a href="/places/'+esc(p.slug)+'/">'+esc(p.en)+'</a></h2>'+
      '<p class="st '+st.k+'">'+esc(st.t)+'</p>'+
      '<div class="box driver"><h3>Show this to your driver</h3><p class="big" lang="vi">'+esc(p.vi)+'</p>'+(p.addr?'<p class="addr" lang="vi">'+esc(p.addr)+'</p><p class="small">'+esc(p.addrEn)+'</p>':'')+'</div>'+
      '<div class="acts"><button class="cta" type="button" data-big="'+esc(p.id)+'">Show full screen</button><a class="btn" href="'+esc(p.dir)+'" target="_blank" rel="noopener">Directions</a><button class="btn saved" type="button" data-unsave="'+esc(p.id)+'" aria-pressed="true">♥ Saved</button></div></article>'}).join("");
  el.onclick=function(e){var b=e.target.closest("button");if(!b)return;
    if(b.dataset.big){var p=by[b.dataset.big];driverCard(p.vi,p.addr,p.addrEn);return}
    if(b.dataset.unsave){var q=by[b.dataset.unsave];HI.setFav(q.id,q.slug,false);renderSaved(el)}}}

/* ---- wire up the page */
/* ---- "Which area suits your trip?" quiz on the where-to-stay guide. Weights come from STAY_QUIZ in build.py
   (data-w="area:points,…" on each answer); area texts from #stay-data. Results can be shared as #stay=<area>. */
function initQuiz(form){
  var A;try{A=JSON.parse($("#stay-data").textContent)}catch(e){return}
  var keys=Object.keys(A),qs=$$("fieldset.q",form),btn=$("button[type=submit]",form),left=$(".qleft",form),out=$("#stay-result");
  function answered(){return qs.filter(function(f){return $("input:checked",f)})}
  function upd(){var n=qs.length-answered().length;btn.disabled=n>0;left.textContent=n?n+(n>1?" questions":" question")+" left":"";
    qs.forEach(function(f){f.classList.toggle("done",!!$("input:checked",f))})}
  function render(k,why,second,shared){var a=A[k];if(!a)return;
    var h='<p class="kicker">'+(shared?"A shared result":"Your best match")+'</p><h3>'+esc(a.name)+'</h3><p><strong>Best for:</strong> '+esc(a.best)+'</p>';
    if(why&&why.length)h+='<p class="small"><strong>Why it fits you:</strong> '+why.map(esc).join(" · ")+'</p>';
    h+='<ul>'+a.pros.map(function(x){return"<li>"+esc(x)+"</li>"}).join("")+'</ul><p class="small"><strong>The catch:</strong> '+esc(a.cons)+'</p>';
    if(a.hotel)h+='<p><a class="cta" href="'+esc(a.hotel)+'" target="_blank" rel="sponsored noopener">See hotels in '+esc(a.name.split(" (")[0])+' ↗</a></p>';
    if(a.next&&a.next.length)h+='<p class="small"><strong>Next:</strong></p><div class="chips">'+a.next.map(function(n){return'<a class="chip" href="'+esc(n.u)+'">'+esc(n.t)+'</a>'}).join("")+'</div>';
    if(second&&A[second])h+='<p class="small">Close second: <a href="#area-'+esc(second)+'">'+esc(A[second].name)+'</a>.</p>';
    h+='<div class="qact"><button type="button" class="btn" data-share>Share this result</button><button type="button" class="btn" data-again>'+(shared?"Take the quiz":"Start again")+'</button><span class="small" data-msg aria-live="polite"></span></div>';
    out.innerHTML=h;out.hidden=false;
    $("[data-share]",out).addEventListener("click",function(){var u=location.origin+location.pathname+"#stay="+k,t="My Saigon base: "+a.name.split(" (")[0],m=$("[data-msg]",out);
      if(navigator.share)navigator.share({title:t,url:u}).catch(function(){});
      else if(navigator.clipboard)navigator.clipboard.writeText(u).then(function(){m.textContent="Link copied."},function(){m.textContent=u});else m.textContent=u});
    $("[data-again]",out).addEventListener("click",function(){form.reset();upd();out.hidden=true;
      if(/^#stay=/.test(location.hash))history.replaceState(null,"",location.pathname);qs[0].scrollIntoView({behavior:"smooth",block:"center"});var f=$("input",qs[0]);if(f)f.focus({preventScroll:true})});
    try{out.focus({preventScroll:true})}catch(e){}out.scrollIntoView({behavior:"smooth",block:"start"})}
  form.addEventListener("change",upd);
  form.addEventListener("submit",function(e){e.preventDefault();if(answered().length<qs.length)return;
    var sc={},why={};keys.forEach(function(k){sc[k]=0;why[k]=[]});
    qs.forEach(function(f){var i=$("input:checked",f);(i.getAttribute("data-w")||"").split(",").forEach(function(p){var kv=p.split(":"),k=kv[0],v=+kv[1];
      if(k in sc){sc[k]+=v;if(v>=2)why[k].push($("span",i.parentNode).textContent)}})});
    var r=keys.slice().sort(function(a,b){return sc[b]-sc[a]||keys.indexOf(a)-keys.indexOf(b)});
    render(r[0],why[r[0]],sc[r[1]]>=sc[r[0]]-1?r[1]:null,false)});
  upd();
  var m=/^#stay=([a-z0-9-]+)$/.exec(location.hash);if(m&&A[m[1]])render(m[1],null,null,true);
}
/* ---- itinerary planner (/guides/saigon-itinerary/). Day plans come from ITIN_DAYS in build.py (#plan-data).
   Same day-picking rules as itin_order() in build.py. State is shareable as #d=2&i=food,views. */
function initPlanner(form){
  var D;try{D=JSON.parse($("#plan-data").textContent)}catch(e){return}
  var out=$("#plan-out"),act=$("#plan-act"),skip={};
  function state(){var n=+(($("input[name=days]:checked",form)||{}).value||2),i=$$("input[name=i]:checked",form).map(function(x){return x.value});return{n:n,i:i}}
  function order(n,i){var trip=i.indexOf("countryside")>-1?"mekong":"cuchi";
    if(n===1)return[(i.indexOf("food")>-1&&i.indexOf("history")<0)?"cholon":"centre"];return["centre","cholon",trip].slice(0,n)}
  function meta(a){a=a.filter(Boolean);return a.length?'<span class="meta">'+a.map(esc).join(" · ")+'</span>':""}
  function render(){var st=state(),used={},h="";
    order(st.n,st.i).forEach(function(key,di){var day=D.days[key],rows="";
      day.slots.forEach(function(sl,si){if(sl.tag&&st.i.indexOf(sl.tag)<0)return;var b="",id=key+"-"+si;
        if(sl.sights)b=sl.sights.map(function(x){var o=D.sights[x];return'<a href="'+esc(o.u)+'"><strong>'+esc(o.n)+'</strong></a> <span class="vn" lang="vi">'+esc(o.vn)+'</span>'+meta([o.h])}).join(" + ");
        else if(sl.places){var pool=sl.places.filter(function(x){return!used[x]});if(!pool.length)pool=sl.places.slice();
          var k=pool[(skip[id]||0)%pool.length],o=D.places[k];used[k]=1;
          b='<a href="'+esc(o.u)+'"><strong>'+esc(o.n)+'</strong></a> <span class="vn" lang="vi">'+esc(o.vn)+'</span>'+meta([o.d,o.a,o.h?"Hours: "+o.h:""]);
          if(pool.length>1)b+='<SWAP:'+id+':'+pool.length+'>'}
        else{b=esc(sl.text||"");if(sl.link)b+=' <a href="'+esc(sl.link[1])+'">'+esc(sl.link[0])+' →</a>'}
        var sw="";b=b.replace(/<SWAP:([\w-]+):(\d+)>$/,function(_,i,n){sw='<button type="button" class="swap" data-slot="'+i+'">Another place ('+n+' options)</button>';return""});
        rows+='<li class="slot"><span class="tm">'+esc(sl.time)+'</span><div>'+(sl.label?'<p class="lab">'+esc(sl.label)+'</p>':"")+b+(sl.note?'<p class="note">'+esc(sl.note)+'</p>':"")+sw+'</div></li>'});
      h+='<section class="pday"><p class="kicker">Day '+(di+1)+' · '+esc(day.area)+'</p><h2>'+esc(day.title)+'</h2><p class="small">'+esc(day.intro)+'</p><ol class="slots">'+rows+'</ol></section>'});
    out.innerHTML=h;
    $$(".swap",out).forEach(function(b){b.addEventListener("click",function(){var id=b.getAttribute("data-slot");skip[id]=(skip[id]||0)+1;render();
      var nb=$('.swap[data-slot="'+id+'"]',out);if(nb)nb.focus({preventScroll:true})})})}
  function hash(){var st=state();return"#d="+st.n+"&i="+st.i.join(",")}
  var m=/^#d=([123])&i=([a-z,]*)$/.exec(location.hash);
  if(m){$$("input[name=days]",form).forEach(function(x){x.checked=x.value===m[1]});var on=m[2].split(",");$$("input[name=i]",form).forEach(function(x){x.checked=on.indexOf(x.value)>-1})}
  form.addEventListener("change",function(){skip={};render();if(/^#d=/.test(location.hash))history.replaceState(null,"",location.pathname+hash())});
  act.hidden=false;
  $("[data-print]",act).addEventListener("click",function(){window.print()});
  $("[data-share]",act).addEventListener("click",function(){var u=location.origin+location.pathname+hash(),msg=$("[data-msg]",act),n=state().n;
    if(navigator.share)navigator.share({title:"My "+n+"-day Saigon plan",url:u}).catch(function(){});
    else if(navigator.clipboard)navigator.clipboard.writeText(u).then(function(){msg.textContent="Link copied."},function(){msg.textContent=u});else msg.textContent=u});
  render();
}
/* ---- "Ask a local" chat (all pages). Talks to /api/ask in src/ask.js; shown only when the Worker says it is switched on.
   The conversation lives only in this tab (sessionStorage) and is never stored on our side. */
function md(t){ /* escape first, then allow only links to our own pages, **bold** and "- " lists */
  var h=esc(t).replace(/\*\*([^*\n]+)\*\*/g,"<strong>$1</strong>")
    .replace(/\[([^\]\n]+)\]\((https:\/\/hcmcinsider\.com\/[^\s)]*|\/[^\s)]*)\)/g,function(_,a,u){return'<a href="'+u.replace(/^https:\/\/hcmcinsider\.com/,"")+'">'+a+"</a>"});
  var out="",list=false;h.split("\n").forEach(function(l){var m=/^\s*[-•*]\s+(.*)/.exec(l);
    if(m){if(!list){out+="<ul>";list=true}out+="<li>"+m[1]+"</li>";return}
    if(list){out+="</ul>";list=false}if(l.trim())out+="<p>"+l+"</p>"});
  return out+(list?"</ul>":"")}
function initAsk(){
  if(document.getElementById("ask-fab"))return;
  var st=document.createElement("style");st.textContent=
    ".ask-fab{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:60;display:inline-flex;align-items:center;gap:8px;background:var(--jade);color:var(--surface);border:0;border-radius:999px;padding:12px 18px;font:700 15px/1 var(--font,inherit);box-shadow:var(--shadow);cursor:pointer}"+
    ".ask-fab:hover{background:var(--jade-2)}"+
    ".ask-panel{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:76px;z-index:61;width:min(400px,calc(100vw - 32px));max-height:min(620px,calc(100dvh - 100px));display:flex;flex-direction:column;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:16px;box-shadow:0 1px 2px rgba(19,33,43,.08),0 18px 48px -12px rgba(19,33,43,.35);font-family:var(--font,inherit)}"+
    ".ask-panel[hidden]{display:none}"+
    ".ask-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:14px 16px 10px;border-bottom:1px solid var(--line)}"+
    ".ask-k{margin:0;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--jade)}"+
    ".ask-top h2{margin:2px 0 0;font-size:18px;line-height:1.25;font-weight:800}"+
    ".ask-x{background:none;border:0;color:var(--muted);font-size:26px;line-height:1;cursor:pointer;padding:0 4px}"+
    ".ask-log{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:10px;font-size:15px;line-height:1.5;min-height:120px}"+
    ".ask-log .msg{max-width:92%;border-radius:12px;padding:9px 12px;overflow-wrap:anywhere}"+
    ".ask-log .msg p{margin:0 0 6px}.ask-log .msg p:last-child{margin:0}.ask-log .msg ul{margin:4px 0 6px;padding-left:18px}"+
    ".ask-log .me{align-self:flex-end;background:var(--ink);color:var(--bg)}"+
    ".ask-log .bot{align-self:flex-start;background:var(--sunk)}.ask-log .bot a{color:var(--jade);font-weight:600}"+
    ".ask-log .typing{color:var(--muted)}"+
    ".ask-sug{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 10px}.ask-sug[hidden]{display:none}"+
    ".ask-chip{font:600 13px/1.3 var(--font,inherit);border:1.5px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:6px 11px;cursor:pointer;text-align:left}"+
    ".ask-chip:hover{border-color:var(--jade);color:var(--jade)}"+
    ".ask-form{display:flex;gap:8px;padding:10px 16px;border-top:1px solid var(--line)}"+
    ".ask-form textarea{flex:1;resize:none;font:16px/1.4 var(--font,inherit);color:var(--ink);background:var(--bg);border:1.5px solid var(--line);border-radius:12px;padding:8px 10px;min-width:0}"+
    ".ask-send{align-self:flex-end;background:var(--jade);color:var(--surface);border:0;border-radius:999px;padding:10px 16px;font:700 15px/1 var(--font,inherit);cursor:pointer}.ask-send:disabled{opacity:.5;cursor:wait}"+
    ".ask-note{margin:0;padding:0 16px 12px;font-size:12px;line-height:1.45;color:var(--muted)}.ask-note a{color:var(--muted)}"+
    ".ask-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}"+
    "@media (max-width:520px){.ask-panel{right:8px;left:8px;width:auto;bottom:72px;max-height:calc(100dvh - 90px)}.ask-fab span{display:none}.ask-fab{padding:14px}}"+
    "@media print{.ask-fab,.ask-panel{display:none!important}}";
  document.head.appendChild(st);
  var KEY="hi_chat",hist=[];try{hist=JSON.parse(sessionStorage.getItem(KEY)||"[]")}catch(e){}
  function save(){try{sessionStorage.setItem(KEY,JSON.stringify(hist.slice(-10)))}catch(e){}}
  var fab=document.createElement("button");fab.id="ask-fab";fab.type="button";fab.className="ask-fab";fab.setAttribute("aria-haspopup","dialog");fab.setAttribute("aria-label","Ask a local");fab.setAttribute("aria-expanded","false");
  fab.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg><span>Ask a local</span>';
  var box=document.createElement("div");box.className="ask-panel";box.setAttribute("role","dialog");box.setAttribute("aria-modal","false");box.setAttribute("aria-labelledby","ask-h");box.hidden=true;
  box.innerHTML='<div class="ask-top"><div><p class="ask-k">Ask a local</p><h2 id="ask-h">Questions about Saigon?</h2></div><button type="button" class="ask-x" aria-label="Close chat">×</button></div>'+
    '<div class="ask-log" aria-live="polite"></div>'+
    '<div class="ask-sug"></div>'+
    '<form class="ask-form"><label class="ask-sr" for="ask-in">Your question</label><textarea id="ask-in" rows="2" maxlength="600" placeholder="e.g. Where can I eat near Binh Tay Market in the morning?"></textarea><button type="submit" class="ask-send">Ask</button></form>'+
    '<p class="ask-note">AI answers from this site’s guides. Hours and prices change, so check before you go. Don’t share personal details. <a href="/privacy">Privacy</a></p>';
  document.body.appendChild(fab);document.body.appendChild(box);
  var log=$(".ask-log",box),inp=$("#ask-in",box),form=$(".ask-form",box),btn=$("button[type=submit]",form),sug=$(".ask-sug",box),busy=false;
  ["Best breakfast in Cholon?","How do I get from the airport to District 1?","Is the War Remnants Museum open on Monday?","2 days in Saigon: what should I do?"].forEach(function(q){
    var b=document.createElement("button");b.type="button";b.className="ask-chip";b.textContent=q;b.addEventListener("click",function(){inp.value=q;send()});sug.appendChild(b)});
  function bubble(role,text){var d=document.createElement("div");d.className="msg "+(role==="user"?"me":"bot");
    if(role==="user")d.textContent=text;else d.innerHTML=md(text);log.appendChild(d);log.scrollTop=log.scrollHeight;return d}
  function paint(){log.innerHTML="";if(!hist.length)bubble("assistant","Hi! Ask me about food, sights, getting around or planning your days in Saigon. I answer from the guides on this site.");
    hist.forEach(function(m){bubble(m.role,m.content)});sug.hidden=hist.length>0}
  function open(){box.hidden=false;fab.setAttribute("aria-expanded","true");paint();inp.focus()}
  function close(){box.hidden=true;fab.setAttribute("aria-expanded","false");fab.focus()}
  fab.addEventListener("click",function(){box.hidden?open():close()});
  $(".ask-x",box).addEventListener("click",close);
  box.addEventListener("keydown",function(e){if(e.key==="Escape")close()});
  inp.addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}});
  form.addEventListener("submit",function(e){e.preventDefault();send()});
  function send(){var q=inp.value.trim();if(!q||busy)return;busy=true;btn.disabled=true;inp.value="";sug.hidden=true;
    hist.push({role:"user",content:q});save();bubble("user",q);var d=bubble("assistant","");d.classList.add("typing");d.textContent="…";var text="";
    fetch("/api/ask",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:hist})}).then(function(r){
      if(!r.ok)return r.json().catch(function(){return{}}).then(function(j){throw new Error(j.error||"Sorry, something went wrong. Please try again.")});
      if(!r.body||!window.TextDecoder)return r.text().then(function(t){text=t});
      var rd=r.body.getReader(),dec=new TextDecoder();
      function pump(){return rd.read().then(function(x){if(x.done)return;text+=dec.decode(x.value,{stream:true});d.classList.remove("typing");d.innerHTML=md(text);log.scrollTop=log.scrollHeight;return pump()})}
      return pump()}).then(function(){d.classList.remove("typing");d.innerHTML=md(text||"Sorry, no answer came back. Please try again.");if(text){hist.push({role:"assistant",content:text});save()}
    }).catch(function(err){d.classList.remove("typing");d.innerHTML=md(err.message);hist.pop();save()}).then(function(){busy=false;btn.disabled=false;inp.focus()})}
}
function maybeAsk(){var k="hi_chat_on",v=null;try{v=sessionStorage.getItem(k)}catch(e){}
  if(v==="1")return initAsk();if(v==="0"||!window.fetch)return;
  fetch("/api/ask",{headers:{Accept:"application/json"}}).then(function(r){return r.ok?r.json():{}}).then(function(j){
    try{sessionStorage.setItem(k,j.ready?"1":"0")}catch(e){}if(j.ready)initAsk()}).catch(function(){})}
function init(){
  $$(".pfav").forEach(function(b){var id=b.getAttribute("data-fav"),slug=b.getAttribute("data-slug");
    var paint=function(){var on=HI.favs().indexOf(id)>-1;b.setAttribute("aria-pressed",String(on));b.classList.toggle("saved",on);b.textContent=on?"♥ Saved":"♡ Save"};
    paint();b.hidden=false;b.addEventListener("click",function(){HI.setFav(id,slug,HI.favs().indexOf(id)<0);paint()})});
  $$(".box.driver .fs").forEach(function(p){var box=p.closest(".box");p.hidden=false;
    $("button",p).addEventListener("click",function(){var a=$(".addr",box),en=a&&a.nextElementSibling&&a.nextElementSibling.classList.contains("small")&&!$("button",a.nextElementSibling)?a.nextElementSibling.textContent:"";
      driverCard($(".big",box).textContent,a?a.textContent:"",en)})});
  $$(".st[data-oh]").forEach(function(el){try{var s=HI.status(JSON.parse(el.getAttribute("data-oh")));el.className="st "+s.k;el.textContent=s.t+" (Saigon time "+HI.clock()+")";el.hidden=false}catch(e){}});
  var ob=$("#order");if(ob)initOrder(ob);
  var qz=$("#stay-quiz");if(qz)initQuiz(qz);
  var pf=$("#plan-form");if(pf)initPlanner(pf);
  if(!/^\/saved\//.test(location.pathname))maybeAsk();
  var sv=$("#saved");if(sv){renderSaved(sv);var off=$("#offline"),upd=function(){off.hidden=navigator.onLine!==false};upd();addEventListener("online",upd);addEventListener("offline",upd)}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost"))
  addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})});
})();
