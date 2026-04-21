// src/utils/swal.js
/**
 * 統一 SweetAlert2 配置
 * 所有彈窗都從這裡匯入，確保風格一致
 */
import Swal from 'sweetalert2';

// ── 基礎樣式共用設定 ─────────────────────────────
const BASE_CONFIG = {
    confirmButtonColor: 'rgb(60, 130, 191)',
    cancelButtonColor: '#6c757d',
    confirmButtonText: '確定',
    cancelButtonText: '取消',
    buttonsStyling: true,
    customClass: {
        popup: 'swal-custom-popup',
        title: 'swal-custom-title',
        htmlContainer: 'swal-custom-content',
        confirmButton: 'swal-custom-confirm',
        cancelButton: 'swal-custom-cancel'
    }
};

// ── 各類型快捷函式 ───────────────────────────────

/** 警告提示（只有確認按鈕）*/
export const alertWarn = (title, text = '') =>
    Swal.fire({
        ...BASE_CONFIG,
        icon: 'warning',
        title,
        text
    });

/** 成功提示 */
export const alertSuccess = (title, text = '') =>
    Swal.fire({
        ...BASE_CONFIG,
        icon: 'success',
        title,
        text,
        timer: 1800,
        showConfirmButton: false
    });

/** 錯誤提示 */
export const alertError = (title, text = '') =>
    Swal.fire({
        ...BASE_CONFIG,
        icon: 'error',
        title,
        text
    });

/** 確認對話框（有確認 + 取消）*/
export const confirmDialog = (title, text = '', options = {}) =>
    Swal.fire({
        ...BASE_CONFIG,
        icon: 'question',
        title,
        text,
        showCancelButton: true,
        ...options
    });

/** 危險操作確認（紅色確認按鈕）*/
export const confirmDanger = (title, text = '', confirmText = '確定') =>
    Swal.fire({
        ...BASE_CONFIG,
        icon: 'warning',
        title,
        text,
        showCancelButton: true,
        confirmButtonText: confirmText,
        confirmButtonColor: '#dc3545'
    });

/** 文字輸入框（取代 window.prompt）*/
export const inputDialog = (title, defaultValue = '', options = {}) =>
    Swal.fire({
        ...BASE_CONFIG,
        title,
        input: 'textarea',
        inputValue: defaultValue,
        showCancelButton: true,
        confirmButtonText: '確認',
        inputAttributes: {
            rows: 4,
            style: 'resize: vertical; font-size: 14px;'
        },
        ...options
    });

export default Swal;
