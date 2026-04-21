// src/composables/useSelectedObject.js
import { ref, reactive } from 'vue';

/**
 * 管理當前選取物件的狀態
 * 所有屬性變更都透過此 composable 傳遞給 canvas
 */
export function useSelectedObject() {
    // 當前選取的物件（內部 JS 物件，非 DOM）
    const selectedObject = ref(null);

    // 可編輯的屬性（與 sidebar 雙向綁定）
    const props = reactive({
        // 通用
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0, // 度數 0~360
        opacity: 100, // 百分比 0~100
        scaleX: 1,
        scaleY: 1,
        // 文字專用
        text: '',
        fontSize: 40,
        fontFamily: 'Microsoft JhengHei',
        color: '#000000',
        bold: false,
        italic: false,
        // 圖片專用
        brightness: 0, // -100 ~ 100
        contrast: 0 // -100 ~ 100
    });

    // 物件類型
    const objectType = ref(null); // 'text' | 'image' | null

    /**
     * 從物件同步屬性到 props
     */
    const syncFromObject = (obj) => {
        if (!obj) {
            selectedObject.value = null;
            objectType.value = null;
            return;
        }
        selectedObject.value = obj;
        objectType.value = obj.type;

        props.x = Math.round(obj.x);
        props.y = Math.round(obj.y);
        props.width = Math.round(obj.width);
        props.height = Math.round(obj.height);
        props.rotation = obj.rotation ?? 0;
        props.opacity = Math.round((obj.opacity ?? 1) * 100);
        props.scaleX = obj.scaleX ?? 1;
        props.scaleY = obj.scaleY ?? 1;

        if (obj.type === 'text') {
            props.text = obj.text ?? '';
            props.fontSize = obj.fontSize ?? 40;
            props.fontFamily = obj.fontFamily ?? 'Microsoft JhengHei';
            props.color = obj.color ?? '#000000';
            props.bold = obj.bold ?? false;
            props.italic = obj.italic ?? false;
        }
        if (obj.type === 'image') {
            props.brightness = obj.brightness ?? 0;
            props.contrast = obj.contrast ?? 0;
        }
    };

    const clearSelection = () => {
        selectedObject.value = null;
        objectType.value = null;
    };

    return {
        selectedObject,
        objectType,
        props,
        syncFromObject,
        clearSelection
    };
}
