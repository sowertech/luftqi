// src/composables/useCanvas.js
import { ref, computed } from 'vue';

const DEG = Math.PI / 180;
const HANDLE_SIZE = 8;
const ROTATE_OFFSET = 24;
const MIN_SIZE = 20;

function rotatePoint(cx, cy, x, y, angleDeg) {
    const rad = angleDeg * DEG;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
        x: cos * (x - cx) - sin * (y - cy) + cx,
        y: sin * (x - cx) + cos * (y - cy) + cy
    };
}

function localPoint(obj, px, py) {
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;
    return rotatePoint(cx, cy, px, py, -obj.rotation);
}

function hitTest(obj, px, py) {
    const lp = localPoint(obj, px, py);
    return (
        lp.x >= obj.x && lp.x <= obj.x + obj.width && lp.y >= obj.y && lp.y <= obj.y + obj.height
    );
}

function getHandles(obj) {
    const { x, y, width, height, rotation } = obj;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const corners = [
        { id: 'tl', lx: x, ly: y },
        { id: 'tr', lx: x + width, ly: y },
        { id: 'br', lx: x + width, ly: y + height },
        { id: 'bl', lx: x, ly: y + height }
    ];
    const rotHandle = rotatePoint(cx, cy, cx, y - ROTATE_OFFSET, rotation);
    return {
        corners: corners.map((c) => {
            const p = rotatePoint(cx, cy, c.lx, c.ly, rotation);
            return { id: c.id, x: p.x, y: p.y };
        }),
        rotate: { id: 'rotate', x: rotHandle.x, y: rotHandle.y }
    };
}

function hitHandle(handles, px, py, radius = HANDLE_SIZE + 2) {
    for (const h of handles.corners) {
        const dx = h.x - px;
        const dy = h.y - py;
        if (dx * dx + dy * dy <= radius * radius) return h.id;
    }
    const dr = handles.rotate;
    const dx = dr.x - px;
    const dy = dr.y - py;
    if (dx * dx + dy * dy <= (radius + 2) * radius) return 'rotate';
    return null;
}

function measureText(obj, ctx) {
    ctx.font = buildFontStyle(obj);
    const lines = obj.text.split('\n');
    const lineH = obj.fontSize * 1.2;
    let maxW = 0;
    lines.forEach((line) => {
        const w = ctx.measureText(line).width;
        if (w > maxW) maxW = w;
    });
    return { width: Math.max(maxW, MIN_SIZE), height: lineH * lines.length };
}

function buildFontStyle(obj) {
    return [
        obj.italic ? 'italic' : '',
        obj.bold ? 'bold' : '',
        `${obj.fontSize}px`,
        `"${obj.fontFamily}"`
    ]
        .filter(Boolean)
        .join(' ');
}

function renderObject(ctx, obj) {
    ctx.save();
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(obj.rotation * DEG);
    ctx.globalAlpha = obj.opacity ?? 1;

    if (obj.type === 'text') {
        ctx.font = buildFontStyle(obj);
        ctx.fillStyle = obj.color ?? '#000000';
        ctx.textBaseline = 'top';
        const lines = obj.text.split('\n');
        const lineH = obj.fontSize * 1.2;
        lines.forEach((line, i) => {
            ctx.fillText(line, -obj.width / 2, -obj.height / 2 + i * lineH);
        });
    }

    if (obj.type === 'image' && obj.imageEl) {
        const b = obj.brightness ?? 0;
        const c = obj.contrast ?? 0;
        ctx.filter = `brightness(${100 + b}%) contrast(${100 + c}%)`;
        ctx.drawImage(obj.imageEl, -obj.width / 2, -obj.height / 2, obj.width, obj.height);
        ctx.filter = 'none';
    }

    ctx.restore();
}

function renderSelection(ctx, obj) {
    ctx.save();
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(obj.rotation * DEG);
    ctx.strokeStyle = 'rgba(60, 130, 191, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(-obj.width / 2 - 2, -obj.height / 2 - 2, obj.width + 4, obj.height + 4);
    ctx.setLineDash([]);
    ctx.restore();

    const handles = getHandles(obj);
    handles.corners.forEach((h) => {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'rgb(60, 130, 191)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(h.x - HANDLE_SIZE / 2, h.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    });

    const rh = handles.rotate;
    ctx.save();
    ctx.fillStyle = 'rgb(60, 130, 191)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rh.x, rh.y, HANDLE_SIZE / 2 + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const tl = handles.corners.find((h) => h.id === 'tl');
    const tr = handles.corners.find((h) => h.id === 'tr');
    ctx.save();
    ctx.strokeStyle = 'rgb(60, 130, 191)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo((tl.x + tr.x) / 2, (tl.y + tr.y) / 2);
    ctx.lineTo(rh.x, rh.y);
    ctx.stroke();
    ctx.restore();
}

export function useCanvas() {
    const canvasEl = ref(null);
    const objects = ref([]);
    const selectedId = ref(null);
    const isProductLoaded = ref(false);
    const zoomLevel = ref(100);

    // ★ 背景固定透明，不再需要 canvasBackground 狀態
    const canvasBackground = ref('transparent');
    const isTransparent = computed(() => true);

    let ctx = null;
    let nextId = 1;
    let _onSelectCallback = null;

    const onSelectChange = (cb) => {
        _onSelectCallback = cb;
    };
    const _notifySelect = (obj) => {
        if (_onSelectCallback) _onSelectCallback(obj);
    };

    // ─── 核心渲染 ─────────────────────────────────
    const render = () => {
        if (!canvasEl.value || !ctx) return;
        const w = canvasEl.value.width;
        const h = canvasEl.value.height;

        // ★ 完全清除，不填任何底色 → canvas 本身透明
        ctx.clearRect(0, 0, w, h);

        // 繪製所有物件
        for (const obj of objects.value) {
            renderObject(ctx, obj);
        }

        // 繪製選取框
        const sel = getSelected();
        if (sel) renderSelection(ctx, sel);
    };

    // ─── 背景 API（保留相容介面，實際不作用）─────
    const setBackground = () => {
        render();
    };
    const setTransparent = () => {
        render();
    };
    const setCanvasBackground = () => {
        render();
    };

    // ─── 初始化 ───────────────────────────────────
    const initCanvas = (canvasId, width = 800, height = 600) => {
        const el = document.getElementById(canvasId);
        if (!el) {
            console.warn(`[useCanvas] 找不到 id="${canvasId}" 的 canvas 元素`);
            return;
        }
        canvasEl.value = el;
        el.width = width;
        el.height = height;
        ctx = el.getContext('2d');
        _attachEvents(el);
        render();
    };

    const resizeCanvas = (width, height) => {
        if (!canvasEl.value) return;
        canvasEl.value.width = width;
        canvasEl.value.height = height;
        render();
    };

    const clampObjects = (width, height) => {
        for (const obj of objects.value) {
            if (obj.x < 0) obj.x = 0;
            if (obj.y < 0) obj.y = 0;
            if (obj.x + obj.width > width) obj.x = Math.max(0, width - obj.width);
            if (obj.y + obj.height > height) obj.y = Math.max(0, height - obj.height);
        }
        render();
    };

    // ─── 選取 ─────────────────────────────────────
    const getSelected = () => objects.value.find((o) => o.id === selectedId.value) ?? null;
    const selectObject = (id) => {
        selectedId.value = id;
        _notifySelect(getSelected());
        render();
    };
    const clearSelection = () => {
        selectedId.value = null;
        _notifySelect(null);
        render();
    };

    // ─── 新增物件 ─────────────────────────────────
    const addText = (text, config = {}) => {
        if (!ctx) return;
        const obj = {
            id: nextId++,
            type: 'text',
            text,
            fontFamily: config.fontFamily ?? 'Microsoft JhengHei',
            fontSize: config.fontSize ?? 40,
            color: config.color ?? '#000000',
            bold: config.bold ?? false,
            italic: config.italic ?? false,
            x: config.x ?? 100,
            y: config.y ?? 100,
            width: 0,
            height: 0,
            rotation: 0,
            opacity: 1,
            scaleX: 1,
            scaleY: 1
        };
        const size = measureText(obj, ctx);
        obj.width = size.width;
        obj.height = size.height;
        objects.value.push(obj);
        selectedId.value = obj.id;
        _notifySelect(obj);
        render();
    };

    const addImage = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const maxW = canvasEl.value?.width ?? 800;
                const maxH = canvasEl.value?.height ?? 600;
                let w = img.naturalWidth;
                let h = img.naturalHeight;
                const ratio = w / h;
                if (w > maxW * 0.7) {
                    w = maxW * 0.7;
                    h = w / ratio;
                }
                if (h > maxH * 0.7) {
                    h = maxH * 0.7;
                    w = h * ratio;
                }
                const obj = {
                    id: nextId++,
                    type: 'image',
                    imageEl: img,
                    x: (maxW - w) / 2,
                    y: (maxH - h) / 2,
                    width: w,
                    height: h,
                    rotation: 0,
                    opacity: 1,
                    scaleX: 1,
                    scaleY: 1,
                    brightness: 0,
                    contrast: 0
                };
                objects.value.push(obj);
                selectedId.value = obj.id;
                _notifySelect(obj);
                render();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    // ─── 刪除 / 清空 ──────────────────────────────
    const deleteSelected = () => {
        if (!selectedId.value) return;
        objects.value = objects.value.filter((o) => o.id !== selectedId.value);
        clearSelection();
    };

    const clearCanvas = () => {
        objects.value = [];
        clearSelection();
    };

    // ─── 更新屬性 ─────────────────────────────────
    const updateSelected = (patch) => {
        const obj = getSelected();
        if (!obj) return;
        Object.assign(obj, patch);
        const textProps = ['text', 'fontSize', 'fontFamily', 'bold', 'italic'];
        if (obj.type === 'text' && ctx && textProps.some((k) => k in patch)) {
            const size = measureText(obj, ctx);
            obj.width = size.width;
            obj.height = size.height;
        }
        _notifySelect(obj);
        render();
    };

    // ─── 圖層 ─────────────────────────────────────
    const bringToFront = (id) => {
        const idx = objects.value.findIndex((o) => o.id === id);
        if (idx < 0 || idx === objects.value.length - 1) return;
        const [obj] = objects.value.splice(idx, 1);
        objects.value.push(obj);
        render();
    };

    const sendToBack = (id) => {
        const idx = objects.value.findIndex((o) => o.id === id);
        if (idx <= 0) return;
        const [obj] = objects.value.splice(idx, 1);
        objects.value.unshift(obj);
        render();
    };

    // ─── 匯出 ─────────────────────────────────────

    /**
     * 匯出純設計圖 PNG（透明背景，僅設計內容）
     */
    const exportToPng = (multiplier = 2) => {
        if (!canvasEl.value || !ctx) return '';
        const w = canvasEl.value.width;
        const h = canvasEl.value.height;
        const off = document.createElement('canvas');
        off.width = w * multiplier;
        off.height = h * multiplier;
        const offCtx = off.getContext('2d');
        offCtx.scale(multiplier, multiplier);
        // ★ 不填底色，保持透明
        for (const obj of objects.value) renderObject(offCtx, obj);
        return off.toDataURL('image/png');
    };

    /**
     * 匯出合成圖 PNG（機台底圖 + 設計圖，無場景）
     * @param {string} machineImageSrc - 機台圖片 URL
     * @param {object} printArea       - { left, top, width, height }（相對於 stage）
     * @param {object} stageSize       - { width, height }（stage 尺寸，預設 800×600）
     * @param {number} multiplier      - 輸出倍率
     * @returns {Promise<string>}       - DataURL
     */
    const exportComposite = (
        machineImageSrc,
        printArea,
        stageSize = { width: 800, height: 600 },
        multiplier = 2
    ) => {
        return new Promise((resolve) => {
            if (!canvasEl.value) return resolve('');

            const { width: stageW, height: stageH } = stageSize;
            const off = document.createElement('canvas');
            off.width = stageW * multiplier;
            off.height = stageH * multiplier;
            const offCtx = off.getContext('2d');
            offCtx.scale(multiplier, multiplier);

            const drawDesign = () => {
                // ② 將設計內容繪製到印刷區域位置
                offCtx.save();
                offCtx.translate(printArea.left, printArea.top);

                // 將 canvas 內容縮放貼到 printArea
                const scaleX = printArea.width / canvasEl.value.width;
                const scaleY = printArea.height / canvasEl.value.height;
                offCtx.scale(scaleX, scaleY);

                // 暫時清除選取後截圖
                const prevId = selectedId.value;
                selectedId.value = null;
                render();

                for (const obj of objects.value) renderObject(offCtx, obj);

                // 還原選取
                selectedId.value = prevId;
                render();

                offCtx.restore();
                resolve(off.toDataURL('image/png'));
            };

            if (machineImageSrc) {
                // ① 先畫機台底圖
                const machineImg = new Image();
                machineImg.crossOrigin = 'anonymous';
                machineImg.onload = () => {
                    offCtx.drawImage(machineImg, 0, 0, stageW, stageH);
                    drawDesign();
                };
                machineImg.onerror = () => {
                    // 機台圖載入失敗 → 只輸出設計圖
                    drawDesign();
                };
                machineImg.src = machineImageSrc;
            } else {
                drawDesign();
            }
        });
    };

    /**
     * 匯出 JPG（透明補白底）
     */
    const exportToJpg = (quality = 0.92, multiplier = 2) => {
        if (!canvasEl.value || !ctx) return '';
        const w = canvasEl.value.width;
        const h = canvasEl.value.height;
        const off = document.createElement('canvas');
        off.width = w * multiplier;
        off.height = h * multiplier;
        const offCtx = off.getContext('2d');
        offCtx.scale(multiplier, multiplier);
        offCtx.fillStyle = '#ffffff';
        offCtx.fillRect(0, 0, w, h);
        for (const obj of objects.value) renderObject(offCtx, obj);
        return off.toDataURL('image/jpeg', quality);
    };

    const downloadImage = (format = 'png', filename = 'design') => {
        const url = format === 'jpg' ? exportToJpg() : exportToPng();
        if (!url) return;
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.${format}`;
        a.click();
    };

    const getPreviewUrl = () => {
        if (!canvasEl.value) return '';
        const prevId = selectedId.value;
        selectedId.value = null;
        render();
        const url = canvasEl.value.toDataURL('image/png');
        selectedId.value = prevId;
        render();
        return url;
    };

    // ─── 去背 ─────────────────────────────────────
    const removeBackground = async (options = {}) => {
        const obj = getSelected();
        if (!obj || obj.type !== 'image') return { success: false, error: '請先選取一張圖片' };
        const { tolerance = 35, feather = 6, samplingCorners = true } = options;
        return new Promise((resolve) => {
            try {
                const srcImg = obj.imageEl;
                const w = srcImg.naturalWidth;
                const h = srcImg.naturalHeight;
                const off = document.createElement('canvas');
                off.width = w;
                off.height = h;
                const offCtx = off.getContext('2d');
                offCtx.drawImage(srcImg, 0, 0);
                const imageData = offCtx.getImageData(0, 0, w, h);
                const data = imageData.data;
                let bgR = 255,
                    bgG = 255,
                    bgB = 255;
                if (samplingCorners) {
                    const samples = [];
                    const sampleAt = (sx, sy) => {
                        for (let dy = 0; dy < 3; dy++) {
                            for (let dx = 0; dx < 3; dx++) {
                                const nx = Math.min(sx + dx, w - 1);
                                const ny = Math.min(sy + dy, h - 1);
                                const idx = (ny * w + nx) * 4;
                                if (data[idx + 3] > 10)
                                    samples.push([data[idx], data[idx + 1], data[idx + 2]]);
                            }
                        }
                    };
                    sampleAt(0, 0);
                    sampleAt(w - 3, 0);
                    sampleAt(0, h - 3);
                    sampleAt(w - 3, h - 3);
                    if (samples.length === 0)
                        return resolve({ success: false, error: '此圖片已經是去背圖片' });
                    bgR = Math.round(samples.reduce((s, c) => s + c[0], 0) / samples.length);
                    bgG = Math.round(samples.reduce((s, c) => s + c[1], 0) / samples.length);
                    bgB = Math.round(samples.reduce((s, c) => s + c[2], 0) / samples.length);
                }
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] === 0) continue;
                    const r = data[i],
                        g = data[i + 1],
                        b = data[i + 2];
                    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
                    if (dist <= tolerance) {
                        data[i + 3] = 0;
                    } else if (dist <= tolerance + feather) {
                        data[i + 3] = Math.round(
                            ((dist - tolerance) / feather) * (data[i + 3] ?? 255)
                        );
                    }
                }
                offCtx.putImageData(imageData, 0, 0);
                const newImg = new Image();
                newImg.onload = () => {
                    obj.imageEl = newImg;
                    render();
                    resolve({ success: true });
                };
                newImg.onerror = () => resolve({ success: false, error: '圖片重建失敗' });
                newImg.src = off.toDataURL('image/png');
            } catch (err) {
                resolve({ success: false, error: err.message });
            }
        });
    };

    // ─── 滑鼠事件 ─────────────────────────────────
    let _dragState = null;

    const _getPos = (el, e) => {
        const rect = el.getBoundingClientRect();
        const scaleX = el.width / rect.width;
        const scaleY = el.height / rect.height;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    const _attachEvents = (el) => {
        el.addEventListener('mousedown', _onMouseDown);
        el.addEventListener('mousemove', _onMouseMove);
        el.addEventListener('mouseup', _onMouseUp);
        el.addEventListener('mouseleave', _onMouseUp);
        el.addEventListener('touchstart', _onTouchStart, { passive: false });
        el.addEventListener('touchmove', _onTouchMove, { passive: false });
        el.addEventListener('touchend', _onMouseUp);
    };

    const _touchToMouse = (e) => {
        e.preventDefault();
        return e.touches[0];
    };
    const _onTouchStart = (e) => _onMouseDown(_touchToMouse(e));
    const _onTouchMove = (e) => _onMouseMove(_touchToMouse(e));

    const _onMouseDown = (e) => {
        const pos = _getPos(canvasEl.value, e);
        const sel = getSelected();
        if (sel) {
            const handles = getHandles(sel);
            const hit = hitHandle(handles, pos.x, pos.y);
            if (hit) {
                _dragState = {
                    type: hit === 'rotate' ? 'rotate' : 'resize',
                    handle: hit,
                    startX: pos.x,
                    startY: pos.y,
                    objId: sel.id,
                    origObj: { ...sel }
                };
                return;
            }
        }
        let found = null;
        for (let i = objects.value.length - 1; i >= 0; i--) {
            if (hitTest(objects.value[i], pos.x, pos.y)) {
                found = objects.value[i];
                break;
            }
        }
        if (found) {
            if (selectedId.value !== found.id) {
                selectedId.value = found.id;
                _notifySelect(found);
                render();
            }
            _dragState = {
                type: 'move',
                startX: pos.x,
                startY: pos.y,
                objId: found.id,
                origObj: { ...found }
            };
        } else {
            clearSelection();
        }
    };

    const _onMouseMove = (e) => {
        if (!_dragState) return;
        const pos = _getPos(canvasEl.value, e);
        const obj = objects.value.find((o) => o.id === _dragState.objId);
        if (!obj) return;
        const dx = pos.x - _dragState.startX;
        const dy = pos.y - _dragState.startY;
        const orig = _dragState.origObj;
        switch (_dragState.type) {
            case 'move':
                obj.x = orig.x + dx;
                obj.y = orig.y + dy;
                _notifySelect(obj);
                break;
            case 'rotate': {
                const cx = orig.x + orig.width / 2;
                const cy = orig.y + orig.height / 2;
                const angle = Math.atan2(pos.y - cy, pos.x - cx) * (180 / Math.PI) + 90;
                obj.rotation = ((Math.round(angle) % 360) + 360) % 360;
                _notifySelect(obj);
                break;
            }
            case 'resize':
                _doResize(obj, orig, _dragState.handle, pos);
                break;
        }
        render();
    };

    const _onMouseUp = () => {
        _dragState = null;
    };

    const _doResize = (obj, orig, handle, pos) => {
        const cx = orig.x + orig.width / 2;
        const cy = orig.y + orig.height / 2;
        const local = rotatePoint(cx, cy, pos.x, pos.y, -orig.rotation);
        const anchorMap = {
            tl: { ax: orig.x + orig.width, ay: orig.y + orig.height },
            tr: { ax: orig.x, ay: orig.y + orig.height },
            br: { ax: orig.x, ay: orig.y },
            bl: { ax: orig.x + orig.width, ay: orig.y }
        };
        const { ax, ay } = anchorMap[handle];
        let newX, newY, newW, newH;
        switch (handle) {
            case 'br':
                newW = Math.max(MIN_SIZE, local.x - ax);
                newH = Math.max(MIN_SIZE, local.y - ay);
                newX = ax;
                newY = ay;
                break;
            case 'bl':
                newW = Math.max(MIN_SIZE, ax - local.x);
                newH = Math.max(MIN_SIZE, local.y - ay);
                newX = ax - newW;
                newY = ay;
                break;
            case 'tr':
                newW = Math.max(MIN_SIZE, local.x - ax);
                newH = Math.max(MIN_SIZE, ay - local.y);
                newX = ax;
                newY = ay - newH;
                break;
            case 'tl':
                newW = Math.max(MIN_SIZE, ax - local.x);
                newH = Math.max(MIN_SIZE, ay - local.y);
                newX = ax - newW;
                newY = ay - newH;
                break;
        }
        const worldCenter = rotatePoint(cx, cy, newX + newW / 2, newY + newH / 2, orig.rotation);
        obj.width = newW;
        obj.height = newH;
        obj.x = worldCenter.x - newW / 2;
        obj.y = worldCenter.y - newH / 2;
        _notifySelect(obj);
    };

    const registerZoomChangeCallback = () => {};

    return {
        canvasEl,
        objects,
        selectedId,
        canvasBackground,
        isTransparent,
        isProductLoaded,
        zoomLevel,
        initCanvas,
        onSelectChange,
        getSelected,
        selectObject,
        clearSelection,
        addText,
        addImage,
        deleteSelected,
        clearCanvas,
        updateSelected,
        bringToFront,
        sendToBack,
        setBackground,
        setTransparent,
        setCanvasBackground,
        resizeCanvas,
        clampObjects,
        exportToPng,
        exportToJpg,
        exportComposite,
        downloadImage,
        getPreviewUrl,
        removeBackground,
        render,
        registerZoomChangeCallback
    };
}
