<!-- src/components/LeftSidebar.vue -->
<template>
    <div class="sidebar">
        <div class="sidebar-scroll">
            <!-- 機台選擇：3D 模式下仍可操作 -->
            <SidebarSection :title="machineSectionTitle" icon="fas fa-box" :default-open="true">
                <MachinePicker
                    :model-value="selectedMachine"
                    @update:model-value="$emit('update:selected-machine', $event)"
                />
            </SidebarSection>

            <Transition name="fade-slide">
                <div v-if="!hasMachine" class="no-machine-tip">
                    <i class="fas fa-arrow-up"></i>
                    <span>請先選擇機台以解鎖設計工具</span>
                </div>
            </Transition>

            <template v-if="hasMachine">
                <!-- 3D 模式提示 -->
                <Transition name="fade-slide">
                    <div v-if="is3DMode" class="mode-tip mode-tip--3d">
                        <i class="fas fa-cube"></i>
                        <span>3D 預覽模式中，切回 2D 編輯以使用設計工具</span>
                    </div>
                </Transition>

                <!-- 調整工具 -->
                <SidebarSection
                    title="調整工具"
                    icon="fas fa-sliders-h"
                    :default-open="true"
                    :disabled="is3DMode"
                >
                    <template v-if="is3DMode">
                        <div class="disabled-overlay">
                            <i class="fas fa-lock"></i>
                            <span>3D 預覽中不可使用</span>
                        </div>
                    </template>
                    <template v-else>
                        <ObjectProperties
                            :object-type="selectedObjectType"
                            :props="selectedProps"
                            @update="$emit('update-object', $event)"
                            @delete="$emit('delete-selected')"
                        />
                    </template>
                </SidebarSection>

                <!-- 文字工具 -->
                <SidebarSection
                    title="文字工具"
                    icon="fas fa-font"
                    :default-open="false"
                    :disabled="is3DMode"
                >
                    <template v-if="is3DMode">
                        <div class="disabled-overlay">
                            <i class="fas fa-lock"></i>
                            <span>3D 預覽中不可使用</span>
                        </div>
                    </template>
                    <template v-else>
                        <TextEditor @add-text="$emit('add-text', $event)" />
                    </template>
                </SidebarSection>

                <!-- 圖片上傳 -->
                <SidebarSection
                    title="圖片上傳"
                    icon="fas fa-image"
                    :default-open="false"
                    :disabled="is3DMode"
                >
                    <template v-if="is3DMode">
                        <div class="disabled-overlay">
                            <i class="fas fa-lock"></i>
                            <span>3D 預覽中不可使用</span>
                        </div>
                    </template>
                    <template v-else>
                        <ImageUploader @upload-image="$emit('upload-image', $event)" />
                    </template>
                </SidebarSection>

                <!-- 背景設定 -->
                <SidebarSection
                    title="背景設定"
                    icon="fas fa-fill-drip"
                    :default-open="false"
                    :disabled="is3DMode"
                >
                    <template v-if="is3DMode">
                        <div class="disabled-overlay">
                            <i class="fas fa-lock"></i>
                            <span>3D 預覽中不可使用</span>
                        </div>
                    </template>
                    <template v-else>
                        <BackgroundSetting
                            :model-value="sceneBackground"
                            @change-background="$emit('change-background', $event)"
                        />
                    </template>
                </SidebarSection>
            </template>
        </div>
    </div>
</template>

<script setup>
    import { computed } from 'vue';
    import SidebarSection from './SidebarSection.vue';
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

    const hasMachine = computed(() => props.selectedMachine !== null);

    const selectedMachineName = computed(() => {
        if (!props.selectedMachine) return null;
        return PRODUCTS_CONFIG[props.selectedMachine]?.name ?? props.selectedMachine;
    });

    const machineSectionTitle = computed(() => {
        if (!selectedMachineName.value) return `選擇機台`;
        return `選擇機台  ${selectedMachineName.value}`;
    });
</script>

<style scoped>
    .sidebar {
        background: transparent !important;
        border: none;
        box-shadow: none !important;
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .sidebar-scroll {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
    }
    .sidebar-scroll::-webkit-scrollbar {
        width: 4px;
    }
    .sidebar-scroll::-webkit-scrollbar-thumb {
        background: var(--border-color);
    }

    .no-machine-tip {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 4px 0 8px;
        padding: 10px 14px;
        border-radius: var(--border-radius);
        background: rgba(150, 100, 220, 0.08);
        border: 1px dashed rgba(150, 100, 220, 0.3);
        font-size: 12px;
        color: var(--text-secondary);
    }
    .no-machine-tip i {
        color: var(--primary-color);
        font-size: 13px;
        flex-shrink: 0;
    }

    /* ══ 3D 模式提示 ══ */
    .mode-tip {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 4px 14px 8px;
        padding: 10px 14px;
        border-radius: var(--border-radius);
        font-size: 12px;
        line-height: 1.4;
    }
    .mode-tip--3d {
        background: rgba(60, 130, 191, 0.1);
        border: 1px dashed rgba(60, 130, 191, 0.35);
        color: var(--text-secondary);
    }
    .mode-tip--3d i {
        color: var(--primary-color);
        font-size: 13px;
        flex-shrink: 0;
    }

    /* ══ 禁用覆蓋層 ══ */
    .disabled-overlay {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 20px 14px;
        color: var(--text-secondary);
        font-size: 12px;
        opacity: 0.6;
    }
    .disabled-overlay i {
        font-size: 14px;
        opacity: 0.5;
    }

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
