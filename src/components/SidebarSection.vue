<template>
    <div class="section" :class="{ collapsed: !isOpen }">
        <!-- 標題列（點擊收合）-->
        <button
            class="section-header"
            :class="isOpen ? 'section-header-close' : 'section-header-open'"
            @click="toggle"
        >
            <div class="section-title">
                <i :class="icon"></i>
                <span>{{ title }}</span>
            </div>
            <i class="toggle-icon fas" :class="isOpen ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
        </button>
        <!-- 內容（收合動畫）-->
        <Transition name="collapse">
            <div v-show="isOpen" class="section-body">
                <slot />
            </div>
        </Transition>
    </div>
</template>
<script setup>
    import { ref } from 'vue';
    const props = defineProps({
        title: { type: String, required: true },
        icon: { type: String, default: 'fas fa-circle' },
        defaultOpen: { type: Boolean, default: true }
    });
    const isOpen = ref(props.defaultOpen);
    const toggle = () => {
        isOpen.value = !isOpen.value;
    };
</script>
<style scoped>
    /* ── 外層容器 ── */
    .section {
        margin-bottom: 0.75rem;
        border-radius: var(--border-radius-lg);
        overflow: hidden;
        background: transparent;
        border: none;
        box-shadow: var(--bubble-shadow);
    }
    .section:last-child {
        margin-bottom: 0;
    }
    /* ── 標題列 ── */
    .section-header {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        /* 藍色玻璃感 */
        background: var(--sidebar-glass-header);
        border: 1px solid var(--sidebar-glass-border);
        border-radius: var(--border-radius-lg);
        cursor: pointer;
        transition:
            background var(--transition-fast),
            box-shadow var(--transition-fast);
        user-select: none;
    }
    .section-header:hover {
        /* hover 時加深藍色 + 輕微光暈 */
        background: var(--sidebar-glass-hover);
        box-shadow: 0 2px 12px rgba(60, 130, 191, 0.1);
    }
    /* 展開時：底部無圓角（與 body 接合）*/
    .section-header-close {
        border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
        border-bottom-color: transparent;
    }
    /* 收合時：完整圓角 */
    .section-header-open {
        border-radius: var(--border-radius-lg);
    }
    /* ── 標題文字 ── */
    .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1rem;
        font-weight: 700;
        color: var(--primary-color);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    /* 亮色主題：文字用主色藍 */
    :root:not([data-theme='dark']) .section-title {
        color: var(--primary-color);
    }
    /* 暗色主題：文字改為淡藍白，確保可讀性 */
    [data-theme='dark'] .section-title {
        color: rgba(160, 210, 255, 0.92);
    }
    .section-title i {
        font-size: 13px;
        width: 15px;
        text-align: center;
        /* 亮色：藍色 icon */
        color: var(--primary-color);
        opacity: 0.85;
    }
    [data-theme='dark'] .section-title i {
        color: rgba(120, 185, 240, 0.9);
    }
    /* ── 收合箭頭 ── */
    .toggle-icon {
        font-size: 10px;
        color: var(--primary-color);
        opacity: 0.6;
        transition:
            transform var(--transition-fast),
            opacity var(--transition-fast);
    }
    [data-theme='dark'] .toggle-icon {
        color: rgba(120, 185, 240, 0.7);
    }
    .section-header:hover .toggle-icon {
        opacity: 1;
    }
    .collapsed .toggle-icon {
        transform: rotate(-90deg);
    }
    /* ── 內容區 ── */
    .section-body {
        overflow: hidden;
        background: var(--sidebar-glass-body);
        border: 1px solid var(--sidebar-glass-border);
        border-top: none;
        border-radius: 0 0 var(--border-radius-lg) var(--border-radius-lg);
    }
    /* ── 收合動畫 ── */
    .collapse-enter-active,
    .collapse-leave-active {
        transition: all 0.24s ease;
        max-height: 800px;
        overflow: hidden;
    }
    .collapse-enter-from,
    .collapse-leave-to {
        max-height: 0;
        opacity: 0;
    }
</style>
