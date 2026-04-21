// src/config/products.js

import { assetUrl } from '../utils/path';

// ── 印刷區固定尺寸 ──────────────────────────────
const PRINT_W = 250; // 48 份
const PRINT_H = Math.round((PRINT_W * 52) / 48); // = 271px（52 份）

/**
 * CUBE 系列 perspective
 * 讓四個角點圍出的 bounding box 剛好是 250×271
 * 並讓印刷區在底圖（800×600）中水平置中
 */
const STAGE_W = 800;
const STAGE_H = 600;

// 置中：left = (800 - 250) / 2 = 275
const PA_LEFT = Math.round((STAGE_W - PRINT_W) / 2); // 275
const PA_TOP = Math.round((STAGE_H - PRINT_H) / 2); // 164（垂直也置中）

const CUBE_PERSPECTIVE = {
    topLeft: { x: PA_LEFT, y: PA_TOP },
    topRight: { x: PA_LEFT + PRINT_W, y: PA_TOP },
    bottomLeft: { x: PA_LEFT, y: PA_TOP + PRINT_H },
    bottomRight: { x: PA_LEFT + PRINT_W, y: PA_TOP + PRINT_H },
    width: PRINT_W,
    height: PRINT_H
};

const DUO_PERSPECTIVE = {
    topLeft: { x: PA_LEFT, y: PA_TOP },
    topRight: { x: PA_LEFT + PRINT_W, y: PA_TOP },
    bottomLeft: { x: PA_LEFT, y: PA_TOP + PRINT_H },
    bottomRight: { x: PA_LEFT + PRINT_W, y: PA_TOP + PRINT_H },
    width: PRINT_W,
    height: PRINT_H
};

const CANVAS_SIZE = { width: STAGE_W, height: STAGE_H };

/**
 * 由 perspective 四個角點自動推算矩形 printArea
 */
function perspectiveToPrintArea(p) {
    const xs = [p.topLeft.x, p.topRight.x, p.bottomLeft.x, p.bottomRight.x];
    const ys = [p.topLeft.y, p.topRight.y, p.bottomLeft.y, p.bottomRight.y];
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const right = Math.max(...xs);
    const bottom = Math.max(...ys);
    return {
        left,
        top,
        width: right - left, // = PRINT_W = 250
        height: bottom - top // = PRINT_H = 271
    };
}

function createProduct(id, name, perspective) {
    return {
        id,
        name,
        thumbnail: assetUrl(`/assets/products/${id}.png`),
        baseImage: assetUrl(`/assets/products/${id}.png`),
        canvasSize: CANVAS_SIZE,
        perspective,
        printArea: perspectiveToPrintArea(perspective)
    };
}

export const PRODUCTS_CONFIG = {
    // ── Cube 系列 ──────────────────────────────────────────
    Cube_B: createProduct('Cube_B', 'Cube Black', CUBE_PERSPECTIVE),
    Cube_BG: createProduct('Cube_BG', 'Cube Beige', CUBE_PERSPECTIVE),
    Cube_Blue: createProduct('Cube_Blue', 'Cube Blue', CUBE_PERSPECTIVE),
    Cube_G: createProduct('Cube_G', 'Cube Gold', CUBE_PERSPECTIVE),
    Cube_P: createProduct('Cube_P', 'Cube Pink', CUBE_PERSPECTIVE),
    Cube_S: createProduct('Cube_S', 'Cube Silver', CUBE_PERSPECTIVE),

    // ── Duo 系列 ───────────────────────────────────────────
    Duo_B: createProduct('Duo_B', 'Duo Black', DUO_PERSPECTIVE),
    Duo_BG: createProduct('Duo_BG', 'Duo Black Gold', DUO_PERSPECTIVE),
    Duo_Blue: createProduct('Duo_Blue', 'Duo Blue', DUO_PERSPECTIVE),
    Duo_G: createProduct('Duo_G', 'Duo Gold', DUO_PERSPECTIVE),
    Duo_Green: createProduct('Duo_Green', 'Duo Green', DUO_PERSPECTIVE),
    Duo_P: createProduct('Duo_P', 'Duo Pink', DUO_PERSPECTIVE),
    Duo_R: createProduct('Duo_R', 'Duo Red', DUO_PERSPECTIVE),
    Duo_S: createProduct('Duo_S', 'Duo Silver', DUO_PERSPECTIVE)
};

// ── 場景配置（不變）───────────────────────────────────────
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

// ── MACHINE_CONFIG（純設計稿預設值）──────────────────────
export const MACHINE_CONFIG = {
    machineImage: assetUrl('/machines/speaker.png'),
    stageSize: { width: STAGE_W, height: STAGE_H },
    printArea: {
        left: PA_LEFT, // 275（水平置中）
        top: PA_TOP, // 164（垂直置中）
        width: PRINT_W, // 250
        height: PRINT_H // 271
    }
};

// ── APP_CONFIG（不變）─────────────────────────────────────
export const APP_CONFIG = {
    defaultZoom: 1,
    minZoom: 0.1,
    maxZoom: 5,
    zoomStep: 0.1,
    exportScale: 2,
    maxImageSize: 300,
    canvasBackgroundColor: '#ffffff'
};
