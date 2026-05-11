// src/config/products.js

import { assetUrl } from '../utils/path';

const STAGE_W = 800;
const STAGE_H = 600;
const PRINT_W = 265;

// ── Cube: 48 × 26 ──────────────────────────────────────
const CUBE_PRINT_H = Math.round((PRINT_W * 26) / 48);
const CUBE_PA_LEFT = Math.round((STAGE_W - PRINT_W) / 2);
const CUBE_PA_TOP = Math.round((STAGE_H - CUBE_PRINT_H) / 3.6);

const CUBE_PERSPECTIVE = {
    topLeft: { x: CUBE_PA_LEFT, y: CUBE_PA_TOP },
    topRight: { x: CUBE_PA_LEFT + PRINT_W, y: CUBE_PA_TOP },
    bottomLeft: { x: CUBE_PA_LEFT, y: CUBE_PA_TOP + CUBE_PRINT_H },
    bottomRight: { x: CUBE_PA_LEFT + PRINT_W, y: CUBE_PA_TOP + CUBE_PRINT_H },
    width: PRINT_W,
    height: CUBE_PRINT_H
};

// ── Duo: 48 × 52 ───────────────────────────────────────
const DUO_PRINT_H = Math.round((PRINT_W * 52) / 48);
const DUO_PA_LEFT = Math.round((STAGE_W - PRINT_W) / 2);
const DUO_PA_TOP = Math.round((STAGE_H - DUO_PRINT_H) / 5.8);

const DUO_PERSPECTIVE = {
    topLeft: { x: DUO_PA_LEFT, y: DUO_PA_TOP },
    topRight: { x: DUO_PA_LEFT + PRINT_W, y: DUO_PA_TOP },
    bottomLeft: { x: DUO_PA_LEFT, y: DUO_PA_TOP + DUO_PRINT_H },
    bottomRight: { x: DUO_PA_LEFT + PRINT_W, y: DUO_PA_TOP + DUO_PRINT_H },
    width: PRINT_W,
    height: DUO_PRINT_H
};

const CANVAS_SIZE = { width: STAGE_W, height: STAGE_H };

function perspectiveToPrintArea(p) {
    const xs = [p.topLeft.x, p.topRight.x, p.bottomLeft.x, p.bottomRight.x];
    const ys = [p.topLeft.y, p.topRight.y, p.bottomLeft.y, p.bottomRight.y];
    return {
        left: Math.min(...xs),
        top: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys)
    };
}

// ── 顏色對應表 ────────────────────────────────────────────
export const COLOR_MAP = {
    B: { hex: '#1a1a1a', name: 'Black' },
    BG: { hex: '#c8a96e', name: 'Beige/Gold' },
    Blue: { hex: '#3a6bc8', name: 'Blue' },
    G: { hex: '#d4af37', name: 'Gold' },
    P: { hex: '#e8a0bf', name: 'Pink' },
    S: { hex: '#a8a8b0', name: 'Silver' },
    Green: { hex: '#4a9a6a', name: 'Green' },
    R: { hex: '#c0392b', name: 'Red' }
};

// ── 系列分類 ──────────────────────────────────────────────
export const CATEGORIES = [
    { id: 'pure', name: '純設計稿', icon: 'fas fa-layer-group' },
    { id: 'Cube', name: 'Cube', icon: 'fas fa-cube' },
    { id: 'Duo', name: 'Duo', icon: 'fas fa-mobile-alt' }
];

// ── 3D 機台分區顏色設定 ───────────────────────────────────
export const DEFAULT_ZONE_COLORS = {
    top: '#aec6e8',
    vent: '#e8d87a',
    base: '#d0d0d0'
};

export const DEFAULT_ZONE_RATIO = {
    baseMax: 0.15,
    ventMax: 0.3
};

// ── createProduct ─────────────────────────────────────────
function createProduct(id, name, perspective, category, colorKey, zoneColors = {}) {
    return {
        id,
        name,
        category,
        colorKey,
        color: COLOR_MAP[colorKey]?.hex ?? '#888',
        colorName: COLOR_MAP[colorKey]?.name ?? colorKey,
        thumbnail: assetUrl(`/assets/products/${id}.png`),
        baseImage: assetUrl(`/assets/products/${id}.png`),
        canvasSize: CANVAS_SIZE,
        perspective,
        printArea: perspectiveToPrintArea(perspective),
        zoneColors: {
            top: zoneColors.top ?? DEFAULT_ZONE_COLORS.top,
            vent: zoneColors.vent ?? DEFAULT_ZONE_COLORS.vent,
            base: zoneColors.base ?? DEFAULT_ZONE_COLORS.base
        },
        zoneRatio: {
            baseMax: zoneColors.baseMax ?? DEFAULT_ZONE_RATIO.baseMax,
            ventMax: zoneColors.ventMax ?? DEFAULT_ZONE_RATIO.ventMax
        }
    };
}

export const PRODUCTS_CONFIG = {
    // ── Cube 系列（48 × 26）──────────────────────────────
    Cube_B: createProduct('Cube_B', 'Cube Black', CUBE_PERSPECTIVE, 'Cube', 'B', {
        top: '#2a2a2a',
        vent: '#111111',
        base: '#2a2a2a'
    }),
    Cube_BG: createProduct('Cube_BG', 'Cube Beige', CUBE_PERSPECTIVE, 'Cube', 'BG', {
        top: '#2a2a2a',
        vent: '#e07934',
        base: '#2a2a2a'
    }),
    Cube_Blue: createProduct('Cube_Blue', 'Cube Blue', CUBE_PERSPECTIVE, 'Cube', 'Blue', {
        top: '#e7e7e7',
        vent: '#276697',
        base: '#e7e7e7'
    }),
    Cube_G: createProduct('Cube_G', 'Cube Gold', CUBE_PERSPECTIVE, 'Cube', 'G', {
        top: '#e7e7e7',
        vent: '#e07934',
        base: '#e7e7e7'
    }),
    Cube_P: createProduct('Cube_P', 'Cube Pink', CUBE_PERSPECTIVE, 'Cube', 'P', {
        top: '#e7e7e7',
        vent: '#8b5b65',
        base: '#e7e7e7'
    }),
    Cube_S: createProduct('Cube_S', 'Cube Silver', CUBE_PERSPECTIVE, 'Cube', 'S', {
        top: '#e7e7e7',
        vent: '#818181',
        base: '#e7e7e7'
    }),

    // ── Duo 系列（48 × 52）───────────────────────────────
    Duo_B: createProduct('Duo_B', 'Duo Black', DUO_PERSPECTIVE, 'Duo', 'B', {
        top: '#272727',
        vent: '#1a1a1a',
        base: '#373737'
    }),
    Duo_BG: createProduct('Duo_BG', 'Duo Black Gold', DUO_PERSPECTIVE, 'Duo', 'BG', {
        top: '#272727',
        vent: '#e07934',
        base: '#373737'
    }),
    Duo_Blue: createProduct('Duo_Blue', 'Duo Blue', DUO_PERSPECTIVE, 'Duo', 'Blue', {
        top: '#e7e7e7',
        vent: '#00899b',
        base: '#e7e7e7'
    }),
    Duo_G: createProduct('Duo_G', 'Duo Gold', DUO_PERSPECTIVE, 'Duo', 'G', {
        top: '#e7e7e7',
        vent: '#e07934',
        base: '#e7e7e7'
    }),
    Duo_Green: createProduct('Duo_Green', 'Duo Green', DUO_PERSPECTIVE, 'Duo', 'Green', {
        top: '#e7e7e7',
        vent: '#0a5f1c',
        base: '#e7e7e7'
    }),
    Duo_P: createProduct('Duo_P', 'Duo Pink', DUO_PERSPECTIVE, 'Duo', 'P', {
        top: '#e7e7e7',
        vent: '#8b5b65',
        base: '#e7e7e7'
    }),
    Duo_R: createProduct('Duo_R', 'Duo Red', DUO_PERSPECTIVE, 'Duo', 'R', {
        top: '#e7e7e7',
        vent: '#8a1313',
        base: '#e7e7e7'
    }),
    Duo_S: createProduct('Duo_S', 'Duo Silver', DUO_PERSPECTIVE, 'Duo', 'S', {
        top: '#e7e7e7',
        vent: '#818181',
        base: '#e7e7e7'
    })
};

// ── 場景 / MACHINE_CONFIG / APP_CONFIG ────────────────────
export const SCENES = [
    {
        id: 'scene_office',
        name: '辦公桌',
        thumbnail: assetUrl('/scenes/office.jpg'),
        url: assetUrl('/scenes/office.jpg')
    },
    {
        id: 'scene_cafe',
        name: '咖啡廳',
        thumbnail: assetUrl('/scenes/cafe.jpg'),
        url: assetUrl('/scenes/cafe.jpg')
    },
    {
        id: 'scene_home',
        name: '居家',
        thumbnail: assetUrl('/scenes/home.jpg'),
        url: assetUrl('/scenes/home.jpg')
    },
    {
        id: 'scene_car',
        name: '車上',
        thumbnail: assetUrl('/scenes/car.jpg'),
        url: assetUrl('/scenes/car.jpg')
    },
    {
        id: 'scene_dark',
        name: '暗色背景',
        thumbnail: assetUrl('/scenes/dark.jpg'),
        url: assetUrl('/scenes/dark.jpg')
    }
];

export const MACHINE_CONFIG = {
    machineImage: assetUrl('/machines/speaker.png'),
    stageSize: { width: STAGE_W, height: STAGE_H },
    // ★ 這裡也可以按需改成動態，目前保留 Duo 預設
    printArea: { left: DUO_PA_LEFT, top: DUO_PA_TOP, width: PRINT_W, height: DUO_PRINT_H }
};

export const APP_CONFIG = {
    defaultZoom: 1,
    minZoom: 0.1,
    maxZoom: 5,
    zoomStep: 0.1,
    exportScale: 2,
    maxImageSize: 300,
    canvasBackgroundColor: '#ffffff'
};
