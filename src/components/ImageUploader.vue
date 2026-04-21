<template>
    <div class="panel">
        <div class="panel-content">
            <label class="upload-label" :class="{ dragging }">
                <input
                    ref="fileInput"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="handleFileUpload"
                />
                <i class="fas fa-cloud-upload-alt"></i>
                <span>點擊或拖曳上傳圖片</span>
                <small>PNG、JPG、GIF・最大 5MB</small>
            </label>

            <div class="help-text">
                <i class="fas fa-info-circle"></i>
                <span>圖片將自動縮放至可編輯區域內</span>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref } from 'vue';
    import { alertWarn } from '../utils/swal.js';

    const emit = defineEmits(['upload-image']);
    const fileInput = ref(null);
    const dragging = ref(false);

    const validate = (file) => {
        if (!file) return false;
        if (!file.type.startsWith('image/')) {
            alertWarn('格式錯誤', '請選擇圖片檔案（PNG、JPG、GIF）');
            return false;
        }
        if (file.size > 5 * 1024 * 1024) {
            alertWarn('檔案過大', '圖片大小不能超過 5MB');
            return false;
        }
        return true;
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!validate(file)) return;
        emit('upload-image', file);
        e.target.value = '';
    };
</script>

<style scoped>
    .panel-content {
        padding: 16px;
    }

    /* ── 上傳區塊 ── */
    .upload-label {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 20px;
        gap: 8px;
        margin-bottom: 16px;

        /* 藍色虛線框 */
        border: 2px dashed rgba(60, 130, 191, 0.35);
        border-radius: var(--border-radius);
        cursor: pointer;

        /* 亮色：極淡藍底 */
        background: rgba(60, 130, 191, 0.07);

        transition:
            border-color var(--transition-fast),
            background var(--transition-fast),
            box-shadow var(--transition-fast);
    }

    /* hover / 拖曳中 */
    .upload-label:hover,
    .upload-label.dragging {
        border-color: rgba(60, 130, 191, 0.7);
        background: rgba(60, 130, 191, 0.14);
        box-shadow:
            0 0 0 4px rgba(60, 130, 191, 0.08),
            inset 0 0 20px rgba(60, 130, 191, 0.06);
    }

    /* 暗色主題 */
    :global([data-theme='dark']) .upload-label {
        border-color: rgba(60, 130, 191, 0.28);
        background: rgba(60, 130, 191, 0.06);
    }

    :global([data-theme='dark']) .upload-label:hover,
    :global([data-theme='dark']) .upload-label.dragging {
        border-color: rgba(60, 130, 191, 0.55);
        background: rgba(60, 130, 191, 0.12);
        box-shadow:
            0 0 0 4px rgba(60, 130, 191, 0.06),
            inset 0 0 24px rgba(60, 130, 191, 0.05);
    }

    /* ── 上傳 icon ── */
    .upload-label i {
        font-size: 36px;
        color: var(--primary-color);
        /* 亮色：正常藍 */
        opacity: 0.85;
        transition:
            transform var(--transition-fast),
            opacity var(--transition-fast);
    }

    .upload-label:hover i {
        transform: translateY(-3px);
        opacity: 1;
    }

    /* ── 文字 ── */
    .upload-label span {
        font-size: 14px;
        font-weight: 600;
        /* 亮色：深藍灰 */
        color: var(--text-primary);
    }

    .upload-label small {
        font-size: 12px;
        color: var(--text-secondary);
    }

    /* ── 說明列 ── */
    .help-text {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-radius: var(--border-radius);
        font-size: 12px;

        /* 亮色：淡藍底 + 藍色字 */
        background: rgba(60, 130, 191, 0.08);
        color: rgba(30, 90, 150, 0.85);
        border: 1px solid rgba(60, 130, 191, 0.15);
    }

    :global([data-theme='dark']) .help-text {
        /* 暗色：深藍底 + 淡藍字 */
        background: rgba(60, 130, 191, 0.07);
        color: rgba(140, 200, 255, 0.8);
        border-color: rgba(60, 130, 191, 0.16);
    }

    .help-text i {
        color: var(--primary-color);
        flex-shrink: 0;
    }

    :global([data-theme='dark']) .help-text i {
        color: rgba(100, 175, 240, 0.9);
    }
</style>
