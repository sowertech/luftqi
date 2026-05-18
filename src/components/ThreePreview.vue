<!-- src/components/ThreePreview.vue -->
<template>
    <div class="three-container">
        <div ref="mountRef" class="three-mount"></div>

        <div v-if="isLoading" class="three-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>{{ loadingText }}</span>
        </div>

        <div v-if="loadError" class="three-error">
            <i class="fas fa-exclamation-triangle"></i>
            <span>{{ loadError }}</span>
        </div>

        <div class="three-hint">
            <i class="fas fa-mouse-pointer"></i>
            拖曳旋轉・滾輪縮放・右鍵平移
        </div>

        <div class="three-controls">
            <button class="ctrl-btn" title="重置視角" @click="resetCamera">
                <i class="fas fa-home"></i>
            </button>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
    import * as THREE from 'three';
    import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
    import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
    import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
    import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
    import { DEFAULT_ZONE_COLORS, DEFAULT_ZONE_RATIO } from '../config/products.js';
    import { assetUrl } from '../utils/path';

    THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
    THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
    THREE.Mesh.prototype.raycast = acceleratedRaycast;

    const props = defineProps({
        designImageUrl: { type: String, default: '' },
        productConfig: { type: Object, default: null },
        machineCategory: { type: String, default: null }
    });

    const mountRef = ref(null);
    const isLoading = ref(true);
    const loadingText = ref('載入模型中...');
    const loadError = ref('');

    const INTERIOR_COLOR = '#2a2a2a';

    const SHELL_CFG = {
        topPercent: 0.1,
        minKeep: 200,
        maxKeep: 500,
        minTriangles: 4,
        surfaceProximity: 0.08,
        maxProximityAdd: 100
    };

    const MODEL_MAP = {
        Cube: {
            path: assetUrl('/assets/3D/Cube_3D.gltf'),
            modelRotation: { x: 0, y: Math.PI, z: 0 },
            camera: {
                angleH: 0,
                angleV: 0.3,
                distMultiplier: 2.2,
                targetYOffset: 0.5,
                minDistMultiplier: 0.3,
                maxDistMultiplier: 4
            },
            designCfg: {
                printH: 0.8,
                zPush: 0.01,
                segments: 30,
                targetMesh: 'auto',
                aspectW: 24,
                aspectH: 13,
                // ★ 新增位置控制參數
                offsetY: 0.3, // 上下偏移（3D 世界單位，正值=往上）
                offsetAngle: 0 // 水平旋轉偏移（弧度，正值=往右）
            }
        },
        Duo: {
            path: assetUrl('/assets/3D/Duo_3D.gltf'),
            autoCorrectOrientation: false,
            modelRotation: { x: 0, y: Math.PI / 1.63, z: 0 },
            camera: {
                angleH: 0,
                angleV: 0.3,
                distMultiplier: 2.5,
                targetYOffset: 0.5,
                minDistMultiplier: 0.3,
                maxDistMultiplier: 4
            },
            designCfg: {
                printH: 1.3,
                zPush: 0.01,
                segments: 30,
                targetMesh: 'auto',
                aspectW: 48,
                aspectH: 52,
                // ★ 新增位置控制參數
                offsetY: 0.1, // 往上移 0.2 單位
                offsetAngle: -0.02 // 水平不偏移
            }
        }
    };

    let scene, camera, renderer, controls;
    let animationId = null;
    let gltfModel = null;
    let designMesh = null;
    let currentModelCategory = null;

    let needsRender = true;
    let isUserInteracting = false;
    let dampingFrames = 0;

    let shellMeshes = [];

    const originalMaterials = new Map();

    function debounce(fn, delay) {
        let timer = null;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    const markNeedsRender = () => {
        needsRender = true;
    };

    const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

    /* ══════════════════════════════════════
       ★ 分類外殼 vs 內部（共用，不動）
    ══════════════════════════════════════ */
    const classifyMeshes = (model) => {
        model.updateMatrixWorld(true);

        const modelBox = new THREE.Box3().setFromObject(model);
        const modelCenter = modelBox.getCenter(new THREE.Vector3());
        const modelSize = modelBox.getSize(new THREE.Vector3());
        const modelMaxDim = Math.max(modelSize.x, modelSize.y, modelSize.z);

        const allItems = [];
        model.traverse((child) => {
            if (!child.isMesh) return;
            const geo = child.geometry;
            if (!geo || !geo.attributes.position) return;

            const triCount = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;

            child.updateMatrixWorld(true);
            const meshBox = new THREE.Box3().setFromObject(child);
            const meshCenter = meshBox.getCenter(new THREE.Vector3());

            allItems.push({
                mesh: child,
                triCount,
                meshBox,
                meshCenter,
                score: 0,
                isShell: false
            });
        });

        const candidates = allItems.filter((item) => item.triCount >= SHELL_CFG.minTriangles);
        const tinyMeshes = allItems.filter((item) => item.triCount < SHELL_CFG.minTriangles);

        const raycaster = new THREE.Raycaster();
        const rayDirs = [];
        for (const x of [-1, 0, 1]) {
            for (const y of [-1, 0, 1]) {
                for (const z of [-1, 0, 1]) {
                    if (x === 0 && y === 0 && z === 0) continue;
                    rayDirs.push(new THREE.Vector3(x, y, z).normalize());
                }
            }
        }

        const rayDistance = modelMaxDim * 2;
        const candidateMeshes = candidates.map((c) => c.mesh);
        const hitCountMap = new Map();
        const secondHitMap = new Map();

        for (const dir of rayDirs) {
            const forward = dir.clone().negate();
            const right = new THREE.Vector3();
            const up = new THREE.Vector3();

            if (Math.abs(dir.y) > 0.9) {
                right.crossVectors(dir, new THREE.Vector3(1, 0, 0)).normalize();
            } else {
                right.crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
            }
            up.crossVectors(forward, right).normalize();

            const origin = new THREE.Vector3();
            const spread = modelMaxDim * 0.4;
            const gridSize = 5;

            for (let gi = 0; gi < gridSize; gi++) {
                for (let gj = 0; gj < gridSize; gj++) {
                    const u = (gi / (gridSize - 1) - 0.5) * spread;
                    const v = (gj / (gridSize - 1) - 0.5) * spread;

                    origin
                        .copy(modelCenter)
                        .add(dir.clone().multiplyScalar(rayDistance))
                        .add(right.clone().multiplyScalar(u))
                        .add(up.clone().multiplyScalar(v));

                    raycaster.firstHitOnly = false;
                    raycaster.set(origin, forward);
                    const hits = raycaster.intersectObjects(candidateMeshes, false);

                    if (hits.length > 0) {
                        const uuid1 = hits[0].object.uuid;
                        hitCountMap.set(uuid1, (hitCountMap.get(uuid1) || 0) + 1);

                        if (hits.length > 1) {
                            const dist01 = hits[1].distance - hits[0].distance;
                            const proximityThreshold = modelMaxDim * SHELL_CFG.surfaceProximity;
                            if (dist01 < proximityThreshold) {
                                const uuid2 = hits[1].object.uuid;
                                secondHitMap.set(uuid2, (secondHitMap.get(uuid2) || 0) + 1);
                            }
                        }
                    }
                }
            }
        }

        for (const item of candidates) {
            const hitScore = hitCountMap.get(item.mesh.uuid) || 0;
            const secondScore = secondHitMap.get(item.mesh.uuid) || 0;
            const distFromCenter = item.meshCenter.distanceTo(modelCenter);
            const maxDist = modelSize.length() * 0.5;
            const distScore = distFromCenter / maxDist;
            item.score = hitScore * 10 + secondScore * 5 + distScore;
        }

        candidates.sort((a, b) => b.score - a.score);

        let keepCount = Math.ceil(candidates.length * SHELL_CFG.topPercent);
        keepCount = Math.max(keepCount, SHELL_CFG.minKeep);
        keepCount = Math.min(keepCount, SHELL_CFG.maxKeep, candidates.length);

        for (let i = 0; i < keepCount; i++) {
            candidates[i].isShell = true;
        }

        const proximityThreshold = modelMaxDim * SHELL_CFG.surfaceProximity;
        const keptBoxes = candidates.filter((item) => item.isShell).map((item) => item.meshBox);
        const notKept = candidates
            .filter((item) => !item.isShell)
            .sort((a, b) => b.score - a.score);
        let proximityAdded = 0;
        let currentTotal = candidates.filter((item) => item.isShell).length;

        for (const item of notKept) {
            if (currentTotal >= SHELL_CFG.maxKeep) break;
            if (proximityAdded >= (SHELL_CFG.maxProximityAdd || 100)) break;
            const isNearShell = keptBoxes.some((keptBox) => {
                const expanded = keptBox.clone().expandByScalar(proximityThreshold);
                return expanded.intersectsBox(item.meshBox);
            });
            if (!isNearShell) continue;
            const distFromCenter = item.meshCenter.distanceTo(modelCenter);
            const isOuterHalf = distFromCenter > modelMaxDim * 0.15;
            const hasSecondHit = (secondHitMap.get(item.mesh.uuid) || 0) > 0;
            if (isOuterHalf || hasSecondHit) {
                item.isShell = true;
                proximityAdded++;
                currentTotal++;
            }
        }

        const shell = [];
        const interior = [];

        for (const item of candidates) {
            if (item.isShell) {
                shell.push(item.mesh);
            } else {
                interior.push(item.mesh);
            }
        }

        for (const item of tinyMeshes) {
            interior.push(item.mesh);
        }

        return { shell, interior };
    };

    /* ══════════════════════════════════════
       ★ 法線分析工具（共用）
    ══════════════════════════════════════ */
    function analyzeNormals(mesh) {
        const geo = mesh.geometry;
        if (!geo || !geo.attributes.normal) return { avgNormalY: 0, radialRatio: 0 };
        const normalAttr = geo.attributes.normal;
        const count = normalAttr.count;
        let sumNY = 0;
        let radialCount = 0;
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
        for (let i = 0; i < count; i++) {
            const nx = normalAttr.getX(i);
            const ny = normalAttr.getY(i);
            const nz = normalAttr.getZ(i);
            const wn = new THREE.Vector3(nx, ny, nz).applyMatrix3(normalMatrix).normalize();
            sumNY += wn.y;
            if (Math.abs(wn.y) < 0.3) radialCount++;
        }
        return {
            avgNormalY: count > 0 ? sumNY / count : 0,
            radialRatio: count > 0 ? radialCount / count : 0
        };
    }

    function analyzeInwardNormals(mesh, modelCenter) {
        const normal = mesh.geometry.attributes.normal;
        const position = mesh.geometry.attributes.position;
        if (!normal || !position) return 0;
        mesh.updateMatrixWorld(true);
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
        let inwardCount = 0;
        const totalSamples = Math.min(normal.count, 500);
        const step = Math.max(1, Math.floor(normal.count / totalSamples));
        const worldPos = new THREE.Vector3();
        const worldNormal = new THREE.Vector3();
        const toCenter = new THREE.Vector3();
        for (let i = 0; i < normal.count; i += step) {
            worldPos.set(position.getX(i), position.getY(i), position.getZ(i));
            worldPos.applyMatrix4(mesh.matrixWorld);
            worldNormal.set(normal.getX(i), normal.getY(i), normal.getZ(i));
            worldNormal.applyMatrix3(normalMatrix).normalize();
            toCenter.copy(modelCenter).sub(worldPos);
            toCenter.y = 0;
            toCenter.normalize();
            const horizontalNormal = new THREE.Vector3(worldNormal.x, 0, worldNormal.z).normalize();
            const dot = horizontalNormal.dot(toCenter);
            if (dot > 0.3) {
                inwardCount++;
            }
        }
        return inwardCount / Math.ceil(normal.count / step);
    }

    /* ══════════════════════════════════════
       ★★★ Cube 專用：分區判定（原邏輯，完全不動）
    ══════════════════════════════════════ */
    function classifyZoneCube(child, { yMin, yHeight, baseMaxY, ventMaxY, modelCenter }) {
        child.updateMatrixWorld(true);
        const mb = new THREE.Box3().setFromObject(child);
        const meshCenterY = (mb.min.y + mb.max.y) / 2;
        const normalizedCenterY = (meshCenterY - yMin) / yHeight;
        const { avgNormalY, radialRatio } = analyzeNormals(child);
        const inwardRatio = analyzeInwardNormals(child, modelCenter);

        // 底面（法線朝下 + 位於最底部）
        if (avgNormalY < -0.5 && normalizedCenterY < 0.15) {
            return 'bottom';
        }
        // 內側面（法線朝向模型中心）
        if (inwardRatio > 0.6) {
            return 'interior';
        }
        // 原有邏輯
        if (meshCenterY <= baseMaxY) {
            return 'base';
        }
        if (meshCenterY <= ventMaxY) {
            return 'vent';
        }
        if (radialRatio > 0.6 && normalizedCenterY < 0.45) {
            return 'vent';
        }
        return 'top';
    }

    /* ══════════════════════════════════════
       ★★★ Duo 專用：分區判定（獨立邏輯）
    ══════════════════════════════════════ */
    function classifyZoneDuo(child, { yMin, yHeight, modelCenter }) {
        child.updateMatrixWorld(true);

        // ═══ 1. 計算真實世界座標 Y 範圍 ═══
        const geo = child.geometry;
        let realWorldMinY = Infinity,
            realWorldMaxY = -Infinity;

        if (geo && geo.attributes.position) {
            const posAttr = geo.attributes.position;
            const count = posAttr.count;
            const step = Math.max(1, Math.floor(count / 300));
            const wp = new THREE.Vector3();
            for (let i = 0; i < count; i += step) {
                wp.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
                wp.applyMatrix4(child.matrixWorld);
                if (wp.y < realWorldMinY) realWorldMinY = wp.y;
                if (wp.y > realWorldMaxY) realWorldMaxY = wp.y;
            }
        }

        if (!isFinite(realWorldMinY)) {
            const mb = new THREE.Box3().setFromObject(child);
            realWorldMinY = mb.min.y;
            realWorldMaxY = mb.max.y;
        }

        // ═══ 2. 正規化數值 ═══
        const normMinY = (realWorldMinY - yMin) / yHeight;
        const normMaxY = (realWorldMaxY - yMin) / yHeight;
        const normCenterY = (normMinY + normMaxY) / 2;
        const normSpan = normMaxY - normMinY;

        const { avgNormalY, radialRatio } = analyzeNormals(child);
        const inwardRatio = analyzeInwardNormals(child, modelCenter);

        // ═══ 3. 內側面（最優先）═══
        if (inwardRatio > 0.65) return 'interior';

        // ═══ 4. 底面朝下 ═══
        if (avgNormalY < -0.6 && normCenterY < 0.1) return 'bottom';

        // ═══ 5. 跨多區的大零件 → 用重心決定 ═══
        // 有些零件跨越 base+vent 或 vent+top，用重心歸類
        if (normSpan > 0.4) {
            // 非常大的零件，跨越整個模型
            if (normCenterY < 0.25) return 'base';
            if (normCenterY < 0.5) return 'vent';
            return 'top';
        }

        // ═══ 6. 根據零件「所在範圍」判定 ═══
        //
        // Duo 三區比例（調整這裡控制分界線）：
        //   base : 0%  ~ 20%  （底座環）
        //   vent : 20% ~ 50%  （通風口柵欄）
        //   top  : 50% ~ 100% （上蓋）
        //
        const BASE_UPPER = 0.2;
        const VENT_UPPER = 0.5;

        // 計算零件在各區的重疊比例
        const overlapBase = Math.max(0, Math.min(normMaxY, BASE_UPPER) - Math.max(normMinY, 0));
        const overlapVent = Math.max(
            0,
            Math.min(normMaxY, VENT_UPPER) - Math.max(normMinY, BASE_UPPER)
        );
        const overlapTop = Math.max(0, Math.min(normMaxY, 1.0) - Math.max(normMinY, VENT_UPPER));

        // 哪個區重疊最多就歸哪區
        const maxOverlap = Math.max(overlapBase, overlapVent, overlapTop);

        if (maxOverlap < 0.001) {
            // 幾乎沒重疊（極薄或在邊界外）→ 用重心
            if (normCenterY < BASE_UPPER) return 'base';
            if (normCenterY < VENT_UPPER) return 'vent';
            return 'top';
        }

        // ═══ 7. 柵欄特徵加權 ═══
        // 通風口柵欄通常是「水平方向法線為主」的零件
        // radialRatio 高 = 法線指向外側（柵欄條）
        if (radialRatio > 0.55 && overlapVent > 0) {
            // 柵欄特徵明顯，且有部分在 vent 區 → 強化 vent 歸屬
            const ventBoosted = overlapVent * 1.5;
            if (ventBoosted >= overlapBase && ventBoosted >= overlapTop) {
                return 'vent';
            }
        }

        // ═══ 8. 最終：重疊最多的區域勝出 ═══
        if (maxOverlap === overlapBase) return 'base';
        if (maxOverlap === overlapVent) return 'vent';
        return 'top';
    }

    // Duo 專用分區比例（與 products.js 的 DEFAULT 解耦）
    const zoneRatioForDuo = {
        baseMax: 0.2, // 0~20% = 底座
        ventMax: 0.5 // 20%~50% = 通風口
    };

    /* ══════════════════════════════════════
       ★★★ 材質工廠：Cube vs Duo 分開
    ══════════════════════════════════════ */

    // Cube 材質（原邏輯，完全不動）
    function createCubeMat(hex) {
        const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(hex),
            roughness: 0.55,
            metalness: 0.15,
            side: THREE.DoubleSide,
            map: null,
            normalMap: null,
            roughnessMap: null,
            metalnessMap: null,
            aoMap: null,
            emissiveMap: null,
            vertexColors: false
        });
        mat.onBeforeCompile = (shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `
                #include <color_fragment>
                if ( !gl_FrontFacing ) {
                    diffuseColor.rgb = vec3(0.05, 0.05, 0.05);
                }
                `
            );
        };
        return mat;
    }

    // Duo 材質（★ 新增金屬感 + MeshPhysicalMaterial）
    function createDuoMat(hex, options = {}) {
        const {
            metalness = 0.0,
            roughness = 0.7,
            clearcoat = 0.1,
            clearcoatRoughness = 0.6
        } = options;

        const mat = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(hex),
            roughness,
            metalness,
            clearcoat,
            clearcoatRoughness,
            reflectivity: 0.3,
            side: THREE.DoubleSide,
            map: null,
            normalMap: null,
            roughnessMap: null,
            metalnessMap: null,
            aoMap: null,
            emissiveMap: null,
            vertexColors: false
        });
        mat.onBeforeCompile = (shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                `
            #include <color_fragment>
            if ( !gl_FrontFacing ) {
                diffuseColor.rgb = vec3(0.03, 0.03, 0.03);
            }
            `
            );
        };
        return mat;
    }

    /* ══════════════════════════════════════
       ★★★ applyZoneColors：根據機型分流
    ══════════════════════════════════════ */
    const applyZoneColors = () => {
        if (!gltfModel) return;
        gltfModel.updateMatrixWorld(true);

        const zoneColors = props.productConfig?.zoneColors ?? DEFAULT_ZONE_COLORS;
        const zoneRatio = props.productConfig?.zoneRatio ?? DEFAULT_ZONE_RATIO;
        const modelBox = new THREE.Box3().setFromObject(gltfModel);
        const yMin = modelBox.min.y;
        const yMax = modelBox.max.y;
        const yHeight = yMax - yMin;
        const shellSet = new Set(shellMeshes.map((m) => m.uuid));
        const modelCenter = new THREE.Vector3();
        modelBox.getCenter(modelCenter);

        const isDuo = currentModelCategory === 'Duo';

        // ── 分區 Y 閾值 ──
        const usedRatio = isDuo
            ? zoneRatioForDuo
            : { baseMax: zoneRatio.baseMax, ventMax: zoneRatio.ventMax };

        const baseMaxY = yMin + yHeight * usedRatio.baseMax;
        const ventMaxY = yMin + yHeight * usedRatio.ventMax;

        const zoneCtx = { yMin, yHeight, baseMaxY, ventMaxY, modelCenter };

        // ── 建立材質 ──
        let matTop, matVent, matBase, matInterior;

        if (isDuo) {
            matTop = createCubeMat(zoneColors.top);
            // 通風口 — 金屬亮面
            matVent = createDuoMat(zoneColors.vent, {
                metalness: 0.1,
                roughness: 0.3,
                clearcoat: 0.3,
                clearcoatRoughness: 0.1
            });
            matBase = createCubeMat(zoneColors.base);
            matInterior = createCubeMat(INTERIOR_COLOR);
        } else {
            matTop = createCubeMat(zoneColors.top);
            // 通風口 — 金屬亮面
            matVent = createDuoMat(zoneColors.vent, {
                metalness: 0.1,
                roughness: 0.3,
                clearcoat: 0.3,
                clearcoatRoughness: 0.1
            });
            matBase = createCubeMat(zoneColors.base);
            matInterior = createCubeMat(INTERIOR_COLOR);
        }

        let debugCount = { top: 0, vent: 0, base: 0, bottom: 0, interior: 0 };

        gltfModel.traverse((child) => {
            if (!child.isMesh) return;

            const isShell = shellSet.has(child.uuid);
            let targetMat;

            if (!isShell) {
                child.visible = false;
                debugCount.interior++;
                return;
            }
            console.log(`[applyZoneColors] ${currentModelCategory}`, debugCount);

            // ★ 根據機型調用不同分區函數
            let zone;
            if (isDuo) {
                zone = classifyZoneDuo(child, zoneCtx);
            } else {
                zone = classifyZoneCube(child, zoneCtx);
            }

            // ★ 分配材質
            if (zone === 'interior') {
                targetMat = matInterior;
                debugCount.interior++;
            } else if (zone === 'bottom') {
                // Cube 的 bottom → 用 base 顏色
                targetMat = matBase;
                debugCount.bottom++;
            } else if (zone === 'base') {
                targetMat = matBase;
                debugCount.base++;
            } else if (zone === 'vent') {
                targetMat = matVent;
                debugCount.vent++;
            } else {
                targetMat = matTop;
                debugCount.top++;
            }

            child.visible = true;

            // 套用材質
            if (Array.isArray(child.material)) {
                child.material.forEach((m) => m?.dispose());
                child.material = child.material.map(() => targetMat.clone());
            } else {
                child.material?.dispose();
                child.material = targetMat.clone();
            }
        });

        console.log(`[applyZoneColors] ${currentModelCategory}`, debugCount);
        markNeedsRender();
    };

    /* ══════════════════════════════════════
       初始化（以下完全不動）
    ══════════════════════════════════════ */
    const initThree = () => {
        const el = mountRef.value;
        if (!el) return;

        const width = el.clientWidth || 600;
        const height = el.clientHeight || 400;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);
        scene.fog = new THREE.Fog(0x1a1a2e, 15, 60);

        camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 100);
        camera.position.set(0, 2, 5);

        renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        el.appendChild(renderer.domElement);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 1;
        controls.maxDistance = 15;
        controls.target.set(0, 0, 0);

        controls.addEventListener('start', onInteractStart);
        controls.addEventListener('change', markNeedsRender);
        controls.addEventListener('end', onInteractEnd);

        addLights();
        addGrid();
        animate();

        loadModelByCategory(props.machineCategory);
        window.addEventListener('resize', onResize);
    };

    const onInteractStart = () => {
        isUserInteracting = true;
        dampingFrames = 0;
        markNeedsRender();
    };

    const onInteractEnd = () => {
        isUserInteracting = false;
        dampingFrames = 30;
    };

    const addLights = () => {
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));

        const dir = new THREE.DirectionalLight(0xffffff, 1.5);
        dir.position.set(5, 8, 5);
        dir.castShadow = true;
        dir.shadow.mapSize.set(1024, 1024);
        Object.assign(dir.shadow.camera, {
            near: 0.1,
            far: 50,
            left: -10,
            right: 10,
            top: 10,
            bottom: -10
        });
        scene.add(dir);

        const fill = new THREE.DirectionalLight(0x8899ff, 0.5);
        fill.position.set(-5, 2, -5);
        scene.add(fill);

        const top = new THREE.PointLight(0xffffff, 0.8, 30);
        top.position.set(0, 10, 0);
        scene.add(top);

        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        pmrem.dispose();
    };

    const addGrid = () => {
        const grid = new THREE.GridHelper(20, 20, 0x333355, 0x222244);
        grid.position.y = -0.1;
        scene.add(grid);
    };

    const clearModel = () => {
        clearDesignMesh();
        if (gltfModel) {
            gltfModel.traverse((child) => {
                if (child.isMesh) {
                    child.geometry?.disposeBoundsTree?.();
                    child.geometry?.dispose();
                    [child.material].flat().forEach((m) => m?.dispose());
                }
            });
            scene.remove(gltfModel);
            gltfModel = null;
        }
        originalMaterials.clear();
        shellMeshes = [];
        currentModelCategory = null;
        markNeedsRender();
    };

    const clearDesignMesh = () => {
        if (!designMesh) return;
        scene.remove(designMesh);
        designMesh.geometry.dispose();
        if (Array.isArray(designMesh.material)) {
            designMesh.material.forEach((m) => m.dispose());
        } else {
            designMesh.material.dispose();
        }
        designMesh = null;
    };

    const autoCorrectOrientation = (model) => {
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const dims = [
            { axis: 'x', value: size.x },
            { axis: 'y', value: size.y },
            { axis: 'z', value: size.z }
        ];
        dims.sort((a, b) => b.value - a.value);
        const tallestAxis = dims[0].axis;
        if (tallestAxis === 'y') return;
        if (tallestAxis === 'z') model.rotation.x = Math.PI / 2;
        else if (tallestAxis === 'x') model.rotation.z = Math.PI / 2;
        model.updateMatrixWorld(true);
    };

    const applyModelRotation = (model, rotation) => {
        if (!rotation) return;
        const { x = 0, y = 0, z = 0 } = rotation;
        model.rotation.x += x;
        model.rotation.y += y;
        model.rotation.z += z;
        model.updateMatrixWorld(true);
    };

    const loadModelByCategory = (category) => {
        const modelConfig = MODEL_MAP[category];
        if (!modelConfig) {
            clearModel();
            isLoading.value = false;
            return;
        }
        if (currentModelCategory === category && gltfModel) return;

        clearModel();
        isLoading.value = true;
        loadingText.value = '載入模型中...';
        loadError.value = '';

        new GLTFLoader().load(
            modelConfig.path,
            async (gltf) => {
                try {
                    gltfModel = gltf.scene;
                    currentModelCategory = category;

                    scene.add(gltfModel);

                    if (modelConfig.autoCorrectOrientation) {
                        autoCorrectOrientation(gltfModel);
                    }
                    if (modelConfig.modelRotation) {
                        applyModelRotation(gltfModel, modelConfig.modelRotation);
                    }

                    centerModel(gltfModel);
                    fitCameraToModel(modelConfig.camera);

                    markNeedsRender();
                    await yieldToMain();

                    loadingText.value = '分析模型結構...';
                    const classified = classifyMeshes(gltfModel);
                    shellMeshes = classified.shell;

                    await yieldToMain();

                    loadingText.value = '套用顏色...';
                    applyZoneColors();
                    markNeedsRender();

                    await yieldToMain();

                    loadingText.value = '優化渲染...';
                    const BATCH = 10;
                    for (let i = 0; i < shellMeshes.length; i++) {
                        const mesh = shellMeshes[i];
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                        originalMaterials.set(mesh.uuid, mesh.material);
                        if (mesh.geometry && !mesh.geometry.boundsTree) {
                            mesh.geometry.computeBoundsTree();
                        }
                        if ((i + 1) % BATCH === 0) await yieldToMain();
                    }

                    await yieldToMain();
                    isLoading.value = false;

                    if (props.designImageUrl) {
                        await yieldToMain();
                        applyDesignTexture(props.designImageUrl);
                    }
                } catch (err) {
                    console.error('[ThreePreview] 模型處理失敗', err);
                    loadError.value = '模型處理失敗';
                    isLoading.value = false;
                }
            },
            (progress) => {
                if (progress.total > 0) {
                    const pct =
                        Math.round((progress.loaded / progress.total) * 100) >= 100
                            ? 100
                            : Math.round((progress.loaded / progress.total) * 100);
                    loadingText.value = `下載模型 ${pct}%...`;
                }
            },
            (err) => {
                console.error('[ThreePreview] GLTF 載入失敗', err);
                loadError.value = '3D 模型載入失敗';
                isLoading.value = false;
            }
        );
    };

    const fitCameraToModel = (cameraConfig) => {
        if (!gltfModel) return;
        const box = new THREE.Box3().setFromObject(gltfModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        const cfg = cameraConfig || {
            angleH: 0,
            angleV: 0.3,
            distMultiplier: 2.2,
            targetYOffset: 0.5,
            minDistMultiplier: 0.3,
            maxDistMultiplier: 4
        };

        const fitDist = maxDim * cfg.distMultiplier;
        const camX = Math.sin(cfg.angleH) * fitDist;
        const camZ = Math.cos(cfg.angleH) * fitDist;
        const camY = center.y + Math.sin(cfg.angleV) * fitDist;

        camera.position.set(camX, camY, camZ);
        const targetY = center.y * cfg.targetYOffset;
        controls.target.set(0, targetY, 0);
        controls.minDistance = fitDist * cfg.minDistMultiplier;
        controls.maxDistance = fitDist * cfg.maxDistMultiplier;
        controls.update();
    };

    const centerModel = (model) => {
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim === 0) return;

        const targetSize = 3;
        model.scale.setScalar(targetSize / maxDim);
        model.updateMatrixWorld(true);

        const box2 = new THREE.Box3().setFromObject(model);
        const center2 = box2.getCenter(new THREE.Vector3());
        model.position.set(-center2.x, -box2.min.y, -center2.z);
        model.updateMatrixWorld(true);
    };

    /* ══════════════════════════════════════
       曲面貼圖（完全不動）
    ══════════════════════════════════════ */
    const buildCurvedMesh = (tex) => {
        if (!gltfModel || shellMeshes.length === 0) return;
        clearDesignMesh();
        const modelConfig = MODEL_MAP[currentModelCategory];
        const cfg = modelConfig?.designCfg ?? {
            printH: 1.5,
            zPush: 0.01,
            segments: 24,
            targetMesh: 'auto',
            aspectW: 48,
            aspectH: 48,
            offsetY: 0,
            offsetAngle: 0
        };
        // ★ 讀取偏移值（預設為 0）
        const offsetY = cfg.offsetY ?? 0;
        const offsetAngle = cfg.offsetAngle ?? 0;
        const segs = cfg.segments;
        const cols = segs + 1;
        const rows = segs + 1;
        gltfModel.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(gltfModel);
        const bCenter = box.getCenter(new THREE.Vector3());
        const bSize = box.getSize(new THREE.Vector3());
        const axisX = bCenter.x;
        const axisZ = bCenter.z;
        const camPos = camera.position.clone();

        // ★★★ 改動 1：frontAngle 加入水平偏移 ★★★
        const frontAngle = Math.atan2(camPos.x - axisX, camPos.z - axisZ) + offsetAngle;
        const modelMidY = (box.max.y + box.min.y) / 2;

        // ★★★ 改動 2：designCenterY 加入垂直偏移 ★★★
        const designCenterY = modelMidY + (box.max.y - modelMidY) * 0.3 + offsetY;
        // ═══ 以下完全不動 ═══
        const meshes = shellMeshes;
        const rayRadius = Math.max(bSize.x, bSize.z) * 3;
        const raycaster = new THREE.Raycaster();
        raycaster.firstHitOnly = true;
        let cylinderRadius = Math.max(bSize.x, bSize.z) * 0.5;
        {
            const dX = Math.sin(frontAngle);
            const dZ = Math.cos(frontAngle);
            raycaster.set(
                new THREE.Vector3(axisX + dX * rayRadius, designCenterY, axisZ + dZ * rayRadius),
                new THREE.Vector3(-dX, 0, -dZ).normalize()
            );
            const hits = raycaster.intersectObjects(meshes, true);
            if (hits.length > 0) {
                const hp = hits[0].point;
                cylinderRadius = Math.sqrt((hp.x - axisX) ** 2 + (hp.z - axisZ) ** 2);
            }
        }
        const targetArcWidth = (cfg.printH * cfg.aspectW) / cfg.aspectH;
        const halfArcRad = targetArcWidth / cylinderRadius / 2;
        const yStart = designCenterY - cfg.printH / 2;
        const dirXs = new Float32Array(cols);
        const dirZs = new Float32Array(cols);
        for (let col = 0; col < cols; col++) {
            const angle = frontAngle - halfArcRad + (col / segs) * halfArcRad * 2;
            dirXs[col] = Math.sin(angle);
            dirZs[col] = Math.cos(angle);
        }
        // ... 後面的程式碼完全不動 ...
        // (PX, PY, PZ, NX, NY, NZ, hitFlags, positions, uvs, indices 等全部不變)

        const PX = new Float32Array(cols * rows);
        const PY = new Float32Array(cols * rows);
        const PZ = new Float32Array(cols * rows);
        const NX = new Float32Array(cols * rows);
        const NY = new Float32Array(cols * rows);
        const NZ = new Float32Array(cols * rows);
        const hitFlags = new Uint8Array(cols * rows);
        const origin = new THREE.Vector3();
        const direction = new THREE.Vector3();
        const normalMat = new THREE.Matrix3();
        let totalHits = 0;
        for (let row = 0; row < rows; row++) {
            const wy = yStart + (row / segs) * cfg.printH;
            for (let col = 0; col < cols; col++) {
                const dX = dirXs[col];
                const dZ = dirZs[col];
                const idx = row * cols + col;
                origin.set(axisX + dX * rayRadius, wy, axisZ + dZ * rayRadius);
                direction.set(-dX, 0, -dZ).normalize();
                raycaster.set(origin, direction);
                const hits = raycaster.intersectObjects(meshes, true);
                if (hits.length > 0) {
                    const hit = hits[0];
                    const pt = hit.point;
                    normalMat.getNormalMatrix(hit.object.matrixWorld);
                    const fn = hit.face.normal;
                    const el = normalMat.elements;
                    const wx = fn.x * el[0] + fn.y * el[3] + fn.z * el[6];
                    const wy2 = fn.x * el[1] + fn.y * el[4] + fn.z * el[7];
                    const wz = fn.x * el[2] + fn.y * el[5] + fn.z * el[8];
                    const len = Math.sqrt(wx * wx + wy2 * wy2 + wz * wz) || 1;
                    PX[idx] = pt.x;
                    PY[idx] = pt.y;
                    PZ[idx] = pt.z;
                    NX[idx] = wx / len;
                    NY[idx] = wy2 / len;
                    NZ[idx] = wz / len;
                    hitFlags[idx] = 1;
                    totalHits++;
                } else {
                    const angle = frontAngle - halfArcRad + (col / segs) * halfArcRad * 2;
                    PX[idx] = axisX + Math.sin(angle) * cylinderRadius;
                    PY[idx] = wy;
                    PZ[idx] = axisZ + Math.cos(angle) * cylinderRadius;
                    NX[idx] = Math.sin(angle);
                    NY[idx] = 0;
                    NZ[idx] = Math.cos(angle);
                    hitFlags[idx] = 0;
                }
            }
        }
        if (totalHits === 0) return;
        const rowArcLengths = new Array(rows);
        for (let row = 0; row < rows; row++) {
            const cumLen = new Float32Array(cols);
            for (let col = 1; col < cols; col++) {
                const i = row * cols + col;
                const p = row * cols + col - 1;
                cumLen[col] =
                    cumLen[col - 1] +
                    Math.sqrt((PX[i] - PX[p]) ** 2 + (PY[i] - PY[p]) ** 2 + (PZ[i] - PZ[p]) ** 2);
            }
            rowArcLengths[row] = cumLen;
        }
        const positions = new Float32Array(cols * rows * 3);
        const uvs = new Float32Array(cols * rows * 2);
        for (let row = 0; row < rows; row++) {
            const v = row / segs;
            const cumLen = rowArcLengths[row];
            const totalLen = cumLen[cols - 1];
            for (let col = 0; col < cols; col++) {
                const idx = row * cols + col;
                const u = totalLen > 0.001 ? cumLen[col] / totalLen : col / segs;
                positions[idx * 3] = PX[idx] + NX[idx] * cfg.zPush;
                positions[idx * 3 + 1] = PY[idx] + NY[idx] * cfg.zPush;
                positions[idx * 3 + 2] = PZ[idx] + NZ[idx] * cfg.zPush;
                uvs[idx * 2] = u;
                uvs[idx * 2 + 1] = v;
            }
        }
        const indices = [];
        for (let row = 0; row < segs; row++) {
            for (let col = 0; col < segs; col++) {
                const a = row * cols + col;
                const b = a + 1;
                const c = a + cols;
                const d = c + 1;
                if (hitFlags[a] + hitFlags[b] + hitFlags[c] + hitFlags[d] >= 3) {
                    indices.push(a, c, b, b, c, d);
                }
            }
        }
        if (indices.length === 0) return;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        const mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            alphaTest: 0.01,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
            side: THREE.DoubleSide
        });
        designMesh = new THREE.Mesh(geo, mat);
        scene.add(designMesh);
        markNeedsRender();
    };

    const applyDesignTexture = (url) => {
        if (!gltfModel || !url) return;
        new THREE.TextureLoader().load(
            url,
            (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.needsUpdate = true;
                buildCurvedMesh(tex);
            },
            undefined,
            (err) => console.error('[applyDesignTexture] 失敗', err)
        );
    };

    const debouncedApplyDesign = debounce(applyDesignTexture, 300);

    const animate = () => {
        animationId = requestAnimationFrame(animate);
        const shouldRender = isUserInteracting || dampingFrames > 0 || needsRender;
        if (shouldRender) {
            controls.update();
            renderer.render(scene, camera);
            needsRender = false;
            if (!isUserInteracting && dampingFrames > 0) dampingFrames--;
        }
    };

    const onResize = () => {
        const el = mountRef.value;
        if (!el) return;
        camera.aspect = el.clientWidth / el.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(el.clientWidth, el.clientHeight);
        markNeedsRender();
    };

    const resetCamera = () => {
        if (!gltfModel || !currentModelCategory) {
            camera.position.set(0, 2, 5);
            controls.target.set(0, 0, 0);
        } else {
            const modelConfig = MODEL_MAP[currentModelCategory];
            fitCameraToModel(modelConfig?.camera);
        }
        controls.update();
        dampingFrames = 30;
        markNeedsRender();
    };

    watch(
        () => props.designImageUrl,
        (url) => {
            if (url) debouncedApplyDesign(url);
        }
    );

    watch(
        () => props.productConfig,
        () => {
            if (gltfModel) applyZoneColors();
        },
        { deep: true }
    );

    watch(
        () => props.machineCategory,
        (newCat, oldCat) => {
            if (newCat !== oldCat) loadModelByCategory(newCat);
        }
    );

    onMounted(initThree);

    onBeforeUnmount(() => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', onResize);
        controls?.removeEventListener('start', onInteractStart);
        controls?.removeEventListener('change', markNeedsRender);
        controls?.removeEventListener('end', onInteractEnd);
        clearModel();
        renderer?.dispose();
        if (mountRef.value && renderer?.domElement) {
            mountRef.value.removeChild(renderer.domElement);
        }
    });
</script>

<style scoped>
    .three-container {
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
        background: #1a1a2e;
        display: flex;
    }
    .three-mount {
        width: 100%;
        height: 100%;
    }
    .three-loading,
    .three-error {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        font-size: 14px;
        pointer-events: none;
        z-index: 10;
    }
    .three-loading {
        background: rgba(26, 26, 46, 0.85);
        color: rgba(255, 255, 255, 0.8);
    }
    .three-loading i {
        font-size: 28px;
        color: #5b7fff;
    }
    .three-error {
        background: rgba(26, 26, 46, 0.9);
        color: #ff6b6b;
    }
    .three-error i {
        font-size: 28px;
    }
    .three-hint {
        position: absolute;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.55);
        color: rgba(255, 255, 255, 0.7);
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        pointer-events: none;
        backdrop-filter: blur(4px);
        white-space: nowrap;
        z-index: 5;
    }
    .three-controls {
        position: absolute;
        top: 16px;
        right: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 5;
    }
    .ctrl-btn {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(0, 0, 0, 0.4);
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        transition: all 0.2s;
        backdrop-filter: blur(4px);
    }
    .ctrl-btn:hover {
        background: rgba(91, 127, 255, 0.5);
        color: white;
        border-color: rgba(91, 127, 255, 0.5);
    }
</style>
