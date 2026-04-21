// src/utils/perspective.js

/**
 * 將平面設計圖透視變形貼到機台底圖上
 * @param {string} designDataUrl  - Fabric canvas 匯出的 base64 圖
 * @param {string} machineDataUrl - 機台底圖的 URL 或 base64
 * @param {object} perspective    - 四個角點 { topLeft, topRight, bottomLeft, bottomRight }
 * @returns {Promise<string>}     - 合成後的 base64 圖
 */
export function applyPerspective(designDataUrl, machineDataUrl, perspective) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const machineImg = new Image();
        machineImg.crossOrigin = 'anonymous';
        machineImg.onload = () => {
            // canvas 尺寸跟機台底圖一樣大
            canvas.width = machineImg.naturalWidth;
            canvas.height = machineImg.naturalHeight;

            // 先畫機台底圖
            ctx.drawImage(machineImg, 0, 0);

            // 再把設計圖透視變形貼上去
            const designImg = new Image();
            designImg.onload = () => {
                drawPerspective(ctx, designImg, perspective);
                resolve(canvas.toDataURL('image/png'));
            };
            designImg.onerror = reject;
            designImg.src = designDataUrl;
        };
        machineImg.onerror = reject;
        machineImg.src = machineDataUrl;
    });
}

/**
 * 用分割三角形的方式模擬透視變形
 * 原生 Canvas 2D 不支援透視，用小格網格近似
 */
function drawPerspective(ctx, img, { topLeft, topRight, bottomLeft, bottomRight }) {
    const STEPS = 20; // 格網細緻度，越高越精確但越慢

    const w = img.naturalWidth;
    const h = img.naturalHeight;

    for (let row = 0; row < STEPS; row++) {
        for (let col = 0; col < STEPS; col++) {
            // 來源圖的格子範圍（平面）
            const sx = (col / STEPS) * w;
            const sy = (row / STEPS) * h;
            const sw = w / STEPS;
            const sh = h / STEPS;

            // 目標四個角點（透視後）
            const r0 = row / STEPS;
            const r1 = (row + 1) / STEPS;
            const c0 = col / STEPS;
            const c1 = (col + 1) / STEPS;

            const tl = interpolate(topLeft, topRight, bottomLeft, bottomRight, c0, r0);
            const tr = interpolate(topLeft, topRight, bottomLeft, bottomRight, c1, r0);
            const bl = interpolate(topLeft, topRight, bottomLeft, bottomRight, c0, r1);
            const br = interpolate(topLeft, topRight, bottomLeft, bottomRight, c1, r1);

            // 用兩個三角形填滿每個格子
            drawTexturedTriangle(
                ctx,
                img,
                sx,
                sy,
                tl.x,
                tl.y,
                sx + sw,
                sy,
                tr.x,
                tr.y,
                sx,
                sy + sh,
                bl.x,
                bl.y
            );
            drawTexturedTriangle(
                ctx,
                img,
                sx + sw,
                sy,
                tr.x,
                tr.y,
                sx + sw,
                sy + sh,
                br.x,
                br.y,
                sx,
                sy + sh,
                bl.x,
                bl.y
            );
        }
    }
}

/**
 * 雙線性插值：根據 u(col) 和 v(row) 計算透視後座標
 */
function interpolate(tl, tr, bl, br, u, v) {
    return {
        x: (1 - u) * (1 - v) * tl.x + u * (1 - v) * tr.x + (1 - u) * v * bl.x + u * v * br.x,
        y: (1 - u) * (1 - v) * tl.y + u * (1 - v) * tr.y + (1 - u) * v * bl.y + u * v * br.y
    };
}

/**
 * Canvas 2D setTransform 貼三角形紋理
 * 參考：http://tulrich.com/geekstuff/canvas/jsgl.js
 */
function drawTexturedTriangle(
    ctx,
    img,
    x0s,
    y0s,
    x0d,
    y0d,
    x1s,
    y1s,
    x1d,
    y1d,
    x2s,
    y2s,
    x2d,
    y2d
) {
    ctx.save();

    // 建立剪裁三角形
    ctx.beginPath();
    ctx.moveTo(x0d, y0d);
    ctx.lineTo(x1d, y1d);
    ctx.lineTo(x2d, y2d);
    ctx.closePath();
    ctx.clip();

    // 計算仿射變換矩陣
    const denom = (x1s - x0s) * (y2s - y0s) - (x2s - x0s) * (y1s - y0s);
    if (Math.abs(denom) < 1e-8) {
        ctx.restore();
        return;
    }

    const m11 = ((x1d - x0d) * (y2s - y0s) - (x2d - x0d) * (y1s - y0s)) / denom;
    const m12 = ((x1d - x0d) * (x0s - x2s) + (x2d - x0d) * (x1s - x0s)) / denom; // 修正
    const m21 = ((y1d - y0d) * (y2s - y0s) - (y2d - y0d) * (y1s - y0s)) / denom;
    const m22 = ((y1d - y0d) * (x0s - x2s) + (y2d - y0d) * (x1s - x0s)) / denom; // 修正

    const dx = x0d - m11 * x0s - m21 * y0s;
    const dy = y0d - m12 * x0s - m22 * y0s; // 修正

    ctx.transform(m11, m12, m21, m22, dx, dy);
    ctx.drawImage(img, 0, 0);

    ctx.restore();
}
