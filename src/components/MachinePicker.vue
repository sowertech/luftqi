<!-- src/components/MachinePicker.vue -->
<template>
    <div class="picker">
        <!-- 搜尋框 -->
        <div class="picker-search">
            <i class="fas fa-search"></i>
            <input v-model="searchQuery" type="text" placeholder="搜尋機台..." />
            <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <!-- 機台列表 -->
        <div class="picker-list">
            <!-- 純設計稿 -->
            <div
                :class="['picker-item', { active: modelValue === 'pure' }]"
                @click="select('pure')"
            >
                <div class="picker-thumb picker-thumb--icon">
                    <i class="fas fa-layer-group"></i>
                </div>
                <div class="picker-info">
                    <div class="picker-name">純設計稿</div>
                    <div class="picker-desc">不套用機台外觀</div>
                </div>
                <i v-if="modelValue === 'pure'" class="fas fa-check-circle check-icon"></i>
            </div>

            <!-- 分隔 -->
            <div class="picker-divider">機台列表</div>

            <!-- 產品 -->
            <div
                v-for="product in filteredProducts"
                :key="product.id"
                :class="['picker-item', { active: modelValue === product.id }]"
                @click="select(product.id)"
            >
                <div class="picker-thumb">
                    <img :src="product.thumbnail" :alt="product.name" loading="lazy" />
                </div>
                <div class="picker-info">
                    <div class="picker-name">{{ product.name }}</div>
                </div>
                <i v-if="modelValue === product.id" class="fas fa-check-circle check-icon"></i>
            </div>

            <!-- 無結果 -->
            <div v-if="filteredProducts.length === 0" class="picker-empty">
                <i class="fas fa-search"></i>
                <span>找不到符合的機台</span>
            </div>
        </div>

        <!-- 已選資訊條 -->
        <Transition name="slide-up">
            <div v-if="selectedInfo" class="picker-selected-bar">
                <i class="fas fa-check-circle"></i>
                <span>{{ selectedInfo.name }}</span>
                <button class="unselect-btn" @click="select(null)">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </Transition>
    </div>
</template>

<script setup>
    import { ref, computed } from 'vue';
    import { PRODUCTS_CONFIG } from '../config/products';

    const props = defineProps({
        modelValue: { type: String, default: null }
    });

    const emit = defineEmits(['update:modelValue']);

    const searchQuery = ref('');

    const allProducts = computed(() => Object.values(PRODUCTS_CONFIG));

    const filteredProducts = computed(() => {
        const q = searchQuery.value.trim().toLowerCase();
        if (!q) return allProducts.value;
        return allProducts.value.filter((p) => p.name.toLowerCase().includes(q));
    });

    // 已選資訊（純設計稿 or 產品）
    const selectedInfo = computed(() => {
        if (!props.modelValue) return null;
        if (props.modelValue === 'pure') return { name: '純設計稿' };
        return PRODUCTS_CONFIG[props.modelValue]
            ? { name: PRODUCTS_CONFIG[props.modelValue].name }
            : null;
    });

    const select = (id) => {
        emit('update:modelValue', id);
    };
</script>

<style scoped>
    .picker {
        display: flex;
        flex-direction: column;
        gap: 0;
    }

    /* ── 搜尋框 ── */
    .picker-search {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 10px 12px 6px;
        padding: 6px 10px;
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
    }
    .picker-search i {
        font-size: 11px;
        color: var(--text-secondary);
        flex-shrink: 0;
    }
    .picker-search input {
        flex: 1;
        border: none;
        background: transparent;
        font-size: 12px;
        color: var(--text-primary);
        outline: none;
        min-width: 0;
    }
    .picker-search input::placeholder {
        color: var(--text-secondary);
    }
    .clear-btn {
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
    .clear-btn:hover {
        color: var(--danger-color);
    }

    /* ── 列表 ── */
    .picker-list {
        max-height: 260px;
        overflow-y: auto;
        padding: 0 8px 8px;
    }
    .picker-list::-webkit-scrollbar {
        width: 3px;
    }
    .picker-list::-webkit-scrollbar-thumb {
        background: var(--border-color);
        border-radius: 2px;
    }

    /* ── 分隔標題 ── */
    .picker-divider {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        color: var(--text-secondary);
        padding: 8px 6px 4px;
        opacity: 0.7;
    }

    /* ── 機台項目 ── */
    .picker-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 8px;
        border-radius: var(--border-radius);
        cursor: pointer;
        transition: all 0.15s;
        border: 1px solid transparent;
        margin-bottom: 2px;
    }
    .picker-item:hover {
        background: var(--sidebar-glass-hover);
        border-color: var(--sidebar-glass-border);
    }
    .picker-item.active {
        background: rgba(100, 138, 220, 0.3);
        border-color: var(--primary-color);
    }

    /* 縮圖 */
    .picker-thumb {
        width: 36px;
        height: 36px;
        border-radius: var(--border-radius);
        overflow: hidden;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        flex-shrink: 0;
    }
    .picker-thumb img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
    .picker-thumb--icon {
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .picker-thumb--icon i {
        font-size: 15px;
        color: var(--primary-color);
    }

    /* 文字 */
    .picker-info {
        flex: 1;
        min-width: 0;
    }
    .picker-name {
        font-size: 12px;
        font-weight: 500;
        color: var(--text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .picker-desc {
        font-size: 11px;
        color: var(--text-secondary);
    }

    /* 勾選圖示 */
    .check-icon {
        color: var(--primary-color);
        font-size: 14px;
        flex-shrink: 0;
    }

    /* 無結果 */
    .picker-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 20px;
        color: var(--text-secondary);
        font-size: 12px;
        text-align: center;
    }
    .picker-empty i {
        font-size: 20px;
        opacity: 0.4;
    }

    /* ── 已選資訊條 ── */
    .picker-selected-bar {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0 8px 10px;
        padding: 8px 10px;
        background: rgba(100, 132, 220, 0.4);
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
        flex-shrink: 0;
    }
    .unselect-btn:hover {
        color: var(--danger-color);
    }

    /* ── Transition ── */
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
