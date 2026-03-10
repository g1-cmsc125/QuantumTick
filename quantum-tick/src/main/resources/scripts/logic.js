document.addEventListener('DOMContentLoaded', () => {

const algoSelect = document.getElementById('algo-select');
const quantumContainer = document.getElementById('quantum-container');
const priorityContainer = document.getElementById('priority-rule-container');
const runSimBtn = document.getElementById('run-sim-btn');
const resultsPanel = document.getElementById('results-panel');
const resultsBody = document.getElementById('results-body');

// ─── Playback state ────────────────────────────────────────────────────────
let animationHandle  = null;   // setInterval id
let animTick         = 0;      // current simulated time unit
let animTotalTicks   = 0;      // total time units in this simulation
let animTimeline     = [];     // flat tick-level array: animTimeline[t] = blockIndex
let animBlocks       = [];     // the timeline blocks
let animProcesses    = [];     // original process data (for colours)
let animSpeed        = 1;      // ms multiplier: lower = faster
let animPaused       = false;
let animFinished     = false;
let pendingTableData = null;   // table rows revealed only after animation ends

const SPEED_PRESETS = [
    { label: '0.5×', ms: 400 },
    { label: '1×',   ms: 200 },
    { label: '2×',   ms: 100 },
    { label: '4×',   ms:  50 },
    { label: '8×',   ms:  25 },
];
let speedIndex = 1; // default 1×

// ─── Helpers ───────────────────────────────────────────────────────────────
function getProcessData() {
    const rows = [...document.querySelectorAll('#process-rows .pg-cell')];
    const processes = [];
    for (let i = 0; i < rows.length; i += 4) {
        const badge = rows[i].querySelector('.badge');
        processes.push({
            id:       badge.innerText.trim(),
            color:    badge.style.backgroundColor,
            burst:    parseInt(rows[i+1].querySelector('input').value, 10),
            arrival:  parseInt(rows[i+2].querySelector('input').value, 10),
            priority: parseInt(rows[i+3].querySelector('input').value, 10)
        });
    }
    return processes;
}

algoSelect.addEventListener('change', (e) => {
    const selected = e.target.value;
    quantumContainer.style.display  = (selected === 'rr')              ? 'block' : 'none';
    priorityContainer.style.display = (selected.startsWith('prio'))    ? 'block' : 'none';
});

// ─── Run Simulation ────────────────────────────────────────────────────────
runSimBtn.addEventListener('click', () => {
    const processes    = getProcessData();
    const selectedAlgo = algoSelect.value;

    if (processes.length === 0) { alert('Please add at least one process.'); return; }

    const hasInvalid = processes.some(p => isNaN(p.burst) || isNaN(p.arrival) || isNaN(p.priority) || p.burst <= 0);
    if (hasInvalid) { alert('Error: All processes must have valid numbers, and Burst Time must be at least 1.'); return; }

    let results;
    switch (selectedAlgo) {
        case 'fcfs':     results = calculateFCFS(processes);      break;
        case 'rr': {
            let q = parseInt(document.getElementById('quantum-time').value, 10);
            if (isNaN(q) || q < 1) q = 1;
            results = calculateRR(processes, q);
            break;
        }
        case 'sjf-np':   results = calculateSJF_NP(processes);    break;
        case 'sjf-p':    results = calculateSJF_P(processes);     break;
        case 'prio-np': {
            let rule = document.getElementById('priority-rule').value;
            results = calculatePriority_NP(processes, rule);
            break;
        }
        case 'prio-p': {
            let rule = document.getElementById('priority-rule').value;
            results = calculatePriority_P(processes, rule);
            break;
        }
        default: alert('Algorithm not implemented yet!'); return;
    }

    pendingTableData = results.completed.sort((a, b) => parseInt(a.id.substring(1)) - parseInt(b.id.substring(1)));

    // Reveal results panel (table hidden until animation ends)
    resultsPanel.style.display = 'block';
    resultsBody.innerHTML = '';
    document.getElementById('avg-tat').innerText = '—';
    document.getElementById('avg-wt').innerText  = '—';

    resultsPanel.scrollIntoView({ behavior: 'smooth' });

    startGanttAnimation(results.timeline, processes);
});

// ══════════════════════════════════════════════════════════════════════════════
//  GANTT ANIMATION ENGINE
// ══════════════════════════════════════════════════════════════════════════════
function startGanttAnimation(timeline, processes) {
    // ── Stop any previous animation ─────────────────────────────────────────
    if (animationHandle) { clearInterval(animationHandle); animationHandle = null; }

    animTimeline  = timeline;
    animProcesses = processes;
    animTick      = 0;
    animPaused    = false;
    animFinished  = false;
    speedIndex    = 1;

    // Build tick→blockIndex map
    const totalTicks = timeline[timeline.length - 1]?.end ?? 0;
    animTotalTicks   = totalTicks;
    animBlocks       = [];

    const tickMap = new Array(totalTicks).fill(0);
    for (let bi = 0; bi < timeline.length; bi++) {
        for (let t = timeline[bi].start; t < timeline[bi].end; t++) {
            tickMap[t] = bi;
        }
    }
    animBlocks = tickMap; // animBlocks[t] = block index

    // ── Build Gantt DOM skeleton ─────────────────────────────────────────────
    const ganttWrapper   = document.getElementById('gantt-container');
    const chartContainer = document.getElementById('gantt-chart');
    const labelsContainer= document.getElementById('gantt-labels');

    ganttWrapper.style.display = 'block';
    chartContainer.innerHTML   = '';
    labelsContainer.innerHTML  = '';

    // Remove old control bar if it exists
    const oldCtrl = document.getElementById('gantt-controls');
    if (oldCtrl) oldCtrl.remove();

    // Create empty block elements (width=0, will grow as ticks advance)
    timeline.forEach((block, bi) => {
        const el = document.createElement('div');
        el.classList.add('gantt-block');
        el.dataset.blockIndex = bi;
        el.style.width        = '0%';
        el.style.flexGrow     = '0';
        el.style.minWidth     = '0';
        el.style.overflow     = 'hidden';
        el.style.transition   = 'none';
        el.style.position     = 'relative';

        if (block.id === 'IDLE') {
            el.classList.add('gantt-idle');
            el.innerText = '';
        } else {
            const pData = processes.find(p => p.id === block.id);
            el.style.backgroundColor = pData ? pData.color : '#888';
            el.dataset.label = block.id;
        }

        chartContainer.appendChild(el);
    });

    // Start label at 0
    const label0 = document.createElement('div');
    label0.classList.add('gantt-label');
    label0.innerText    = '0';
    label0.style.left   = '0%';
    label0.id           = 'gantt-label-0';
    labelsContainer.appendChild(label0);

    // ── Control bar ──────────────────────────────────────────────────────────
    const ctrlBar = document.createElement('div');
    ctrlBar.id        = 'gantt-controls';
    ctrlBar.innerHTML = `
        <div class="gc-left">
            <button class="gc-btn" id="gc-playpause">⏸ Pause</button>
            <button class="gc-btn" id="gc-restart-anim">↺ Restart</button>
        </div>
        <div class="gc-center">
            <span class="gc-clock-label">CPU Clock</span>
            <span class="gc-clock" id="gc-clock">t = 0</span>
            <span class="gc-proc-label">Running:</span>
            <span class="gc-proc" id="gc-running">—</span>
        </div>
        <div class="gc-right">
            <span class="gc-speed-label">Speed</span>
            ${SPEED_PRESETS.map((s, i) =>
                `<button class="gc-speed-btn ${i === speedIndex ? 'active' : ''}" data-idx="${i}">${s.label}</button>`
            ).join('')}
        </div>
    `;
    ganttWrapper.appendChild(ctrlBar);

    // Wire control buttons
    document.getElementById('gc-playpause').onclick = togglePause;
    document.getElementById('gc-restart-anim').onclick = () => startGanttAnimation(animTimeline.slice(), animProcesses.slice());
    ctrlBar.querySelectorAll('.gc-speed-btn').forEach(btn => {
        btn.onclick = () => {
            speedIndex = parseInt(btn.dataset.idx);
            ctrlBar.querySelectorAll('.gc-speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (!animPaused && !animFinished) {
                clearInterval(animationHandle);
                animationHandle = setInterval(tick, SPEED_PRESETS[speedIndex].ms);
            }
        };
    });

    // ── Progress bar ─────────────────────────────────────────────────────────
    const progressWrap = document.createElement('div');
    progressWrap.id        = 'gantt-progress-wrap';
    progressWrap.innerHTML = `<div id="gantt-progress-bar"></div>`;
    ganttWrapper.insertBefore(progressWrap, chartContainer);

    // ── Start ticking ────────────────────────────────────────────────────────
    animationHandle = setInterval(tick, SPEED_PRESETS[speedIndex].ms);
}

// ── Single tick advance ────────────────────────────────────────────────────
function tick() {
    if (animPaused || animFinished) return;

    const t       = animTick;
    const total   = animTotalTicks;

    if (t >= total) {
        finishAnimation();
        return;
    }

    const bi      = animBlocks[t];           // which block owns this tick
    const block   = animTimeline[bi];
    const elapsed = t - block.start + 1;     // ticks rendered into this block
    const blockEl = document.querySelector(`[data-block-index="${bi}"]`);

    // Grow block's proportional width
    if (blockEl) {
        const blockWidth = ((elapsed) / total) * 100;
        // accumulate: sum of all completed blocks + this partial
        let accumulatedWidth = 0;
        for (let prevBi = 0; prevBi < bi; prevBi++) {
            accumulatedWidth += ((animTimeline[prevBi].end - animTimeline[prevBi].start) / total) * 100;
        }
        const partialWidth = (elapsed / total) * 100;
        blockEl.style.width   = `${(elapsed / (block.end - block.start)) * 100}%`;
        blockEl.style.flexGrow = elapsed;

        // Show label once block is wide enough
        if (block.id !== 'IDLE' && elapsed >= (block.end - block.start) * 0.4) {
            blockEl.innerText = block.dataset?.label || blockEl.dataset.label || block.id;
        }

        // Pulse the active block
        blockEl.classList.add('gantt-active');
    }

    // Remove pulse from previous block if we just moved to a new one
    if (t > 0) {
        const prevBi = animBlocks[t - 1];
        if (prevBi !== bi) {
            const prevEl = document.querySelector(`[data-block-index="${prevBi}"]`);
            if (prevEl) prevEl.classList.remove('gantt-active');

            // Freeze previous block at full width
            const prevBlock = animTimeline[prevBi];
            if (prevEl) {
                prevEl.style.flexGrow = prevBlock.end - prevBlock.start;
                prevEl.style.width    = '';
            }

            // Add time label for the end of previous block / start of new
            addTimeLabel(t, total);
        }
    }

    // Update clock + running process display
    document.getElementById('gc-clock').innerText   = `t = ${t + 1}`;
    const runningEl = document.getElementById('gc-running');
    if (block.id === 'IDLE') {
        runningEl.innerText              = 'IDLE';
        runningEl.style.background       = 'rgba(255,255,255,0.1)';
        runningEl.style.color            = '#aaa';
    } else {
        const pData = animProcesses.find(p => p.id === block.id);
        runningEl.innerText              = block.id;
        runningEl.style.background       = pData ? pData.color + '44' : '';
        runningEl.style.color            = pData ? pData.color : '#fff';
        runningEl.style.borderColor      = pData ? pData.color : 'transparent';
    }

    // Progress bar
    const pct = ((t + 1) / total) * 100;
    const progressBar = document.getElementById('gantt-progress-bar');
    if (progressBar) progressBar.style.width = `${pct}%`;

    animTick++;
}

function addTimeLabel(t, total) {
    const labelsContainer = document.getElementById('gantt-labels');
    if (!labelsContainer) return;

    // Avoid duplicate labels
    const exists = [...labelsContainer.children].some(el => el.innerText == t);
    if (exists) return;

    const lbl = document.createElement('div');
    lbl.classList.add('gantt-label', 'gantt-label-appear');
    lbl.innerText  = t;
    lbl.style.left = `${(t / total) * 100}%`;
    labelsContainer.appendChild(lbl);
}

function finishAnimation() {
    clearInterval(animationHandle);
    animationHandle = null;
    animFinished    = true;

    // Finalise last block
    const lastBi = animBlocks[animTotalTicks - 1];
    const lastEl = document.querySelector(`[data-block-index="${lastBi}"]`);
    if (lastEl) {
        const lb = animTimeline[lastBi];
        lastEl.style.flexGrow = lb.end - lb.start;
        lastEl.style.width    = '';
        lastEl.classList.remove('gantt-active');
        lastEl.innerText = lb.id !== 'IDLE' ? lb.id : '';
    }

    // Final time label
    addTimeLabel(animTotalTicks, animTotalTicks);

    // Update clock
    document.getElementById('gc-clock').innerText = `t = ${animTotalTicks} ✓`;
    const runningEl = document.getElementById('gc-running');
    runningEl.innerText    = 'Done';
    runningEl.style.color  = '#69ff9a';
    runningEl.style.borderColor = '#69ff9a';
    runningEl.style.background  = 'rgba(105,255,154,0.1)';

    // Play/pause btn
    const ppBtn = document.getElementById('gc-playpause');
    if (ppBtn) { ppBtn.innerText = '▶ Play'; ppBtn.disabled = true; ppBtn.style.opacity = '0.4'; }

    // Progress bar to 100%
    const pb = document.getElementById('gantt-progress-bar');
    if (pb) { pb.style.width = '100%'; pb.style.background = 'linear-gradient(90deg, #69ff9a, #4cc9f0)'; }

    // Now reveal the results table
    setTimeout(() => {
        displayResults(pendingTableData);

        // Flash the table into view
        const tbody = document.getElementById('results-body');
        if (tbody) {
            tbody.style.opacity   = '0';
            tbody.style.transform = 'translateY(10px)';
            void tbody.offsetHeight;
            tbody.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            tbody.style.opacity    = '1';
            tbody.style.transform  = 'translateY(0)';
        }
    }, 300);
}

function togglePause() {
    if (animFinished) return;
    animPaused = !animPaused;
    const btn  = document.getElementById('gc-playpause');
    if (animPaused) {
        btn.innerText = '▶ Play';
        clearInterval(animationHandle);
        animationHandle = null;
    } else {
        btn.innerText = '⏸ Pause';
        animationHandle = setInterval(tick, SPEED_PRESETS[speedIndex].ms);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
//  ALGORITHMS  
// ══════════════════════════════════════════════════════════════════════════════
function calculateFCFS(processes) {
    let sorted = [...processes].sort((a, b) => a.arrival - b.arrival);
    let currentTime = 0, completedProcesses = [], timeline = [];

    sorted.forEach(p => {
        if (currentTime < p.arrival) {
            timeline.push({ id: 'IDLE', start: currentTime, end: p.arrival });
            currentTime = p.arrival;
        }
        let ct = currentTime + p.burst;
        timeline.push({ id: p.id, start: currentTime, end: ct });
        completedProcesses.push({ ...p, completionTime: ct, turnaroundTime: ct - p.arrival, waitingTime: ct - p.arrival - p.burst });
        currentTime = ct;
    });
    return { completed: completedProcesses, timeline };
}

function calculateRR(processes, quantum) {
    let remaining = processes.map(p => ({ ...p, rem: p.burst }));
    remaining.sort((a, b) => a.arrival - b.arrival);
    let time = 0, completed = [], timeline = [], queue = [], i = 0;

    while (i < remaining.length && remaining[i].arrival <= time) { queue.push(remaining[i]); i++; }

    while (completed.length < processes.length) {
        if (queue.length === 0) {
            let nextArrival = remaining[i].arrival;
            timeline.push({ id: 'IDLE', start: time, end: nextArrival });
            time = nextArrival;
            while (i < remaining.length && remaining[i].arrival <= time) { queue.push(remaining[i]); i++; }
        } else {
            let p = queue.shift();
            let runTime = Math.min(p.rem, quantum);
            timeline.push({ id: p.id, start: time, end: time + runTime });
            p.rem -= runTime;
            time  += runTime;
            while (i < remaining.length && remaining[i].arrival <= time) { queue.push(remaining[i]); i++; }
            if (p.rem === 0) {
                completed.push({ ...p, completionTime: time, turnaroundTime: time - p.arrival, waitingTime: time - p.arrival - p.burst });
            } else {
                queue.push(p);
            }
        }
    }
    return { completed, timeline };
}

function calculateSJF_NP(processes) {
    let remaining = [...processes].map(p => ({ ...p }));
    let time = 0, completed = [], timeline = [];

    while (remaining.length > 0) {
        let available = remaining.filter(p => p.arrival <= time);
        if (available.length === 0) {
            let next = Math.min(...remaining.map(p => p.arrival));
            timeline.push({ id: 'IDLE', start: time, end: next });
            time = next;
            available = remaining.filter(p => p.arrival <= time);
        }
        available.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival);
        let p = available[0];
        timeline.push({ id: p.id, start: time, end: time + p.burst });
        time += p.burst;
        completed.push({ ...p, completionTime: time, turnaroundTime: time - p.arrival, waitingTime: time - p.arrival - p.burst });
        remaining = remaining.filter(x => x.id !== p.id);
    }
    return { completed, timeline };
}

function calculateSJF_P(processes) {
    let remaining = processes.map(p => ({ ...p, rem: p.burst }));
    let time = 0, completed = [], timeline = [], completedCount = 0, n = processes.length;
    let currentId = null, blockStart = 0;

    while (completedCount < n) {
        let available = remaining.filter(p => p.arrival <= time && p.rem > 0);
        if (available.length === 0) {
            let future = remaining.filter(p => p.rem > 0);
            let nextTime = Math.min(...future.map(p => p.arrival));
            if (currentId !== 'IDLE') {
                if (currentId !== null && time > blockStart) timeline.push({ id: currentId, start: blockStart, end: time });
                currentId = 'IDLE'; blockStart = time;
            }
            time = nextTime; continue;
        }
        available.sort((a, b) => a.rem - b.rem || a.arrival - b.arrival);
        let p = available[0];
        if (currentId !== p.id) {
            if (currentId !== null && time > blockStart) timeline.push({ id: currentId, start: blockStart, end: time });
            currentId = p.id; blockStart = time;
        }
        p.rem -= 1; time += 1;
        if (p.rem === 0) {
            completedCount++;
            completed.push({ id: p.id, arrival: p.arrival, burst: p.burst, priority: p.priority, completionTime: time, turnaroundTime: time - p.arrival, waitingTime: time - p.arrival - p.burst });
        }
    }
    if (currentId !== null && time > blockStart) timeline.push({ id: currentId, start: blockStart, end: time });
    return { completed, timeline };
}

function calculatePriority_NP(processes, rule) {
    let remaining = [...processes].map(p => ({ ...p }));
    let time = 0, completed = [], timeline = [];

    while (remaining.length > 0) {
        let available = remaining.filter(p => p.arrival <= time);
        if (available.length === 0) {
            let next = Math.min(...remaining.map(p => p.arrival));
            timeline.push({ id: 'IDLE', start: time, end: next });
            time = next;
            available = remaining.filter(p => p.arrival <= time);
        }
        available.sort((a, b) => sortPriority(a, b, rule));
        let p = available[0];
        timeline.push({ id: p.id, start: time, end: time + p.burst });
        time += p.burst;
        completed.push({ ...p, completionTime: time, turnaroundTime: time - p.arrival, waitingTime: time - p.arrival - p.burst });
        remaining = remaining.filter(x => x.id !== p.id);
    }
    return { completed, timeline };
}

function calculatePriority_P(processes, rule) {
    let remaining = processes.map(p => ({ ...p, rem: p.burst }));
    let time = 0, completed = [], timeline = [], completedCount = 0, n = processes.length;
    let currentId = null, blockStart = 0;

    while (completedCount < n) {
        let available = remaining.filter(p => p.arrival <= time && p.rem > 0);
        if (available.length === 0) {
            let future = remaining.filter(p => p.rem > 0);
            let nextTime = Math.min(...future.map(p => p.arrival));
            if (currentId !== 'IDLE') {
                if (currentId !== null && time > blockStart) timeline.push({ id: currentId, start: blockStart, end: time });
                currentId = 'IDLE'; blockStart = time;
            }
            time = nextTime; continue;
        }
        available.sort((a, b) => sortPriority(a, b, rule));
        let p = available[0];
        if (currentId !== p.id) {
            if (currentId !== null && time > blockStart) timeline.push({ id: currentId, start: blockStart, end: time });
            currentId = p.id; blockStart = time;
        }
        p.rem -= 1; time += 1;
        if (p.rem === 0) {
            completedCount++;
            completed.push({ id: p.id, arrival: p.arrival, burst: p.burst, priority: p.priority, completionTime: time, turnaroundTime: time - p.arrival, waitingTime: time - p.arrival - p.burst });
        }
    }
    if (currentId !== null && time > blockStart) timeline.push({ id: currentId, start: blockStart, end: time });
    return { completed, timeline };
}

function sortPriority(a, b, rule) {
    return rule === 'high-num-high-prio'
        ? b.priority - a.priority || a.arrival - b.arrival
        : a.priority - b.priority || a.arrival - b.arrival;
}

// ── Display Results Table ──────────────────────────────────────────────────
function displayResults(results) {
    resultsBody.innerHTML = '';
    let totalTAT = 0, totalWT = 0;

    results.forEach(r => {
        totalTAT += r.turnaroundTime;
        totalWT  += r.waitingTime;
        resultsBody.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${r.id}</td>
                <td>${r.arrival}</td>
                <td>${r.burst}</td>
                <td>${r.completionTime}</td>
                <td>${r.turnaroundTime}</td>
                <td>${r.waitingTime}</td>
            </tr>
        `);
    });

    document.getElementById('avg-tat').innerText = (totalTAT / results.length).toFixed(2);
    document.getElementById('avg-wt').innerText  = (totalWT  / results.length).toFixed(2);
}

// ── Results panel buttons ──────────────────────────────────────────────────
const menuBtn    = document.getElementById('menu-btn');
const restartBtn = document.getElementById('restart-sim-btn');

if (menuBtn) {
    menuBtn.addEventListener('click', () => {
        if (typeof javaApp !== 'undefined' && javaApp !== null) javaApp.navigate('/index.html');
        else window.location.href = '../index.html';
    });
}

if (restartBtn) {
    restartBtn.addEventListener('click', () => {
        if (animationHandle) { clearInterval(animationHandle); animationHandle = null; }
        resultsPanel.style.display = 'none';
        document.getElementById('clr-btn')?.click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

});