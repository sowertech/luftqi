<!-- src/components/LeftSidebar.vue -->
<template>
    <div class="sidebar">
        <div class="sidebar-scroll">
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
                <SidebarSection title="調整工具" icon="fas fa-sliders-h" :default-open="true">
                    <ObjectProperties
                        :object-type="selectedObjectType"
                        :props="selectedProps"
                        @update="$emit('update-object', $event)"
                        @delete="$emit('delete-selected')"
                    />
                </SidebarSection>

                <SidebarSection title="文字工具" icon="fas fa-font" :default-open="false">
                    <TextEditor @add-text="$emit('add-text', $event)" />
                </SidebarSection>

                <SidebarSection title="圖片上傳" icon="fas fa-image" :default-open="false">
                    <ImageUploader @upload-image="$emit('upload-image', $event)" />
                </SidebarSection>

                <!--  修正：prop 改為 model-value，對應 BackgroundSetting 的 defineProps -->
                <SidebarSection title="背景設定" icon="fas fa-fill-drip" :default-open="false">
                    <BackgroundSetting
                        :model-value="sceneBackground"
                        @change-background="$emit('change-background', $event)"
                    />
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
        sceneBackground: { type: String, default: null }, //  改為 sceneBackground
        selectedObjectType: { type: String, default: null },
        selectedProps: { type: Object, default: () => ({}) },
        selectedMachine: { type: String, default: null }
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
        if (props.selectedMachine === 'pure') return '純設計稿';
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
