<template>
    <div class="text-editor">
        <!-- 文字輸入 -->
        <div class="form-group">
            <label>文字內容</label>
            <textarea
                v-model="textContent"
                class="form-control"
                placeholder="輸入文字內容..."
                rows="3"
            ></textarea>
        </div>

        <!-- 字型 & 大小 -->
        <div class="form-row">
            <div class="form-group">
                <label>字型</label>
                <select v-model="fontFamily" class="form-control">
                    <option value="Microsoft JhengHei">微軟正黑體</option>
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Courier New">Courier New</option>
                </select>
            </div>
            <div class="form-group">
                <label>大小</label>
                <input
                    v-model.number="fontSize"
                    type="number"
                    class="form-control"
                    min="12"
                    max="200"
                />
            </div>
        </div>

        <!-- ★ 粗體 / 斜體 -->
        <div class="form-group">
            <label>樣式</label>
            <div class="toggle-row">
                <button
                    :class="['style-btn', { active: isBold }]"
                    title="粗體"
                    @click="isBold = !isBold"
                >
                    <b>B</b>
                </button>
                <button
                    :class="['style-btn', { active: isItalic }]"
                    title="斜體"
                    @click="isItalic = !isItalic"
                >
                    <i>I</i>
                </button>
            </div>
        </div>

        <!-- 文字顏色 -->
        <div class="form-group">
            <label>文字顏色</label>
            <div class="color-row">
                <input v-model="fontColor" type="color" class="color-input" />
                <span class="color-value">{{ fontColor }}</span>
            </div>
        </div>

        <!-- 新增按鈕 -->
        <button class="add-btn btn btn-primary" @click="handleAddText">
            <i class="fas fa-plus"></i>
            新增至畫布
        </button>
    </div>
</template>

<script setup>
    import { ref } from 'vue';
    import { alertWarn } from '../utils/swal.js';

    const emit = defineEmits(['add-text']);

    const textContent = ref('');
    const fontFamily = ref('Microsoft JhengHei');
    const fontSize = ref(16);
    const fontColor = ref('#000000');
    const isBold = ref(false);
    const isItalic = ref(false);

    const handleAddText = () => {
        if (!textContent.value.trim()) {
            alertWarn('請輸入文字', '文字內容不能為空白');
            return;
        }
        emit('add-text', {
            content: textContent.value,
            fontFamily: fontFamily.value,
            fontSize: fontSize.value,
            color: fontColor.value,
            bold: isBold.value,
            italic: isItalic.value
        });
        textContent.value = '';
    };
</script>

<style scoped>
    .text-editor {
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .form-group {
        margin-bottom: 12px;
    }

    .form-group label {
        display: block;
        margin-bottom: 6px;
        font-size: 12px;
        font-weight: 500;
        color: var(--text-secondary);
    }

    .form-control {
        width: 100%;
        padding: 0.75rem 1rem 0.75rem 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        font-size: 13px;
        background: var(--bg-primary);
        color: var(--text-primary);
        box-sizing: border-box;
        transition: border-color var(--transition-fast);
    }

    .form-control:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(91, 127, 255, 0.1);
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
    }

    textarea.form-control {
        resize: vertical;
        min-height: 72px;
    }

    /* ★ 粗體 / 斜體 toggle */
    .toggle-row {
        display: flex;
        gap: 8px;
    }

    .style-btn {
        width: 36px;
        height: 32px;
        border-radius: var(--border-radius);
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all var(--transition-fast);
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        color: var(--text-primary);
    }

    .style-btn:hover {
        background: var(--primary-light);
        border-color: var(--primary-color);
        color: var(--primary-color);
    }

    .style-btn.active {
        background: var(--primary-color);
        border-color: transparent;
        color: #fff;
        box-shadow: 0 2px 8px rgba(60, 130, 191, 0.35);
    }

    .color-row {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .color-input {
        width: 44px;
        height: 36px;
        border: none;
        border-radius: var(--border-radius-lg);
        cursor: pointer;
        padding: 2px;
        background: none;
    }

    .color-value {
        font-size: 12px;
        color: var(--text-secondary);
        font-family: monospace;
    }

    .add-btn {
        width: 100%;
        padding: 10px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-bottom: 10px;
    }

    .hint {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: var(--text-secondary);
        padding: 8px 10px;
        background: var(--bg-secondary);
        border-radius: var(--border-radius);
    }

    .hint i {
        color: var(--primary-color);
        font-size: 11px;
        flex-shrink: 0;
    }
</style>
