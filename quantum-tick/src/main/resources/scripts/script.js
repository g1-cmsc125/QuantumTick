// Loading the whole DOM

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('btn-start');
    const hiwBtn = document.getElementById('btn-how');
    
    startBtn.addEventListener('click', () => {
        if (typeof javaApp !== 'undefined' && javaApp !== null) {
            javaApp.navigate('start');
        } else {
            window.location.href = 'pages/start.html'; 
        }
    });

    hiwBtn.addEventListener('click', () => {
        if (typeof javaApp !== 'undefined' && javaApp !== null) {
            javaApp.navigate('hiw');
        } else {
            window.location.href = 'pages/hiw.html'; 
        }
    });
});