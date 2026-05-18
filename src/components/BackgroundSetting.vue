<!-- src/components/BackgroundSetting.vue -->
<template>
    <div class="bg-setting">
        <!-- 場景選擇標題 -->
        <div class="section-label">
            <i class="fas fa-mountain"></i>
            <span>選擇場景背景</span>
        </div>

        <!-- 無背景選項 -->
        <div
            :class="['scene-none', { active: modelValue === null }]"
            @click="$emit('change-background', null)"
        >
            <div class="scene-none-icon">
                <i class="fas fa-ban"></i>
            </div>
            <span>無背景（透明）</span>
            <i v-if="modelValue === null" class="fas fa-check-circle check-icon"></i>
        </div>

        <!-- 場景網格 -->
        <div class="scene-grid">
            <div
                v-for="scene in SCENES"
                :key="scene.id"
                :class="['scene-card', { active: modelValue === scene.id }]"
                :title="scene.name"
                @click="$emit('change-background', scene.id)"
            >
                <!-- 縮圖 -->
                <div class="scene-thumb">
                    <img :src="scene.thumbnail" :alt="scene.name" loading="lazy" />
                    <!-- 選中遮罩 -->
                    <div v-if="modelValue === scene.id" class="scene-overlay">
                        <i class="fas fa-check-circle"></i>
                    </div>
                </div>
                <!-- 名稱 -->
                <div class="scene-name">{{ scene.name }}</div>
            </div>
        </div>

        <!-- 已選提示 -->
        <div v-if="selectedScene" class="selected-hint">
            <i class="fas fa-image"></i>
            <span>已選：{{ selectedScene.name }}</span>
        </div>
    </div>
</template>

<script setup>
    import { computed } from 'vue';
    import { SCENES } from '../config/products';

    const props = defineProps({
        // 現在存的是 scene id（string）或 null
        modelValue: { type: String, default: null }
    });

    defineEmits(['change-background']);

    const selectedScene = computed(() =>
        props.modelValue ? SCENES.find((s) => s.id === props.modelValue) ?? null : null
    );
</script>

<style scoped>
    .bg-setting {
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    /* ── 標題列 ── */
    .section-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 600;
        color: var(--text-secondary);
        letter-spacing: 0.5px;
        text-transform: uppercase;
    }
    .section-label i {
        color: var(--primary-color);
        font-size: 12px;
    }

    /* ── 無背景按鈕 ── */
    .scene-none {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: var(--border-radius);
        border: 1px dashed var(--border-color);
        cursor: pointer;
        font-size: 12px;
        color: var(--text-secondary);
        transition: all 0.15s;
    }
    .scene-none:hover {
        border-color: var(--primary-color);
        color: var(--text-primary);
        background: rgba(91, 127, 255, 0.05);
    }
    .scene-none.active {
        border-color: var(--primary-color);
        background: rgba(91, 127, 255, 0.1);
        color: var(--text-primary);
    }
    .scene-none-icon {
        width: 28px;
        height: 28px;
        border-radius: var(--border-radius);
        background: var(--bg-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        color: var(--text-secondary);
        flex-shrink: 0;
    }
    .scene-none > span {
        flex: 1;
    }
    .check-icon {
        color: var(--primary-color);
        font-size: 14px;
        flex-shrink: 0;
    }

    /* ── 場景網格 ── */
    .scene-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }

    .scene-card {
        border-radius: var(--border-radius);
        border: 2px solid var(--border-color);
        cursor: pointer;
        overflow: hidden;
        transition: all 0.18s;
        background: var(--bg-secondary);
    }
    .scene-card:hover {
        border-color: var(--primary-color);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(91, 127, 255, 0.2);
    }
    .scene-card.active {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 2px rgba(91, 127, 255, 0.3);
    }

    /* 縮圖容器 */
    .scene-thumb {
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 9;
        overflow: hidden;
        background: var(--bg-tertiary);
    }
    .scene-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: transform 0.2s;
    }
    .scene-card:hover .scene-thumb img {
        transform: scale(1.05);
    }

    /* 選中遮罩 */
    .scene-overlay {
        position: absolute;
        inset: 0;
        background: rgba(91, 127, 255, 0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        color: #fff;
    }

    /* 名稱 */
    .scene-name {
        padding: 4px 6px;
        font-size: 11px;
        font-weight: 500;
        color: var(--text-primary);
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    /* ── 已選提示 ── */
    .selected-hint {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 10px;
        background: rgba(91, 127, 255, 0.08);
        border: 1px solid rgba(91, 127, 255, 0.25);
        border-radius: var(--border-radius);
        font-size: 11px;
        color: var(--text-secondary);
    }
    .selected-hint i {
        color: var(--primary-color);
    }
</style>
