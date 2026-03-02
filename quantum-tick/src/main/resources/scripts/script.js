// Loading the whole DOM

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('btn-start');
    startBtn.addEventListener('click', () => {
        if (typeof javaApp !== 'undefined' && javaApp !== null) {
            // Use Java to navigate when running inside the desktop app (.exe)
            javaApp.navigate('/pages/start.html');
        } else {
            // Fallback for regular browser testing
            window.location.href = 'pages/start.html'; 
        }
    });

    const hiwBtn = document.getElementById('btn-how');
    hiwBtn.addEventListener('click', () => {
        if (typeof javaApp !== 'undefined' && javaApp !== null) {
            javaApp.navigate('/pages/hiw.html');
        } else {
            window.location.href = 'pages/hiw.html'; 
        }
    });
});