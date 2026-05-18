<template>
    <div id="app">
        <div class="app-bg" :class="isDark ? 'app-bg--dark' : 'app-bg--light'"></div>
        <!-- 右上角固定操作按鈕 -->
        <div class="top-right-actions">
            <button class="btn btn-primary" @click="ExportPng">
                <i class="fas fa-download"></i>
                下載 PNG
            </button>
            <button class="btn btn-secondary theme-toggle" @click="toggleTheme">
                <i :class="isDark ? 'fas fa-sun' : 'fas fa-moon'"></i>
            </button>
        </div>
        <div class="app-body">
            <!-- ★ 改這裡：d-flex 改成 layout-row -->
            <div class="layout-row">
                <div class="sidebar-float-wrap">
                    <LeftSidebar
                        :scene-background="sceneBackground"
                        :selected-object-type="selectedObjectType"
                        :selected-props="selectedProps"
                        :selected-machine="selectedMachine"
                        :is3-d-mode="is3DMode"
                        @add-text="handleAddText"
                        @upload-image="handleUploadImage"
                        @change-background="handleChangeBackground"
                        @update-object="handleUpdateObject"
                        @delete-selected="handleDeleteSelected"
                        @update:selected-machine="selectedMachine = $event"
                    />
                </div>
                <div class="canvas-float-wrap">
                    <CanvasView
                        ref="canvasViewRef"
                        :zoom-level="zoomLevel"
                        :selected-machine="selectedMachine"
                        :scene-background="sceneBackground"
                        :selected-object-type="selectedObjectType"
                        :canvas-background="canvasBackground"
                        :get-preview-url="getPreviewUrl"
                        @canvas-ready="onCanvasReady"
                        @zoom-in="handleZoomIn"
                        @zoom-out="handleZoomOut"
                        @reset-view="handleResetView"
                        @clear-canvas="handleClearCanvas"
                        @delete-selected="handleDeleteSelected"
                        @remove-bg="handleRemoveBg"
                        @update:canvas-background="handleCanvasBackgroundChange"
                        @change-background="handleCanvasBackgroundChange"
                        @update:is3-d-mode="is3DMode = $event"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
    import LeftSidebar from './components/LeftSidebar.vue';
    import CanvasView from './components/CanvasView.vue';
    import { useCanvas } from './composables/useCanvas';
    import { useToolbar } from './composables/useToolbar';
    import { useSelectedObject } from './composables/useSelectedObject';
    import { PRODUCTS_CONFIG } from './config/products';

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
        setTransparent,
        deselectAll // ★ 需要從 useCanvas 匯出
    } = useCanvas();

    const {
        objectType: selectedObjectType,
        props: selectedProps,
        syncFromObject
    } = useSelectedObject();

    onSelectChange((obj) => syncFromObject(obj));

    const { zoomLevel, zoomIn, zoomOut, resetView, fitScreen } = useToolbar(canvasEl);

    const selectedMachine = ref(null);
    const sceneBackground = ref(null);
    const canvasBackground = ref('#ffffff');
    const isDark = ref(false);
    const canvasViewRef = ref(null);
    const canvasInitialized = ref(false);
    const currentPerspective = ref(null);
    const currentPrintArea = ref(null);
    const is3DMode = ref(false);

    const currentMachineImage = computed(() => {
        if (!selectedMachine.value) return null;
        return PRODUCTS_CONFIG[selectedMachine.value]?.baseImage ?? null;
    });

    watch(selectedMachine, () => {
        canvasInitialized.value = false;
    });

    const applyTheme = (dark) => {
        isDark.value = dark;
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    };

    const toggleTheme = () => applyTheme(!isDark.value);

    const handleRemoveBg = async () => {
        if (selectedObjectType.value !== 'image') {
            canvasViewRef.value?.finishBgRemove();
            return;
        }
        const result = await removeBackground({ tolerance: 35, feather: 6 });
        if (!result.success) console.warn('去背失敗：', result.error);
        canvasViewRef.value?.finishBgRemove();
    };

    const handleCanvasBackgroundChange = (value) => {
        canvasBackground.value = value;
        if (value === 'transparent') setTransparent();
        else setBackground(value);
    };

    onMounted(() => {
        applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
        window.addEventListener('keydown', handleKeyDown);
    });

    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeyDown);
    });

    const onCanvasReady = ({ wrapperEl, printArea, perspective }) => {
        currentPrintArea.value = printArea;
        currentPerspective.value = perspective;
        if (!canvasInitialized.value) {
            const tryInit = () => {
                const el = document.getElementById('main-canvas');
                if (el) {
                    initCanvas('main-canvas', printArea.width, printArea.height);
                    canvasInitialized.value = true;
                    setTimeout(() => fitScreen(wrapperEl), 100);
                } else {
                    requestAnimationFrame(tryInit);
                }
            };
            tryInit();
        } else {
            resizeCanvas?.(printArea.width, printArea.height);
            clampObjects?.(printArea.width, printArea.height);
            setTimeout(() => fitScreen(wrapperEl), 100);
        }
    };

    // ★ 修正：handleAddText 傳入粗體斜體
    const handleAddText = (config) => addText(config.content, config);
    const handleUploadImage = (file) => addImage(file);
    const handleChangeBackground = (id) => {
        sceneBackground.value = id;
    };
    const handleUpdateObject = (patch) => updateSelected(patch);
    const handleDeleteSelected = () => deleteSelected();
    const handleClearCanvas = () => clearCanvas();
    const handleZoomIn = () => zoomIn();
    const handleZoomOut = () => zoomOut();
    const handleResetView = () => resetView();

    // ★ 純設計稿匯出
    const handleExportPng = () => {
        // ★ 先取消選取，移除藍色框框
        deselectAll();

        const dataURL = exportToPng(2);
        if (!dataURL) return;
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = 'design.png';
        a.click();
    };

    // ★ 含機台合成匯出
    const handleExportComposite = async () => {
        if (!currentPrintArea.value || !currentMachineImage.value) return;

        // ★ 先取消選取，移除藍色框框
        deselectAll();

        const stageEl = canvasViewRef.value?.$el?.querySelector('.machine-stage');
        const stageSize = stageEl
            ? { width: stageEl.offsetWidth, height: stageEl.offsetHeight }
            : { width: 800, height: 600 };

        const url = await exportComposite(
            currentMachineImage.value,
            currentPrintArea.value,
            stageSize,
            2
        );
        if (!url) return;
        const a = document.createElement('a');
        a.href = url;
        a.download = 'design-with-machine.png';
        a.click();
    };

    // ★ 下載入口：先取消選取再匯出
    const ExportPng = async () => {
        // 先取消所有選取（確保沒有藍色框框）
        deselectAll();

        // 等一幀讓 canvas 重繪
        await new Promise((r) => requestAnimationFrame(r));

        // 1. 永遠匯出純設計稿
        handleExportPng();

        // 2. 有機台底圖時，額外匯出含機台的合成圖
        if (currentMachineImage.value) {
            await handleExportComposite();
        }
    };

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
    .top-right-actions {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 100;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
    }
    /* ★ 核心修正：讓 layout-row 撐滿高度 */
    .layout-row {
        display: flex;
        flex-direction: row;
        width: 100%;
        height: 100%; /* 撐滿 app-body */
        position: relative;
        z-index: 1; /* 確保在 app-bg 之上 */
        pointer-events: all; /* 確保可以接收事件 */
    }
    .app-body {
        position: relative;
        z-index: 10;
        /* 撐滿剩餘空間 */
        flex: 1;
        width: 80%;
        height: 100vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
</style>
