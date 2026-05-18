<!-- src/components/MachinePicker.vue -->
<template>
    <div class="picker">
        <!-- ══ 機台大圖預覽（最上方）══ -->
        <div class="machine-image-area">
            <Transition name="fade" mode="out-in">
                <img
                    v-if="selectedProduct"
                    :key="selectedProduct.id"
                    :src="selectedProduct.thumbnail"
                    :alt="selectedProduct.name"
                    class="machine-main-image"
                />
                <div v-else class="machine-image-placeholder">
                    <i class="fas fa-cube"></i>
                </div>
            </Transition>
        </div>

        <!-- ══ 機台種類 ══ -->
        <div class="section-block">
            <div class="section-label">機台種類</div>
            <div class="category-tabs">
                <button
                    v-for="cat in CATEGORIES"
                    :key="cat.id"
                    :class="['cat-tab', { active: selectedCategory === cat.id }]"
                    @click="selectCategory(cat.id)"
                >
                    <i :class="cat.icon"></i>
                    <span>{{ cat.name }}</span>
                </button>
            </div>
        </div>

        <!-- ══ 顏色 ══ -->
        <Transition name="fade-slide">
            <div v-if="selectedCategory" class="section-block">
                <div class="section-label">
                    顏色
                    <span v-if="selectedProduct" class="color-hint">
                        — {{ selectedProduct.colorName }}
                    </span>
                </div>
                <div class="color-swatches">
                    <button
                        v-for="product in categoryProducts"
                        :key="product.id"
                        :class="['swatch', { active: modelValue === product.id }]"
                        :title="product.colorName"
                        @click="select(product.id)"
                    >
                        <span class="swatch-dot" :style="{ background: product.color }" />
                        <i v-if="modelValue === product.id" class="fas fa-check swatch-check"></i>
                    </button>
                </div>
            </div>
        </Transition>

        <!-- ══ 已選資訊條 ══ -->
        <Transition name="slide-up">
            <div v-if="selectedInfo" class="picker-selected-bar">
                <i class="fas fa-check-circle"></i>
                <span>已選：{{ selectedInfo.name }}</span>
                <button class="unselect-btn" @click="clearSelection">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </Transition>
    </div>
</template>

<script setup>
    import { ref, computed, watch } from 'vue';
    import { PRODUCTS_CONFIG } from '../config/products';

    // ── 系列定義（移除純設計稿）─────────────
    const CATEGORIES = [
        { id: 'Cube', name: 'Cube', icon: 'fas fa-cube' },
        { id: 'Duo', name: 'Duo', icon: 'fas fa-mobile-alt' }
    ];

    const props = defineProps({
        modelValue: { type: String, default: null }
    });
    const emit = defineEmits(['update:modelValue']);

    // ── 從 modelValue 反推 category ─────────────────────────
    function getCategoryFromId(id) {
        if (!id) return null;
        return PRODUCTS_CONFIG[id]?.category ?? null;
    }

    // ── 取得某系列第一個產品 id ─────────────────────────────
    function getDefaultProductOfCategory(catId) {
        if (!catId) return null;
        const products = Object.values(PRODUCTS_CONFIG).filter((p) => p.category === catId);
        return products[0]?.id ?? null;
    }

    // ── 初始化 category ──────────────────────────────────────
    const initialCategory = getCategoryFromId(props.modelValue) ?? 'Cube';
    const selectedCategory = ref(initialCategory);

    // 初次掛載：若無 modelValue，自動選 Cube 第一個顏色
    if (!props.modelValue) {
        const defaultId = getDefaultProductOfCategory('Cube');
        if (defaultId) emit('update:modelValue', defaultId);
    }

    // ── 當前系列產品清單 ────────────────────────────────────
    const categoryProducts = computed(() =>
        selectedCategory.value
            ? Object.values(PRODUCTS_CONFIG).filter((p) => p.category === selectedCategory.value)
            : []
    );

    // ── 當前已選產品 ────────────────────────────────────────
    const selectedProduct = computed(() => {
        if (!props.modelValue) return null;
        return PRODUCTS_CONFIG[props.modelValue] ?? null;
    });

    // ── 底部資訊條 ──────────────────────────────────────────
    const selectedInfo = computed(() => {
        if (!props.modelValue) return null;
        return selectedProduct.value ? { name: selectedProduct.value.name } : null;
    });

    // ── 選系列 ──────────────────────────────────────────────
    function selectCategory(catId) {
        selectedCategory.value = catId;

        const currentBelongs = selectedProduct.value?.category === catId;
        if (!currentBelongs) {
            const firstId = getDefaultProductOfCategory(catId);
            emit('update:modelValue', firstId);
        }
    }

    // ── 選顏色 ──────────────────────────────────────────────
    function select(id) {
        emit('update:modelValue', id);
    }

    // ── 清除 ────────────────────────────────────────────────
    function clearSelection() {
        selectedCategory.value = null;
        emit('update:modelValue', null);
    }

    // ── 外部 modelValue 改變時同步 category ─────────────────
    watch(
        () => props.modelValue,
        (val) => {
            const cat = getCategoryFromId(val);
            if (cat && cat !== selectedCategory.value) {
                selectedCategory.value = cat;
            }
        }
    );
</script>

<style scoped>
    .picker {
        display: flex;
        flex-direction: column;
        gap: 0;
    }

    /* ══ 機台大圖區 ══ */
    .machine-image-area {
        width: 100%;
        aspect-ratio: 16 / 10;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.03) 0%,
            rgba(255, 255, 255, 0.07) 100%
        );
        border-bottom: 1px solid var(--border-color);
        overflow: hidden;
        position: relative;
    }

    .machine-main-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
        padding: 12px;
        transition: all 0.3s ease;
        filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.4));
    }

    .machine-image-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        color: var(--text-secondary);
        opacity: 0.3;
        font-size: 48px;
    }

    /* ══ 區塊通用 ══ */
    .section-block {
        padding: 10px 14px 12px;
        border-bottom: 1px solid var(--border-color);
    }
    .section-block:last-of-type {
        border-bottom: none;
    }

    /* ══ 區塊標題 ══ */
    .section-label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        color: var(--text-secondary);
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 4px;
    }
    .color-hint {
        font-weight: 400;
        letter-spacing: 0;
        text-transform: none;
        color: var(--text-primary);
    }

    /* ══ 系列 Tabs ══ */
    .category-tabs {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }
    .cat-tab {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 5px 13px;
        border-radius: 20px;
        border: 1px solid var(--border-color);
        background: var(--bg-secondary);
        color: var(--text-secondary);
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
    }
    .cat-tab i {
        font-size: 11px;
    }
    .cat-tab:hover {
        background: var(--sidebar-glass-hover);
        border-color: var(--primary-color);
        color: var(--text-primary);
    }
    .cat-tab.active {
        background: var(--primary-color);
        border-color: var(--primary-color);
        color: #fff;
    }

    /* ══ 顏色色塊 ══ */
    .color-swatches {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        padding: 2px 0;
    }
    .swatch {
        position: relative;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 2px solid transparent;
        background: transparent;
        cursor: pointer;
        padding: 0;
        transition: all 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .swatch:hover {
        transform: scale(1.15);
        border-color: var(--text-secondary);
    }
    .swatch.active {
        border-color: var(--primary-color);
        transform: scale(1.1);
        box-shadow: 0 0 0 2px rgba(100, 138, 220, 0.4);
    }
    .swatch-dot {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 1px solid rgba(0, 0, 0, 0.2);
        display: block;
        box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.25);
        pointer-events: none;
    }
    .swatch-check {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 10px;
        color: #fff;
        text-shadow: 0 0 4px rgba(0, 0, 0, 0.9);
        pointer-events: none;
    }

    /* ══ 已選資訊條 ══ */
    .picker-selected-bar {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 8px 14px;
        padding: 8px 10px;
        background: rgba(100, 132, 220, 0.2);
        border: 1px solid rgba(100, 122, 220, 0.4);
        border-radius: var(--border-radius);
        font-size: 12px;
        font-weight: 500;
        color: var(--text-primary);
    }
    .picker-selected-bar > i {
        color: var(--primary-color);
        font-size: 13px;
        flex-shrink: 0;
    }
    .picker-selected-bar > span {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .unselect-btn {
        border: none;
        background: transparent;
        cursor: pointer;
        color: var(--text-secondary);
        font-size: 11px;
        padding: 0;
        display: flex;
        align-items: center;
        transition: color 0.15s;
    }
    .unselect-btn:hover {
        color: var(--danger-color);
    }

    /* ══ Transitions ══ */
    .fade-enter-active,
    .fade-leave-active {
        transition: opacity 0.25s ease;
    }
    .fade-enter-from,
    .fade-leave-to {
        opacity: 0;
    }

    .fade-slide-enter-active,
    .fade-slide-leave-active {
        transition: all 0.2s ease;
    }
    .fade-slide-enter-from,
    .fade-slide-leave-to {
        opacity: 0;
        transform: translateY(-6px);
    }

    .slide-up-enter-active,
    .slide-up-leave-active {
        transition: all 0.2s ease;
    }
    .slide-up-enter-from,
    .slide-up-leave-to {
        opacity: 0;
        transform: translateY(6px);
    }
</style>
