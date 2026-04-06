/* ── Custom cursor ─────────────────────────── */
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursorRing');
let ringX = 0, ringY = 0, curX = 0, curY = 0;

document.addEventListener('mousemove', e => {
    curX = e.clientX;
    curY = e.clientY;
    cursor.style.left = curX + 'px';
    cursor.style.top  = curY + 'px';
});

function animateRing() {
    ringX += (curX - ringX) * 0.12;
    ringY += (curY - ringY) * 0.12;
    ring.style.left = ringX + 'px';
    ring.style.top  = ringY + 'px';
    requestAnimationFrame(animateRing);
}
animateRing();

document.querySelectorAll('a, button, .btn, .logo, .project-card').forEach(el => {
    el.addEventListener('mouseenter', () => {
        cursor.style.width  = '20px';
        cursor.style.height = '20px';
        ring.style.width    = '50px';
        ring.style.height   = '50px';
    });
    el.addEventListener('mouseleave', () => {
        cursor.style.width  = '10px';
        cursor.style.height = '10px';
        ring.style.width    = '32px';
        ring.style.height   = '32px';
    });
});

/* ── Mobile nav ─────────────────────────────── */
const sidemenu = document.getElementById('sidemenu');

function openmenu()  { sidemenu.style.right = '0'; }
function closemenu() { sidemenu.style.right = '-240px'; }

/* ── Grain texture ──────────────────────────── */
const canvas = document.createElement('canvas');
canvas.width  = 300;
canvas.height = 300;
canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9997;opacity:0.4;';

const ctx = canvas.getContext('2d');
const imageData = ctx.createImageData(300, 300);
for (let i = 0; i < imageData.data.length; i += 4) {
    const val = Math.random() * 255;
    imageData.data[i]     = val;
    imageData.data[i + 1] = val;
    imageData.data[i + 2] = val;
    imageData.data[i + 3] = 18;
}
ctx.putImageData(imageData, 0, 0);
document.body.appendChild(canvas);

/* ── Shared nav ─────────────────────────────── */
fetch('nav.html')
    .then(r => r.text())
    .then(html => {
        document.getElementById('nav-placeholder').innerHTML = html;
    });

    
