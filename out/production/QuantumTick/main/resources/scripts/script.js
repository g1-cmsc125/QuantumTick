// Loading the whole DOM

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('btn-start');
    startBtn.addEventListener('click', () => {
        window.location.href = 'pages/start.html'; 
    });

    const hiwBtn = document.getElementById('btn-how');
    hiwBtn.addEventListener('click', () => {
        window.location.href = 'pages/hiw.html'; 
    });
});