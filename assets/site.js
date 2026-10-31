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
function init(){
  $$(".pfav").forEach(function(b){var id=b.getAttribute("data-fav"),slug=b.getAttribute("data-slug");
    var paint=function(){var on=HI.favs().indexOf(id)>-1;b.setAttribute("aria-pressed",String(on));b.classList.toggle("saved",on);b.textContent=on?"♥ Saved":"♡ Save"};
    paint();b.hidden=false;b.addEventListener("click",function(){HI.setFav(id,slug,HI.favs().indexOf(id)<0);paint()})});
  $$(".box.driver .fs").forEach(function(p){var box=p.closest(".box");p.hidden=false;
    $("button",p).addEventListener("click",function(){var a=$(".addr",box),en=a&&a.nextElementSibling&&a.nextElementSibling.classList.contains("small")&&!$("button",a.nextElementSibling)?a.nextElementSibling.textContent:"";
      driverCard($(".big",box).textContent,a?a.textContent:"",en)})});
  $$(".st[data-oh]").forEach(function(el){try{var s=HI.status(JSON.parse(el.getAttribute("data-oh")));el.className="st "+s.k;el.textContent=s.t+" (Saigon time "+HI.clock()+")";el.hidden=false}catch(e){}});
  var ob=$("#order");if(ob)initOrder(ob);
  var sv=$("#saved");if(sv){renderSaved(sv);var off=$("#offline"),upd=function(){off.hidden=navigator.onLine!==false};upd();addEventListener("online",upd);addEventListener("offline",upd)}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost"))
  addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})});
})();
