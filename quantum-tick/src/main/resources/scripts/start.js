document.addEventListener('DOMContentLoaded', () => {
    const addPBtn = document.getElementById('add-process-btn');
    const procRows = document.getElementById('process-rows');

    const MIN_ROWS = 3;
    const MAX_ROWS = 20;

    const BADGE_COLORS = [
        '#7C69FF', '#E0506E', '#69A297', '#F4A261', '#E76F51',
        '#2A9D8F', '#E9C46A', '#A8DADC', '#F72585', '#4CC9F0',
        '#7B2FBE', '#06D6A0', '#FFB703', '#FB8500', '#3A86FF',
        '#FF006E', '#8338EC', '#FFBE0B', '#00B4D8', '#80ED99'
    ];

    function getRandomColor() {
        return BADGE_COLORS[Math.floor(Math.random() * BADGE_COLORS.length)];
    }

    // --- Row Factory ---
    // Mirrors the pg-cell structure exactly, color always randomized
    function createRow(index) {
        const color = getRandomColor();
        const label = `P${index + 1}`;
        return [
            `<div class="pg-cell"><span class="badge cell-box" style="background-color:${color}">${label}</span></div>`,
            `<div class="pg-cell"><input class="cell-box" type="number" value="0"></div>`,
            `<div class="pg-cell"><input class="cell-box" type="number" value="0"></div>`,
            `<div class="pg-cell"><input class="cell-box" type="number" value="0"></div>`,
        ].join('');
    }

    // --- Populate with n fresh randomized rows ---
    function populateRows(count = MIN_ROWS) {
        let html = '';
        for (let i = 0; i < count; i++) html += createRow(i);
        procRows.innerHTML = html;
    }

    // --- Button listeners ---
    addPBtn.onclick = addProcess;
    document.getElementById('rnd-btn').onclick = randomize;
    document.getElementById('upl-btn').onclick = upload;
    document.getElementById('clr-btn').onclick = clear;

    // --- Functionalities ---
    function addProcess() {
        const currentCount = procRows.querySelectorAll('.badge.cell-box').length;
        if (currentCount >= MAX_ROWS) {
            alert(`Maximum of ${MAX_ROWS} processes reached.`);
            return;
        }
        procRows.insertAdjacentHTML('beforeend', createRow(currentCount));
    }

    function clear() {
        // Fade the whole container out as one unit — avoids per-cell
        // reflow flicker that JavaFX WebView causes with staggered transitions
        procRows.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        procRows.style.opacity    = '0';
        procRows.style.transform  = 'scale(0.97)';

        setTimeout(() => {
            populateRows(MIN_ROWS);

            // Fade back in after rebuild
            procRows.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            procRows.style.opacity    = '0';
            procRows.style.transform  = 'scale(0.97)';

            // Force a reflow so the starting state registers before animating in
            void procRows.offsetHeight;

            procRows.style.opacity   = '1';
            procRows.style.transform = 'scale(1)';
        }, 260);
    }

    function randomize() {
        const cells = [...procRows.children];   // flat list of all pg-cell divs
        const rowCount = cells.length / 4;      // each row = 4 cells

        // Priority pool sized to current row count — unique values from 1 to rowCount
        const priorityPool = Array.from({ length: rowCount }, (_, i) => i + 1)
            .sort(() => Math.random() - 0.5);

        for (let i = 0; i < rowCount; i++) {
            const offset = i * 4;
            // cells[offset]     -> badge (skip)
            // cells[offset + 1] -> burst time  input
            // cells[offset + 2] -> arrival time input
            // cells[offset + 3] -> priority no. input

            const burstInput    = cells[offset + 1].querySelector('input');
            const arrivalInput  = cells[offset + 2].querySelector('input');
            const priorityInput = cells[offset + 3].querySelector('input');

            const burst    = Math.floor(Math.random() * 30) + 1;  // 1-30
            const arrival  = Math.floor(Math.random() * 31);       // 0-30
            const priority = priorityPool[i];                      // unique 1-20

            burstInput.value         = burst;
            burstInput.dataset.value = String(burst);

            arrivalInput.value         = arrival;
            arrivalInput.dataset.value = String(arrival);

            priorityInput.value         = priority;
            priorityInput.dataset.value = String(priority);
        }
    }

    function upload() {
        try {
            if (typeof javaApp !== 'undefined' && javaApp !== null) {
                javaApp.openFilePicker();
                return;
            }
        } catch (e) {
            console.warn('javaApp bridge not available, falling back to browser upload:', e);
        }

        // Browser fallback — fresh input created every click so change
        // always fires, even if the same file is selected again
        const input = document.createElement('input');
        input.type  = 'file';
        input.accept = '.csv';
        input.value = '';  // reset so same-file re-selection still fires

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (!file.name.endsWith('.csv')) {
                alert('Invalid file: please upload a .csv file.');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => parseCSV(e.target.result);
            reader.readAsText(file);
        });
    }

    // --- CSV Parser (on window so Java can call: engine.executeScript("parseCSV(...)")) ---
    window.parseCSV = function parseCSV(text) {
        const EXPECTED_HEADERS = ['burst', 'arrival', 'prio'];

        const lines = text
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0);  // drop blank lines

        if (lines.length < 2) {
            alert('Invalid CSV: file must have a header row and at least one data row.');
            return;
        }

        // --- Validate header ---
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const headersValid = EXPECTED_HEADERS.every((h, i) => headers[i] === h);
        if (!headersValid || headers.length !== EXPECTED_HEADERS.length) {
            alert(
                'Invalid CSV: header must be exactly "burst, arrival, prio".\n' +
                `Got: "${lines[0]}"`
            );
            return;
        }

        // --- Validate & parse data rows ---
        const dataLines = lines.slice(1);

        if (dataLines.length < MIN_ROWS) {
            alert(`Invalid CSV: must have at least ${MIN_ROWS} data rows, found ${dataLines.length}.`);
            return;
        }

        if (dataLines.length > MAX_ROWS) {
            alert(`Invalid CSV: cannot exceed ${MAX_ROWS} processes, found ${dataLines.length}.`);
            return;
        }

        const parsed = [];
        for (let i = 0; i < dataLines.length; i++) {
            const lineNum = i + 2;  // +2 because line 1 is the header
            const cols = dataLines[i].split(',').map(c => c.trim());

            // Reject rows with wrong column count (catches missing/extra commas)
            if (cols.length !== EXPECTED_HEADERS.length) {
                alert(
                    `Invalid CSV: line ${lineNum} has ${cols.length} column(s), expected 3.\n` +
                    `Line: "${dataLines[i]}"`
                );
                return;
            }

            const [burstStr, arrivalStr, prioStr] = cols;
            const burst   = Number(burstStr);
            const arrival = Number(arrivalStr);
            const prio    = Number(prioStr);

            // Reject non-numeric values
            if (isNaN(burst) || isNaN(arrival) || isNaN(prio)) {
                alert(
                    `Invalid CSV: line ${lineNum} contains non-numeric value(s).\n` +
                    `Line: "${dataLines[i]}"`
                );
                return;
            }

            // Reject values outside allowed ranges
            if (burst < 1 || burst > 30) {
                alert(`Invalid CSV: line ${lineNum} burst time must be between 1–30, got ${burst}.`);
                return;
            }
            if (arrival < 0 || arrival > 30) {
                alert(`Invalid CSV: line ${lineNum} arrival time must be between 0–30, got ${arrival}.`);
                return;
            }
            if (prio < 1 || prio > MAX_ROWS) {
                alert(`Invalid CSV: line ${lineNum} priority must be between 1–${MAX_ROWS}, got ${prio}.`);
                return;
            }

            parsed.push({ burst, arrival, prio });
        }

        // Reject duplicate priority numbers
        const priorities = parsed.map(r => r.prio);
        const uniquePrios = new Set(priorities);
        if (uniquePrios.size !== priorities.length) {
            const dupes = priorities.filter((p, i) => priorities.indexOf(p) !== i);
            alert(`Invalid CSV: duplicate priority number(s) found: ${[...new Set(dupes)].join(', ')}.`);
            return;
        }

        // --- All valid: fade out, wipe, repopulate, fade in ---
        procRows.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        procRows.style.opacity    = '0';
        procRows.style.transform  = 'scale(0.97)';

        setTimeout(() => {
            procRows.innerHTML = '';

            parsed.forEach(({ burst, arrival, prio }, i) => {
                const color = getRandomColor();
                const label = `P${i + 1}`;
                const html = [
                    `<div class="pg-cell"><span class="badge cell-box" style="background-color:${color}">${label}</span></div>`,
                    `<div class="pg-cell"><input class="cell-box" type="number" value="${burst}"   data-value="${burst}"></div>`,
                    `<div class="pg-cell"><input class="cell-box" type="number" value="${arrival}" data-value="${arrival}"></div>`,
                    `<div class="pg-cell"><input class="cell-box" type="number" value="${prio}"    data-value="${prio}"></div>`,
                ].join('');
                procRows.insertAdjacentHTML('beforeend', html);
            });

            // Reset to invisible then trigger fade-in
            procRows.style.opacity   = '0';
            procRows.style.transform = 'scale(0.97)';
            void procRows.offsetHeight; // force reflow so transition fires
            procRows.style.opacity   = '1';
            procRows.style.transform = 'scale(1)';
        }, 260);
    }

    // --- Input value tracking ---
    procRows.onchange = (e) => {
        if (e.target.matches('input.cell-box')) {
            e.target.dataset.value = e.target.value;
        }
    };

    // --- Init: build the default 3 rows with random colors on first load ---
    populateRows();
});


