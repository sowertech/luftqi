// src/utils/path.js
const BASE_URL = import.meta.env.VITE_BASE_URL || '';

/**
 * 取得正確的資源完整路徑
 * @param {string} path - 以 / 開頭的相對路徑
 * @returns {string}
 */
export function assetUrl(path) {
    return `${BASE_URL}${path}`;
}
