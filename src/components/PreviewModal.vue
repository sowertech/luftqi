<!-- src/components/PreviewModal.vue -->
<template>
    <Teleport to="body">
        <Transition name="modal-fade">
            <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
                <div class="modal-container">
                    <!-- Header -->
                    <div class="modal-header">
                        <div class="modal-title">
                            <i class="fas fa-cube"></i>
                            <span>3D 預覽效果</span>
                        </div>
                        <button class="close-btn" @click="$emit('close')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <!-- Body：純 3D 預覽 -->
                    <div class="modal-body">
                        <ThreePreview :design-image-url="previewImageUrl" />
                    </div>

                    <!-- Footer -->
                    <div class="modal-footer">
                        <button class="btn btn-secondary" @click="$emit('close')">
                            <i class="fas fa-arrow-left"></i>
                            繼續編輯
                        </button>
                        <div class="footer-actions">
                            <button class="btn btn-primary" @click="$emit('export-png')">
                                <i class="fas fa-download"></i>
                                下載 PNG
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup>
    import ThreePreview from './ThreePreview.vue';

    defineProps({
        visible: { type: Boolean, default: false },
        previewImageUrl: { type: String, default: '' }
    });

    defineEmits(['close', 'export-png']);
</script>

<style scoped>
    .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.65);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        backdrop-filter: blur(4px);
        z-index: 1000;
    }

    .modal-container {
        background: var(--bg-primary);
        border-radius: 16px;
        width: min(860px, 96vw);
        height: min(680px, 90vh);
        display: flex;
        flex-direction: column;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.4);
        overflow: hidden;
    }

    /* ── Header ── */
    .modal-header {
        display: flex;
        align-items: center;
        padding: 14px 20px;
        border-bottom: 1px solid var(--border-color);
        gap: 16px;
        background: var(--bg-secondary);
        flex-shrink: 0;
    }

    .modal-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        font-weight: 700;
        color: var(--text-primary);
        flex: 1;
    }
    .modal-title i {
        color: var(--primary-color);
    }

    .close-btn {
        width: 36px;
        height: 36px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        border-radius: var(--border-radius);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
        transition: all 0.2s;
    }
    .close-btn:hover {
        background: var(--danger-color);
        border-color: var(--danger-color);
        color: white;
    }

    /* ── Body ── */
    .modal-body {
        flex: 1;
        display: flex;
        overflow: hidden;
        min-height: 0;
    }

    /* ── Footer ── */
    .modal-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 20px;
        border-top: 1px solid var(--border-color);
        background: var(--bg-secondary);
        gap: 12px;
        flex-shrink: 0;
    }
    .footer-actions {
        display: flex;
        gap: 8px;
    }

    /* ── Transition ── */
    .modal-fade-enter-active,
    .modal-fade-leave-active {
        transition: opacity 0.25s ease;
    }
    .modal-fade-enter-active .modal-container,
    .modal-fade-leave-active .modal-container {
        transition: transform 0.25s ease;
    }
    .modal-fade-enter-from,
    .modal-fade-leave-to {
        opacity: 0;
    }
    .modal-fade-enter-from .modal-container {
        transform: scale(0.95) translateY(10px);
    }
</style>
