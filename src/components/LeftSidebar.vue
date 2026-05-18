<!-- src/components/LeftSidebar.vue -->
<template>
    <div class="sidebar-shell">
        <!-- ① 左側細條：圖示導航 -->
        <nav class="sidebar-nav">
            <!-- 機台選擇 -->
            <button
                class="nav-item"
                :class="{ active: activeTab === 'machine' }"
                title="選擇機台"
                @click="setTab('machine')"
            >
                <i class="fas fa-box"></i>
                <span class="nav-label">機台</span>
            </button>

            <template v-if="hasMachine && !is3DMode">
                <!-- 調整工具：有選取物件才可點 -->
                <button
                    class="nav-item"
                    :class="{
                        active: activeTab === 'adjust',
                        'nav-item--disabled': !hasSelectedObject
                    }"
                    :title="hasSelectedObject ? '調整工具' : '請先點選畫布物件'"
                    @click="hasSelectedObject && setTab('adjust')"
                >
                    <i class="fas fa-sliders-h"></i>
                    <span class="nav-label">調整</span>
                </button>

                <!-- 文字工具 -->
                <button
                    class="nav-item"
                    :class="{ active: activeTab === 'text' }"
                    title="文字工具"
                    @click="setTab('text')"
                >
                    <i class="fas fa-font"></i>
                    <span class="nav-label">文字</span>
                </button>

                <!-- 圖片上傳 -->
                <button
                    class="nav-item"
                    :class="{ active: activeTab === 'image' }"
                    title="圖片上傳"
                    @click="setTab('image')"
                >
                    <i class="fas fa-image"></i>
                    <span class="nav-label">圖片</span>
                </button>

                <!-- 背景設定 -->
                <button
                    class="nav-item"
                    :class="{ active: activeTab === 'background' }"
                    title="背景設定"
                    @click="setTab('background')"
                >
                    <i class="fas fa-fill-drip"></i>
                    <span class="nav-label">背景</span>
                </button>
            </template>

            <!-- 3D 模式：顯示鎖定圖示 -->
            <template v-if="hasMachine && is3DMode">
                <div class="nav-item nav-item--disabled" title="3D 預覽中不可使用">
                    <i class="fas fa-lock"></i>
                    <span class="nav-label">鎖定</span>
                </div>
            </template>
        </nav>

        <!-- ② 右側面板 -->
        <!-- ★ 需求2：移除 Transition，直接 v-if -->
        <div v-if="activeTab" class="sidebar-panel">
            <!-- 面板標題 -->
            <div class="panel-header">
                <span class="panel-title">{{ panelTitle }}</span>
            </div>

            <!-- 面板內容 -->
            <div class="panel-body">
                <!-- 機台選擇 -->
                <div v-if="activeTab === 'machine'">
                    <MachinePicker
                        :model-value="selectedMachine"
                        @update:model-value="$emit('update:selected-machine', $event)"
                    />
                    <Transition name="fade-slide">
                        <div v-if="!hasMachine" class="tip tip--hint">
                            <i class="fas fa-arrow-up"></i>
                            <span>請先選擇機台以解鎖設計工具</span>
                        </div>
                    </Transition>
                </div>

                <!-- 調整工具 -->
                <div v-else-if="activeTab === 'adjust'">
                    <ObjectProperties
                        :object-type="selectedObjectType"
                        :props="selectedProps"
                        @update="$emit('update-object', $event)"
                        @delete="$emit('delete-selected')"
                    />
                </div>

                <!-- 文字工具 -->
                <div v-else-if="activeTab === 'text'">
                    <TextEditor @add-text="$emit('add-text', $event)" />
                </div>

                <!-- 圖片上傳 -->
                <div v-else-if="activeTab === 'image'">
                    <ImageUploader @upload-image="$emit('upload-image', $event)" />
                </div>

                <!-- 背景設定 -->
                <div v-else-if="activeTab === 'background'">
                    <BackgroundSetting
                        :model-value="sceneBackground"
                        @change-background="$emit('change-background', $event)"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, computed, watch } from 'vue';
    import TextEditor from './TextEditor.vue';
    import ImageUploader from './ImageUploader.vue';
    import BackgroundSetting from './BackgroundSetting.vue';
    import ObjectProperties from './ObjectProperties.vue';
    import MachinePicker from './MachinePicker.vue';
    import { PRODUCTS_CONFIG } from '../config/products';

    const props = defineProps({
        sceneBackground: { type: String, default: null },
        selectedObjectType: { type: String, default: null },
        selectedProps: { type: Object, default: () => ({}) },
        selectedMachine: { type: String, default: null },
        is3DMode: { type: Boolean, default: false }
    });

    defineEmits([
        'add-text',
        'upload-image',
        'change-background',
        'update-object',
        'delete-selected',
        'update:selected-machine'
    ]);

    // ── 狀態 ──────────────────────────────────────────
    const activeTab = ref('machine');

    const hasMachine = computed(() => props.selectedMachine !== null);

    // ★ 需求1：是否有選取物件
    const hasSelectedObject = computed(() => !!props.selectedObjectType);

    const selectedMachineName = computed(() => {
        if (!props.selectedMachine) return null;
        return PRODUCTS_CONFIG[props.selectedMachine]?.name ?? props.selectedMachine;
    });

    const TAB_TITLES = {
        machine: '選擇機台',
        adjust: '調整工具',
        text: '文字工具',
        image: '圖片上傳',
        background: '背景設定'
    };

    const panelTitle = computed(() => {
        if (activeTab.value === 'machine' && selectedMachineName.value) {
            return `機台｜${selectedMachineName.value}`;
        }
        return TAB_TITLES[activeTab.value] ?? '';
    });

    // ── 方法 ──────────────────────────────────────────
    function setTab(tab) {
        // ★ 需求2：再次點擊同一個 tab 不做任何事，不收合
        if (activeTab.value === tab) return;
        activeTab.value = tab;
    }

    // ── Watch ──────────────────────────────────────────
    // 切換 3D 模式時，若目前面板不是 machine，切回 machine
    watch(
        () => props.is3DMode,
        (val) => {
            if (val && activeTab.value !== 'machine') {
                activeTab.value = 'machine';
            }
        }
    );

    // ★ 需求1：點選畫布物件時，自動跳到調整面板
    watch(
        () => props.selectedObjectType,
        (val) => {
            if (val) {
                // 有選取物件 → 自動切到調整
                activeTab.value = 'adjust';
            } else {
                // 取消選取 → 若目前在調整頁，切回文字頁
                if (activeTab.value === 'adjust') {
                    activeTab.value = 'text';
                }
            }
        }
    );

    // ★ 需求1：物件被刪除時，離開 adjust
    watch(
        () => props.selectedObjectType,
        (val, oldVal) => {
            if (!val && oldVal && activeTab.value === 'adjust') {
                activeTab.value = 'text';
            }
        }
    );
</script>

<style scoped>
    /* ═══════════════════════════════════════
       外層容器
    ═══════════════════════════════════════ */
    .sidebar-shell {
        display: flex;
        flex-direction: row;
        width: 100%;
        height: 100%;
        position: relative;
        padding: 1.5rem 0 1.5rem 1.5rem;
    }

    /* ═══════════════════════════════════════
       左側細條導航
    ═══════════════════════════════════════ */
    .sidebar-nav {
        width: 64px;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px 0;
        gap: 4px;
        background: var(--sidebar-nav-bg);
        border-right: 1px solid var(--sidebar-panel-border);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border-radius: var(--border-radius-lg);
    }

    .nav-item {
        width: 48px;
        height: 48px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        border: none;
        border-radius: var(--border-radius);
        background: transparent;
        cursor: pointer;
        color: var(--text-secondary);
        transition:
            background 0.18s,
            color 0.18s,
            transform 0.12s;
        user-select: none;
    }

    .nav-item:hover:not(.nav-item--disabled) {
        background: var(--sidebar-glass-hover);
        color: var(--text-primary);
        transform: scale(1.04);
    }

    .nav-item.active {
        background: var(--primary-light);
        color: var(--primary-color);
        box-shadow: 0 0 0 1px rgba(60, 130, 191, 0.35);
    }

    /* ★ disabled 樣式：半透明 + 禁用游標 */
    .nav-item--disabled {
        opacity: 0.3;
        cursor: not-allowed;
        pointer-events: none;
    }

    /* ★ adjust 特殊：可顯示 tooltip 但不可點 */
    .nav-item[title]:not([title='調整工具']).nav-item--disabled {
        pointer-events: auto; /* 保留 hover tooltip */
    }

    .nav-item i {
        font-size: 18px;
        line-height: 1;
    }

    .nav-label {
        font-size: 0.8rem;
        letter-spacing: 0.02em;
        line-height: 1;
        color: var(--text-secondary);
    }

    /* ═══════════════════════════════════════
       右側內容面板
    ═══════════════════════════════════════ */
    .sidebar-panel {
        width: calc(100% - 64px - 0.5rem);
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        margin-left: 0.5rem;
        border-radius: var(--border-radius-lg);
        background: var(--sidebar-panel-bg);
        border: 1px solid var(--sidebar-panel-border);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        box-shadow: var(--bubble-shadow);
        transition:
            background 0.3s ease,
            border-color 0.3s ease;
    }

    .panel-header {
        display: flex;
        height: 52px;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px 10px;
        border-bottom: 1px solid var(--sidebar-panel-border);
        flex-shrink: 0;
        background: var(--sidebar-glass-header);
        border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
    }

    .panel-title {
        font-size: 1.2rem;
        font-weight: 600;
        color: var(--text-primary);
        letter-spacing: 0.04em;
    }

    .panel-body {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 12px;
    }
    .panel-body::-webkit-scrollbar {
        width: 4px;
    }
    .panel-body::-webkit-scrollbar-thumb {
        background: var(--border-color);
        border-radius: 2px;
    }

    .tip {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 12px;
        padding: 10px 12px;
        border-radius: 8px;
        font-size: 12px;
        color: var(--text-secondary);
        line-height: 1.4;
    }
    .tip--hint {
        background: rgba(150, 100, 220, 0.08);
        border: 1px dashed rgba(150, 100, 220, 0.3);
    }
    .tip i {
        color: var(--primary-color);
        font-size: 13px;
        flex-shrink: 0;
    }

    /* ═══════════════════════════════════════
       淡入淡出（提示訊息）
    ═══════════════════════════════════════ */
    .fade-slide-enter-active,
    .fade-slide-leave-active {
        transition: all 0.22s ease;
    }
    .fade-slide-enter-from,
    .fade-slide-leave-to {
        opacity: 0;
        transform: translateY(-6px);
    }
</style>
