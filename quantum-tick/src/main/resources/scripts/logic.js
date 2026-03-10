document.addEventListener('DOMContentLoaded', () => {

const algoSelect = document.getElementById('algo-select');
const quantumContainer = document.getElementById('quantum-container');
const priorityContainer = document.getElementById('priority-rule-container');
const runSimBtn = document.getElementById('run-sim-btn');
const resultsPanel = document.getElementById('results-panel');
const resultsBody = document.getElementById('results-body');


function getProcessData() {
        const rows = [...document.querySelectorAll('#process-rows .pg-cell')];
        const processes = [];
        
        for (let i = 0; i < rows.length; i += 4) {
            const badge = rows[i].querySelector('.badge');
            
            processes.push({
                id: badge.innerText.trim(),
                color: badge.style.backgroundColor, // <-- NEW: Save the exact color
                burst: parseInt(rows[i+1].querySelector('input').value, 10),
                arrival: parseInt(rows[i+2].querySelector('input').value, 10),
                priority: parseInt(rows[i+3].querySelector('input').value, 10)
            });
        }
        return processes;
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

    

function calculateFCFS(processes) {
        let sorted = [...processes].sort((a, b) => a.arrival - b.arrival);
        
        let currentTime = 0;
        let completedProcesses = [];
        let timeline = []; // <-- NEW: Array to track execution blocks

        sorted.forEach(p => {
            // Track Idle Time
            if (currentTime < p.arrival) {
                timeline.push({ id: 'IDLE', start: currentTime, end: p.arrival });
                currentTime = p.arrival;
            }
            
            let completionTime = currentTime + p.burst;
            let turnaroundTime = completionTime - p.arrival;
            let waitingTime = turnaroundTime - p.burst;
            
            // Track Process Execution
            timeline.push({ id: p.id, start: currentTime, end: completionTime });
            
            completedProcesses.push({
                ...p,
                completionTime,
                turnaroundTime,
                waitingTime
            });
            
            currentTime = completionTime;
        });

        // Return an object containing BOTH the stats and the timeline
        return { completed: completedProcesses, timeline: timeline }; 
    }

    function displayResults(results) {
        resultsPanel.style.display = 'block'; // Reveal the results section
        resultsBody.innerHTML = ''; // Clear old results

        let totalTAT = 0;
        let totalWT = 0;

        results.forEach(r => {
            totalTAT += r.turnaroundTime;
            totalWT += r.waitingTime;

            const rowHtml = `
                <tr>
                    <td>${r.id}</td>
                    <td>${r.arrival}</td>
                    <td>${r.burst}</td>
                    <td>${r.completionTime}</td>
                    <td>${r.turnaroundTime}</td>
                    <td>${r.waitingTime}</td>
                </tr>
            `;
            resultsBody.insertAdjacentHTML('beforeend', rowHtml);
        });

        document.getElementById('avg-tat').innerText = (totalTAT / results.length).toFixed(2);
        document.getElementById('avg-wt').innerText = (totalWT / results.length).toFixed(2);
        
        // Scroll down to results smoothly
        resultsPanel.scrollIntoView({ behavior: 'smooth' });
    }

    // ==========================================
    // 2. ROUND ROBIN (RR)
    // ==========================================
    function calculateRR(processes, quantum) {
        let remaining = processes.map(p => ({ ...p, rem: p.burst }));
        remaining.sort((a, b) => a.arrival - b.arrival); 
        
        let time = 0;
        let completed = [];
        let timeline = [];
        let queue = [];
        let i = 0;

        while (i < remaining.length && remaining[i].arrival <= time) {
            queue.push(remaining[i]); i++;
        }

        while (completed.length < processes.length) {
            if (queue.length === 0) {
                let nextArrival = remaining[i].arrival;
                timeline.push({ id: 'IDLE', start: time, end: nextArrival });
                time = nextArrival;
                
                while (i < remaining.length && remaining[i].arrival <= time) {
                    queue.push(remaining[i]); i++;
                }
            } else {
                let p = queue.shift();
                let runTime = Math.min(p.rem, quantum);
                
                // Track execution
                timeline.push({ id: p.id, start: time, end: time + runTime });
                
                p.rem -= runTime;
                time += runTime;

                while (i < remaining.length && remaining[i].arrival <= time) {
                    queue.push(remaining[i]); i++;
                }

                if (p.rem === 0) {
                    completed.push({
                        ...p,
                        completionTime: time,
                        turnaroundTime: time - p.arrival,
                        waitingTime: time - p.arrival - p.burst
                    });
                } else {
                    queue.push(p);
                }
            }
        }
        return { completed, timeline };
    }

    // ==========================================
    // 3. SHORTEST JOB FIRST - NON-PREEMPTIVE (SJF-NP)
    // ==========================================
    function calculateSJF_NP(processes) {
        let remaining = [...processes].map(p => ({ ...p }));
        let time = 0;
        let completed = [];
        let timeline = [];

        while (remaining.length > 0) {
            let available = remaining.filter(p => p.arrival <= time);
            
            if (available.length === 0) {
                let nextArrival = Math.min(...remaining.map(p => p.arrival));
                timeline.push({ id: 'IDLE', start: time, end: nextArrival });
                time = nextArrival;
                available = remaining.filter(p => p.arrival <= time);
            }
            
            available.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival);
            let p = available[0];
            
            timeline.push({ id: p.id, start: time, end: time + p.burst });
            time += p.burst; 
            
            completed.push({
                ...p,
                completionTime: time,
                turnaroundTime: time - p.arrival,
                waitingTime: time - p.arrival - p.burst
            });
            
            remaining = remaining.filter(x => x.id !== p.id);
        }
        return { completed, timeline };
    }

    // ==========================================
    // 4. SHORTEST JOB FIRST - PREEMPTIVE (SRTF)
    // ==========================================
    function calculateSJF_P(processes) {
        let remaining = processes.map(p => ({ ...p, rem: p.burst }));
        let time = 0;
        let completed = [];
        let timeline = [];
        let completedCount = 0;
        let n = processes.length;

        let currentId = null;
        let blockStart = 0;

        while (completedCount < n) {
            let available = remaining.filter(p => p.arrival <= time && p.rem > 0);
            
            if (available.length === 0) {
                let future = remaining.filter(p => p.rem > 0);
                let nextTime = Math.min(...future.map(p => p.arrival));
                
                if (currentId !== 'IDLE') {
                    if (currentId !== null && time > blockStart) timeline.push({ id: currentId, start: blockStart, end: time });
                    currentId = 'IDLE';
                    blockStart = time;
                }
                time = nextTime;
                continue;
            }

            available.sort((a, b) => a.rem - b.rem || a.arrival - b.arrival);
            let p = available[0];

            // If a new process is taking over the CPU, log the previous block
            if (currentId !== p.id) {
                if (currentId !== null && time > blockStart) timeline.push({ id: currentId, start: blockStart, end: time });
                currentId = p.id;
                blockStart = time;
            }

            p.rem -= 1;
            time += 1;

            if (p.rem === 0) {
                completedCount++;
                completed.push({
                    id: p.id, arrival: p.arrival, burst: p.burst, priority: p.priority,
                    completionTime: time,
                    turnaroundTime: time - p.arrival,
                    waitingTime: time - p.arrival - p.burst
                });
            }
        }
        // Push the final block
        if (currentId !== null && time > blockStart) timeline.push({ id: currentId, start: blockStart, end: time });

        return { completed, timeline };
    }

    // ==========================================
    // 5. PRIORITY - NON-PREEMPTIVE
    // ==========================================
    function calculatePriority_NP(processes, rule) {
        let remaining = [...processes].map(p => ({ ...p }));
        let time = 0;
        let completed = [];
        let timeline = [];

        while (remaining.length > 0) {
            let available = remaining.filter(p => p.arrival <= time);
            
            if (available.length === 0) {
                let nextArrival = Math.min(...remaining.map(p => p.arrival));
                timeline.push({ id: 'IDLE', start: time, end: nextArrival });
                time = nextArrival;
                available = remaining.filter(p => p.arrival <= time);
            }
            
            available.sort((a, b) => sortPriority(a, b, rule));
            let p = available[0];
            
            timeline.push({ id: p.id, start: time, end: time + p.burst });
            time += p.burst; 
            
            completed.push({
                ...p,
                completionTime: time,
                turnaroundTime: time - p.arrival,
                waitingTime: time - p.arrival - p.burst
            });
            
            remaining = remaining.filter(x => x.id !== p.id);
        }
        return { completed, timeline };
    }

    // ==========================================
    // 6. PRIORITY - PREEMPTIVE
    // ==========================================
    function calculatePriority_P(processes, rule) {
        let remaining = processes.map(p => ({ ...p, rem: p.burst }));
        let time = 0;
        let completed = [];
        let timeline = [];
        let completedCount = 0;
        let n = processes.length;

        let currentId = null;
        let blockStart = 0;

        while (completedCount < n) {
            let available = remaining.filter(p => p.arrival <= time && p.rem > 0);
            
            if (available.length === 0) {
                let future = remaining.filter(p => p.rem > 0);
                let nextTime = Math.min(...future.map(p => p.arrival));
                
                if (currentId !== 'IDLE') {
                    if (currentId !== null && time > blockStart) timeline.push({ id: currentId, start: blockStart, end: time });
                    currentId = 'IDLE';
                    blockStart = time;
                }
                time = nextTime;
                continue;
            }

            available.sort((a, b) => sortPriority(a, b, rule));
            let p = available[0];

            if (currentId !== p.id) {
                if (currentId !== null && time > blockStart) timeline.push({ id: currentId, start: blockStart, end: time });
                currentId = p.id;
                blockStart = time;
            }

            p.rem -= 1;
            time += 1;

            if (p.rem === 0) {
                completedCount++;
                completed.push({
                    id: p.id, arrival: p.arrival, burst: p.burst, priority: p.priority,
                    completionTime: time,
                    turnaroundTime: time - p.arrival,
                    waitingTime: time - p.arrival - p.burst
                });
            }
        }
        if (currentId !== null && time > blockStart) timeline.push({ id: currentId, start: blockStart, end: time });

        return { completed, timeline };
    }

    function renderGanttChart(timeline, originalProcesses) {
        const chartContainer = document.getElementById('gantt-chart');
        const labelsContainer = document.getElementById('gantt-labels');
        const ganttWrapper = document.getElementById('gantt-container');
        
        chartContainer.innerHTML = '';
        labelsContainer.innerHTML = '';
        ganttWrapper.style.display = 'block';

        if (timeline.length === 0) return;

        const totalTime = timeline[timeline.length - 1].end;

        timeline.forEach((block, index) => {
            const duration = block.end - block.start;
            
            const blockEl = document.createElement('div');
            blockEl.classList.add('gantt-block');
            blockEl.style.flexGrow = duration; 
            
            if (block.id === 'IDLE') {
                blockEl.classList.add('gantt-idle');
            } else {
                // Find the original process data to get its color
                const pData = originalProcesses.find(p => p.id === block.id);
                
                // Use the scraped color, fallback to gray if not found
                blockEl.style.backgroundColor = pData ? pData.color : '#888';
                blockEl.innerText = block.id;
            }
            chartContainer.appendChild(blockEl);

            const startLabel = document.createElement('div');
            startLabel.classList.add('gantt-label');
            startLabel.innerText = block.start;
            startLabel.style.left = `${(block.start / totalTime) * 100}%`;
            labelsContainer.appendChild(startLabel);

            if (index === timeline.length - 1) {
                const endLabel = document.createElement('div');
                endLabel.classList.add('gantt-label');
                endLabel.innerText = block.end;
                endLabel.style.left = `100%`;
                labelsContainer.appendChild(endLabel);
            }
        });
    }

    // ==========================================
    // PRIORITY HELPER FUNCTION
    // ==========================================
    function sortPriority(a, b, rule) {
        if (rule === 'high-num-high-prio') {
            return b.priority - a.priority || a.arrival - b.arrival; // Higher number wins
        } else {
            return a.priority - b.priority || a.arrival - b.arrival; // Lower number wins
        }
    }

    // ==========================================
    // RESULTS BUTTON FUNCTION
    // ==========================================

    const menuBtn = document.getElementById('menu-btn');
    const restartBtn = document.getElementById('restart-sim-btn');

    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            if (typeof javaApp !== 'undefined' && javaApp !== null) {
                javaApp.navigate('/index.html');
            } else {
                window.location.href = '../index.html'; 
            }
        });
    }

    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            const resultsPanel = document.getElementById('results-panel');
            resultsPanel.style.display = 'none';

            const clearBtn = document.getElementById('clr-btn');
            if (clearBtn) {
                clearBtn.click();
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

});