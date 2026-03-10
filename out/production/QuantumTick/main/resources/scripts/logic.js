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
    // --- Run Simulation Engine ---
    runSimBtn.addEventListener('click', () => {
        const processes = getProcessData();
        const selectedAlgo = algoSelect.value;
        let results = [];

        // Check if there are processes
        if (processes.length === 0) {
            alert('Please add at least one process.');
            return;
        }

        // NEW: Check for invalid inputs (Burst time of 0 or blank cells)
        const hasInvalidInputs = processes.some(p => isNaN(p.burst) || isNaN(p.arrival) || isNaN(p.priority) || p.burst <= 0);
        
        if (hasInvalidInputs) {
            alert('Error: All processes must have valid numbers, and Burst Time must be at least 1.');
            return; // Stop the simulation from running and crashing!
        }

        // Route to the correct algorithm logic
            switch(selectedAlgo) {
                case 'fcfs':
                    results = calculateFCFS(processes);
                    break;
                case 'rr': {
                    let quantumInput = document.getElementById('quantum-time');
                    let quantum = quantumInput ? parseInt(quantumInput.value, 10) : 2;
                    if (isNaN(quantum) || quantum < 1) quantum = 1; // Fallback
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
                    let ruleSelect = document.getElementById('priority-rule');
                    let rule = ruleSelect ? ruleSelect.value : 'low-num-high-prio';
                    results = calculatePriority_NP(processes, rule);
                    break;
                }
                case 'prio-p': {
                    let ruleSelect = document.getElementById('priority-rule');
                    let rule = ruleSelect ? ruleSelect.value : 'low-num-high-prio';
                    results = calculatePriority_P(processes, rule);
                    break;
                }
            default:
                alert('Algorithm not implemented yet!');
                return;
        }

        // Sort results by ID (P1, P2, P3) for a cleaner output table
        //results.sort((a, b) => parseInt(a.id.substring(1)) - parseInt(b.id.substring(1)));
       // displayResults(results);
       // Inside your switch statement, after an algorithm runs:
        // const simData = calculateFCFS(processes);
        
        // After the switch statement finishes:
       
        const finalTableData = results.completed.sort((a, b) => parseInt(a.id.substring(1)) - parseInt(b.id.substring(1)));
        
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
});