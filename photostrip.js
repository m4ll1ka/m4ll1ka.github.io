// ─────────────────────────────────────────────────────────
//  photostrip.js  —  Photostrip screen, called by sketch.js when the user clicks Save
// ─────────────────────────────────────────────────────────

function showPhotostrip(imageDataURL) {
    // ── 1. Populate strip content ──────────────────────────
    let frame = document.getElementById('strip-image-frame');
    frame.innerHTML = '';

    let img = document.createElement('img');
    img.src = imageDataURL;
    img.alt = 'your gesture painting';
    frame.appendChild(img);

    // Set date stamp
    let now = new Date();
    document.getElementById('strip-date').textContent =
        now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

    // ── 2. Show the photostrip screen ─────────────────────
    document.getElementById('tool-header').classList.add('hidden');
    document.getElementById('tool-body').classList.add('hidden');
    document.getElementById('photostrip-screen').classList.remove('hidden');

    // ── 3. Wire up action buttons ─────────────────────────

    // Download: render the full strip (machine + photo) to a canvas and save it
    document.getElementById('download-btn').onclick = () => downloadStrip(imageDataURL);

    // Copy link: copy a placeholder message (no real server, so we copy the data URL)
    document.getElementById('share-btn').onclick = () => {
        copyToClipboard(imageDataURL);
        let btn = document.getElementById('share-btn');
        btn.textContent = '✓ copied!';
        setTimeout(() => { btn.textContent = '🔗 copy link'; }, 2000);
    };

    // Back: return to drawing screen (keep the drawing intact)
    document.getElementById('back-btn').onclick = () => {
        document.getElementById('photostrip-screen').classList.add('hidden');
        document.getElementById('tool-header').classList.remove('hidden');
        document.getElementById('tool-body').classList.remove('hidden');
    };
}

// ── Download the photostrip as a PNG ──────────────────────
function downloadStrip(imageDataURL) {
    // Build a canvas that looks like the photostrip
    let STRIP_W = 560;
    let IMAGE_H = Math.round(STRIP_W * (3/4));  // 4:3 ratio
    let PADDING  = 28;
    let HEADER_H = 44;
    let FOOTER_H = 40;
    let TOTAL_H  = HEADER_H + IMAGE_H + FOOTER_H + PADDING * 2;

    let c = document.createElement('canvas');
    c.width  = STRIP_W;
    c.height = TOTAL_H;
    let ctx = c.getContext('2d');

    // Background — cream film
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, STRIP_W, TOTAL_H);

    // Top border stripe
    ctx.fillStyle = '#c8a96e';
    ctx.fillRect(0, 0, STRIP_W, 4);

    // Header text
    ctx.fillStyle = '#c8a96e';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.letterSpacing = '2px';
    ctx.fillText('GESTURE PAINT™', PADDING, PADDING + 14);

    let now = new Date();
    let dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    ctx.fillStyle = '#999';
    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(dateStr, STRIP_W - PADDING, PADDING + 14);
    ctx.textAlign = 'left';

    // Dashed header divider
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#d4c9b0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING, PADDING + 20);
    ctx.lineTo(STRIP_W - PADDING, PADDING + 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // Image — with a border
    let imgY = PADDING + HEADER_H;
    let imgW = STRIP_W - PADDING * 2;

    ctx.strokeStyle = '#c8b99a';
    ctx.lineWidth = 4;
    ctx.strokeRect(PADDING - 2, imgY - 2, imgW + 4, IMAGE_H + 4);

    // Draw the captured painting
    let paintImg = new Image();
    paintImg.onload = () => {
        ctx.drawImage(paintImg, PADDING, imgY, imgW, IMAGE_H);

        // Footer dashed line
        let footerY = imgY + IMAGE_H + 10;
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#d4c9b0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PADDING, footerY);
        ctx.lineTo(STRIP_W - PADDING, footerY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Sprocket holes (decorative rectangles)
        let sprocketY = footerY + 12;
        ctx.strokeStyle = '#d4c9b0';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(PADDING, sprocketY, 20, 14);
        ctx.strokeRect(STRIP_W - PADDING - 20, sprocketY, 20, 14);

        // Footer tagline
        ctx.fillStyle = '#aaa';
        ctx.font = '12px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('✦ made with your hands ✦', STRIP_W / 2, sprocketY + 11);

        // Bottom border stripe
        ctx.fillStyle = '#c8a96e';
        ctx.fillRect(0, TOTAL_H - 4, STRIP_W, 4);

        // Trigger download
        let link = document.createElement('a');
        link.download = 'gesture-paint-' + Date.now() + '.png';
        link.href = c.toDataURL('image/png');
        link.click();
    };
    paintImg.src = imageDataURL;
}

// ── Utility: copy text to clipboard ───────────────────────
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    let ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
}
