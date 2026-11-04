/* One Day in Saigon: a playable comic. All art is drawn here as SVG; the 24 moments are in Q, one painter per moment in V. */
(function(){
/* ============================================================ drawing kit (SVG, 400 x 300) */
var K="#22160F", SK=["#F7D4B8","#E8B48E","#C98B62"];
function t(x,y,s,o){o=o||{};return '<text x="'+x+'" y="'+y+'" font-family="Be Vietnam Pro, sans-serif" font-weight="'+(o.w||800)+'" font-size="'+(o.s||11)+'" fill="'+(o.f||"#fff")+'" text-anchor="'+(o.a||"middle")+'"'+(o.r?' transform="rotate('+o.r+' '+x+' '+y+')"':"")+'>'+s+'</text>';}
function sfx(x,y,s,r,size){return '<text x="'+x+'" y="'+y+'" font-family="Bangers, Impact, sans-serif" font-size="'+(size||30)+'" fill="#FFC93C" stroke="'+K+'" stroke-width="2.5" paint-order="stroke" text-anchor="middle" transform="rotate('+(r||-8)+' '+x+' '+y+')" letter-spacing="1">'+s+'</text>';}

/* chibi characters: big head, anime eyes. o = {s, skin, hair, hs (style), shirt, pants, hat, face, arm, flip, item, hero, apron, sit} */
function person(x,y,o){
  var s=o.s||1,f=o.flip?-1:1,sk=o.skin||SK[0],sh=o.shirt||"#5B8DEF",hc=o.hair||"#2A1A12";
  var g='<g transform="translate('+x+' '+y+') scale('+(f*s)+' '+s+')">';
  g+='<ellipse cx="0" cy="2" rx="27" ry="5" fill="#000" opacity=".16"/>';
  if(o.hs==="long")g+='<path d="M-33,-100 Q-38,-56 -24,-54 L24,-54 Q38,-56 33,-100 Z" fill="'+hc+'" stroke="'+K+'" stroke-width="2.5"/>';
  if(o.hero)g+='<rect x="-34" y="-70" width="20" height="34" rx="7" fill="#17A589" stroke="'+K+'" stroke-width="2.5"/>';
  if(o.sit){g+='<path d="M-14,-30 L-14,-14 L-30,-12 M14,-30 L14,-14 L30,-12" stroke="'+(o.pants||"#2F4E6E")+'" stroke-width="11" stroke-linecap="round" fill="none"/>';}
  else{g+='<rect x="-15" y="-32" width="12" height="31" rx="4" fill="'+(o.pants||"#2F4E6E")+'" stroke="'+K+'" stroke-width="2.5"/><rect x="3" y="-32" width="12" height="31" rx="4" fill="'+(o.pants||"#2F4E6E")+'" stroke="'+K+'" stroke-width="2.5"/>'+
    '<ellipse cx="-10" cy="-1" rx="9" ry="4.5" fill="'+K+'"/><ellipse cx="10" cy="-1" rx="9" ry="4.5" fill="'+K+'"/>';}
  g+='<rect x="-23" y="-70" width="46" height="44" rx="15" fill="'+sh+'" stroke="'+K+'" stroke-width="2.5"/>';
  if(o.apron)g+='<rect x="-15" y="-52" width="30" height="26" rx="5" fill="'+o.apron+'" stroke="'+K+'" stroke-width="2"/>';
  if(o.hero)g+='<path d="M-15,-68 L-12,-36 M15,-68 L12,-36" stroke="#17A589" stroke-width="5" stroke-linecap="round"/>';
  var arms={down:[[26,-34],[-26,-34]],wave:[[36,-114],[-26,-34]],hold:[[22,-46],[-22,-46]],point:[[52,-72],[-26,-34]],give:[[46,-58],[-26,-34]],phone:[[14,-60],[-14,-58]],both:[[38,-110],[-38,-110]],hips:[[30,-40],[-30,-40]]};
  var A=arms[o.arm||"down"];
  [A[1],A[0]].forEach(function(h,i){var sx=i?20:-20;g+='<path d="M'+sx+',-62 L'+h[0]+','+h[1]+'" stroke="'+K+'" stroke-width="14" stroke-linecap="round"/><path d="M'+sx+',-62 L'+h[0]+','+h[1]+'" stroke="'+sh+'" stroke-width="8.5" stroke-linecap="round"/><circle cx="'+h[0]+'" cy="'+h[1]+'" r="6.5" fill="'+sk+'" stroke="'+K+'" stroke-width="2.2"/>';});
  if(o.item)g+='<g transform="translate('+A[0][0]+' '+A[0][1]+')">'+o.item+'</g>';
  g+='<circle cx="0" cy="-98" r="31" fill="'+sk+'" stroke="'+K+'" stroke-width="2.5"/>';
  var hs=o.hs||"short";
  if(hs==="spiky")g+='<path d="M-32,-98 Q-34,-136 0,-134 Q34,-136 32,-98 L26,-110 L19,-99 L11,-115 L2,-101 L-8,-117 L-16,-101 L-24,-112 Z" fill="'+hc+'" stroke="'+K+'" stroke-width="2.5" stroke-linejoin="round"/>';
  else if(hs!=="none")g+='<path d="M-32,-96 Q-32,-134 0,-133 Q32,-134 32,-96 Q24,-114 6,-112 L0,-104 L-6,-112 Q-24,-114 -32,-96 Z" fill="'+hc+'" stroke="'+K+'" stroke-width="2.5" stroke-linejoin="round"/>';
  if(hs==="bun")g+='<circle cx="0" cy="-136" r="10" fill="'+hc+'" stroke="'+K+'" stroke-width="2.5"/>';
  g+=face(o.face||"neutral",o.glasses);
  if(o.hat==="non")g+='<path d="M-50,-112 L50,-112 L0,-158 Z" fill="#EBCB7E" stroke="'+K+'" stroke-width="2.5" stroke-linejoin="round"/><path d="M-30,-112 L0,-140 M30,-112 L0,-140 M-12,-112 L0,-150 M12,-112 L0,-150" stroke="#B9934A" stroke-width="1.4"/>';
  if(o.hat==="helmet")g+='<path d="M-35,-102 Q-36,-142 0,-142 Q36,-142 35,-102 Z" fill="'+(o.hc||"#E74C3C")+'" stroke="'+K+'" stroke-width="2.5"/><path d="M-22,-130 Q0,-138 22,-130" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>';
  if(o.hat==="cap")g+='<path d="M-31,-108 Q-30,-140 0,-140 Q30,-140 31,-108 Z" fill="'+(o.hc||"#2E86DE")+'" stroke="'+K+'" stroke-width="2.5"/><path d="M8,-108 L48,-106 Q50,-100 30,-100 L8,-102 Z" fill="'+(o.hc||"#2E86DE")+'" stroke="'+K+'" stroke-width="2.5"/>';
  return g+'</g>';
}
function face(f,gl){
  var g='<ellipse cx="-19" cy="-85" rx="6" ry="3.4" fill="#F28B82" opacity=".55"/><ellipse cx="19" cy="-85" rx="6" ry="3.4" fill="#F28B82" opacity=".55"/>';
  var eye=function(x){return '<ellipse cx="'+x+'" cy="-95" rx="5" ry="7" fill="'+K+'"/><circle cx="'+(x+1.8)+'" cy="-97.5" r="2.3" fill="#fff"/><circle cx="'+(x-1.5)+'" cy="-92" r="1" fill="#fff"/>';};
  if(f==="happy")g+='<path d="M-17,-93 Q-11,-102 -5,-93 M5,-93 Q11,-102 17,-93" stroke="'+K+'" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M-8,-83 Q0,-72 8,-83 Z" fill="#D9453B" stroke="'+K+'" stroke-width="2.2" stroke-linejoin="round"/>';
  else if(f==="shock")g+='<circle cx="-11" cy="-95" r="7.5" fill="#fff" stroke="'+K+'" stroke-width="2.4"/><circle cx="11" cy="-95" r="7.5" fill="#fff" stroke="'+K+'" stroke-width="2.4"/><circle cx="-11" cy="-95" r="2.6" fill="'+K+'"/><circle cx="11" cy="-95" r="2.6" fill="'+K+'"/><ellipse cx="0" cy="-80" rx="5" ry="6" fill="#7A2A1E" stroke="'+K+'" stroke-width="2"/><path d="M-22,-121 L-18,-113 M0,-126 L0,-117 M22,-121 L18,-113" stroke="'+K+'" stroke-width="2.4" stroke-linecap="round"/>';
  else if(f==="worry")g+=eye(-11)+eye(11)+'<path d="M-18,-108 L-5,-104 M18,-108 L5,-104" stroke="'+K+'" stroke-width="2.6" stroke-linecap="round"/><path d="M-7,-81 Q-3.5,-84 0,-81 Q3.5,-78 7,-81" stroke="'+K+'" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M27,-118 Q33,-108 27,-104 Q21,-108 27,-118 Z" fill="#7FD3F7" stroke="'+K+'" stroke-width="1.8"/>';
  else if(f==="talk")g+=eye(-11)+eye(11)+'<ellipse cx="0" cy="-81" rx="6" ry="4.5" fill="#D9453B" stroke="'+K+'" stroke-width="2"/>';
  else if(f==="grin")g+=eye(-11)+eye(11)+'<path d="M-9,-84 Q0,-76 9,-84" stroke="'+K+'" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
  else g+=eye(-11)+eye(11)+'<path d="M-5,-83 Q0,-79 5,-83" stroke="'+K+'" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
  if(gl)g+='<circle cx="-11" cy="-95" r="9" fill="none" stroke="'+K+'" stroke-width="2.4"/><circle cx="11" cy="-95" r="9" fill="none" stroke="'+K+'" stroke-width="2.4"/><path d="M-2,-95 L2,-95" stroke="'+K+'" stroke-width="2.4"/>';
  return g;
}
function hero(x,y,face,arm,item,extra){var o={hero:1,hs:"spiky",hair:"#7A4426",shirt:"#FFB627",pants:"#2F4E6E",face:face,arm:arm||"down",item:item};for(var k in extra)o[k]=extra[k];return person(x,y,o);}

/* backgrounds */
function sky(top,bot){return '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+top+'"/><stop offset="1" stop-color="'+bot+'"/></linearGradient></defs><rect width="400" height="300" fill="url(#sky)"/>';}
function houses(pal,signs,h,night){
  var g="",hs=h||[170,150,182,160,175];
  for(var i=0;i<5;i++){var x=i*80,top=228-hs[i],c=pal[i%pal.length];
    g+='<rect x="'+x+'" y="'+top+'" width="80" height="'+hs[i]+'" fill="'+c+'" stroke="'+K+'" stroke-width="2.5"/>';
    for(var r=0;r<2;r++)for(var w=0;w<2;w++){var wx=x+12+w*34,wy=top+14+r*38;g+='<rect x="'+wx+'" y="'+wy+'" width="22" height="26" rx="3" fill="'+(night?(((i+r+w)%3)?"#FFD86B":"#2B3A55"):"#2B4C6F")+'" stroke="'+K+'" stroke-width="2"/><path d="M'+(wx-3)+','+(wy+26)+' h28" stroke="'+K+'" stroke-width="2"/>';}
    g+='<rect x="'+(x+6)+'" y="'+(top+90)+'" width="68" height="4" fill="'+K+'"/>';
    if(signs&&signs[i]){g+='<rect x="'+(x+6)+'" y="'+(228-62)+'" width="68" height="20" rx="3" fill="'+(i%2?"#E63946":"#FFC93C")+'" stroke="'+K+'" stroke-width="2"/>'+t(x+40,228-48,signs[i],{s:10.5,f:i%2?"#fff":K});}
    g+='<rect x="'+(x+14)+'" y="'+(228-38)+'" width="52" height="38" fill="'+(night?"#5A3B1E":"#3A2A20")+'" stroke="'+K+'" stroke-width="2"/>';}
  g+='<path d="M0,64 Q200,104 400,58 M0,74 Q160,120 400,70 M0,58 Q250,96 400,84" stroke="'+K+'" stroke-width="1.4" fill="none"/>';
  return g;
}
function walk(night){return '<rect y="226" width="400" height="22" fill="'+(night?"#8C7B6B":"#D8C3A0")+'" stroke="'+K+'" stroke-width="2.5"/><path d="M0,237 H400" stroke="'+K+'" stroke-width="1" opacity=".35"/>'+[40,100,160,220,280,340].map(function(x){return '<path d="M'+x+',226 v22" stroke="'+K+'" stroke-width="1" opacity=".3"/>';}).join("")+
  '<rect y="248" width="400" height="52" fill="'+(night?"#3E3B44":"#6E6A6A")+'"/><path d="M0,248 H400" stroke="#F4D35E" stroke-width="3"/>';}
function tree(x,y){return '<rect x="'+(x-5)+'" y="'+(y-70)+'" width="10" height="70" fill="#7A5230" stroke="'+K+'" stroke-width="2"/><circle cx="'+x+'" cy="'+(y-82)+'" r="30" fill="#4CAF6B" stroke="'+K+'" stroke-width="2.5"/><circle cx="'+(x-18)+'" cy="'+(y-66)+'" r="18" fill="#3E9A5C" stroke="'+K+'" stroke-width="2.5"/>';}
function street(o){o=o||{};return sky(o.n?"#1B2340":"#7FD3F7",o.n?"#3C3A6B":"#DDF4FC")+(o.sun?sun(340,40):"")+houses(o.pal||["#F4A261","#F6E7B0","#9ED8C8","#F7B7C3","#C9D7F2"],o.signs||["PHỞ","CƠM TẤM","CÀ PHÊ","TẠP HÓA","TIỆM VÀNG"],o.h,o.n)+walk(o.n);}
function sun(x,y){return '<circle cx="'+x+'" cy="'+y+'" r="26" fill="#FFD23F" stroke="'+K+'" stroke-width="2.5"/>'+[0,45,90,135,180,225,270,315].map(function(a){var r=a*Math.PI/180;return '<path d="M'+(x+Math.cos(r)*33)+','+(y+Math.sin(r)*33)+' L'+(x+Math.cos(r)*44)+','+(y+Math.sin(r)*44)+'" stroke="'+K+'" stroke-width="3" stroke-linecap="round"/>';}).join("");}
function indoor(wall,floor){return '<rect width="400" height="300" fill="'+wall+'"/><rect y="236" width="400" height="64" fill="'+floor+'"/><path d="M0,236 H400" stroke="'+K+'" stroke-width="2.5"/>'+[60,140,220,300,380].map(function(x){return '<path d="M'+x+',236 L'+(x-40)+',300" stroke="'+K+'" stroke-width="1" opacity=".25"/>';}).join("");}
function airport(){var g=indoor("#D5ECF7","#B9C6D0");
  for(var i=0;i<5;i++)g+='<rect x="'+(i*80+6)+'" y="18" width="68" height="120" fill="#A8DDF5" stroke="'+K+'" stroke-width="2"/><path d="M'+(i*80+10)+',120 L'+(i*80+40)+',30" stroke="#fff" stroke-width="5" opacity=".6"/>';
  g+='<path d="M160,64 q20,-14 40,0 l30,-6 l-8,10 l-22,4 q-22,8 -40,-8 Z" fill="#fff" stroke="'+K+'" stroke-width="2"/>';
  g+='<rect x="0" y="138" width="400" height="16" fill="#3F5D7D"/>'+t(200,150,"GA ĐẾN · ARRIVALS · TERMINAL 2",{s:10});return g;}
function counter(x,w,label,col){return '<rect x="'+x+'" y="176" width="'+w+'" height="64" rx="4" fill="'+(col||"#F2F2F2")+'" stroke="'+K+'" stroke-width="2.5"/><rect x="'+x+'" y="170" width="'+w+'" height="10" fill="#8D99AE" stroke="'+K+'" stroke-width="2.5"/><rect x="'+(x+10)+'" y="190" width="'+(w-20)+'" height="22" rx="3" fill="#E63946" stroke="'+K+'" stroke-width="2"/>'+t(x+w/2,205,label,{s:11});}
function moto(x,y,c,cls,hc){return '<g class="'+(cls||"")+'"><g transform="translate('+x+' '+y+')">'+
  '<circle cx="-22" cy="0" r="11" fill="#333" stroke="'+K+'" stroke-width="2.5"/><circle cx="24" cy="0" r="11" fill="#333" stroke="'+K+'" stroke-width="2.5"/><circle cx="-22" cy="0" r="4" fill="#aaa"/><circle cx="24" cy="0" r="4" fill="#aaa"/>'+
  '<path d="M-30,-8 Q-28,-24 -6,-22 L18,-22 L30,-6 L-30,-6 Z" fill="'+c+'" stroke="'+K+'" stroke-width="2.5" stroke-linejoin="round"/><path d="M-30,-12 L-36,-22" stroke="'+K+'" stroke-width="3"/>'+
  '<rect x="-2" y="-52" width="20" height="30" rx="7" fill="#5B8DEF" stroke="'+K+'" stroke-width="2.3"/><path d="M8,-30 L-12,-14" stroke="#2F4E6E" stroke-width="8" stroke-linecap="round"/><path d="M2,-44 L-24,-30" stroke="'+K+'" stroke-width="6" stroke-linecap="round"/>'+
  '<circle cx="8" cy="-64" r="13" fill="'+SK[1]+'" stroke="'+K+'" stroke-width="2.3"/><path d="M-6,-64 Q-6,-80 8,-80 Q22,-80 22,-64 Z" fill="'+(hc||"#FFC93C")+'" stroke="'+K+'" stroke-width="2.3"/>'+
  '</g></g>';}
function car(x,y,c,plate){return '<g transform="translate('+x+' '+y+')"><path d="M-80,-10 L-78,-34 Q-70,-40 -54,-42 L-36,-66 Q-30,-72 -18,-72 L34,-72 Q46,-72 52,-64 L68,-42 Q80,-40 82,-30 L82,-10 Z" fill="'+c+'" stroke="'+K+'" stroke-width="2.6" stroke-linejoin="round"/><path d="M-30,-44 L-16,-64 L8,-64 L8,-44 Z M14,-44 L14,-64 L38,-64 L56,-44 Z" fill="#9FD8F2" stroke="'+K+'" stroke-width="2.2"/><circle cx="-48" cy="-8" r="15" fill="#333" stroke="'+K+'" stroke-width="2.5"/><circle cx="50" cy="-8" r="15" fill="#333" stroke="'+K+'" stroke-width="2.5"/><circle cx="-48" cy="-8" r="6" fill="#bbb"/><circle cx="50" cy="-8" r="6" fill="#bbb"/>'+(plate?'<rect x="-20" y="-28" width="44" height="14" rx="2" fill="#fff" stroke="'+K+'" stroke-width="2"/>'+t(2,-18,plate,{s:9,f:K}):"")+'</g>';}
function stool(x,y,c){return '<path d="M'+(x-14)+','+y+' L'+(x-10)+','+(y-22)+' L'+(x+10)+','+(y-22)+' L'+(x+14)+','+y+'" fill="none" stroke="'+K+'" stroke-width="7" stroke-linejoin="round"/><path d="M'+(x-14)+','+y+' L'+(x-10)+','+(y-22)+' L'+(x+10)+','+(y-22)+' L'+(x+14)+','+y+'" fill="none" stroke="'+c+'" stroke-width="3.5" stroke-linejoin="round"/><rect x="'+(x-15)+'" y="'+(y-27)+'" width="30" height="7" rx="2" fill="'+c+'" stroke="'+K+'" stroke-width="2"/>';}
function cart(x,label,c){return '<g transform="translate('+x+' 0)"><rect x="-60" y="150" width="120" height="58" rx="4" fill="#EAF6FB" fill-opacity=".85" stroke="'+K+'" stroke-width="2.5"/><path d="M-60,180 H60" stroke="'+K+'" stroke-width="2"/><rect x="-66" y="130" width="132" height="22" rx="3" fill="'+(c||"#E63946")+'" stroke="'+K+'" stroke-width="2.5"/>'+t(0,146,label,{s:12})+'<rect x="-64" y="208" width="128" height="16" fill="#8E5A3C" stroke="'+K+'" stroke-width="2.5"/><circle cx="-44" cy="232" r="10" fill="#333" stroke="'+K+'" stroke-width="2.5"/><circle cx="44" cy="232" r="10" fill="#333" stroke="'+K+'" stroke-width="2.5"/></g>';}
function banhmi(){return '<path d="M-14,4 Q-16,-8 0,-9 Q16,-8 14,4 Z" transform="rotate(-20)" fill="#E7B76A" stroke="'+K+'" stroke-width="2"/><path d="M-8,-4 L6,-6" stroke="#4CAF6B" stroke-width="3" transform="rotate(-20)"/>';}
function glass(c){return '<path d="M-7,-14 L7,-14 L5,6 L-5,6 Z" fill="'+(c||"#8B5A2B")+'" stroke="'+K+'" stroke-width="2"/><path d="M-6,-14 L6,-14 L6,-10 L-6,-10 Z" fill="#fff" opacity=".7"/>';}
function phone(txt){return '<rect x="-9" y="-16" width="18" height="30" rx="4" fill="#222" stroke="'+K+'" stroke-width="2"/><rect x="-6.5" y="-12" width="13" height="21" rx="1.5" fill="#7FD3F7"/>'+(txt||"");}
function note(val,c,r){return '<g transform="rotate('+(r||0)+')"><rect x="-22" y="-11" width="44" height="22" rx="2" fill="'+c+'" stroke="'+K+'" stroke-width="2"/><circle cx="-11" cy="0" r="6" fill="#fff" opacity=".5"/>'+t(8,4,val,{s:9,f:K})+'</g>';}
function bowl(){return '<path d="M-20,-6 L20,-6 Q18,12 0,12 Q-18,12 -20,-6 Z" fill="#fff" stroke="'+K+'" stroke-width="2.4"/><path d="M-20,-6 L20,-6" stroke="#E63946" stroke-width="3"/><g class="steam"><path d="M-6,-12 q-5,-8 0,-14 q5,-6 0,-12 M6,-12 q-5,-8 0,-14 q5,-6 0,-12" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M-6,-12 q-5,-8 0,-14 q5,-6 0,-12 M6,-12 q-5,-8 0,-14 q5,-6 0,-12" stroke="'+K+'" stroke-width="1" fill="none" opacity=".4"/></g>';}
function lantern(x,y,c){return '<g class="sway"><path d="M'+x+','+(y-20)+' V'+(y-10)+'" stroke="'+K+'" stroke-width="2"/><ellipse cx="'+x+'" cy="'+(y+6)+'" rx="15" ry="17" fill="'+c+'" stroke="'+K+'" stroke-width="2.5"/><path d="M'+(x-6)+','+(y-10)+' Q'+(x-12)+','+(y+6)+' '+(x-6)+','+(y+22)+' M'+(x+6)+','+(y-10)+' Q'+(x+12)+','+(y+6)+' '+(x+6)+','+(y+22)+'" stroke="'+K+'" stroke-width="1.4" fill="none" opacity=".6"/><rect x="'+(x-7)+'" y="'+(y-12)+'" width="14" height="5" fill="#FFC93C" stroke="'+K+'" stroke-width="1.6"/><path d="M'+x+','+(y+23)+' v10" stroke="#FFC93C" stroke-width="3"/></g>';}
function rain(){var g='<rect width="400" height="300" fill="#3D5A80" opacity=".28"/><g class="rainy">';for(var i=0;i<60;i++){var x=(i*67)%410,y=((i*131)%330)-30;g+='<path d="M'+x+','+y+' l-6,16" stroke="#E0F4FF" stroke-width="2" stroke-linecap="round" opacity=".85"/>';}return g+'</g>';}
function burst(x,y,txt,c){var p=[];for(var i=0;i<16;i++){var a=i*Math.PI/8,r=i%2?32:48;p.push((x+Math.cos(a)*r*1.35).toFixed(1)+","+(y+Math.sin(a)*r).toFixed(1));}
  return '<g class="pop"><polygon points="'+p.join(" ")+'" fill="'+c+'" stroke="'+K+'" stroke-width="3" stroke-linejoin="round"/><text x="'+x+'" y="'+(y+9)+'" font-family="Bangers, Impact, sans-serif" font-size="27" fill="#fff" stroke="'+K+'" stroke-width="2.5" paint-order="stroke" text-anchor="middle" letter-spacing="1">'+txt+'</text></g>';}
function heat(){return '<g opacity=".55">'+[60,150,240,330].map(function(x){return '<path d="M'+x+',214 q8,-10 0,-20 q-8,-10 0,-20" stroke="#FF8C42" stroke-width="3" fill="none" class="steam"/>';}).join("")+'</g>';}

/* one painter per moment: h = hero face */
var V=[
 function(h){return airport()+counter(230,150,"ĐỔI TIỀN · EXCHANGE","#F6F6F6")+person(305,172,{shirt:"#fff",hair:"#1F1410",hs:"bun",face:"grin",s:.8,arm:"hold",item:note("100","#9ED8C8")})+'<rect x="230" y="152" width="150" height="16" fill="#FFC93C" stroke="'+K+'" stroke-width="2"/>'+t(305,164,"USD 25,9xx  ·  EUR 28,xxx",{s:9,f:K})+hero(120,288,h,"hold",'<g transform="translate(-22 4)">'+note("$","#B7E4A8",-10)+'</g>');},
 function(h){return airport()+counter(220,160,"SIM 4G / 5G","#F6F6F6")+person(300,172,{shirt:"#E63946",hair:"#2A1A12",hs:"long",face:"talk",s:.8,arm:"give",item:'<rect x="-8" y="-6" width="16" height="12" rx="2" fill="#FFC93C" stroke="'+K+'" stroke-width="2"/>'})+hero(110,288,h,"phone",phone(),{flip:0});},
 function(h){return '<rect width="400" height="300" fill="#CFE8F3"/><rect y="0" width="400" height="40" fill="#8D99AE" stroke="'+K+'" stroke-width="2.5"/>'+[30,190,350].map(function(x){return '<rect x="'+(x-8)+'" y="40" width="16" height="190" fill="#B8C4CE" stroke="'+K+'" stroke-width="2.5"/>';}).join("")+'<rect x="260" y="60" width="120" height="26" rx="4" fill="#1450A3" stroke="'+K+'" stroke-width="2"/>'+t(320,78,"TAXI · XE CÔNG NGHỆ",{s:10})+walk()+car(330,272,"#3FA34D")+person(250,262,{shirt:"#7E57C2",hs:"short",face:"grin",s:.95,arm:"wave",flip:1,hair:"#1F1410",glasses:1})+hero(110,270,h,"down")+sfx(300,130,"TAXI! TAXI!",-6,26);},
 function(h){return street({signs:["","GA ĐI","","",""],pal:["#C9D7F2","#E2E8F0","#C9D7F2","#E2E8F0","#C9D7F2"]})+car(285,286,"#FFFFFF","51K-238.46")+person(255,236,{shirt:"#3FA34D",hs:"short",s:.6,face:"grin",arm:"wave",hat:"cap",hc:"#3FA34D"})+hero(90,290,h,"give",'<g transform="translate(6 -6)">'+phone(t(0,1,"51K",{s:5.5,f:K})+t(0,7,"238.46",{s:5,f:K}))+'</g>');},
 function(h){return '<rect width="400" height="300" fill="#F2E3C6"/><rect x="40" y="30" width="150" height="200" rx="4" fill="#B5835A" stroke="'+K+'" stroke-width="2.5"/><rect x="40" y="10" width="150" height="26" rx="3" fill="#0E8A6A" stroke="'+K+'" stroke-width="2.5"/>'+t(115,28,"HOTEL",{s:14})+'<path d="M115,30 V230" stroke="'+K+'" stroke-width="2"/>'+indoor("transparent","#D7C2A0")+person(300,280,{shirt:"#3FA34D",hs:"short",face:"grin",s:.95,hat:"cap",hc:"#3FA34D",flip:1})+hero(150,290,h,"give",'<g transform="translate(14 -2)">'+note("20.000","#5DADE2",-12)+'</g>')+'<g transform="translate(220 90)">'+note("20.000","#5DADE2",-8)+'</g><g transform="translate(220 128)">'+note("500.000","#48C9B0",6)+'</g>'+t(220,70,"?!",{s:22,f:"#E63946"});},
 function(h){return street({sun:0,signs:["","SIÊU THỊ","","BÁNH MÌ",""]})+[20,60,100,140,180].map(function(x){return '<rect x="'+(x+190)+'" y="250" width="22" height="50" fill="#fff" opacity=".85"/>';}).join("")+moto(430,288,"#E63946","drive")+moto(520,270,"#3FA34D","drive2","#5B8DEF")+moto(640,292,"#7E57C2","drive","#FF8C42")+hero(110,262,h,"down")+sfx(300,120,"BRRRM!",8,32);},
 function(h){return street({signs:["","BÁNH MÌ","","",""],sun:1})+cart(280,"BÁNH MÌ SÀI GÒN","#E63946")+person(280,140+90,{shirt:"#F28B82",hs:"bun",hat:"non",face:"talk",s:.75,arm:"hold",item:banhmi(),apron:"#fff"})+hero(100,290,h,"down");},
 function(h){var g=sky("#7FD3F7","#DDF4FC")+'<rect x="40" y="60" width="320" height="168" fill="#F0D98C" stroke="'+K+'" stroke-width="2.5"/><rect x="170" y="10" width="60" height="70" fill="#F0D98C" stroke="'+K+'" stroke-width="2.5"/><circle cx="200" cy="44" r="18" fill="#fff" stroke="'+K+'" stroke-width="2.5"/><path d="M200,44 V32 M200,44 L208,48" stroke="'+K+'" stroke-width="2.5"/><rect x="110" y="84" width="180" height="24" fill="#E63946" stroke="'+K+'" stroke-width="2"/>'+t(200,102,"CHỢ BẾN THÀNH",{s:14})+[70,140,230,300].map(function(x){return '<rect x="'+x+'" y="128" width="34" height="100" rx="17" fill="#3A2A20" stroke="'+K+'" stroke-width="2"/>';}).join("")+walk();
  for(var i=0;i<5;i++)g+='<path d="M'+(248+i*6)+','+(214-i*14)+' L'+(318+i*6)+','+(214-i*14)+' L'+(283+i*6)+','+(184-i*14)+' Z" fill="#EBCB7E" stroke="'+K+'" stroke-width="2"/>';
  return g+person(330,288,{shirt:"#7E57C2",hs:"long",hair:"#2A1A12",face:"talk",s:.9,arm:"hips",flip:1})+hero(110,290,h,"down",'',{hat:h==="happy"?"non":null});},
 function(h){return street({signs:["CÀ PHÊ","","CÀ PHÊ SỮA ĐÁ","",""],sun:1})+tree(40,236)+stool(140,282,"#2E86DE")+stool(205,282,"#E63946")+'<rect x="250" y="200" width="70" height="40" rx="3" fill="#8E5A3C" stroke="'+K+'" stroke-width="2.5"/>'+person(330,280,{shirt:"#9ED8C8",hs:"short",hair:"#3A3A3A",face:"talk",s:.85,arm:"hold",item:glass(),flip:1})+hero(150,286,h,"down",'',{sit:1,s:.92});},
 function(h){return street({signs:["CÀ PHÊ","","CÀ PHÊ SỮA ĐÁ","",""],sun:1})+tree(40,236)+stool(150,282,"#2E86DE")+'<g transform="translate(212 252)">'+glass("#EADBC8")+'</g>'+stool(212,282,"#E63946")+person(320,284,{shirt:"#9ED8C8",hs:"short",hair:"#3A3A3A",face:"grin",s:.85,flip:1})+hero(150,286,h,"wave",'',{sit:1,s:.92});},
 function(h){return street({sun:1,signs:["","PHỐ ĐI BỘ","","NGUYỄN HUỆ",""],pal:["#F6E7B0","#FBEFD5","#F6E7B0","#FBEFD5","#F6E7B0"]})+heat()+tree(330,236)+hero(140,288,h==="neutral"?"worry":h,h==="happy"?"hold":"down",h==="happy"?'<g transform="translate(-20 0)"><path d="M-6,-14 L6,-14 L6,8 L-6,8 Z" fill="#9FD8F2" stroke="'+K+'" stroke-width="2"/><rect x="-4" y="-20" width="8" height="6" fill="#2E86DE" stroke="'+K+'" stroke-width="1.6"/></g>':"")+sfx(270,110,"34°C",-6,36);},
 function(h){var g=indoor("#DDE3EA","#B7C0C9")+'<rect y="20" width="400" height="30" fill="#E63946" stroke="'+K+'" stroke-width="2.5"/>'+t(200,41,"GA BẾN THÀNH · TUYẾN SỐ 1",{s:13})+'<rect x="300" y="110" width="60" height="120" rx="6" fill="#2E86DE" stroke="'+K+'" stroke-width="2.5"/><rect x="310" y="122" width="40" height="30" fill="#9FD8F2" stroke="'+K+'" stroke-width="2"/>'+t(330,172,"VÉ",{s:12});
  [120,200].forEach(function(x){g+='<rect x="'+x+'" y="170" width="24" height="66" fill="#8D99AE" stroke="'+K+'" stroke-width="2.5"/><rect x="'+(x+4)+'" y="176" width="16" height="8" fill="#3FA34D"/><path d="M'+(x+24)+',196 L'+(x+60)+',196" stroke="#E63946" stroke-width="6" stroke-linecap="round"/>';});
  return g+hero(70,290,h,"give",'<rect x="-10" y="-7" width="20" height="14" rx="3" fill="#FFC93C" stroke="'+K+'" stroke-width="2"/>');},
 function(h){var g=sky("#FFE0B2","#FFF3E0")+'<rect x="40" y="110" width="320" height="118" fill="#C0392B" stroke="'+K+'" stroke-width="2.5"/><path d="M20,116 Q200,60 380,116 L360,96 Q200,40 40,96 Z" fill="#3E8E5B" stroke="'+K+'" stroke-width="2.5"/><path d="M20,116 q-8,-14 4,-22 M380,116 q8,-14 -4,-22" stroke="'+K+'" stroke-width="3" fill="none"/><rect x="160" y="140" width="80" height="88" fill="#3A2A20" stroke="'+K+'" stroke-width="2.5"/><rect x="150" y="122" width="100" height="18" fill="#FFC93C" stroke="'+K+'" stroke-width="2"/>'+t(200,136,"NGỌC HOÀNG ĐIỆN",{s:10,f:K})+walk();
  g+='<rect x="268" y="200" width="44" height="30" rx="6" fill="#B08D57" stroke="'+K+'" stroke-width="2.5"/>'+[278,290,302].map(function(x){return '<path d="M'+x+',200 v-22" stroke="#8E5A3C" stroke-width="2"/><path class="steam" d="M'+x+',176 q-6,-10 0,-20 q6,-10 0,-20" stroke="#bbb" stroke-width="2" fill="none"/>';}).join("");
  return g+person(330,290,{shirt:"#8D6E63",hs:"bun",hair:"#9E9E9E",face:"neutral",s:.8,arm:"hold",flip:1})+hero(120,292,h,"down",'',{shirt:h==="happy"?"#4C6EF5":"#FFB627"});},
 function(h){return street({signs:["","ÁO MƯA","","CÀ PHÊ",""],pal:["#B9C4D6","#C7CFDD","#B9C4D6","#C7CFDD","#B9C4D6"]}).replace("#7FD3F7","#5C6B80").replace("#DDF4FC","#9AA7B8")+'<rect x="-10" y="168" width="140" height="14" fill="#E63946" stroke="'+K+'" stroke-width="2.5" transform="skewX(-12)"/>'+person(300,288,{shirt:"#3FA34D",hat:"non",face:"talk",s:.9,arm:"give",flip:1,item:'<path d="M-12,-8 L12,-8 L16,18 L-16,18 Z" fill="#7FD3F7" fill-opacity=".8" stroke="'+K+'" stroke-width="2"/>'})+hero(120,290,h,"down",'',h==="happy"?{shirt:"#7FD3F7"}:{})+rain()+sfx(110,128,"RÀO RÀO!",-4,26);},
 function(h){return street({signs:["","","SHOP","",""]})+moto(470,290,"#2E2E2E","drive","#2E2E2E")+hero(h==="happy"?110:150,h==="happy"?236:262,h,"phone",phone())+(h==="shock"?sfx(250,170,"SWOOSH!",8,30):"");},
 function(h){return street({signs:["","XE ÔM","","",""]})+'<g transform="translate(270 290)"><circle cx="-34" cy="-2" r="13" fill="#333" stroke="'+K+'" stroke-width="2.5"/><circle cx="40" cy="-2" r="13" fill="#333" stroke="'+K+'" stroke-width="2.5"/><path d="M-44,-12 Q-40,-34 -8,-32 L26,-32 L44,-10 L-44,-10 Z" fill="#E63946" stroke="'+K+'" stroke-width="2.5"/></g>'+person(280,262,{shirt:"#5B8DEF",hat:"helmet",hc:"#FFC93C",face:"talk",s:.85,arm:"give",flip:1,item:'<path d="M-14,4 Q-14,-16 0,-16 Q14,-16 14,4 Z" fill="#E63946" stroke="'+K+'" stroke-width="2.2"/>',sit:1})+hero(100,290,h,"down",'',h==="happy"?{hat:"helmet",hc:"#E63946"}:{});},
 function(h){return street({signs:["","","","",""],pal:["#C9D7F2","#F6E7B0","#9ED8C8","#F7B7C3","#C9D7F2"]})+'<rect x="40" y="130" width="70" height="98" fill="none"/><rect x="48" y="128" width="8" height="100" fill="#1450A3" stroke="'+K+'" stroke-width="2"/><rect x="30" y="112" width="70" height="26" rx="3" fill="#1450A3" stroke="'+K+'" stroke-width="2.5"/>'+t(65,129,"TRẠM XE BUÝT",{s:9})+
  '<g transform="translate('+(h==="shock"?40:200)+' 0)"><rect x="0" y="150" width="210" height="96" rx="12" fill="#3FA34D" stroke="'+K+'" stroke-width="3"/>'+[14,62,110,158].map(function(x){return '<rect x="'+x+'" y="164" width="40" height="34" rx="4" fill="#9FD8F2" stroke="'+K+'" stroke-width="2"/>';}).join("")+'<rect x="10" y="206" width="120" height="20" rx="3" fill="#FFC93C" stroke="'+K+'" stroke-width="2"/>'+t(70,221,"1 · CHỢ LỚN",{s:12,f:K})+'<circle cx="40" cy="248" r="15" fill="#333" stroke="'+K+'" stroke-width="2.5"/><circle cx="170" cy="248" r="15" fill="#333" stroke="'+K+'" stroke-width="2.5"/></g>'+hero(110,290,h,h==="happy"?"wave":"down",'',{s:.9})+(h==="shock"?sfx(120,90,"VÙÙÙ...",-8,30):"");},
 function(h){var g=street({signs:["THUỐC BẮC","LỒNG ĐÈN","TRÀ","LỒNG ĐÈN","VẢI"],pal:["#E9C46A","#F4A261","#E76F51","#F4A261","#E9C46A"]});for(var i=0;i<7;i++)g+=lantern(30+i*58,60+(i%2)*14,["#E63946","#FFC93C","#E63946","#FF8C42"][i%4]);
  return g+person(300,290,{shirt:"#E63946",hs:"bun",face:"talk",s:.9,arm:"give",flip:1,item:lantern(0,-4,"#E63946")})+hero(110,290,h,"down");},
 function(h){return sky("#FF9F68","#FFD6A5")+houses(["#E9C46A","#F4A261","#C9D7F2","#F7B7C3","#9ED8C8"],["","HỦ TIẾU","","",""],null,1)+walk(1)+cart(300,"HỦ TIẾU MÌ","#0E8A6A")+'<g transform="translate(300 172)">'+bowl()+'</g>'+stool(120,284,"#E63946")+stool(190,284,"#2E86DE")+person(190,282,{shirt:"#F28B82",hs:"long",hair:"#2A1A12",face:"grin",s:.75,sit:1})+hero(110,282,h,h==="happy"?"point":"down",'',{sit:1,s:.8});},
 function(h){return sky("#FF9F68","#FFD6A5")+houses(["#E9C46A","#F4A261","#C9D7F2","#F7B7C3","#9ED8C8"],["","HỦ TIẾU","","",""],null,1)+walk(1)+cart(310,"HỦ TIẾU MÌ","#0E8A6A")+person(240,288,{shirt:"#9ED8C8",hs:"bun",face:h==="shock"?"worry":"grin",s:.75,arm:"hold",flip:1,apron:"#fff"})+stool(110,284,"#E63946")+hero(110,282,h,"wave",'',{sit:1,s:.8})+(h==="shock"?sfx(170,110,"PSST!",-10,26):"");},
 function(h){return sky("#6C5B9A","#FF9F68")+houses(["#E9C46A","#F4A261","#C9D7F2","#F7B7C3","#9ED8C8"],["","HỦ TIẾU","","",""],null,1)+walk(1)+cart(310,"HỦ TIẾU MÌ","#0E8A6A")+person(250,288,{shirt:"#F28B82",hs:"bun",hat:"non",face:"worry",s:.8,arm:"hips",flip:1,apron:"#fff"})+hero(110,290,h,"give",'<g transform="translate(14 0)">'+note("500.000","#48C9B0",-8)+'</g>',{s:.9});},
 function(h){return sky("#4B3F72","#9C6B98")+houses(["#E9C46A","#F4A261","#C9D7F2","#F7B7C3","#9ED8C8"],["","HỦ TIẾU","","",""],null,1)+walk(1)+cart(310,"HỦ TIẾU MÌ","#0E8A6A")+person(250,288,{shirt:"#F28B82",hs:"bun",hat:"non",face:"happy",s:.8,flip:1,apron:"#fff"})+hero(110,290,h,"give",'<g transform="translate(14 0)">'+note("100.000","#C39BD3",-8)+'</g>',{s:.9});},
 function(h){var g=sky("#141B38","#3C3A6B");for(var i=0;i<14;i++)g+='<circle cx="'+(i*29+8)+'" cy="'+(20+(i*37)%60)+'" r="1.6" fill="#fff"/>';
  g+=houses(["#5B5F97","#6C5B9A","#5B5F97","#6C5B9A","#5B5F97"],["","PHỐ ĐI BỘ","","",""],null,1)+walk(1)+'<path d="M0,40 Q100,70 200,40 Q300,70 400,40" stroke="#FFD86B" stroke-width="2" fill="none"/>'+[20,60,100,140,180,220,260,300,340,380].map(function(x,i){return '<circle cx="'+x+'" cy="'+(46+Math.sin(i)*6)+'" r="4" fill="#FFD86B" stroke="'+K+'" stroke-width="1"/>';}).join("");
  return g+person(280,288,{shirt:"#8D6E63",hs:"short",hat:"cap",hc:"#555",face:"grin",s:.85,arm:"give",flip:1,item:'<rect x="-12" y="-5" width="24" height="10" rx="3" fill="#8E5A3C" stroke="'+K+'" stroke-width="2"/>'})+hero(120,290,h,h==="happy"?"give":"down");},
 function(h){var g=sky("#141B38","#2C2F5B")+'<circle cx="330" cy="50" r="22" fill="#FFF3B0" stroke="'+K+'" stroke-width="2.5"/><circle cx="340" cy="44" r="20" fill="#2C2F5B"/>'+'<rect x="30" y="40" width="200" height="190" fill="#B5835A" stroke="'+K+'" stroke-width="2.5"/><rect x="30" y="20" width="200" height="26" fill="#0E8A6A" stroke="'+K+'" stroke-width="2.5"/>'+t(130,38,"HOTEL",{s:14})+[50,140].map(function(x){return '<rect x="'+x+'" y="70" width="70" height="50" fill="#FFD86B" stroke="'+K+'" stroke-width="2"/>';}).join("")+walk(1);
  return g+car(320,292,"#FFFFFF")+person(250,286,{shirt:"#3FA34D",hat:"cap",hc:"#3FA34D",face:"grin",s:.85,arm:"hold",flip:1,item:'<rect x="-14" y="-14" width="28" height="30" rx="4" fill="#E63946" stroke="'+K+'" stroke-width="2.2"/>'})+hero(110,290,h,h==="happy"?"wave":"down");}
];
/* who speaks in the panel: [left %, top %, tail] */
var CATS={money:"Money",move:"Getting around",food:"Food and ordering",talk:"Talking",street:"Street smarts"};
var Q=[
{t:"8:10 am",p:"Tan Son Nhat Airport",pv:"Sân bay Tân Sơn Nhất",c:"money",
 s:"You land with US dollars and no Vietnamese dong. The exchange counters are right outside arrivals.",a:"How much do you change here?",
 o:[["Change everything now, so you never think about it again",1,"It works, but airport counters usually give a slightly worse rate than banks and gold shops in town."],["Change a little, enough for the ride and lunch, and the rest in the city",2,"Locals do this. Change $20 to $50 here, then use a bank, ATM or jewellery shop in District 1."],["Change nothing and pay everyone in dollars",0,"Taxis, street food and markets price in dong. Paying in dollars gets you a bad rate, or a no."]],ph:["Đổi tiền","Exchange money"]},
{t:"8:25 am",p:"Arrivals hall",pv:"Sảnh đến",c:"move",lines:["SIM seller","SIM du lịch không em?","Tourist SIM?"],b:[22,5,"tr"],
 s:"Phone booths sell tourist SIM cards next to the exchange counters. Your hotel is 8 km away.",a:"What do you do about mobile data?",
 o:[["Buy a tourist SIM here, or use the eSIM you bought before flying",2,"With data you can book Grab or Be, read maps and translate menus. Bring your passport: it is needed to register a SIM."],["Skip it and use free wifi",0,"Wifi is common in cafés, but not at the kerb when you need a ride or a map."],["Skip it and ask people for directions",1,"People are kind, but street names and English vary. Data saves a lot of time."]],ph:["Cho tôi một SIM du lịch","A tourist SIM, please"]},
{t:"8:40 am",p:"Arrivals curb",pv:"Lối ra",c:"street",
 s:"Outside the doors a man walks up: “Taxi? Taxi! Cheap price, my friend!”",a:"What do you do?",
 o:[["Follow him to his car",0,"Unmarked “taxi” touts at the door are the classic first-day overcharge."],["Smile, say no thanks, and go to the official taxi line or the ride-app pickup point",2,"Use the signed taxi rank or book in an app. You see the price before you get in."],["Ask his price and haggle hard",0,"Even a “good” haggled price is often far above the metered or app fare."]],ph:["Không, cảm ơn","No, thank you"]},
{t:"8:55 am",p:"Ride-app pickup",pv:"Điểm đón xe công nghệ",c:"street",
 s:"Your app car is arriving. A white car stops and the driver waves at you.",a:"What do you check before you get in?",
 o:[["That the number plate matches the one in the app",2,"Always match the plate. Many cars look the same at the airport."],["Nothing, he waved at me",0,"Drivers wave at everyone. Check the plate first."],["Only the colour of the car",1,"A start, but half the cars are white. The plate is the real check."]],ph:["Biển số xe","Number plate"]},
{t:"9:40 am",p:"Hotel, District 1",pv:"Khách sạn, Quận 1",c:"money",
 s:"You want to give the driver a 20,000 tip for helping with your bags. In your wallet are a 20,000 note and a 500,000 note, both blue plastic.",a:"How do you give the 20,000?",
 o:[["Read the number on the note before handing it over",2,"20,000 and 500,000 notes look alike, especially at night. Read the zeros every time."],["Grab the blue one quickly",0,"That could be 500,000, about 25 times more. The most common tourist mistake with dong."],["Hold out your wallet and let the driver take it",0,"Most people are honest, but keep control of your own money."]],ph:["Năm trăm ngàn","Five hundred thousand"]},
{t:"10:00 am",p:"Le Loi Street",pv:"Đường Lê Lợi",c:"street",
 s:"You need to cross a busy street. There is a crosswalk, but motorbikes keep coming.",a:"How do you cross?",
 o:[["Walk at a slow, steady pace and let the bikes flow around you",2,"Riders judge where you will be. Steady and predictable is safest. Use lights and crosswalks where they exist."],["Wait for a gap, then run",0,"Running and stopping suddenly is what causes accidents. Riders cannot predict you."],["Wait until there is no traffic at all",1,"Safe, but you may wait a long time. Cross with a group of locals if you are nervous."]],ph:["Qua đường","Cross the street"]},
{t:"10:15 am",p:"Bánh mì cart",pv:"Xe bánh mì",c:"food",lines:["Seller","Có ăn cay không em?","Do you eat spicy, dear?"],b:[44,8,"tr"],
 s:"You stop at a bánh mì cart. You do not want chilli.",a:"What do you say?",
 o:[["“Không cay”",2,"Không cay means not spicy. The seller will skip the chilli."],["“Không đá”",0,"Không đá means no ice. Useful for drinks, not for bread."],["“Không đường”",0,"Không đường means no sugar. Save it for coffee."]],ph:["Một ổ bánh mì, không cay","One bánh mì, not spicy"]},
{t:"10:40 am",p:"Ben Thanh Market",pv:"Chợ Bến Thành",c:"money",lines:["Hat seller","Cái nón này một trăm rưỡi.","This hat is 150,000."],b:[46,30,"tr"],
 s:"You like a conical hat. You have seen similar ones for less.",a:"How do you bargain?",
 o:[["Smile, offer about 60 to 70 percent, and meet in the middle",2,"Friendly bargaining is normal in tourist markets. Smiling matters more than the number."],["Pay 150,000 straight away",1,"Fine if you are happy with it, but a counter-offer is expected here."],["Say it is a rip-off and offer 20,000",0,"Insulting offers end the talk. Bargaining is a game played politely."]],ph:["Bớt chút được không?","Can you lower it a little?"]},
{t:"11:00 am",p:"Sidewalk coffee",pv:"Cà phê vỉa hè",c:"food",lines:["Coffee seller","Uống gì em?","What would you like to drink?"],b:[46,26,"tr"],
 s:"It is 33°C. You want the classic Saigon iced coffee with condensed milk.",a:"What do you order?",
 o:[["Cà phê sữa đá",2,"Iced coffee with sweet condensed milk. The Saigon classic."],["Cà phê đen nóng",0,"That is hot black coffee: no milk, no ice."],["Bạc xỉu",1,"Close: mostly milk with a little coffee. Nice, but not what you asked for."]],ph:["Cho em một ly cà phê sữa đá","One iced milk coffee, please"]},
{t:"11:40 am",p:"Coffee stall",pv:"Quán cà phê",c:"food",
 s:"You have finished your coffee at a small street stall and want to leave.",a:"How do you pay?",
 o:[["Call the seller over and say “Tính tiền”",2,"At street stalls you usually pay after, at your stool. Tính tiền means the bill, please."],["Leave some money on the stool and walk off",0,"The seller may not see it, and you may leave too much or too little."],["Walk to the cart and wait in silence",1,"It works eventually. A quick tính tiền is faster."]],ph:["Tính tiền em ơi","The bill, please"]},
{t:"12:10 pm",p:"Nguyen Hue Walking Street",pv:"Phố đi bộ Nguyễn Huệ",c:"street",
 s:"Midday sun. Your next stop is 3 km away and you feel tired.",a:"What do you do?",
 o:[["Walk the 3 km now",0,"Walking 3 km in the noon heat is how first days end early. Save long walks for the morning or evening."],["Take the metro or a ride, and buy a bottle of water",2,"Smart. Drink plenty of water and rest in the shade at midday."],["Rest in an air-conditioned café for an hour, then go",2,"That is what locals do at noon too."]],ph:["Một chai nước suối","A bottle of water"]},
{t:"12:40 pm",p:"Ben Thanh metro station",pv:"Ga Bến Thành",c:"move",
 s:"You take Metro Line 1. There are ticket machines and gates.",a:"How do you get through the gate?",
 o:[["Tap a contactless bank card on the gate, or buy a ticket at the machine",2,"Both work. Keep your ticket or card for the exit gate."],["Give cash to the guard",0,"Staff can help, but you pay at the machine or with a card, not to the guard."],["Follow someone through the gate",0,"Fare dodging is not worth a fine on day one."]],ph:["Vé một chiều","Single ticket"]},
{t:"1:30 pm",p:"Jade Emperor Pagoda",pv:"Chùa Ngọc Hoàng",c:"street",
 s:"You visit a pagoda. You are in shorts and a tank top, and people are praying inside.",a:"What do you do?",
 o:[["Cover your shoulders and knees, speak quietly, and ask before photographing people",2,"Respectful dress and a quiet voice. Carry a light scarf or shirt for temples."],["Go in as you are and take flash photos of the worshippers",0,"Flash photos of people praying are rude."],["Skip it",1,"No harm, but you miss one of the city's finest old temples."]],ph:["Xin phép","Excuse me, may I?"]},
{t:"2:30 pm",p:"Pasteur Street",pv:"Đường Pasteur",c:"street",lines:["Street seller","Áo mưa không em? Hai chục nè!","Raincoat? 20,000!"],b:[46,26,"tr"],
 s:"The sky turns black. An afternoon downpour starts.",a:"What do you do?",
 o:[["Buy a raincoat for 20,000 and keep going",2,"A plastic poncho (áo mưa) is the local answer. Price is an example."],["Shelter under a shop awning and wait",2,"Afternoon storms in the rainy season often pass in 30 to 60 minutes."],["Keep walking with your phone in your pocket",0,"You get soaked and your phone may too."]],ph:["Áo mưa","Raincoat"]},
{t:"3:00 pm",p:"Street corner",pv:"Góc đường",c:"street",
 s:"You stop to check Google Maps. You are standing right at the edge of the road.",a:"How do you hold your phone?",
 o:[["Step back from the road and hold it firmly, away from the street side",2,"Snatching from passing motorbikes happens in busy areas. Check your phone in a doorway."],["Hold it out loosely at the kerb",0,"This is exactly how phones get snatched from passing bikes."],["Never take your phone out",1,"Too cautious. Just use it away from the road."]],ph:["Cẩn thận","Be careful"]},
{t:"3:30 pm",p:"Xe ôm corner",pv:"Góc xe ôm",c:"move",lines:["Xe ôm driver","Đi đâu em?","Where are you going?"],b:[48,22,"tr"],
 s:"Your data runs out. A motorbike taxi driver (xe ôm) offers a ride.",a:"Before you get on, you…",
 o:[["Agree on the price first, then put on and fasten the helmet",2,"Price before the ride, helmet always. Both are the rule."],["Get on and ask the price at the end",0,"That is how a short ride becomes expensive."],["Agree the price but skip the helmet because it is short",0,"Helmets are required by law and they save lives."]],ph:["Bao nhiêu tiền?","How much?"]},
{t:"4:00 pm",p:"Bus stop",pv:"Trạm xe buýt",c:"move",
 s:"Bus 1 to Cholon (Chinatown) is coming. You are the only one at the stop.",a:"What do you do?",
 o:[["Wave clearly at the bus",2,"Buses may drive past a stop if nobody signals."],["Stand still and wait for it to stop",0,"It drives straight past. Wave next time."],["Run after it",0,"Wave from the stop instead. It is safer and the driver can see you."]],ph:["Xe buýt","Bus"]},
{t:"4:45 pm",p:"Cholon, District 5",pv:"Chợ Lớn, Quận 5",c:"talk",lines:["Seller","Năm chục em.","Fifty, dear."],b:[48,30,"tr"],
 s:"You ask the price of a lantern. In southern Vietnam people often count money in “chục”.",a:"How much is “năm chục”?",
 o:[["50,000 dong",2,"In price talk, chục means ten thousand. Năm chục is 50,000; hai chục is 20,000."],["5,000 dong",0,"Too low. Chục means tens of thousands in price talk."],["500,000 dong",0,"Too high. That would be năm trăm (ngàn)."]],ph:["Năm chục","Fifty (thousand)"]},
{t:"5:30 pm",p:"Noodle stall",pv:"Quán hủ tiếu",c:"food",lines:["Noodle seller","Mấy tô em?","How many bowls?"],b:[50,20,"tr"],
 s:"You and a friend sit on low plastic stools at a noodle stall.",a:"You want two bowls. What do you say?",
 o:[["“Cho hai tô”",2,"Tô is a bowl. Cho hai tô means two bowls, please."],["“Cho hai ly”",0,"Ly is a glass. You would get two drinks."],["“Cho hai ổ”",0,"Ổ is a loaf, used for bánh mì."]],ph:["Cho hai tô hủ tiếu","Two bowls of hủ tiếu, please"]},
{t:"6:30 pm",p:"Noodle stall",pv:"Quán hủ tiếu",c:"talk",
 s:"You need the seller's attention. She is younger than you.",a:"How do you call her?",
 o:[["“Em ơi!”",2,"Em is for someone younger; ơi is like hey. For someone older, say anh ơi (man) or chị ơi (woman)."],["Whistle or snap your fingers",0,"That is rude everywhere, including here."],["“Hey you!”",1,"She will come, but em ơi sounds warm and local."]],ph:["Em ơi","Excuse me (to someone younger)"]},
{t:"7:00 pm",p:"Noodle stall",pv:"Quán hủ tiếu",c:"money",lines:["Noodle seller","Không có tiền thối em ơi.","I don't have change, dear."],b:[46,26,"tr"],
 s:"The bill is 60,000. You only have a 500,000 note.",a:"What now?",
 o:[["Break the note at a convenience store first, then come back",2,"Small stalls rarely have change for 500,000. Buy a bottle of water at a convenience store to get small notes."],["Insist she finds change",0,"She may have to run around the street to find it. Carry small notes for stalls."],["Tell her to keep the change",0,"That is a 440,000 tip. Very kind, but not needed."]],ph:["Tiền lẻ","Small change"]},
{t:"7:20 pm",p:"Noodle stall",pv:"Quán hủ tiếu",c:"money",
 s:"You have paid. You wonder about a tip.",a:"What is normal at a street stall?",
 o:[["No tip expected. Rounding up or a smile and thank you is plenty",2,"Tipping is not expected at stalls. It is more common for tours, spas and drivers who helped a lot."],["Add 15 to 20 percent",1,"Not wrong, just not expected. The seller may be surprised."],["Leave coins",0,"Vietnam does not use coins day to day. Notes only."]],ph:["Cảm ơn nhiều","Thank you very much"]},
{t:"8:30 pm",p:"Nguyen Hue Walking Street",pv:"Phố đi bộ Nguyễn Huệ",c:"street",lines:["Shoe cleaner","Đánh giày nha!","Shoe shine!"],b:[48,26,"tr"],
 s:"Families are out, music is playing. A man walks up to clean your shoes, and starts before you answer.",a:"What do you do?",
 o:[["Say “Không, cảm ơn” firmly and step away",2,"Say no clearly before anything starts. Once the service starts, you will be asked to pay."],["Let him finish and pay what he asks",0,"Prices for unrequested services are often very high."],["Ignore him and keep walking",1,"Often works, but a clear no is better."]],ph:["Không, cảm ơn","No, thank you"]},
{t:"9:30 pm",p:"Back at the hotel",pv:"Về khách sạn",c:"talk",
 s:"Your ride drops you at the hotel. The driver helped with your bags.",a:"What do you say?",
 o:[["“Cảm ơn anh”",2,"Thank you, to a man about your age or older. Use em for someone younger, chị for an older woman."],["“Xin chào”",0,"That is hello."],["“Không sao”",0,"That means no problem, the reply to sorry."]],ph:["Cảm ơn anh","Thank you (to a man)"]}
];
/* bubbles for scenes that have no line in the text: the tout and the shoe cleaner say theirs via SFX/lines */

/* ============================================================ game */
var KEY="sdc_v1", app=document.getElementById("app");
var st={i:-1,ans:[],fb:{}};
try{var sv=JSON.parse(localStorage.getItem(KEY)||"null");if(sv&&sv.ans)st=sv;}catch(e){}
var hot=window.claude&&window.claude.hot;if(hot&&hot.data&&hot.data.ans)st=hot.data;
if(hot&&hot.snapshot)hot.snapshot(function(){return st;});
function save(){try{localStorage.setItem(KEY,JSON.stringify(st));}catch(e){}}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
var canSpeak="speechSynthesis" in window;
function speakBtn(x){return canSpeak?'<button type="button" class="speak" data-say="'+esc(x)+'" aria-label="Listen: '+esc(x)+'">Listen</button>':"";}
function speak(x){try{speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(x);u.lang="vi-VN";u.rate=.85;var v=speechSynthesis.getVoices().filter(function(z){return /^vi/i.test(z.lang);})[0];if(v)u.voice=v;speechSynthesis.speak(u);}catch(e){}}
app.addEventListener("click",function(e){var b=e.target.closest("[data-say]");if(b)speak(b.getAttribute("data-say"));});
/* show the options in a fixed shuffled order per page, so the best answer is not always A */
var PERM=[[1,0,2],[2,1,0],[0,2,1],[1,2,0],[2,0,1],[0,1,2]];
function order(i){return PERM[(i*5+2)%6];}
var cls=["b","o","g"],L="ABC",FACE=["shock","worry","happy"],BURST=[["OOPS!","#F2545B"],["HMM...","#FFB627"],["NICE!","#0E8A6A"]];
function top(){return '<div class="top"><span>One day in Saigon</span><span class="pg">'+(st.i>=0&&st.i<Q.length?"Page "+(st.i+1)+" / "+Q.length:"")+'</span></div>';}
function strip(){return '<div class="strip" aria-hidden="true">'+Q.map(function(q,k){var a=st.ans[k];return '<i class="'+(a!=null?cls[q.o[a][1]]:(k===st.i?"now":""))+'"></i>';}).join("")+'</div>';}
function svg(inner,label){return '<svg viewBox="0 0 400 300" role="img" aria-label="'+esc(label)+'">'+inner+'</svg>';}
function cover(){
  var art=sky("#7FD3F7","#FFE8C2")+sun(330,56)+houses(["#F4A261","#F6E7B0","#9ED8C8","#F7B7C3","#C9D7F2"],["PHỞ","BÁNH MÌ","CÀ PHÊ","CHỢ","LỒNG ĐÈN"])+walk()+moto(460,292,"#E63946","drive")+moto(560,276,"#3FA34D","drive2","#5B8DEF")+
    person(300,250,{shirt:"#F28B82",hs:"bun",hat:"non",face:"happy",s:.8,arm:"give",flip:1,item:banhmi()})+hero(130,262,"happy","wave","",{s:1.05})+sfx(220,40,"XIN CHÀO!",-6,30);
  app.innerHTML=top()+'<h1 class="title">One day in <span>Saigon</span></h1>'+
    '<div class="panel">'+svg(art,"A tourist waves hello on a busy Saigon street")+'</div>'+
    '<p class="lead">A comic you play. Follow one traveller through a first day in Ho Chi Minh City, from the airport at 8 am to the hotel at night. On every page, you choose what happens next.</p>'+
    '<div class="chips"><span class="chip">'+Q.length+' pages</span><span class="chip">About 8 minutes</span><span class="chip">Free, no sign-up</span><span class="chip">Hear the Vietnamese</span></div>'+
    '<div><button type="button" class="cta" id="go">'+(st.ans.length?"Continue reading":"Start reading")+'</button></div>';
  document.getElementById("go").onclick=function(){if(st.i<0)st.i=0;save();render();window.scrollTo(0,0);};
}
function page(){
  var q=Q[st.i],a=st.ans[st.i],done=a!=null,sc=done?q.o[a][1]:-1;
  var art=V[st.i](done?FACE[sc]:"neutral")+(done?burst(222,100,BURST[sc][0],BURST[sc][1]):"");
  var bub=q.lines&&q.b?'<div class="bub '+q.b[2]+'" style="left:'+q.b[0]+'%;top:'+q.b[1]+'%"><span class="vi" lang="vi">'+esc(q.lines[1])+speakBtn(q.lines[1])+'</span><span class="en">'+esc(q.lines[2])+'</span></div>':"";
  var h=top()+strip()+'<div class="panel">'+svg(art,q.p+": "+q.s)+'<div class="cap"><div class="plate"><b>'+esc(q.pv)+'</b><span>'+esc(q.p)+'</span></div><div class="clock">'+esc(q.t)+'</div></div>'+bub+'</div>'+
    '<div class="ask"><p class="sit">'+esc(q.s)+'</p><p class="q">'+esc(q.a)+'</p></div><div class="opts">'+order(st.i).map(function(k,pos){var o=q.o[k];
      var c="opt"+(done&&k===a?" picked "+cls[o[1]]:"")+(done&&k!==a&&o[1]===2?" best":"");
      return '<button type="button" class="'+c+'" data-o="'+k+'"'+(done?" disabled":"")+'><span class="k">'+L[pos]+'</span><span>'+esc(o[0])+'</span></button>';}).join("")+'</div>';
  if(done){var o=q.o[a];
    h+='<div class="narr '+cls[sc]+'" role="status"><h3>'+["Not quite…","Okay, but there is a better way","That is what a local would do!"][sc]+'</h3><p>'+esc(o[2])+'</p>'+
      (sc<2?'<p class="small">Best answer: '+esc(q.o.filter(function(x){return x[1]===2;}).map(function(x){return x[0];}).join(" or "))+'</p>':"")+
      '<div class="say"><span class="lbl">Say it</span><span class="vi" lang="vi">'+esc(q.ph[0])+'</span><span class="en">'+esc(q.ph[1])+'</span>'+speakBtn(q.ph[0])+'</div></div>';}
  h+='<div class="nav">'+(st.i>0?'<button type="button" class="ghost" data-back>← Back</button>':'<span></span>')+(done?'<button type="button" class="cta" data-next>'+(st.i===Q.length-1?"The end →":"Next page →")+'</button>':"")+'</div>';
  app.innerHTML=h;
  app.querySelectorAll("[data-o]").forEach(function(b){b.onclick=function(){st.ans[st.i]=+b.dataset.o;save();page();var p=app.querySelector(".panel");if(p)p.scrollIntoView({block:"start",behavior:"smooth"});};});
  var n=app.querySelector("[data-next]");if(n)n.onclick=function(){st.i++;save();render();window.scrollTo(0,0);};
  var bk=app.querySelector("[data-back]");if(bk)bk.onclick=function(){st.i--;save();render();window.scrollTo(0,0);};
}
function total(){return st.ans.reduce(function(s,a,k){return s+(a!=null?Q[k].o[a][1]:0);},0);}
function results(){
  var sc=total(),max=Q.length*2,pct=Math.round(sc/max*100);
  var title=pct>=85?"You could live here!":pct>=65?"Ready for Saigon!":pct>=45?"A good first day":"What an adventure!";
  var art=sky("#141B38","#2C2F5B")+'<circle cx="320" cy="60" r="24" fill="#FFF3B0" stroke="'+K+'" stroke-width="2.5"/><circle cx="331" cy="53" r="22" fill="#2C2F5B"/>'+indoor("transparent","#8E6A4E")+'<rect x="60" y="200" width="280" height="50" rx="10" fill="#fff" stroke="'+K+'" stroke-width="2.5"/><rect x="60" y="186" width="70" height="30" rx="10" fill="#C9D7F2" stroke="'+K+'" stroke-width="2.5"/>'+hero(200,236,pct>=45?"happy":"grin","both","",{s:.9})+'<rect x="120" y="214" width="200" height="40" rx="8" fill="#5B8DEF" stroke="'+K+'" stroke-width="2.5"/>'+sfx(200,48,"Z Z Z . . .",-4,26);
  var bars=Object.keys(CATS).map(function(c){var got=0,m=0;Q.forEach(function(q,k){if(q.c===c){m+=2;got+=st.ans[k]!=null?q.o[st.ans[k]][1]:0;}});return '<div class="bar"><span>'+CATS[c]+'</span><span class="t"><i style="width:'+Math.round(got/m*100)+'%"></i></span><span>'+got+'/'+m+'</span></div>';}).join("");
  var seen={},phr=Q.filter(function(q){if(seen[q.ph[0]])return false;seen[q.ph[0]]=1;return true;}).map(function(q){return '<div><span class="vi" lang="vi">'+esc(q.ph[0])+' '+speakBtn(q.ph[0])+'</span><span class="en">'+esc(q.ph[1])+'</span></div>';}).join("");
  var f=st.fb;
  function pick(n,opts){return '<div class="pick" role="group">'+opts.map(function(o){return '<button type="button" data-f="'+n+'" data-v="'+esc(o)+'" aria-pressed="'+(f[n]===o)+'">'+esc(o)+'</button>';}).join("")+'</div>';}
  app.innerHTML=top()+strip()+'<div class="panel">'+svg(art,"The traveller asleep at the hotel after the day")+'<div class="cap"><div class="plate"><b>Hết ngày</b><span>End of the day</span></div><div class="clock">11:00 pm</div></div></div>'+
   '<div class="card"><div class="score"><b>'+sc+'</b><span class="small">out of '+max+'</span></div><h3>'+title+'</h3><div class="bars">'+bars+'</div></div>'+
   '<div class="card"><h3>Phrases from your day</h3><div class="phrases">'+phr+'</div></div>'+
   '<div class="card"><h3>Help us make the next chapter</h3><p class="small">This is an early test. Nothing is sent automatically: fill in what you like, copy it, and paste it as a comment where you found this comic, or email it to hello@hcmcinsider.com.</p>'+
   '<fieldset><legend>How much did you enjoy it?</legend>'+pick("fun",["1","2","3","4","5"])+'</fieldset>'+
   '<fieldset><legend>Would you read this before a real trip?</legend>'+pick("play",["Yes","Maybe","No"])+'</fieldset>'+
   '<fieldset><legend>Have you been to Saigon?</legend>'+pick("been",["Never","Once","Many times","I live here"])+'</fieldset>'+
   '<label for="fb-more">What should the next chapter be, or what was wrong?</label><textarea id="fb-more" placeholder="For example: a night market, a scooter rental, a price that looks off">'+esc(f.more||"")+'</textarea>'+
   '<div class="nav"><button type="button" class="cta" data-copy>Copy my feedback</button><span class="small" data-msg aria-live="polite"></span></div><div class="out" data-out hidden></div></div>'+
   '<div class="card"><h3>Want more?</h3><div class="links"><a href="/try-saigon/">Try Saigon: walk the same day in 360°, with play money →</a><a href="/guides/arriving-in-saigon/">The real guide: airport to city, Grab, taxi and bus →</a><a href="/#eat">Where to eat in Saigon, picked by locals →</a></div>'+
   '<div class="nav"><button type="button" class="ghost" data-review>Read it again</button><button type="button" class="ghost" data-restart>Start over</button></div></div>';
  app.querySelectorAll("[data-f]").forEach(function(b){b.onclick=function(){f[b.dataset.f]=b.dataset.v;save();app.querySelectorAll('[data-f="'+b.dataset.f+'"]').forEach(function(x){x.setAttribute("aria-pressed",x===b);});};});
  var ta=app.querySelector("#fb-more");ta.oninput=function(){f.more=ta.value;save();};
  app.querySelector("[data-copy]").onclick=function(){
    var txt="One Day in Saigon (comic): "+sc+"/"+max+"\nEnjoyed: "+(f.fun||"-")+"/5 · Read before a trip: "+(f.play||"-")+" · Been to Saigon: "+(f.been||"-")+(f.more?"\nComments: "+f.more:"");
    var out=app.querySelector("[data-out]"),msg=app.querySelector("[data-msg]");out.textContent=txt;out.hidden=false;
    try{navigator.clipboard.writeText(txt).then(function(){msg.textContent="Copied. Paste it as a comment. Thank you!";},function(){msg.textContent="Select the text below and copy it.";});}catch(e){msg.textContent="Select the text below and copy it.";}
  };
  app.querySelector("[data-review]").onclick=function(){st.i=0;save();render();window.scrollTo(0,0);};
  app.querySelector("[data-restart]").onclick=function(){st={i:-1,ans:[],fb:st.fb};save();render();window.scrollTo(0,0);};
}
function render(){if(st.i<0)return cover();if(st.i>=Q.length)return results();page();}
render();
})();
