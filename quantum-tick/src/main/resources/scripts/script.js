// Loading the whole DOM
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('btn-start');
    startBtn.addEventListener('click', () => {
        if (typeof javaApp !== 'undefined' && javaApp !== null) {
            javaApp.loadPage('/pages/start.html'); 
        } else {
            window.location.href = 'pages/start.html'; 
        }
    });

    const hiwBtn = document.getElementById('btn-how');
    hiwBtn.addEventListener('click', () => {
        if (typeof javaApp !== 'undefined' && javaApp !== null) {
            javaApp.loadPage('/pages/hiw.html');
        } else {
            window.location.href = 'pages/hiw.html';
        }
    });
});