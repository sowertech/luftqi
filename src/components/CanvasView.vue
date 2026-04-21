<!-- src/components/CanvasView.vue -->
<template>
    <div class="p-canvas-container">
        <div class="canvas-content">
            <!-- ══════════════════════════════════════
                 Toolbar
            ══════════════════════════════════════ -->
            <div v-if="hasMachine" class="canvas-toolbar">
                <div class="toolbar-group">
                    <button class="toolbar-btn" title="放大 (Ctrl +)" @click="handleZoomIn">
                        <i class="fas fa-search-plus"></i>
                    </button>
                    <button class="toolbar-btn" title="縮小 (Ctrl -)" @click="handleZoomOut">
                        <i class="fas fa-search-minus"></i>
                    </button>
                    <div class="zoom-display">{{ localZoom }}%</div>
                    <button class="toolbar-btn" title="重設縮放 (100%)" @click="handleResetZoom">
                        <i class="fas fa-compress-arrows-alt"></i>
                    </button>
                    <!-- ★ toolbar-divider 與 bg-control 已完整移除 -->
                </div>
                <div class="toolbar-group">
                    <button class="toolbar-btn" title="預覽" @click="$emit('open-preview')">
                        <i class="fas fa-eye"></i>
                        <span class="btn-label">預覽</span>
                    </button>
                    <div class="toolbar-divider"></div>
                    <button
                        class="toolbar-btn toolbar-btn--danger"
                        title="刪除選取 (Delete)"
                        @click="$emit('delete-selected')"
                    >
                        <i class="fas fa-trash-alt"></i>
                    </button>
                    <button
                        class="toolbar-btn toolbar-btn--danger"
                        title="清空畫布"
                        @click="handleClearCanvas"
                    >
                        <i class="fas fa-eraser"></i>
                    </button>
                </div>
            </div>

            <!-- ══════════════════════════════════════
                 Canvas 區域
            ══════════════════════════════════════ -->
            <div
                ref="wrapperRef"
                class="canvas-wrapper"
                :class="{ 'canvas-wrapper--no-machine': !hasMachine }"
                @wheel.prevent="handleWheel"
            >
                <!-- 未選機台 -->
                <div v-if="!hasMachine" class="canvas-empty-state">
                    <div class="empty-state-content">
                        <i class="fas fa-box-open"></i>
                        <h3>請先選擇機台</h3>
                        <p>從左側選擇一款機台，即可開始設計</p>
                    </div>
                </div>

                <!-- 已選機台 -->
                <template v-else>
                    <div class="canvas-centering">
                        <div ref="zoomTargetRef" class="zoom-target" :style="zoomTargetStyle">
                            <div class="machine-stage" :style="stageStyle">
                                <!-- ★ 場景背景：machine-stage 最底層，z-index: 0 -->
                                <div
                                    v-if="sceneLayerVisible"
                                    class="scene-bg-layer"
                                    :style="sceneLayerStyle"
                                />

                                <!-- 機台圖片 z-index: 1 -->
                                <img
                                    v-if="machineImageLoaded && currentMachineImage"
                                    class="machine-base-img"
                                    :src="currentMachineImage"
                                    alt="機台底圖"
                                    draggable="false"
                                />
                                <div
                                    v-else-if="!machineImageLoaded && currentMachineImage"
                                    class="machine-placeholder"
                                >
                                    <i class="fas fa-image"></i>
                                    <span>機台圖載入中...</span>
                                </div>
                                <div v-else-if="machineImageError" class="machine-error">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <span>機台圖無法載入</span>
                                </div>

                                <!-- 印刷區域 z-index: 2 -->
                                <div class="canvas-print-area" :style="printAreaStyle">
                                    <canvas
                                        id="main-canvas"
                                        ref="canvasRef"
                                        class="design-canvas"
                                    ></canvas>
                                </div>

                                <!-- 印刷區域邊框 z-index: 3 -->
                                <div class="print-area-border" :style="printAreaStyle"></div>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
    import { confirmDanger } from '../utils/swal.js';
    import { SCENES, PRODUCTS_CONFIG } from '../config/products';

    // ═══════════════════════════════════════════════════
    //  常數
    // ═══════════════════════════════════════════════════
    const ZOOM_STEP = 10;
    const ZOOM_MIN = 20;
    const ZOOM_MAX = 300;
    const ZOOM_DEFAULT = 100;
    const STAGE_PADDING = 80;

    /**
     * 場景背景基準縮放比例
     * 當 zoom = SCENE_BASE_SCALE * 100 (25%) 時，場景背景剛好填滿 wrapper
     * zoom 越大，背景越大（zoom in 效果）
     */
    const SCENE_BASE_SCALE = 0.25;

    // ═══════════════════════════════════════════════════
    //  Props
    // ═══════════════════════════════════════════════════
    const props = defineProps({
        zoomLevel: { type: Number, default: null },
        selectedMachine: { type: String, default: null },
        sceneBackground: { type: String, default: null },
        selectedObjectType: { type: String, default: null }
    });

    // ═══════════════════════════════════════════════════
    //  Emits
    // ═══════════════════════════════════════════════════
    const emit = defineEmits([
        'canvas-ready',
        'zoom-in',
        'zoom-out',
        'fit-screen',
        'reset-view',
        'clear-canvas',
        'delete-selected',
        'open-preview',
        'update:zoom-level'
    ]);

    // ═══════════════════════════════════════════════════
    //  Template Refs
    // ═══════════════════════════════════════════════════
    const wrapperRef = ref(null);
    const zoomTargetRef = ref(null);
    const canvasRef = ref(null);

    // ═══════════════════════════════════════════════════
    //  機台判斷
    // ═══════════════════════════════════════════════════
    const hasMachine = computed(
        () => props.selectedMachine !== null && props.selectedMachine !== undefined
    );

    // ═══════════════════════════════════════════════════
    //  產品設定
    // ═══════════════════════════════════════════════════
    const currentProductConfig = computed(() => {
        if (!props.selectedMachine || props.selectedMachine === 'pure') return null;
        return PRODUCTS_CONFIG[props.selectedMachine] ?? null;
    });

    // ═══════════════════════════════════════════════════
    //  Stage 尺寸（固定 800×600）
    // ═══════════════════════════════════════════════════
    const STAGE_W = 800;
    const STAGE_H = 600;

    const stageStyle = computed(() => ({
        width: `${STAGE_W}px`,
        height: `${STAGE_H}px`
    }));

    // ═══════════════════════════════════════════════════
    //  印刷區域
    // ═══════════════════════════════════════════════════
    const PRINT_W = 250;
    const PRINT_H = Math.round((PRINT_W * 52) / 48);

    const DEFAULT_PRINT_AREA = {
        left: Math.round((STAGE_W - PRINT_W) / 2),
        top: Math.round((STAGE_H - PRINT_H) / 2),
        width: PRINT_W,
        height: PRINT_H
    };

    const printArea = computed(() => currentProductConfig.value?.printArea ?? DEFAULT_PRINT_AREA);

    const printAreaStyle = computed(() => ({
        left: `${printArea.value.left}px`,
        top: `${printArea.value.top}px`,
        width: `${printArea.value.width}px`,
        height: `${printArea.value.height}px`
    }));

    // ═══════════════════════════════════════════════════
    //  縮放狀態
    // ═══════════════════════════════════════════════════
    const _internalZoom = ref(ZOOM_DEFAULT);

    const localZoom = computed({
        get: () => props.zoomLevel ?? _internalZoom.value,
        set: (val) => {
            const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(val)));
            _internalZoom.value = clamped;
            emit('update:zoom-level', clamped);
        }
    });

    const scale = computed(() => localZoom.value / 100);

    const zoomTargetStyle = computed(() => ({
        width: `${STAGE_W}px`,
        height: `${STAGE_H}px`,
        transform: `scale(${scale.value})`,
        transformOrigin: 'center center',
        willChange: 'transform',
        transition: 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    }));

    // ── 縮放操作 ──────────────────────────────────────
    const handleZoomIn = () => {
        localZoom.value = localZoom.value + ZOOM_STEP;
        emit('zoom-in');
    };

    const handleZoomOut = () => {
        localZoom.value = localZoom.value - ZOOM_STEP;
        emit('zoom-out');
    };

    const handleResetZoom = () => {
        localZoom.value = ZOOM_DEFAULT;
        emit('reset-view');
    };

    const handleFitScreen = () => {
        if (!wrapperRef.value) return;
        const wrapperW = wrapperRef.value.clientWidth - STAGE_PADDING * 2;
        const wrapperH = wrapperRef.value.clientHeight - STAGE_PADDING * 2;
        const fitScale = Math.min(wrapperW / STAGE_W, wrapperH / STAGE_H, 1);
        localZoom.value = Math.round(fitScale * 100);
        emit('fit-screen');
    };

    const handleWheel = (e) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        localZoom.value = localZoom.value + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP);
    };

    // 同步外部 zoomLevel prop
    watch(
        () => props.zoomLevel,
        (val) => {
            if (val !== null && val !== undefined) {
                _internalZoom.value = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, val));
            }
        }
    );

    // ═══════════════════════════════════════════════════
    //  Wrapper 尺寸偵測（供場景背景計算使用）
    // ═══════════════════════════════════════════════════
    const wrapperWidth = ref(0);
    const wrapperHeight = ref(0);
    let resizeObserver = null;

    // ═══════════════════════════════════════════════════
    //  場景背景
    //
    //  scene-bg-layer 放在 machine-stage 內（z-index:0），
    //  尺寸 = wrapper 尺寸 / SCENE_BASE_SCALE，
    //  這樣 scale = SCENE_BASE_SCALE(0.25) 時視覺剛好填滿 wrapper，
    //  scale 越大背景越大，產生 zoom-in 效果。
    // ═══════════════════════════════════════════════════
    const sceneLayerVisible = computed(() => {
        // 有場景圖才顯示場景層，網格改由 canvas-wrapper 負責
        return !!SCENES.find((s) => s.id === props.sceneBackground);
    });

    const sceneLayerStyle = computed(() => {
        if (!sceneLayerVisible.value) return {};

        const scene = SCENES.find((s) => s.id === props.sceneBackground);
        const w = wrapperWidth.value || STAGE_W;
        const h = wrapperHeight.value || STAGE_H;
        const layerW = Math.ceil(w / SCENE_BASE_SCALE);
        const layerH = Math.ceil(h / SCENE_BASE_SCALE);
        return {
            position: 'absolute',
            width: `${layerW}px`,
            height: `${layerH}px`,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundImage: `url(${scene.url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            zIndex: '0',
            pointerEvents: 'none',
            transition: 'background-image 0.25s ease'
        };
    });

    // ═══════════════════════════════════════════════════
    //  機台圖片載入
    // ═══════════════════════════════════════════════════
    const currentMachineImage = computed(() => currentProductConfig.value?.baseImage ?? null);
    const machineImageLoaded = ref(false);
    const machineImageError = ref(false);

    watch(
        currentMachineImage,
        (url) => {
            machineImageLoaded.value = false;
            machineImageError.value = false;
            if (!url) return;

            const img = new Image();
            img.onload = () => {
                machineImageLoaded.value = true;
            };
            img.onerror = () => {
                machineImageError.value = true;
            };
            img.src = url;
        },
        { immediate: true }
    );

    // ═══════════════════════════════════════════════════
    //  清空畫布
    // ═══════════════════════════════════════════════════
    const handleClearCanvas = async () => {
        const { isConfirmed } = await confirmDanger(
            '清空畫布',
            '確定要清空畫布嗎？所有內容將被刪除。',
            '確定清空'
        );
        if (isConfirmed) emit('clear-canvas');
    };

    // ═══════════════════════════════════════════════════
    //  鍵盤快捷鍵
    // ═══════════════════════════════════════════════════
    const handleKeyDown = (e) => {
        const tag = document.activeElement?.tagName;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            handleZoomIn();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '-') {
            e.preventDefault();
            handleZoomOut();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '0') {
            e.preventDefault();
            handleResetZoom();
        }
    };

    // ═══════════════════════════════════════════════════
    //  生命週期
    // ═══════════════════════════════════════════════════
    onMounted(() => {
        window.addEventListener('keydown', handleKeyDown);

        if (wrapperRef.value) {
            wrapperWidth.value = wrapperRef.value.clientWidth;
            wrapperHeight.value = wrapperRef.value.clientHeight;

            resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    wrapperWidth.value = entry.contentRect.width;
                    wrapperHeight.value = entry.contentRect.height;
                }
            });
            resizeObserver.observe(wrapperRef.value);
        }

        if (hasMachine.value) {
            emit('canvas-ready', {
                wrapperEl: wrapperRef.value,
                printArea: printArea.value,
                perspective: currentProductConfig.value?.perspective ?? null
            });
            setTimeout(handleFitScreen, 150);
        }
    });

    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeyDown);
        resizeObserver?.disconnect();
    });

    // 印刷區域變更時重新通知
    watch(printArea, async (newArea) => {
        await nextTick();
        emit('canvas-ready', {
            wrapperEl: wrapperRef.value,
            printArea: newArea,
            perspective: currentProductConfig.value?.perspective ?? null
        });
    });

    // 切換機台時重新 fit
    watch(
        () => props.selectedMachine,
        async () => {
            await nextTick();
            setTimeout(handleFitScreen, 200);
        }
    );

    // ═══════════════════════════════════════════════════
    //  Expose
    // ═══════════════════════════════════════════════════
    defineExpose({
        wrapperRef,
        canvasRef,
        zoomIn: handleZoomIn,
        zoomOut: handleZoomOut,
        resetZoom: handleResetZoom,
        fitScreen: handleFitScreen
    });
</script>

<style scoped>
    /* ══════════════════════════════════════════════════
   容器
══════════════════════════════════════════════════ */
    .p-canvas-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 0;
        border-radius: var(--border-radius-lg);
        padding: 1.5rem;
        width: 100%;
        height: 100%;
    }

    .canvas-content {
        box-shadow: var(--bubble-shadow);
        border-radius: var(--border-radius-lg);
        display: flex;
        flex-direction: column;
        height: 100%;
        background-color: transparent;
        overflow: hidden;
    }

    /* ══════════════════════════════════════════════════
   Toolbar
══════════════════════════════════════════════════ */
    .canvas-toolbar {
        padding: 8px 16px;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-shrink: 0;
        height: 52px;
        border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
        position: relative;
        z-index: 10;
        background: var(--sidebar-glass-header);
    }

    .toolbar-group {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .toolbar-btn {
        height: 34px;
        min-width: 34px;
        padding: 0 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 13px;
        border-radius: var(--border-radius-pill);
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        color: var(--text-primary);
        transition: all var(--transition-fast);
    }
    .toolbar-btn:hover {
        background: var(--primary-color);
        color: #fff;
        border-color: transparent;
        box-shadow: 0 2px 8px rgba(60, 130, 191, 0.3);
    }
    .toolbar-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        pointer-events: none;
    }
    .toolbar-btn--danger:hover {
        background: var(--danger-color);
        box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
    }

    .toolbar-divider {
        width: 1px;
        height: 20px;
        background: var(--border-color);
        margin: 0 4px;
    }

    .zoom-display {
        padding: 5px 12px;
        background: var(--bg-secondary);
        border-radius: var(--border-radius-pill);
        font-weight: 600;
        font-size: 12px;
        min-width: 56px;
        text-align: center;
        user-select: none;
        border: 1px solid var(--border-color);
        color: var(--text-primary);
        letter-spacing: 0.02em;
    }

    .btn-label {
        font-size: 12px;
        font-weight: 500;
    }

    /* ══════════════════════════════════════════════════
   背景控制
══════════════════════════════════════════════════ */
    .bg-control {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-pill);
        height: 34px;
    }

    .bg-label {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-secondary);
        white-space: nowrap;
        letter-spacing: 0.03em;
    }

    .transparent-btn {
        width: 24px;
        height: 24px;
        padding: 0;
        border: 2px solid var(--border-color);
        border-radius: 5px;
        cursor: pointer;
        background: none;
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
            border-color 0.15s,
            box-shadow 0.15s;
        flex-shrink: 0;
        overflow: hidden;
    }
    .transparent-btn:hover {
        border-color: var(--primary-color);
    }
    .transparent-btn.is-active {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
    }

    .color-picker-wrap {
        position: relative;
        width: 24px;
        height: 24px;
        cursor: pointer;
        flex-shrink: 0;
    }
    .color-picker-wrap input[type='color'] {
        position: absolute;
        inset: 0;
        opacity: 0;
        width: 100%;
        height: 100%;
        cursor: pointer;
        padding: 0;
        border: none;
    }
    .color-preview {
        display: block;
        width: 24px;
        height: 24px;
        border-radius: 5px;
        border: 2px solid var(--border-color);
        transition: border-color 0.15s;
        pointer-events: none;
    }
    .color-preview.is-transparent {
        background-image: linear-gradient(45deg, #ccc 25%, transparent 25%),
            linear-gradient(-45deg, #ccc 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #ccc 75%),
            linear-gradient(-45deg, transparent 75%, #ccc 75%);
        background-size: 8px 8px;
        background-position:
            0 0,
            0 4px,
            4px -4px,
            -4px 0;
        background-color: #fff;
    }
    .color-picker-wrap:hover .color-preview {
        border-color: var(--primary-color);
    }

    .preset-colors {
        display: flex;
        align-items: center;
        gap: 3px;
    }
    .preset-dot {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
        transition:
            transform 0.15s,
            border-color 0.15s,
            box-shadow 0.15s;
        padding: 0;
        flex-shrink: 0;
        outline: none;
    }
    .preset-dot:hover {
        transform: scale(1.25);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    }
    .preset-dot.is-active {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
        transform: scale(1.15);
    }

    /* ══════════════════════════════════════════════════
   Canvas 區域
══════════════════════════════════════════════════ */

    /*
 * canvas-wrapper
 * overflow: hidden → 裁切 scene-bg-layer 超出的部分
 * 棋盤格背景 → 表示透明區域
 */
    .canvas-wrapper {
        flex: 1;
        min-height: 0;
        overflow: hidden;
        position: relative;
        border-radius: 0 0 var(--border-radius-lg) var(--border-radius-lg);
        border: none;
        /* ★ 透明棋盤格（Photoshop 風格） */
        background-color: transparent;
        background-size: 16px 16px;
        background-position:
            0 0,
            0 8px,
            8px -8px,
            -8px 0;
    }

    /*
    * canvas-centering
    * 覆蓋整個 wrapper，負責將 zoom-target 置中
    */
    .canvas-centering {
        position: absolute;
        border-radius: 0 0 var(--border-radius-lg) var(--border-radius-lg);
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        z-index: 1;
        background-color: transparent;
    }

    /*
 * zoom-target
 * 縮放目標，transform: scale() 套用於此
 * overflow: visible 讓 scene-bg-layer 可超出邊界（由 wrapper 裁切）
 */
    .zoom-target {
        position: relative;
        flex-shrink: 0;
        pointer-events: auto;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: visible;
    }

    /*
 * machine-stage
 * 固定 800×600，z-index:1 在場景背景之上
 * overflow: visible 讓 scene-bg-layer 超出
 */
    .machine-stage {
        position: relative;
        flex-shrink: 0;
        overflow: visible;
        z-index: 1;
        filter: drop-shadow(0 8px 32px rgba(0, 0, 0, 0.28));
    }

    /*
 * scene-bg-layer
 * 以 machine-stage 中心為基準向四周展開
 * 尺寸由 sceneLayerStyle 動態注入
 * z-index: 0 → 在機台圖片之下
 */
    .scene-bg-layer {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 0;
        pointer-events: none;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        transition: background-image 0.25s ease;
    }

    .machine-base-img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
        pointer-events: none;
        user-select: none;
        -webkit-user-drag: none;
        z-index: 1;
    }

    .machine-placeholder,
    .machine-error {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 12px;
        color: var(--text-secondary);
        background-image: linear-gradient(45deg, #d8d8d8 25%, transparent 25%),
            linear-gradient(-45deg, #d8d8d8 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #d8d8d8 75%),
            linear-gradient(-45deg, transparent 75%, #d8d8d8 75%);
        background-size: 16px 16px;
        background-position:
            0 0,
            0 8px,
            8px -8px,
            -8px 0;
        background-color: #ececec;
        border-radius: 4px;
        z-index: 1;
        pointer-events: none;
    }
    .machine-placeholder i {
        font-size: 28px;
        opacity: 0.4;
    }
    .machine-error {
        background-color: #fdf0f0;
        color: var(--danger-color);
    }
    .machine-error i {
        font-size: 28px;
    }

    .canvas-print-area {
        position: absolute;
        overflow: hidden;
        z-index: 2;
    }
    .design-canvas {
        display: block;
        width: 100% !important;
        height: 100% !important;
        cursor: crosshair;
        background: transparent;
    }
    .print-area-border {
        position: absolute;
        border-radius: 2px;
        pointer-events: none;
        border: 2px dashed rgba(150, 150, 150, 0.75);
        z-index: 3;
        opacity: 1; /* ★ 改：永遠顯示 */
    }

    /* 無機台狀態 */
    .canvas-wrapper--no-machine {
        background-image: none;
        background-color: var(--bg-secondary);
    }
    .canvas-empty-state {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1;
    }
    .empty-state-content {
        text-align: center;
        color: var(--text-secondary);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
    }
    .empty-state-content i {
        font-size: 48px;
        opacity: 0.3;
        color: var(--primary-color);
    }
    .empty-state-content h3 {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
        opacity: 0.6;
        margin: 0;
    }
    .empty-state-content p {
        font-size: 13px;
        opacity: 0.5;
        margin: 0;
    }
</style>
