<!-- src/components/CanvasView.vue -->
<template>
    <div class="p-canvas-container">
        <div class="canvas-content">
            <!-- ══════════════════════════════════════
                 Toolbar
            ══════════════════════════════════════ -->
            <div v-if="hasMachine" class="canvas-toolbar">
                <div class="toolbar-group">
                    <!-- 2D 模式才顯示縮放 -->
                    <template v-if="!is3DMode">
                        <button class="toolbar-btn" title="放大 (Ctrl +)" @click="handleZoomIn">
                            <i class="fas fa-search-plus"></i>
                        </button>
                        <button class="toolbar-btn" title="縮小 (Ctrl -)" @click="handleZoomOut">
                            <i class="fas fa-search-minus"></i>
                        </button>
                        <div class="zoom-display">{{ localZoom }}%</div>
                        <button
                            class="toolbar-btn"
                            title="重設縮放 (100%)"
                            @click="handleResetZoom"
                        >
                            <i class="fas fa-compress-arrows-alt"></i>
                        </button>
                    </template>
                </div>

                <div class="toolbar-group">
                    <!-- ★ 2D/3D 切換按鈕 -->
                    <button
                        class="toolbar-btn view-toggle-btn"
                        :class="{ 'view-toggle-btn--active': is3DMode }"
                        :title="is3DMode ? '切換回 2D 編輯' : '切換到 3D 預覽'"
                        @click="toggleViewMode"
                    >
                        <i :class="is3DMode ? 'fas fa-pen' : 'fas fa-cube'"></i>
                        <span class="btn-label">{{ is3DMode ? '2D 編輯' : '3D 預覽' }}</span>
                    </button>

                    <div class="toolbar-divider"></div>

                    <!-- 2D 模式才顯示編輯操作 -->
                    <template v-if="!is3DMode">
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
                    </template>
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
                    <!-- ★ 3D 視圖層 -->
                    <Transition name="view-fade">
                        <div v-if="is3DMode" class="three-overlay">
                            <ThreePreview
                                :design-image-url="currentPreviewUrl"
                                :product-config="currentProductConfig"
                                :machine-category="currentMachineCategory"
                            />
                        </div>
                    </Transition>

                    <!-- 2D 編輯層 -->
                    <div class="canvas-centering">
                        <div ref="zoomTargetRef" class="zoom-target" :style="zoomTargetStyle">
                            <div class="machine-stage" :style="stageStyle">
                                <div
                                    v-if="sceneLayerVisible"
                                    class="scene-bg-layer"
                                    :style="sceneLayerStyle"
                                />

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

                                <div class="canvas-print-area" :style="printAreaStyle">
                                    <canvas
                                        id="main-canvas"
                                        ref="canvasRef"
                                        class="design-canvas"
                                    ></canvas>
                                </div>

                                <div class="print-area-border" :style="printAreaStyle"></div>

                                <!-- ★ 尺寸標註 -->
                                <div
                                    v-if="hasMachine && !is3DMode"
                                    class="dimension-labels"
                                    :style="dimensionContainerStyle"
                                >
                                    <!-- 上方寬度標註 -->
                                    <div class="dimension-top" :style="dimensionTopStyle">
                                        <div
                                            class="dimension-line dimension-line--horizontal"
                                        ></div>
                                        <span class="dimension-value">{{ dimensionWidth }}</span>
                                    </div>
                                    <!-- 左側高度標註 -->
                                    <div class="dimension-left" :style="dimensionLeftStyle">
                                        <div class="dimension-line dimension-line--vertical"></div>
                                        <span class="dimension-value">{{ dimensionHeight }}</span>
                                    </div>
                                </div>
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
    import ThreePreview from './ThreePreview.vue';

    // ═══════════════════════════════════════════════════
    //  常數
    // ═══════════════════════════════════════════════════
    const ZOOM_STEP = 10;
    const ZOOM_MIN = 20;
    const ZOOM_MAX = 300;
    const ZOOM_DEFAULT = 100;
    const STAGE_PADDING = 80;
    const SCENE_BASE_SCALE = 0.25;

    // ═══════════════════════════════════════════════════
    //  Props
    // ═══════════════════════════════════════════════════
    const props = defineProps({
        zoomLevel: { type: Number, default: null },
        selectedMachine: { type: String, default: null },
        sceneBackground: { type: String, default: null },
        selectedObjectType: { type: String, default: null },
        getPreviewUrl: { type: Function, default: null }
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
        'update:zoom-level',
        'update:is3DMode'
    ]);

    // ═══════════════════════════════════════════════════
    //  Template Refs
    // ═══════════════════════════════════════════════════
    const wrapperRef = ref(null);
    const zoomTargetRef = ref(null);
    const canvasRef = ref(null);

    // ═══════════════════════════════════════════════════
    //  2D / 3D 切換狀態
    // ═══════════════════════════════════════════════════
    const is3DMode = ref(false);
    const currentPreviewUrl = ref('');

    const toggleViewMode = async () => {
        if (!is3DMode.value) {
            if (props.getPreviewUrl) {
                currentPreviewUrl.value = props.getPreviewUrl();
            }
            is3DMode.value = true;
        } else {
            is3DMode.value = false;
        }
        emit('update:is3DMode', is3DMode.value);
    };

    // ═══════════════════════════════════════════════════
    //  機台判斷
    // ═══════════════════════════════════════════════════
    const hasMachine = computed(
        () => props.selectedMachine !== null && props.selectedMachine !== undefined
    );

    const currentMachineCategory = computed(() => {
        if (!props.selectedMachine) return null;
        const config = PRODUCTS_CONFIG[props.selectedMachine];
        return config?.category ?? null;
    });

    // ═══════════════════════════════════════════════════
    //  產品設定
    // ═══════════════════════════════════════════════════
    const currentProductConfig = computed(() => {
        if (!props.selectedMachine) return null;
        return PRODUCTS_CONFIG[props.selectedMachine] ?? null;
    });

    // ═══════════════════════════════════════════════════
    //  Stage 尺寸
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
    const PRINT_BASE_W = 250;
    const PRINT_SIZE_MAP = {
        Cube: { w: 48, h: 26 },
        Duo: { w: 48, h: 52 }
    };
    const printArea = computed(() => {
        if (currentProductConfig.value?.printArea) {
            return currentProductConfig.value.printArea;
        }
        const category = currentMachineCategory.value;
        const size = PRINT_SIZE_MAP[category] ?? { w: 48, h: 52 };
        const pw = PRINT_BASE_W;
        const ph = Math.round((pw * size.h) / size.w);
        return {
            left: Math.round((STAGE_W - pw) / 2),
            top: Math.round((STAGE_H - ph) / 2),
            width: pw,
            height: ph
        };
    });

    const printAreaStyle = computed(() => ({
        left: `${printArea.value.left}px`,
        top: `${printArea.value.top}px`,
        width: `${printArea.value.width}px`,
        height: `${printArea.value.height}px`
    }));

    // ═══════════════════════════════════════════════════
    //  尺寸標註
    // ═══════════════════════════════════════════════════
    const DIMENSION_OFFSET_TOP = 40; // 上方標註距離虛線框的距離
    const DIMENSION_OFFSET_LEFT = 10; // 左側標註距離虛線框的距離

    const dimensionWidth = computed(() => '48.3mm');

    const dimensionHeight = computed(() => {
        const category = currentMachineCategory.value;
        const size = PRINT_SIZE_MAP[category];
        return size ? String(size.h) + 'mm' : '52mm';
    });

    const dimensionContainerStyle = computed(() => ({
        position: 'absolute',
        inset: '0',
        pointerEvents: 'none',
        zIndex: 4
    }));

    const dimensionTopStyle = computed(() => {
        const pa = printArea.value;
        return {
            position: 'absolute',
            left: `${pa.left}px`,
            top: `${pa.top - DIMENSION_OFFSET_TOP}px`,
            width: `${pa.width}px`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        };
    });
    const dimensionLeftStyle = computed(() => {
        const pa = printArea.value;
        return {
            position: 'absolute',
            left: `${pa.left - DIMENSION_OFFSET_LEFT}px`,
            top: `${pa.top}px`,
            height: `${pa.height}px`,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center'
        };
    });

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
        if (is3DMode.value) return;
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        localZoom.value = localZoom.value + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP);
    };

    watch(
        () => props.zoomLevel,
        (val) => {
            if (val !== null && val !== undefined) {
                _internalZoom.value = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, val));
            }
        }
    );

    // ═══════════════════════════════════════════════════
    //  Wrapper 尺寸偵測
    // ═══════════════════════════════════════════════════
    const wrapperWidth = ref(0);
    const wrapperHeight = ref(0);
    let resizeObserver = null;

    // ═══════════════════════════════════════════════════
    //  場景背景
    // ═══════════════════════════════════════════════════
    const sceneLayerVisible = computed(() => !!SCENES.find((s) => s.id === props.sceneBackground));

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
        if (is3DMode.value) return;
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

    watch(printArea, async (newArea) => {
        await nextTick();
        emit('canvas-ready', {
            wrapperEl: wrapperRef.value,
            printArea: newArea,
            perspective: currentProductConfig.value?.perspective ?? null
        });
    });

    watch(
        () => props.selectedMachine,
        async (newVal, oldVal) => {
            if (newVal === oldVal) return;
            is3DMode.value = false;
            emit('update:is3DMode', false);

            await nextTick();

            emit('canvas-ready', {
                wrapperEl: wrapperRef.value,
                printArea: printArea.value,
                perspective: currentProductConfig.value?.perspective ?? null
            });

            setTimeout(handleFitScreen, 200);
        }
    );

    // ═══════════════════════════════════════════════════
    //  Expose
    // ═══════════════════════════════════════════════════
    defineExpose({
        wrapperRef,
        canvasRef,
        is3DMode,
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
        padding: 1.5rem 1.5rem 1.5rem 1rem;
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
    .toolbar-btn--danger:hover {
        background: var(--danger-color);
        box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
    }

    .view-toggle-btn--active {
        background: var(--primary-color);
        color: #fff;
        border-color: transparent;
        box-shadow: 0 2px 8px rgba(60, 130, 191, 0.35);
    }
    .view-toggle-btn--active:hover {
        background: var(--primary-color);
        filter: brightness(1.1);
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
   Canvas 區域
══════════════════════════════════════════════════ */
    .canvas-wrapper {
        flex: 1;
        min-height: 0;
        overflow: hidden;
        position: relative;
        border-radius: 0 0 var(--border-radius-lg) var(--border-radius-lg);
        background-color: transparent;
        background-size: 16px 16px;
        background-position:
            0 0,
            0 8px,
            8px -8px,
            -8px 0;
    }

    .three-overlay {
        position: absolute;
        inset: 0;
        z-index: 20;
        border-radius: 0 0 var(--border-radius-lg) var(--border-radius-lg);
        overflow: hidden;
    }

    .view-fade-enter-active,
    .view-fade-leave-active {
        transition: opacity 0.3s ease;
    }
    .view-fade-enter-from,
    .view-fade-leave-to {
        opacity: 0;
    }

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

    .zoom-target {
        position: relative;
        flex-shrink: 0;
        pointer-events: auto;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: visible;
    }

    .machine-stage {
        position: relative;
        flex-shrink: 0;
        overflow: visible;
        z-index: 1;
        filter: drop-shadow(0 8px 32px rgba(0, 0, 0, 0.28));
    }

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
        margin-bottom: 5rem;
    }
    .print-area-border {
        position: absolute;
        border-radius: 2px;
        pointer-events: none;
        border: 2px dashed rgba(150, 150, 150, 0.75);
        z-index: 3;
    }

    /* ══════════════════════════════════════════════════
   尺寸標註
══════════════════════════════════════════════════ */
    .dimension-labels {
        pointer-events: none;
        user-select: none;
    }

    .dimension-top {
        transform: translateY(-100%);
    }

    .dimension-top .dimension-value {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-secondary);
        background: transparent;
        padding: 1px 6px;
        border-radius: 3px;
        white-space: nowrap;
        letter-spacing: 0.02em;
    }

    .dimension-left {
        transform: translateX(-100%);
    }

    .dimension-left .dimension-value {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-secondary);
        background: transparent;
        padding: 1px 6px;
        border-radius: 3px;
        white-space: nowrap;
        writing-mode: vertical-lr;
        text-orientation: mixed;
        transform: rotate(180deg);
        letter-spacing: 0.02em;
    }

    .dimension-line--horizontal {
        width: 100%;
        height: 1px;
        background: var(--text-secondary);
        opacity: 0.4;
        margin-bottom: 2px;
        position: relative;
    }
    .dimension-line--horizontal::before,
    .dimension-line--horizontal::after {
        content: '';
        position: absolute;
        top: -3px;
        width: 1px;
        height: 7px;
        background: var(--text-secondary);
        opacity: 0.6;
    }
    .dimension-line--horizontal::before {
        left: 0;
    }
    .dimension-line--horizontal::after {
        right: 0;
    }

    .dimension-line--vertical {
        width: 1px;
        height: 100%;
        background: var(--text-secondary);
        opacity: 0.4;
        margin-right: 2px;
        position: relative;
    }
    .dimension-line--vertical::before,
    .dimension-line--vertical::after {
        content: '';
        position: absolute;
        left: -3px;
        height: 1px;
        width: 7px;
        background: var(--text-secondary);
        opacity: 0.6;
    }
    .dimension-line--vertical::before {
        top: 0;
    }
    .dimension-line--vertical::after {
        bottom: 0;
    }

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
