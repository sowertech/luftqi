<template>
    <div class="three-container">
        <div ref="mountRef" class="three-mount"></div>

        <!-- 操作提示 -->
        <div class="three-hint">
            <i class="fas fa-mouse-pointer"></i>
            拖曳旋轉・滾輪縮放・右鍵平移
        </div>

        <!-- 控制面板 -->
        <div class="three-controls">
            <button class="ctrl-btn" title="重置視角" @click="resetCamera">
                <i class="fas fa-home"></i>
            </button>
            <button
                class="ctrl-btn"
                title="自動旋轉"
                :class="{ active: autoRotate }"
                @click="toggleAutoRotate"
            >
                <i class="fas fa-sync-alt"></i>
            </button>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
    import * as THREE from 'three';
    import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

    const props = defineProps({
        designImageUrl: { type: String, default: '' }
    });

    const mountRef = ref(null);
    const autoRotate = ref(true);

    let scene, camera, renderer, controls;
    let animationId = null;
    let designMesh = null;

    // ===== 初始化 Three.js =====
    const initThree = () => {
        const el = mountRef.value;
        if (!el) return;

        const width = el.clientWidth;
        const height = el.clientHeight;

        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

        // 霧效果
        scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);

        // Camera
        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 1.5, 5);

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        el.appendChild(renderer.domElement);

        // Controls
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = autoRotate.value;
        controls.autoRotateSpeed = 1.5;
        controls.minDistance = 2;
        controls.maxDistance = 12;

        // Lights
        addLights();

        // 地面格線
        addGrid();

        // 主體：立方體
        addBox();

        // 動畫
        animate();

        // Resize
        window.addEventListener('resize', onResize);
    };

    const addLights = () => {
        // 環境光
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambient);

        // 主光源
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 8, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(1024, 1024);
        scene.add(dirLight);

        // 補光
        const fillLight = new THREE.DirectionalLight(0x5b7fff, 0.4);
        fillLight.position.set(-5, 2, -5);
        scene.add(fillLight);

        // 頂光
        const topLight = new THREE.PointLight(0xffffff, 0.6, 20);
        topLight.position.set(0, 8, 0);
        scene.add(topLight);
    };

    const addGrid = () => {
        const grid = new THREE.GridHelper(20, 20, 0x333355, 0x222244);
        grid.position.y = -1.5;
        scene.add(grid);
    };

    // ===== 建立示範立方體 =====
    const addBox = () => {
        const geometry = new THREE.BoxGeometry(2, 2, 2, 1, 1, 1);

        // 6 面材質（預設灰色）
        const materials = [
            createFaceMaterial(0x4a5568), // right
            createFaceMaterial(0x4a5568), // left
            createFaceMaterial(0x2d3748), // top
            createFaceMaterial(0x2d3748), // bottom
            createFaceMaterial(0x5b7fff), // front ← 設計面
            createFaceMaterial(0x4a5568) // back
        ];

        designMesh = new THREE.Mesh(geometry, materials);
        designMesh.castShadow = true;
        designMesh.receiveShadow = true;
        designMesh.position.y = 0;
        scene.add(designMesh);

        // 如果已有設計圖，立即套用
        if (props.designImageUrl) {
            applyDesignTexture(props.designImageUrl);
        }
    };

    const createFaceMaterial = (color) => {
        return new THREE.MeshStandardMaterial({
            color,
            roughness: 0.6,
            metalness: 0.2
        });
    };

    // ===== 套用設計貼圖 =====
    const applyDesignTexture = (url) => {
        if (!designMesh || !url) return;
        const loader = new THREE.TextureLoader();
        loader.load(url, (texture) => {
            //  移除 texture.flipY = false，使用預設 true
            // 或明確設定
            texture.flipY = true; // Three.js 預設值，WebGL UV 座標正確方向
            texture.needsUpdate = true;

            designMesh.material[4] = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.5,
                metalness: 0.1
            });
            designMesh.material[4].needsUpdate = true;
        });
    };

    const animate = () => {
        animationId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    };

    const onResize = () => {
        const el = mountRef.value;
        if (!el) return;
        const w = el.clientWidth;
        const h = el.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    };

    const resetCamera = () => {
        camera.position.set(0, 1.5, 5);
        controls.target.set(0, 0, 0);
        controls.update();
    };

    const toggleAutoRotate = () => {
        autoRotate.value = !autoRotate.value;
        controls.autoRotate = autoRotate.value;
    };

    // ===== Watch 設計圖變更 =====
    watch(
        () => props.designImageUrl,
        (url) => {
            if (url) applyDesignTexture(url);
        }
    );

    onMounted(initThree);

    onBeforeUnmount(() => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', onResize);
        renderer?.dispose();
        if (mountRef.value && renderer?.domElement) {
            mountRef.value.removeChild(renderer.domElement);
        }
    });
</script>

<style scoped>
    .three-container {
        flex: 1;
        position: relative;
        overflow: hidden;
        background: #1a1a2e;
        display: flex;
    }

    .three-mount {
        width: 100%;
        height: 100%;
        min-height: 400px;
    }

    .three-hint {
        position: absolute;
        bottom: 60px;
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
    }

    .three-controls {
        position: absolute;
        top: 16px;
        right: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
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
    .ctrl-btn.active {
        background: rgba(91, 127, 255, 0.6);
        color: white;
        border-color: var(--primary-color);
    }
</style>
