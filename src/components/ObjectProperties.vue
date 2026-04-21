<!-- src/components/ObjectProperties.vue -->
<template>
    <div v-if="objectType" class="obj-props">
        <!-- ── 文字內容 ── -->
        <div v-if="objectType === 'text'" class="form-group">
            <label>文字內容</label>
            <textarea
                :value="props.text"
                class="form-control"
                rows="3"
                @input="emit('update', { text: $event.target.value })"
            />
        </div>

        <!-- ── 字型 & 大小 ── -->
        <div v-if="objectType === 'text'" class="form-row">
            <div class="form-group">
                <label>字型</label>
                <select
                    :value="props.fontFamily"
                    class="form-control"
                    @change="emit('update', { fontFamily: $event.target.value })"
                >
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
                    :value="props.fontSize"
                    type="number"
                    class="form-control"
                    min="8"
                    max="300"
                    @input="emit('update', { fontSize: Number($event.target.value) })"
                />
            </div>
        </div>

        <!-- ── 粗體 / 斜體 ── -->
        <div v-if="objectType === 'text'" class="form-group">
            <label>樣式</label>
            <div class="toggle-row">
                <button
                    :class="['style-btn', { active: props.bold }]"
                    @click="emit('update', { bold: !props.bold })"
                >
                    <b>B</b>
                </button>
                <button
                    :class="['style-btn', { active: props.italic }]"
                    @click="emit('update', { italic: !props.italic })"
                >
                    <i>I</i>
                </button>
            </div>
        </div>

        <!-- ── 文字顏色 ── -->
        <div v-if="objectType === 'text'" class="form-group">
            <label>文字顏色</label>
            <div class="color-row">
                <input
                    :value="props.color"
                    type="color"
                    class="color-input"
                    @input="emit('update', { color: $event.target.value })"
                />
                <span class="color-value">{{ props.color }}</span>
            </div>
        </div>

        <div class="divider"></div>

        <!-- ── 旋轉 ── -->
        <div class="form-group">
            <label>旋轉角度：{{ props.rotation ?? 0 }}°</label>
            <div class="slider-row">
                <input
                    :value="props.rotation ?? 0"
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    class="slider"
                    @input="emit('update', { rotation: Number($event.target.value) })"
                />
                <input
                    :value="props.rotation ?? 0"
                    type="number"
                    class="form-control num-input"
                    min="0"
                    max="360"
                    @input="emit('update', { rotation: Number($event.target.value) })"
                />
            </div>
        </div>

        <!-- ── 透明度 ── -->
        <div class="form-group">
            <!-- opacity 儲存為 0~1，顯示時 × 100 -->
            <label>透明度：{{ props.opacity }}%</label>
            <input
                :value="props.opacity"
                type="range"
                min="0"
                max="100"
                step="1"
                class="slider"
                @input="emit('update', { opacity: Number($event.target.value) / 100 })"
            />
        </div>

        <!-- ── 寬高 ── -->
        <div class="form-row">
            <div class="form-group">
                <label>寬度</label>
                <input
                    :value="props.width"
                    type="number"
                    class="form-control"
                    min="10"
                    @input="emit('update', { width: Number($event.target.value) })"
                />
            </div>
            <div class="form-group">
                <label>高度</label>
                <input
                    :value="props.height"
                    type="number"
                    class="form-control"
                    min="10"
                    @input="emit('update', { height: Number($event.target.value) })"
                />
            </div>
        </div>

        <!-- ── 位置 ── -->
        <div class="form-row">
            <div class="form-group">
                <label>X</label>
                <input
                    :value="props.x"
                    type="number"
                    class="form-control"
                    @input="emit('update', { x: Number($event.target.value) })"
                />
            </div>
            <div class="form-group">
                <label>Y</label>
                <input
                    :value="props.y"
                    type="number"
                    class="form-control"
                    @input="emit('update', { y: Number($event.target.value) })"
                />
            </div>
        </div>

        <!-- ── 圖片濾鏡（圖片專用）── -->
        <template v-if="objectType === 'image'">
            <div class="divider"></div>

            <!-- 亮度 -->
            <div class="form-group">
                <div class="label-row">
                    <label>亮度</label>
                    <span class="value-badge">{{ props.brightness ?? 0 }}</span>
                </div>
                <div class="slider-row">
                    <span
                        class="slider-cap"
                        @click="
                            emit('update', {
                                brightness: Math.max(-100, (props.brightness ?? 0) - 1)
                            })
                        "
                        >−</span
                    >
                    <input
                        :value="props.brightness ?? 0"
                        type="range"
                        min="-100"
                        max="100"
                        step="1"
                        class="slider slider--bipolar"
                        @input="emit('update', { brightness: Number($event.target.value) })"
                    />
                    <span
                        class="slider-cap"
                        @click="
                            emit('update', {
                                brightness: Math.min(100, (props.brightness ?? 0) + 1)
                            })
                        "
                        >＋</span
                    >
                </div>
            </div>
            <!-- 對比 -->
            <div class="form-group">
                <div class="label-row">
                    <label>對比</label>
                    <span class="value-badge">{{ props.contrast ?? 0 }}</span>
                </div>
                <div class="slider-row">
                    <span
                        class="slider-cap"
                        @click="
                            emit('update', { contrast: Math.max(-100, (props.contrast ?? 0) - 1) })
                        "
                        >−</span
                    >
                    <input
                        :value="props.contrast ?? 0"
                        type="range"
                        min="-100"
                        max="100"
                        step="1"
                        class="slider slider--bipolar"
                        @input="emit('update', { contrast: Number($event.target.value) })"
                    />
                    <span
                        class="slider-cap"
                        @click="
                            emit('update', { contrast: Math.min(100, (props.contrast ?? 0) + 1) })
                        "
                        >＋</span
                    >
                </div>
            </div>
        </template>

        <!-- ── 刪除 ── -->
        <button class="delete-btn btn" @click="emit('delete')">
            <i class="fas fa-trash-alt"></i>
            刪除物件
        </button>
    </div>

    <!-- 未選取提示 -->
    <div v-else class="no-select">
        <i class="fas fa-mouse-pointer"></i>
        <span>點選畫布物件<br />以編輯屬性</span>
    </div>
</template>

<script setup>
    defineProps({
        objectType: { type: String, default: null },
        props: { type: Object, default: () => ({}) }
    });

    const emit = defineEmits(['update', 'delete']);
</script>

<style scoped>
    /* ══════════════════════════════════════════════════
   容器
══════════════════════════════════════════════════ */
    .obj-props {
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    /* ══════════════════════════════════════════════════
   未選取提示
══════════════════════════════════════════════════ */
    .no-select {
        padding: 32px 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        color: var(--text-secondary);
        font-size: 13px;
        text-align: center;
        line-height: 1.8;
    }
    .no-select i {
        font-size: 32px;
        opacity: 0.7;
        color: var(--primary-color);
    }

    /* ══════════════════════════════════════════════════
   Form Group
══════════════════════════════════════════════════ */
    .form-group {
        margin-bottom: 12px;
    }

    .form-group label {
        display: block;
        margin-bottom: 6px;
        font-size: 12px;
        font-weight: 500;
        color: var(--text-secondary); /* ★ 統一用 token，跟 TextEditor 一致 */
    }

    /* ══════════════════════════════════════════════════
   Input / Select / Textarea
   ★ 統一用 CSS token，跟 TextEditor 風格一致
══════════════════════════════════════════════════ */
    .form-control {
        width: 100%;
        padding: 7px 10px;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        font-size: 13px;
        box-sizing: border-box;
        background: var(--bg-primary); /* ★ 乾淨白底 / 暗色黑底 */
        color: var(--text-primary);
        transition:
            border-color var(--transition-fast),
            box-shadow var(--transition-fast);
    }
    .form-control:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(60, 130, 191, 0.12);
    }

    /* select option */
    .form-control option {
        background: var(--bg-primary);
        color: var(--text-primary);
    }

    textarea.form-control {
        resize: vertical;
        min-height: 64px;
    }

    /* ══════════════════════════════════════════════════
   兩欄排列
══════════════════════════════════════════════════ */
    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
    }

    /* ══════════════════════════════════════════════════
   Slider
══════════════════════════════════════════════════ */
    .slider-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .slider {
        flex: 1;
        accent-color: var(--primary-color);
        cursor: pointer;
        height: 4px;
    }

    /* 雙向 slider（−100 ~ +100）：中間對齊的視覺軌道 */
    .slider--bipolar {
        /* 用 background track 表現「從中心出發」的感覺 */
        accent-color: var(--primary-color);
    }

    .slider-cap {
        font-size: 14px;
        font-weight: 700;
        color: var(--text-secondary);
        min-width: 12px;
        text-align: center;
        user-select: none;
        line-height: 1;
        cursor: pointer;
    }

    .num-input {
        width: 64px;
        flex-shrink: 0;
        text-align: center;
        padding: 5px 4px;
    }

    /* label 右側數值標籤 */
    .label-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
    }
    .label-row label {
        margin-bottom: 0; /* 覆蓋 form-group label 的 margin */
    }
    .value-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 1px 7px;
        border-radius: var(--border-radius-pill);
        background: var(--primary-light);
        color: var(--primary-color);
        min-width: 36px;
        text-align: center;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.02em;
        /* 數值改變時平滑過渡底色 */
        transition: background var(--transition-fast);
    }
    /* 正值：藍色；負值：橘紅提示 */
    .value-badge--positive {
        background: rgba(60, 130, 191, 0.15);
        color: var(--primary-color);
    }
    .value-badge--negative {
        background: rgba(220, 100, 60, 0.12);
        color: #dc643c;
    }

    /* ══════════════════════════════════════════════════
   顏色選取
══════════════════════════════════════════════════ */
    .color-row {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .color-input {
        width: 44px;
        height: 34px;
        border: none;
        border-radius: var(--border-radius);
        cursor: pointer;
        padding: 2px;
        background: none;
    }
    .color-value {
        font-size: 12px;
        color: var(--text-secondary);
        font-family: monospace;
    }

    /* ══════════════════════════════════════════════════
   粗體 / 斜體 toggle
══════════════════════════════════════════════════ */
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

    /* ══════════════════════════════════════════════════
   分隔線
══════════════════════════════════════════════════ */
    .divider {
        height: 1px;
        background: var(--border-color);
        margin: 6px 0 14px;
    }

    /* ══════════════════════════════════════════════════
   刪除按鈕
══════════════════════════════════════════════════ */
    .delete-btn {
        width: 100%;
        padding: 9px;
        margin-top: 8px;
        background: rgba(220, 53, 69, 0.07);
        border: 1px solid rgba(220, 53, 69, 0.22);
        color: var(--danger-color);
        border-radius: var(--border-radius);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all var(--transition-fast);
    }
    .delete-btn:hover {
        background: var(--danger-color);
        border-color: transparent;
        color: #fff;
        box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
    }
</style>
