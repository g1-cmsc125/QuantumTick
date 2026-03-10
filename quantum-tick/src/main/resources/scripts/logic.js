document.addEventListener('DOMContentLoaded', () => {

const algoSelect        = document.getElementById('algo-select');
const quantumContainer  = document.getElementById('quantum-container');
const priorityContainer = document.getElementById('priority-rule-container');
const runSimBtn         = document.getElementById('run-sim-btn');
const resultsPanel      = document.getElementById('results-panel');
const resultsBody       = document.getElementById('results-body');

// ─── Playback state ────────────────────────────────────────────────────────
let animHandle    = null;
let animTick      = 0;      // current time unit (0 … total)
let animTotal     = 0;      // total time units
let animTimeline  = [];     // [{id, start, end, color}]
let animProcesses = [];
let animPaused    = false;
let animDone      = false;
let speedIdx      = 1;
let pendingTable  = null;

// pixels-per-time-unit — chart will be this wide per unit
const PX_PER_UNIT = 36; // each time unit = 36px wide

const SPEEDS = [
    { label: '0.5×', ms: 700 },
    { label: '1×',   ms: 400 },
    { label: '2×',   ms: 200 },
    { label: '4×',   ms:  90 },
    { label: '8×',   ms:  30 },
];

// ─── Helpers ───────────────────────────────────────────────────────────────
function getProcessData() {
    const rows = [...document.querySelectorAll('#process-rows .pg-cell')];
    const out  = [];
    for (let i = 0; i < rows.length; i += 4) {
        const badge = rows[i].querySelector('.badge');
        out.push({
            id:       badge.innerText.trim(),
            color:    badge.style.backgroundColor,
            burst:    parseInt(rows[i+1].querySelector('input').value, 10),
            arrival:  parseInt(rows[i+2].querySelector('input').value, 10),
            priority: parseInt(rows[i+3].querySelector('input').value, 10),
        });
    }
    return out;
}

algoSelect.addEventListener('change', e => {
    quantumContainer.style.display  = e.target.value === 'rr'           ? 'block' : 'none';
    priorityContainer.style.display = e.target.value.startsWith('prio') ? 'block' : 'none';
});

// ─── Run simulation ────────────────────────────────────────────────────────
runSimBtn.addEventListener('click', () => {
    const procs = getProcessData();
    const algo  = algoSelect.value;

    if (!procs.length) { alert('Please add at least one process.'); return; }
    if (procs.some(p => isNaN(p.burst) || isNaN(p.arrival) || isNaN(p.priority) || p.burst <= 0)) {
        alert('All processes must have valid numbers and Burst Time >= 1.');
        return;
    }

    let res;
    switch (algo) {
        case 'fcfs':    res = calculateFCFS(procs); break;
        case 'rr': {
            let q = parseInt(document.getElementById('quantum-time').value, 10);
            if (isNaN(q) || q < 1) q = 1;
            res = calculateRR(procs, q); break;
        }
        case 'sjf-np':  res = calculateSJF_NP(procs); break;
        case 'sjf-p':   res = calculateSJF_P(procs);  break;
        case 'prio-np': res = calculatePriority_NP(procs, document.getElementById('priority-rule').value); break;
        case 'prio-p':  res = calculatePriority_P(procs,  document.getElementById('priority-rule').value); break;
        default: alert('Algorithm not implemented.'); return;
    }

    pendingTable = res.completed.sort((a,b) => parseInt(a.id.slice(1)) - parseInt(b.id.slice(1)));

    resultsPanel.style.display = 'block';
    resultsBody.innerHTML      = '';
    document.getElementById('avg-tat').innerText = '—';
    document.getElementById('avg-wt').innerText  = '—';
    resultsPanel.scrollIntoView({ behavior: 'smooth' });

    startAnimation(res.timeline, procs);
});

// ══════════════════════════════════════════════════════════════════════════
//  ANIMATION ENGINE
//  Strategy: fixed-width chart (total * PX_PER_UNIT px wide).
//  Each tick, we advance by 1 time unit.
//  • Completed blocks: rendered at their exact pixel width, stay put.
//  • Current (active) block: grows one PX_PER_UNIT slice per tick.
//  • Future blocks: not rendered yet — only empty space ahead.
//  Time axis is pre-drawn with all numbers so it's a real ruler.
// ══════════════════════════════════════════════════════════════════════════
function startAnimation(timeline, procs) {
    if (animHandle) { clearInterval(animHandle); animHandle = null; }

    animTimeline  = timeline;
    animProcesses = procs;
    animTick      = 0;
    animPaused    = false;
    animDone      = false;
    speedIdx      = 1;

    const total   = timeline[timeline.length - 1]?.end ?? 0;
    animTotal     = total;
    const chartPx = total * PX_PER_UNIT;

    // ── Wipe & prepare DOM ─────────────────────────────────────────────
    const wrapper  = document.getElementById('gantt-container');
    const chartEl  = document.getElementById('gantt-chart');
    const labelRow = document.getElementById('gantt-labels');

    wrapper.style.display   = 'block';
    labelRow.style.display  = 'none'; // we build our own axis

    ['gantt-controls','gantt-progress-wrap','gantt-timeline-row','gantt-scroll-wrap'].forEach(id => {
        document.getElementById(id)?.remove();
    });
    chartEl.innerHTML = '';

    // ── Scrollable wrapper around chart + axis ─────────────────────────
    // We detach chartEl from the DOM momentarily, wrap it, re-attach
    const scrollWrap = document.createElement('div');
    scrollWrap.id = 'gantt-scroll-wrap';

    // ── Chart area (fixed pixel width) ────────────────────────────────
    chartEl.style.width    = `${chartPx}px`;
    chartEl.style.minWidth = `${chartPx}px`;
    chartEl.style.position = 'relative';
    chartEl.style.display  = 'flex';
    chartEl.style.height   = '52px';

    // ── Time axis (same fixed pixel width, pre-drawn) ──────────────────
    const axis = document.createElement('div');
    axis.id            = 'gantt-timeline-row';
    axis.style.width   = `${chartPx}px`;
    axis.style.minWidth= `${chartPx}px`;
    axis.style.position= 'relative';
    axis.style.height  = '28px';

    const step = total > 40 ? 5 : total > 20 ? 2 : 1;
    for (let t = 0; t <= total; t++) {
        const pip = document.createElement('div');
        pip.classList.add('gantt-time-pip');
        pip.dataset.t  = t;
        pip.style.left = `${t * PX_PER_UNIT}px`;  // absolute px, not %

        const num = document.createElement('span');
        num.classList.add('gantt-time-num');
        num.innerText = t;
        if (t % step !== 0 && t !== total) num.classList.add('minor');

        pip.appendChild(num);
        axis.appendChild(pip);
    }
algoSelect.addEventListener('change', (e) => {
        const selected = e.target.value;
        
        // Toggle Quantum Time input
        quantumContainer.style.display = (selected === 'rr') ? 'block' : 'none';
        
        // Toggle Priority Rule dropdown
        priorityContainer.style.display = (selected.startsWith('prio')) ? 'block' : 'none';
    });

    // --- Run Simulation Engine ---
runSimBtn.addEventListener('click', () => {
    const processes = getProcessData();
    const selectedAlgo = algoSelect.value;
    const errorDisplay = document.getElementById('error-msg'); 
    let results = [];

    // IMPORTANT: Clear the old message immediately so the new one can show up
    if (errorDisplay) {
        errorDisplay.innerText = '';
    }

    // 1. Validate Process Count (3-20)
    if (processes.length < 3 || processes.length > 20) {
        errorDisplay.innerText = `Invalid Range: Number of processes must be 3-20 (Current: ${processes.length})`;
        return;
    }

    // 2. Validate Data Ranges
    const priorities = processes.map(p => p.priority);
    const uniquePriorities = new Set(priorities);

    for (const p of processes) {
        if (isNaN(p.burst) || p.burst < 1 || p.burst > 30) {
            errorDisplay.innerText = `Invalid Range: Process ${p.id} Burst Time must be 1-30.`;
            return;
        }
        if (isNaN(p.arrival) || p.arrival < 0 || p.arrival > 30) {
            errorDisplay.innerText = `Invalid Range: Process ${p.id} Arrival Time must be 0-30.`;
            return;
        }
        if (isNaN(p.priority) || p.priority < 1 || p.priority > 20) {
            errorDisplay.innerText = `Invalid Range: Process ${p.id} Priority must be 1-20.`;
            return;
        }
    }

    // 3. Duplicate Priority Check
    if (uniquePriorities.size !== processes.length) {
        errorDisplay.innerText = 'Invalid Range: Duplicate priority numbers found. Each must be unique.';
        return;
    }

    // 4. Time Quantum Check (1-10)
    if (selectedAlgo === 'rr') {
        const quantumInput = document.getElementById('quantum-time');
        const quantum = quantumInput ? parseInt(quantumInput.value, 10) : NaN;
        if (isNaN(quantum) || quantum < 1 || quantum > 10) {
            errorDisplay.innerText = 'Invalid Range: Time Quantum must be between 1 and 10.';
            return;
        }
    }

    switch(selectedAlgo) {
        case 'fcfs':
            results = calculateFCFS(processes);
            break;
        case 'rr': {
            const quantum = parseInt(document.getElementById('quantum-time').value, 10);
            results = calculateRR(processes, quantum);
            break;
        }
        case 'sjf-np':
            results = calculateSJF_NP(processes);
            break;
        case 'sjf-p':
            results = calculateSJF_P(processes);
            break;
        case 'prio-np': {
            let rule = document.getElementById('priority-rule')?.value || 'low-num-high-prio';
            results = calculatePriority_NP(processes, rule);
            break;
        }
        case 'prio-p': {
            let rule = document.getElementById('priority-rule')?.value || 'low-num-high-prio';
            results = calculatePriority_P(processes, rule);
            break;
        }
        default:
            errorDisplay.innerText = 'Algorithm not implemented yet!';
            return;
    }

    // --- DISPLAY RESULTS ---
    const finalTableData = results.completed.sort((a, b) => 
        parseInt(a.id.substring(1)) - parseInt(b.id.substring(1))
    );
    
    displayResults(finalTableData);
    renderGanttChart(results.timeline, processes); 
});

    // Re-insert into scroll wrapper
    scrollWrap.appendChild(chartEl);
    scrollWrap.appendChild(axis);

    // Find where gantt-container's children are and insert scrollWrap before labelRow
    wrapper.insertBefore(scrollWrap, labelRow);

    // ── Progress bar (full-width, outside scroll) ──────────────────────
    const progWrap = document.createElement('div');
    progWrap.id = 'gantt-progress-wrap';
    progWrap.innerHTML = `<div id="gantt-progress-bar"></div>`;
    wrapper.insertBefore(progWrap, scrollWrap);

    // ── Control bar ────────────────────────────────────────────────────
    const ctrlBar = document.createElement('div');
    ctrlBar.id = 'gantt-controls';
    ctrlBar.innerHTML = `
        <div class="gc-left">
            <button class="gc-btn" id="gc-playpause">&#9646;&#9646; Pause</button>
            <button class="gc-btn" id="gc-restart-anim">&#8635; Restart</button>
        </div>
        <div class="gc-center">
            <div class="gc-time-display">
                <span class="gc-time-label">Time</span>
                <span class="gc-time-val" id="gc-clock">0</span>
            </div>
            <div class="gc-proc-wrap">
                <span class="gc-proc-label">Running</span>
                <span class="gc-proc" id="gc-running">—</span>
            </div>
        </div>
        <div class="gc-right">
            <span class="gc-speed-label">Speed</span>
            ${SPEEDS.map((s,i) => `<button class="gc-speed-btn ${i===speedIdx?'active':''}" data-idx="${i}">${s.label}</button>`).join('')}
        </div>
    `;
    wrapper.appendChild(ctrlBar);

    document.getElementById('gc-playpause').onclick    = togglePause;
    document.getElementById('gc-restart-anim').onclick = () => startAnimation([...animTimeline], [...animProcesses]);
    ctrlBar.querySelectorAll('.gc-speed-btn').forEach(btn => {
        btn.onclick = () => {
            speedIdx = +btn.dataset.idx;
            ctrlBar.querySelectorAll('.gc-speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (!animPaused && !animDone) {
                clearInterval(animHandle);
                animHandle = setInterval(tick, SPEEDS[speedIdx].ms);
            }
        };
    });

    // ── Kick off ───────────────────────────────────────────────────────
    renderTick();
    animHandle = setInterval(tick, SPEEDS[speedIdx].ms);
}

// ── renderTick: redraw chart from scratch up to animTick ──────────────────
// This is the key function. It draws:
//   • All fully-completed blocks at exact width
//   • The currently-active block at partial width (only ticks elapsed so far)
//   • Nothing for future blocks
function renderTick() {
    const t      = animTick;
    const total  = animTotal;
    const chart  = document.getElementById('gantt-chart');
    if (!chart) return;

    // Clear only the block elements (keep cursor if any)
    chart.innerHTML = '';

    let drawnUpTo = 0; // tracks how many px we've painted

    for (let bi = 0; bi < animTimeline.length; bi++) {
        const block    = animTimeline[bi];
        const blockDur = block.end - block.start;
        const pData    = block.id !== 'IDLE' ? animProcesses.find(p => p.id === block.id) : null;

        if (t <= block.start) break; // this block hasn't started yet — stop

        // How many time units of this block have elapsed?
        const elapsed = Math.min(t - block.start, blockDur);
        const px      = elapsed * PX_PER_UNIT;

        const el = document.createElement('div');
        el.classList.add('gantt-block');
        el.style.width    = `${px}px`;
        el.style.minWidth = `${px}px`;
        el.style.flexShrink = '0';

        if (block.id === 'IDLE') {
            el.classList.add('gantt-idle');
        } else {
            el.style.backgroundColor = pData ? pData.color : '#888';
            // Show label only when block is wide enough
            if (px >= 28) el.innerText = block.id;
        }

        // Is this the block the cursor is currently inside?
        const isActive = t > block.start && t < block.end;
        if (isActive) el.classList.add('gantt-active');

        chart.appendChild(el);
        drawnUpTo += px;
    }

    // ── Cursor line: sits at the right edge of everything drawn ──────────
    const cursor = document.createElement('div');
    cursor.id = 'gantt-cursor';
    cursor.style.left = `${t * PX_PER_UNIT}px`;
    chart.appendChild(cursor);

    // ── Highlight active time pip ────────────────────────────────────────
    document.querySelectorAll('.gantt-time-pip').forEach(p => p.classList.remove('gantt-pip-active'));
    const pip = document.querySelector(`.gantt-time-pip[data-t="${t}"]`);
    if (pip) pip.classList.add('gantt-pip-active');

    // ── Auto-scroll so cursor stays visible ──────────────────────────────
    const wrap = document.getElementById('gantt-scroll-wrap');
    if (wrap) {
        const cursorPx  = t * PX_PER_UNIT;
        const wrapWidth = wrap.clientWidth;
        const scrollL   = wrap.scrollLeft;
        // Scroll right when cursor is within 60px of the right edge
        if (cursorPx > scrollL + wrapWidth - 60) {
            wrap.scrollLeft = cursorPx - wrapWidth + 80;
        }
    }

    // ── Control bar updates ───────────────────────────────────────────────
    const clockEl  = document.getElementById('gc-clock');
    if (clockEl) clockEl.innerText = t;

    const runEl = document.getElementById('gc-running');
    if (runEl) {
        // Find which block owns tick t
        const activeBlock = animTimeline.find(b => t > b.start && t <= b.end);
        if (!activeBlock || t === 0) {
            runEl.innerText         = t === 0 ? 'Starting…' : '—';
            runEl.style.color       = 'rgba(255,255,255,0.4)';
            runEl.style.borderColor = 'rgba(255,255,255,0.1)';
            runEl.style.background  = 'rgba(255,255,255,0.04)';
        } else if (activeBlock.id === 'IDLE') {
            runEl.innerText         = 'IDLE';
            runEl.style.color       = '#aaa';
            runEl.style.borderColor = '#555';
            runEl.style.background  = 'rgba(255,255,255,0.05)';
        } else {
            const pData             = animProcesses.find(p => p.id === activeBlock.id);
            runEl.innerText         = activeBlock.id;
            runEl.style.color       = pData ? pData.color : '#fff';
            runEl.style.borderColor = pData ? pData.color : 'transparent';
            runEl.style.background  = pData ? pData.color + '28' : '';
        }
    }

    // ── Progress bar ──────────────────────────────────────────────────────
    const pb = document.getElementById('gantt-progress-bar');
    if (pb) pb.style.width = `${(t / total) * 100}%`;
}

function tick() {
    if (animPaused || animDone) return;
    animTick++;
    renderTick();
    if (animTick >= animTotal) finishAnimation();
}

function finishAnimation() {
    clearInterval(animHandle);
    animHandle = null;
    animDone   = true;

    // Draw final state — all blocks full
    renderTick();

    // Remove active pulse from last block
    document.querySelectorAll('.gantt-active').forEach(el => el.classList.remove('gantt-active'));

    // Move cursor to very end
    const cursor = document.getElementById('gantt-cursor');
    if (cursor) cursor.style.left = `${animTotal * PX_PER_UNIT}px`;

    // Highlight last pip
    document.querySelectorAll('.gantt-time-pip').forEach(p => p.classList.remove('gantt-pip-active'));
    const lastPip = document.querySelector(`.gantt-time-pip[data-t="${animTotal}"]`);
    if (lastPip) lastPip.classList.add('gantt-pip-active');

    // Clock
    const clockEl = document.getElementById('gc-clock');
    if (clockEl) { clockEl.innerText = animTotal; clockEl.style.color = '#69ff9a'; }

    const runEl = document.getElementById('gc-running');
    if (runEl) {
        runEl.innerText         = 'Done ✓';
        runEl.style.color       = '#69ff9a';
        runEl.style.borderColor = '#69ff9a';
        runEl.style.background  = 'rgba(105,255,154,0.1)';
    }

    const ppBtn = document.getElementById('gc-playpause');
    if (ppBtn) { ppBtn.textContent = '▶ Play'; ppBtn.disabled = true; ppBtn.style.opacity = '0.4'; }

    const pb = document.getElementById('gantt-progress-bar');
    if (pb) { pb.style.width = '100%'; pb.style.background = 'linear-gradient(90deg,#69ff9a,#4cc9f0)'; }

    // Reveal results table
    setTimeout(() => {
        displayResults(pendingTable);
        const tbody = document.getElementById('results-body');
        if (tbody) {
            tbody.style.opacity   = '0';
            tbody.style.transform = 'translateY(8px)';
            void tbody.offsetHeight;
            tbody.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
            tbody.style.opacity    = '1';
            tbody.style.transform  = 'translateY(0)';
        }
    }, 350);
}

function togglePause() {
    if (animDone) return;
    animPaused = !animPaused;
    const btn  = document.getElementById('gc-playpause');
    if (animPaused) {
        btn.textContent = '▶ Play';
        clearInterval(animHandle); animHandle = null;
    } else {
        btn.textContent = '⏸ Pause';
        animHandle = setInterval(tick, SPEEDS[speedIdx].ms);
    }
}

// ══════════════════════════════════════════════════════════════════════════
//  ALGORITHMS  (unchanged)
// ══════════════════════════════════════════════════════════════════════════
function calculateFCFS(processes) {
    let sorted=[...processes].sort((a,b)=>a.arrival-b.arrival),cur=0,done=[],tl=[];
    sorted.forEach(p=>{
        if(cur<p.arrival){tl.push({id:'IDLE',start:cur,end:p.arrival});cur=p.arrival;}
        let ct=cur+p.burst;
        tl.push({id:p.id,start:cur,end:ct});
        done.push({...p,completionTime:ct,turnaroundTime:ct-p.arrival,waitingTime:ct-p.arrival-p.burst});
        cur=ct;
    });
    return {completed:done,timeline:tl};
}

function calculateRR(processes,quantum){
    let rem=processes.map(p=>({...p,rem:p.burst}));
    rem.sort((a,b)=>a.arrival-b.arrival);
    let time=0,done=[],tl=[],queue=[],i=0;
    while(i<rem.length&&rem[i].arrival<=time){queue.push(rem[i]);i++;}
    while(done.length<processes.length){
        if(!queue.length){
            let nxt=rem[i].arrival;tl.push({id:'IDLE',start:time,end:nxt});time=nxt;
            while(i<rem.length&&rem[i].arrival<=time){queue.push(rem[i]);i++;}
        }else{
            let p=queue.shift(),run=Math.min(p.rem,quantum);
            tl.push({id:p.id,start:time,end:time+run});p.rem-=run;time+=run;
            while(i<rem.length&&rem[i].arrival<=time){queue.push(rem[i]);i++;}
            if(p.rem===0)done.push({...p,completionTime:time,turnaroundTime:time-p.arrival,waitingTime:time-p.arrival-p.burst});
            else queue.push(p);
        }
    }
    return {completed:done,timeline:tl};
}

function calculateSJF_NP(processes){
    let rem=[...processes].map(p=>({...p})),time=0,done=[],tl=[];
    while(rem.length){
        let avail=rem.filter(p=>p.arrival<=time);
        if(!avail.length){let n=Math.min(...rem.map(p=>p.arrival));tl.push({id:'IDLE',start:time,end:n});time=n;avail=rem.filter(p=>p.arrival<=time);}
        avail.sort((a,b)=>a.burst-b.burst||a.arrival-b.arrival);
        let p=avail[0];tl.push({id:p.id,start:time,end:time+p.burst});time+=p.burst;
        done.push({...p,completionTime:time,turnaroundTime:time-p.arrival,waitingTime:time-p.arrival-p.burst});
        rem=rem.filter(x=>x.id!==p.id);
    }
    return {completed:done,timeline:tl};
}

function calculateSJF_P(processes){
    let rem=processes.map(p=>({...p,rem:p.burst})),time=0,done=[],tl=[],cnt=0,n=processes.length,curId=null,bs=0;
    while(cnt<n){
        let avail=rem.filter(p=>p.arrival<=time&&p.rem>0);
        if(!avail.length){
            let nxt=Math.min(...rem.filter(p=>p.rem>0).map(p=>p.arrival));
            if(curId!=='IDLE'){if(curId!==null&&time>bs)tl.push({id:curId,start:bs,end:time});curId='IDLE';bs=time;}
            time=nxt;continue;
        }
        avail.sort((a,b)=>a.rem-b.rem||a.arrival-b.arrival);
        let p=avail[0];
        if(curId!==p.id){if(curId!==null&&time>bs)tl.push({id:curId,start:bs,end:time});curId=p.id;bs=time;}
        p.rem--;time++;
        if(p.rem===0){cnt++;done.push({id:p.id,arrival:p.arrival,burst:p.burst,priority:p.priority,completionTime:time,turnaroundTime:time-p.arrival,waitingTime:time-p.arrival-p.burst});}
    }
    if(curId!==null&&time>bs)tl.push({id:curId,start:bs,end:time});
    return {completed:done,timeline:tl};
}

function calculatePriority_NP(processes,rule){
    let rem=[...processes].map(p=>({...p})),time=0,done=[],tl=[];
    while(rem.length){
        let avail=rem.filter(p=>p.arrival<=time);
        if(!avail.length){let n=Math.min(...rem.map(p=>p.arrival));tl.push({id:'IDLE',start:time,end:n});time=n;avail=rem.filter(p=>p.arrival<=time);}
        avail.sort((a,b)=>sortPriority(a,b,rule));
        let p=avail[0];tl.push({id:p.id,start:time,end:time+p.burst});time+=p.burst;
        done.push({...p,completionTime:time,turnaroundTime:time-p.arrival,waitingTime:time-p.arrival-p.burst});
        rem=rem.filter(x=>x.id!==p.id);
    }
    return {completed:done,timeline:tl};
}

function calculatePriority_P(processes,rule){
    let rem=processes.map(p=>({...p,rem:p.burst})),time=0,done=[],tl=[],cnt=0,n=processes.length,curId=null,bs=0;
    while(cnt<n){
        let avail=rem.filter(p=>p.arrival<=time&&p.rem>0);
        if(!avail.length){
            let nxt=Math.min(...rem.filter(p=>p.rem>0).map(p=>p.arrival));
            if(curId!=='IDLE'){if(curId!==null&&time>bs)tl.push({id:curId,start:bs,end:time});curId='IDLE';bs=time;}
            time=nxt;continue;
        }
        avail.sort((a,b)=>sortPriority(a,b,rule));
        let p=avail[0];
        if(curId!==p.id){if(curId!==null&&time>bs)tl.push({id:curId,start:bs,end:time});curId=p.id;bs=time;}
        p.rem--;time++;
        if(p.rem===0){cnt++;done.push({id:p.id,arrival:p.arrival,burst:p.burst,priority:p.priority,completionTime:time,turnaroundTime:time-p.arrival,waitingTime:time-p.arrival-p.burst});}
    }
    if(curId!==null&&time>bs)tl.push({id:curId,start:bs,end:time});
    return {completed:done,timeline:tl};
}

function sortPriority(a,b,rule){
    return rule==='high-num-high-prio'?b.priority-a.priority||a.arrival-b.arrival:a.priority-b.priority||a.arrival-b.arrival;
}

function displayResults(results){
    resultsBody.innerHTML='';
    let tTAT=0,tWT=0;
    results.forEach(r=>{
        tTAT+=r.turnaroundTime; tWT+=r.waitingTime;
        resultsBody.insertAdjacentHTML('beforeend',`
            <tr>
                <td>${r.id}</td>
                <td>${r.burst}</td>
                <td>${r.arrival}</td>
                <td>${r.priority}</td>
                <td>${r.waitingTime}</td>
                <td>${r.turnaroundTime}</td>
                <td></td>
                <td></td>
            </tr>`);
    });
    // Avg values only on the last row's last two cells (matching image layout)
    const rows = resultsBody.querySelectorAll('tr');
    if (rows.length) {
        const lastRow = rows[rows.length - 1];
        lastRow.cells[6].innerText = (tWT  / results.length).toFixed(2);
        lastRow.cells[7].innerText = (tTAT / results.length).toFixed(2);
    }
    document.getElementById('avg-wt').innerText  = (tWT  / results.length).toFixed(2);
    document.getElementById('avg-tat').innerText = (tTAT / results.length).toFixed(2);
}

document.getElementById('menu-btn')?.addEventListener('click',()=>{
    if(typeof javaApp!=='undefined' && javaApp !== null) {
        javaApp.navigate('home'); // Use simple name
    } else {
        window.location.href='../index.html';
    }
});

document.getElementById('restart-sim-btn')?.addEventListener('click',()=>{
    if(animHandle){clearInterval(animHandle);animHandle=null;}
    resultsPanel.style.display='none';
    document.getElementById('clr-btn')?.click();
    window.scrollTo({top:0,behavior:'smooth'});
});

});