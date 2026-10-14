(function(){
  const WEEK_NOTES = [
    "Cut sugar, fried food, and refined flour completely. Build the daily workout habit.",
    "Same meals, portions down ~25%. Push for clean, controlled reps on every move.",
    "Swap one carb-heavy meal for extra vegetables/salad, twice this week.",
    "Evening snack: plain roasted chana only. Protect 7+ hours of sleep — this is what locks it in."
  ];

  const RULES = [
    "No sugar, fried snacks, or packaged juice",
    "3 litres of water",
    "Protein at every meal",
    "No eating after 8:30 PM",
    "7+ hours of sleep",
    "20 crunches",
    "20 hip thrusts",
    "10 leg raises",
    "20 squats",
    "20 v-ups",
    "10 Russian twists (each side)"
  ];
  const WORKOUT_START = 5; // index where the daily workout block begins

  const MEALS = {
    default: {
      breakfast: "Spinach + avocado toast on multigrain bread, or sautéed kale with 2 eggs-alternative (paneer scramble)",
      lunch: "1–2 multigrain rotis or ½ cup brown rice, 1 bowl dal/rajma/chana, roasted broccoli + cabbage sabzi, side salad",
      dinner: "Vegetable soup (spinach/kale base) or dal, big bowl of roasted broccoli + cabbage, ¼ avocado on the side"
    }
  };

  const TOTAL_DAYS = 28;
  const STORAGE_KEY = 'discipline-log-progress';
  const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  let state = {};
  let openDay = null;
  let activeWeek = 1;

  function dayKey(d){ return String(d); }

  function isDayDone(d){
    const e = state[dayKey(d)];
    if(!e) return false;
    return RULES.every((_,i)=> e.rules && e.rules[i]);
  }

  function computeStreak(){
    let streak = 0;
    for(let d = TOTAL_DAYS; d>=1; d--){
      if(isDayDone(d)) streak++;
      else if(state[dayKey(d)]) break;
      else continue;
    }
    // simpler: count trailing consecutive done days from the highest touched day backward
    let s = 0, sawAny = false;
    for(let d = TOTAL_DAYS; d>=1; d--){
      const touched = !!state[dayKey(d)];
      if(!touched) continue;
      sawAny = true;
      if(isDayDone(d)) { s++; } else { break; }
    }
    return s;
  }

  function completionPct(){
    let done = 0;
    for(let d=1; d<=TOTAL_DAYS; d++) if(isDayDone(d)) done++;
    return Math.round((done/TOTAL_DAYS)*100);
  }

  async function save(){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }catch(e){ console.error('save failed', e); }
  }

  function toggleRule(d, i){
    const k = dayKey(d);
    if(!state[k]) state[k] = { rules: new Array(RULES.length).fill(false), weight: null };
    if(!state[k].rules) state[k].rules = new Array(RULES.length).fill(false);
    state[k].rules[i] = !state[k].rules[i];
    save();
    render();
  }

  function setWeight(d, val){
    const k = dayKey(d);
    if(!state[k]) state[k] = { rules: new Array(RULES.length).fill(false), weight: null };
    state[k].weight = val === '' ? null : parseFloat(val);
    save();
  }

  function toggleDayOpen(d){
    openDay = (openDay === d) ? null : d;
    render();
  }

  function toggleMeals(id){
    const el = document.getElementById(id);
    if(el) el.classList.toggle('open');
  }

  async function resetAll(){
    if(!confirm('Clear all logged progress? This cannot be undone.')) return;
    state = {};
    await save();
    render();
  }

  function dayLabel(dayIndex){
    const weekOf = Math.floor((dayIndex-1)/7);
    const dow = (dayIndex-1) % 7;
    return "Day " + dayIndex + " · " + DAY_NAMES[dow];
  }

  function renderDay(d){
    const k = dayKey(d);
    const entry = state[k] || { rules: new Array(RULES.length).fill(false), weight: null };
    const doneCount = entry.rules ? entry.rules.filter(Boolean).length : 0;
    const full = doneCount === RULES.length;
    const isOpen = openDay === d;
    const isWeighDay = d % 7 === 0;

    const checksHtml = RULES.map((r,i)=>{
      const checked = entry.rules && entry.rules[i];
      const divider = (i === WORKOUT_START) ? `<div class="dl-section-label">TODAY'S WORKOUT</div>` : '';
      return `${divider}<div class="dl-check-row">
        <input type="checkbox" class="dl-checkbox" ${checked?'checked':''} onchange="dl.toggleRule(${d},${i})">
        <div class="dl-check-label ${checked?'checked':''}">${r}</div>
      </div>`;
    }).join('');

    const mealsId = "meals-"+d;
    const mealsHtml = `
      <div class="dl-meals-toggle" onclick="dl.toggleMeals('${mealsId}')">▸ today's meal reference</div>
      <div class="dl-meals" id="${mealsId}">
        <div><b>Breakfast —</b> ${MEALS.default.breakfast}</div>
        <div><b>Lunch —</b> ${MEALS.default.lunch}</div>
        <div><b>Dinner —</b> ${MEALS.default.dinner}</div>
      </div>`;

    const weighHtml = isWeighDay ? `
      <div class="dl-weigh">
        <label>Weigh-in (kg)</label>
        <input type="number" step="0.1" value="${entry.weight ?? ''}" onchange="dl.setWeight(${d}, this.value)">
      </div>` : '';

    return `
      <div class="dl-day ${full?'done':''}">
        <div class="dl-stamp ${full?'show':''}">DONE</div>
        <div class="dl-day-head" onclick="dl.toggleDayOpen(${d})">
          <div class="dl-day-name">${dayLabel(d)}</div>
          <div class="dl-day-count ${full?'full':''}">${doneCount}/${RULES.length}</div>
        </div>
        <div class="dl-day-body ${isOpen?'open':''}">
          ${checksHtml}
          ${weighHtml}
          ${mealsHtml}
        </div>
      </div>`;
  }

  function render(){
    const root = document.getElementById('dl-root');
    const streak = computeStreak();
    const pct = completionPct();

    const tabsHtml = [1,2,3,4].map(w=>{
      return `<div class="dl-tab ${activeWeek===w?'active':''}" onclick="dl.setWeek(${w})">WEEK ${w}</div>`;
    }).join('');

    const startDay = (activeWeek-1)*7 + 1;
    let daysHtml = '';
    for(let d=startDay; d<startDay+7; d++){ daysHtml += renderDay(d); }

    root.innerHTML = `
      <div class="dl-eyebrow">Vegetarian Reset — No Crash Days</div>
      <div class="dl-title">The Discipline Log</div>
      <div class="dl-sub">Tick every box, every day. No skipped days.</div>

      <div class="dl-stats">
        <div class="dl-stat">
          <div class="dl-stat-num">${streak}</div>
          <div class="dl-stat-label">Day Streak</div>
        </div>
        <div class="dl-stat">
          <div class="dl-stat-num">${pct}%</div>
          <div class="dl-stat-label">Month Complete</div>
        </div>
      </div>
      <div class="dl-progress-track"><div class="dl-progress-fill" style="width:${pct}%"></div></div>

      <div class="dl-tabs">${tabsHtml}</div>
      <div class="dl-week-note"><b>Week ${activeWeek} focus —</b> ${WEEK_NOTES[activeWeek-1]}</div>

      ${daysHtml}

      <div class="dl-reset" onclick="dl.resetAll()">reset all progress</div>
    `;
  }

  window.dl = { toggleRule, setWeight, toggleDayOpen, toggleMeals, resetAll, setWeek: (w)=>{ activeWeek=w; render(); } };

  (async function init(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      state = raw ? JSON.parse(raw) : {};
    }catch(e){
      state = {};
    }
    render();
  })();
})();