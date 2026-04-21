<!-- src/App.vue -->
<template>
    <div id="app">
        <div class="app-bg" :class="isDark ? 'app-bg--dark' : 'app-bg--light'"></div>

        <header class="header">
            <div class="nav-left"></div>
            <div class="logo">
                <img src="/assets/LOGO_450x450_01.png" alt="Logo" />
            </div>
            <div class="header-actions">
                <button class="btn btn-primary" @click="ExportPng">
                    <i class="fas fa-download"></i>
                    下載 PNG
                </button>
                <button class="btn btn-secondary theme-toggle" @click="toggleTheme">
                    <i :class="isDark ? 'fas fa-sun' : 'fas fa-moon'"></i>
                </button>
            </div>
        </header>

        <div class="app-body">
            <div class="d-flex">
                <!-- ★ 左側欄：機台選擇 + 設計工具 -->
                <div class="sidebar-float-wrap">
                    <LeftSidebar
                        :scene-background="sceneBackground"
                        :selected-object-type="selectedObjectType"
                        :selected-props="selectedProps"
                        :selected-machine="selectedMachine"
                        @add-text="handleAddText"
                        @upload-image="handleUploadImage"
                        @change-background="handleChangeBackground"
                        @update-object="handleUpdateObject"
                        @delete-selected="handleDeleteSelected"
                        @update:selected-machine="selectedMachine = $event"
                    />
                </div>

                <!-- ★ 畫布：場景背景 + 機台底圖 + 可編輯區域 -->
                <div class="canvas-float-wrap">
                    <CanvasView
                        ref="canvasViewRef"
                        :zoom-level="zoomLevel"
                        :selected-machine="selectedMachine"
                        :scene-background="sceneBackground"
                        :selected-object-type="selectedObjectType"
                        :canvas-background="canvasBackground"
                        @canvas-ready="onCanvasReady"
                        @zoom-in="handleZoomIn"
                        @zoom-out="handleZoomOut"
                        @reset-view="handleResetView"
                        @clear-canvas="handleClearCanvas"
                        @delete-selected="handleDeleteSelected"
                        @open-preview="openPreview"
                        @remove-bg="handleRemoveBg"
                        @update:canvas-background="handleCanvasBackgroundChange"
                        @change-background="handleCanvasBackgroundChange"
                    />
                </div>
            </div>
        </div>

        <!-- 預覽 Modal（只保留 3D） -->
        <PreviewModal
            :visible="showPreview"
            :preview-image-url="previewImageUrl"
            @close="showPreview = false"
            @export-png="handleExportPng"
        />
    </div>
</template>

<script setup>
    import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
    import LeftSidebar from './components/LeftSidebar.vue';
    import CanvasView from './components/CanvasView.vue';
    import PreviewModal from './components/PreviewModal.vue';
    import { useCanvas } from './composables/useCanvas';
    import { useToolbar } from './composables/useToolbar';
    import { useSelectedObject } from './composables/useSelectedObject';
    import { applyPerspective } from './utils/perspective.js';
    import { PRODUCTS_CONFIG } from './config/products';
    /* ══════════════════════════════════════════════════
        Canvas 引擎 — useCanvas() 只呼叫一次
    ══════════════════════════════════════════════════ */
    const {
        canvasEl,
        onSelectChange,
        initCanvas,
        addText,
        addImage,
        deleteSelected,
        clearCanvas,
        updateSelected,
        exportToPng,
        exportComposite,
        getPreviewUrl,
        resizeCanvas,
        clampObjects,
        removeBackground,
        setBackground,
        setTransparent
    } = useCanvas();
    /* ══════════════════════════════════════════════════
        選取物件狀態 — 必須在 handleRemoveBg 之前宣告
    ══════════════════════════════════════════════════ */
    const {
        objectType: selectedObjectType,
        props: selectedProps,
        syncFromObject
    } = useSelectedObject();
    onSelectChange((obj) => syncFromObject(obj));
    /* ══════════════════════════════════════════════════
        Toolbar（縮放）
    ══════════════════════════════════════════════════ */
    const { zoomLevel, zoomIn, zoomOut, resetView, fitScreen } = useToolbar(canvasEl);
    /* ══════════════════════════════════════════════════
        機台選擇
    ══════════════════════════════════════════════════ */
    const selectedMachine = ref(null);
    watch(selectedMachine, (machineId) => {
        // 重置初始化狀態，讓 onCanvasReady 重新執行 initCanvas
        canvasInitialized.value = false;
        if (!machineId || machineId === 'pure') {
            resizeCanvas?.(250, Math.round((250 * 52) / 48));
            return;
        }
        const config = PRODUCTS_CONFIG[machineId];
        if (!config) return;
        const pa = config.printArea?.rect ?? config.printArea;
        if (pa?.width && pa?.height) {
            resizeCanvas?.(pa.width, pa.height);
            clampObjects?.(pa.width, pa.height);
        }
    });
    /* ══════════════════════════════════════════════════
        場景背景
    ══════════════════════════════════════════════════ */
    const sceneBackground = ref(null);
    /* ══════════════════════════════════════════════════
        主題
    ══════════════════════════════════════════════════ */
    const isDark = ref(false);
    const applyTheme = (dark) => {
        isDark.value = dark;
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    };
    const toggleTheme = () => applyTheme(!isDark.value);
    /* ══════════════════════════════════════════════════
        CanvasView ref
    ══════════════════════════════════════════════════ */
    const canvasViewRef = ref(null);
    /* ══════════════════════════════════════════════════
        去背景 Handler
        — selectedObjectType 已在上方宣告，可安全存取
    ══════════════════════════════════════════════════ */
    const handleRemoveBg = async () => {
        if (selectedObjectType.value !== 'image') {
            canvasViewRef.value?.finishBgRemove();
            return;
        }
        const result = await removeBackground({
            tolerance: 35,
            feather: 6
        });
        if (!result.success) {
            console.warn('去背失敗：', result.error);
        }
        canvasViewRef.value?.finishBgRemove();
    };
    /* ══════════════════════════════════════════════════
        預覽
    ══════════════════════════════════════════════════ */
    const showPreview = ref(false);
    const previewImageUrl = ref('');
    const currentPerspective = ref(null);
    const currentPrintArea = ref(null); // ★ 新增
    const canvasInitialized = ref(false);
    const currentMachineImage = computed(() => {
        if (!selectedMachine.value) return null;
        const config = PRODUCTS_CONFIG[selectedMachine.value];
        return config?.baseImage ?? null;
    });
    const openPreview = async () => {
        const flatImage = getPreviewUrl();
        if (currentPerspective.value && currentMachineImage.value) {
            try {
                previewImageUrl.value = await applyPerspective(
                    flatImage,
                    currentMachineImage.value,
                    currentPerspective.value
                );
            } catch (err) {
                console.error('透視變形失敗', err);
                previewImageUrl.value = flatImage;
            }
        } else {
            previewImageUrl.value = flatImage;
        }
        showPreview.value = true;
    };
    const canvasBackground = ref('#ffffff');

    const handleCanvasBackgroundChange = (value) => {
        canvasBackground.value = value;
        // 同步到 useCanvas 引擎
        if (value === 'transparent') {
            setTransparent(); // useCanvas 解構出來的方法
        } else {
            setBackground(value); // useCanvas 解構出來的方法
        }
    };
    /* ══════════════════════════════════════════════════
        生命週期
    ══════════════════════════════════════════════════ */
    onMounted(() => {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark);
        window.addEventListener('keydown', handleKeyDown);
    });
    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeyDown);
    });
    /* ══════════════════════════════════════════════════
        Canvas Ready
    ══════════════════════════════════════════════════ */
    const onCanvasReady = ({ wrapperEl, printArea, perspective }) => {
        currentPrintArea.value = printArea; // ★ 新增：儲存 printArea
        // ★ 同時儲存 stage 尺寸（從 canvasViewRef 或直接用 printArea）
        if (!canvasInitialized.value) {
            const tryInit = () => {
                const el = document.getElementById('main-canvas');
                if (el) {
                    initCanvas('main-canvas', printArea.width, printArea.height);
                    canvasInitialized.value = true;
                    currentPerspective.value = perspective;
                    setTimeout(() => fitScreen(wrapperEl), 100);
                } else {
                    requestAnimationFrame(tryInit);
                }
            };
            tryInit();
        } else {
            resizeCanvas?.(printArea.width, printArea.height);
            clampObjects?.(printArea.width, printArea.height);
            currentPerspective.value = perspective;
            setTimeout(() => fitScreen(wrapperEl), 100);
        }
    };
    /* ══════════════════════════════════════════════════
        事件 Handlers
    ══════════════════════════════════════════════════ */
    const handleAddText = (config) => addText(config.content, config);
    const handleUploadImage = (file) => addImage(file);
    const handleChangeBackground = (sceneId) => {
        sceneBackground.value = sceneId;
    };
    const handleUpdateObject = (patch) => updateSelected(patch);
    const handleDeleteSelected = () => deleteSelected();
    const handleClearCanvas = () => clearCanvas();
    const handleZoomIn = () => zoomIn();
    const handleZoomOut = () => zoomOut();
    const handleResetView = () => resetView();
    const handleExportPng = () => {
        const dataURL = exportToPng(2);
        if (!dataURL) return;
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = 'design.png';
        a.click();
    };
    // ★ 新增：匯出合成圖（機台 + 設計）
    const handleExportComposite = async () => {
        if (!currentPrintArea.value) {
            console.warn('尚未取得印刷區域資訊');
            return;
        }
        const machineImageSrc = currentMachineImage.value; // 已有這個 computed
        // stage 尺寸從 canvasViewRef 取得，或用固定值
        const stageEl = canvasViewRef.value?.$el?.querySelector('.machine-stage');
        const stageSize = stageEl
            ? { width: stageEl.offsetWidth, height: stageEl.offsetHeight }
            : { width: 800, height: 600 };
        const url = await exportComposite(
            machineImageSrc,
            currentPrintArea.value, // { left, top, width, height }
            stageSize,
            2 // 2x 輸出倍率
        );
        if (!url) return;
        const a = document.createElement('a');
        a.href = url;
        a.download = 'design-with-machine.png';
        a.click();
    };
    const ExportPng = async () => {
        handleExportPng();
        handleExportComposite();
    };

    /* ══════════════════════════════════════════════════
        鍵盤快捷鍵
    ══════════════════════════════════════════════════ */
    const handleKeyDown = (e) => {
        const tag = document.activeElement?.tagName;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
        if (e.key === 'Delete' || e.key === 'Backspace') handleDeleteSelected();
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            handleZoomIn();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '-') {
            e.preventDefault();
            handleZoomOut();
        }
    };
</script>

<style scoped>
    /* ── 基底 ── */
    #app {
        position: relative;
        min-height: 100vh;
    }

    .app-bg {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        transition:
            background-color 0.45s ease,
            background-image 0.45s ease;
    }

    .app-bg--light {
        background-color: var(--app-bg-base);
        background-image: repeating-conic-gradient(var(--app-grid-color) 0% 25%, transparent 0% 50%),
            radial-gradient(
                ellipse 65% 55% at 12% 18%,
                rgba(150, 100, 220, 0.22) 0%,
                rgba(150, 100, 220, 0.08) 40%,
                transparent 70%
            ),
            radial-gradient(
                ellipse 55% 60% at 95% 90%,
                rgba(180, 140, 255, 0.16) 0%,
                transparent 65%
            ),
            var(--app-bg-gradient);
        background-size:
            14px 14px,
            100% 100%,
            100% 100%,
            100% 100%;
    }

    .app-bg--dark {
        background-color: var(--app-bg-base);
        background-image: repeating-conic-gradient(var(--app-grid-color) 0% 25%, transparent 0% 50%),
            radial-gradient(
                ellipse 65% 55% at 12% 18%,
                rgba(150, 100, 220, 0.3) 0%,
                rgba(120, 70, 180, 0.1) 40%,
                transparent 70%
            ),
            radial-gradient(ellipse 55% 60% at 95% 90%, rgba(10, 2, 25, 0.75) 0%, transparent 65%),
            var(--app-bg-gradient);
        background-size:
            14px 14px,
            100% 100%,
            100% 100%,
            100% 100%;
    }

    .header,
    .app-body {
        position: relative;
        z-index: 10;
    }

    .logo img {
        height: 36px;
        width: auto;
        object-fit: contain;
    }

    .nav-left {
        display: flex;
        align-items: center;
    }
</style>
