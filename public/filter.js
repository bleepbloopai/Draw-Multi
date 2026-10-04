// Shared by the page and the Worker so the filter lives in one place.
/* ---------- username filter (leetspeak, symbols, spacing, repeats) ---------- */
const BAD='fuck phuck fvck fuk shit bitch biatch bastard asshole ass cunt dick cock pussy penis vagina whor slut fag faggot nigger nigga retard rape rapist nazi hitler cum jizz porn sex tits titty boob anal anus dildo blowjob handjob wank twat piss kike spic chink gook coon tranny dyke molest pedo paedo incest bollock prick douche orgasm milf hentai kkk jerkoff cumshot bukkake nipple erotic horny'.split(' ');
const OKW='class glass grass pass mass bass brass crass sass lass hassle assist assum assur assert assess asset assign associat assembl assimil assassin assault assort assay embass ambassad harass cassett cassand cassid cassie lasso tassel vassal wassup sussex essex middlesex sextet sexton sextant cumin cucumber document circumst cumul cumber accum succumb scum cocktail cockpit peacock hancock cockat shuttlecock woodcock cockney cockroach cocker dickens dickinson analy analog banal canal uranus janus manus grape drape scrape therapeutic spice spicy despic conspic auspic perspic raccoon cocoon tycoon prickl scunthorpe snigger swank fukushima pedom'.split(' ');
const RX=BAD.map(w=>new RegExp([...w].map(c=>'aeiou'.includes(c)?'(?:'+c+'|\\*)+':c+'+').join('')));
const MAP={'@':'a','4':'a','^':'a','8':'b','3':'e','€':'e','6':'g','9':'g','!':'i','|':'i','0':'o','$':'s','5':'s','§':'s','7':'t','+':'t','2':'z','а':'a','е':'e','о':'o','р':'p','с':'c','х':'x','і':'i','ѕ':'s','у':'y','?':'*','%':'*','#':'*'};
export function isBad(s){
  s=String(s).normalize('NFKD').replace(/[\u0300-\u036f\u200b-\u200f\u2060\ufeff]/g,'').toLowerCase();
  return ['i','l'].some(one=>{
    let t='';for(const ch of s)t+=ch==='1'?one:(MAP[ch]||ch);
    t=t.replace(/[^a-z*]/g,'');
    for(const w of OKW)t=t.split(w).join('|');
    return RX.some(r=>r.test(t));
  });
}
export const nameOK=n=>/^[A-Za-z0-9 _.-]{2,16}$/.test(n)&&!isBad(n);
export const cleanName=n=>typeof n==='string'&&nameOK(n.slice(0,16))?n.slice(0,16):'Guest';

