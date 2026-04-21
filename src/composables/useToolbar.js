// src/composables/useToolbar.js
import { ref } from 'vue';

export function useToolbar() {
    const zoomLevel = ref(100);
    const MIN_ZOOM = 25;
    const MAX_ZOOM = 300;
    const STEP = 10;

    const zoomIn = () => {
        zoomLevel.value = Math.min(MAX_ZOOM, zoomLevel.value + STEP);
    };
    const zoomOut = () => {
        zoomLevel.value = Math.max(MIN_ZOOM, zoomLevel.value - STEP);
    };
    const resetView = () => {
        zoomLevel.value = 100;
    };
    const fitScreen = (wrapperEl) => {
        if (!wrapperEl) return;
        const STAGE_W = 800;
        const STAGE_H = 600;
        const PADDING = 80;
        const ww = wrapperEl.clientWidth - PADDING * 2;
        const wh = wrapperEl.clientHeight - PADDING * 2;
        const scale = Math.min(ww / STAGE_W, wh / STAGE_H, 1);
        zoomLevel.value = Math.round(scale * 100);
    };
    return { zoomLevel, zoomIn, zoomOut, resetView, fitScreen };
}
