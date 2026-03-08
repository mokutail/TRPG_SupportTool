// ==========================================
// ★ Firebaseの初期設定
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyD67HN29lVqUoRAczK-FYFdqlkQq7PyfTU",
  authDomain: "trpg-supporttool.firebaseapp.com",
  projectId: "trpg-supporttool",
  storageBucket: "trpg-supporttool.firebasestorage.app",
  messagingSenderId: "163289928352",
  appId: "1:163289928352:web:a75c5bb1827b47d0eb2fc5"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let saveTimeout = null; // オートセーブ用のタイマー

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // ★ 2. ログインチェックと、前回の下書きの読み込み
    // ==========================================
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadDraftFromFirebase(); // ログインしたら金庫から下書きを取り出す！
        } else {
            alert("データの同期にはログインが必要です。トップページに戻ります。");
            window.location.href = '../index.html';
        }
    });

    // データベースから下書きを読み込む処理
    function loadDraftFromFirebase() {
        db.collection("users").doc(currentUser.uid).collection("settings").doc("recruit_draft")
            .get().then((doc) => {
                if (doc.exists) {
                    applyFormState(doc.data());
                }
            }).catch(err => console.error("下書きの読み込みに失敗しました:", err));
    }

    // データベースへ下書きを保存する処理（オートセーブ）
    function triggerSave() {
        if (!currentUser) return;
        clearTimeout(saveTimeout);
        // 入力が終わってから1秒（1000ミリ秒）後に自動保存する
        saveTimeout = setTimeout(() => {
            const state = getFormState();
            db.collection("users").doc(currentUser.uid).collection("settings").doc("recruit_draft")
              .set(state, { merge: true })
              .then(() => console.log("クラウドに下書きを自動保存しました！"));
        }, 1000);
    }

    // ==========================================
    // 既存のUI制御・Canvas描画コード
    // ==========================================
    const canvas = document.getElementById('recruitCanvas');
    const ctx = canvas.getContext('2d');
    const form = document.getElementById('recruit-form');
    const previewSection = document.getElementById('preview-section');

    let customData = { system: [], tool: [] };

    // --- 🎨 カラーピッカー連動ロジック ---
    let currentPickingId = null;
    const colorModal = document.getElementById('colorModal');
    const colorWheel = document.getElementById('colorWheel');
    const grayScaleBar = document.getElementById('grayScaleBar');
    const modalPreview = document.getElementById('modalPreview');
    const modalHexInput = document.getElementById('modalHexInput');
    let favorites = JSON.parse(localStorage.getItem('trpg_fav_colors')) || Array(8).fill('#FFFFFF');

    window.openPicker = (id) => {
        currentPickingId = id;
        const currentVal = document.getElementById(id).value;
        updateModalUI(currentVal);
        renderPalette();
        colorModal.style.display = 'flex';
        if (previewSection) previewSection.style.display = 'none';

        setTimeout(() => {
            drawWheel();
            drawGrayScaleBar();
        }, 10);
    };

    function drawWheel() {
        if (!colorWheel) return;
        const cwCtx = colorWheel.getContext('2d');
        const r = colorWheel.width / 2;
        cwCtx.clearRect(0, 0, 220, 220);
        for (let a = 0; a < 360; a++) {
            const s = (a - 2) * Math.PI / 180; const e = (a + 2) * Math.PI / 180;
            cwCtx.beginPath(); cwCtx.moveTo(r, r); cwCtx.arc(r, r, r, s, e);
            const g = cwCtx.createRadialGradient(r, r, 0, r, r, r);
            g.addColorStop(0, '#fff'); g.addColorStop(1, `hsl(${a},100%,50%)`);
            cwCtx.fillStyle = g; cwCtx.fill();
        }
    }

    function drawGrayScaleBar() {
        if (!grayScaleBar) return;
        const ctx = grayScaleBar.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, grayScaleBar.width, 0);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, grayScaleBar.width, grayScaleBar.height);
    }

    function handleColorPick(e) {
        const rect = colorWheel.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        const x = cx - rect.left; const y = cy - rect.top;
        const cwCtx = colorWheel.getContext('2d');
        const p = cwCtx.getImageData(x, y, 1, 1).data;
        if (p[3] === 0) return;
        const hex = "#" + [p[0], p[1], p[2]].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
        updateModalUI(hex);
    }

    function handleGrayScalePick(e) {
        const rect = grayScaleBar.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        let x = Math.max(0, Math.min(cx - rect.left, grayScaleBar.width - 1));
        const ctx = grayScaleBar.getContext('2d');
        const p = ctx.getImageData(x, 15, 1, 1).data;
        const hex = "#" + [p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
        updateModalUI(hex);
    }

    function updateModalUI(hex) {
        if(modalPreview) modalPreview.style.backgroundColor = hex;
        if(modalHexInput) modalHexInput.value = hex;
    }

    if(colorWheel) {
        colorWheel.addEventListener('mousedown', (e) => {
            handleColorPick(e);
            const move = (ev) => handleColorPick(ev);
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', () => window.removeEventListener('mousemove', move), { once: true });
        });
        colorWheel.addEventListener('touchstart', (e) => {
            handleColorPick(e);
            const move = (ev) => handleColorPick(ev);
            window.addEventListener('touchmove', move);
            window.addEventListener('touchend', () => window.removeEventListener('touchmove', move), { once: true });
        }, { passive: false });
    }

    if(grayScaleBar) {
        grayScaleBar.addEventListener('mousedown', (e) => {
            handleGrayScalePick(e);
            const move = (ev) => handleGrayScalePick(ev);
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', () => window.removeEventListener('mousemove', move), { once: true });
        });
        grayScaleBar.addEventListener('touchstart', (e) => {
            handleGrayScalePick(e);
            const move = (ev) => handleGrayScalePick(ev);
            window.addEventListener('touchmove', move);
            window.addEventListener('touchend', () => window.removeEventListener('touchmove', move), { once: true });
        }, { passive: false });
    }

    function renderPalette() {
        const grid = document.getElementById('paletteGrid');
        if(!grid) return;
        grid.innerHTML = '';
        favorites.forEach((color, i) => {
            const slot = document.createElement('div');
            slot.className = 'palette-slot';
            slot.style.backgroundColor = color;
            slot.onclick = () => updateModalUI(color);
            let t;
            const start = () => t = setTimeout(() => {
                favorites[i] = modalHexInput.value;
                localStorage.setItem('trpg_fav_colors', JSON.stringify(favorites));
                renderPalette();
            }, 800);
            const end = () => clearTimeout(t);
            slot.onmousedown = start; slot.onmouseup = end;
            slot.ontouchstart = start; slot.ontouchend = end;
            grid.appendChild(slot);
        });
    }

    document.getElementById('btnModalApply').onclick = () => {
        const val = modalHexInput.value;
        document.getElementById(currentPickingId).value = val;
        document.getElementById('preview-' + currentPickingId).style.backgroundColor = val;
        colorModal.style.display = 'none';
        if (previewSection) previewSection.style.display = 'flex';
        draw();
        triggerSave(); // ★ 色を変えたら自動保存！
    };

    document.getElementById('btnModalCancel').onclick = () => {
        colorModal.style.display = 'none';
        if (previewSection) previewSection.style.display = 'flex';
    };

    // --- 📋 募集タイプモーダル制御 ---
    const typeModal = document.getElementById('typeModal');
    const typeSelectBtn = document.getElementById('typeSelectBtn');
    const recruitTypeInput = document.getElementById('recruitType');
    const playerNumGroup = document.getElementById('playerNumGroup');

    if(typeSelectBtn) {
        typeSelectBtn.onclick = () => {
            typeModal.style.display = 'flex';
            if (previewSection) previewSection.style.display = 'none';
        };
    }

    if(typeModal) {
        typeModal.onclick = (e) => {
            if (e.target === typeModal) {
                typeModal.style.display = 'none';
                if (previewSection) previewSection.style.display = 'flex';
            }
        };
    }

    window.selectType = (val) => {
        recruitTypeInput.value = val;
        typeSelectBtn.innerText = val;
        playerNumGroup.style.display = (val === 'PL募集' || val === 'DL募集') ? 'block' : 'none';

        typeModal.style.display = 'none';
        if (previewSection) previewSection.style.display = 'flex';
        draw();
        triggerSave(); // ★ 種類を変えたら自動保存！
    };

    document.querySelectorAll('.modal-list-item').forEach(item => {
        item.onclick = () => selectType(item.getAttribute('data-value'));
    });

    // --- 🎲 動的Pill管理 ---
    window.addCustomPill = (type) => {
        const inputId = type === 'system' ? 'addSystemInput' : 'addToolInput';
        const containerId = type === 'system' ? 'system-pill-container' : 'tool-pill-container';
        const input = document.getElementById(inputId);
        const val = input.value.trim();
        if (!val) return;
        if (customData[type].includes(val)) { input.value = ''; return; }
        customData[type].push(val);
        input.value = '';
        renderCustomPills(type, containerId);
        draw();
        triggerSave(); // ★ カスタムタグを追加したら自動保存！
    };

    function renderCustomPills(type, containerId) {
        const container = document.getElementById(containerId);
        container.querySelectorAll('.custom-pill').forEach(p => p.remove());
        customData[type].forEach(val => {
            const label = document.createElement('label');
            const isSystem = type === 'system';
            label.className = (isSystem ? 'pill-radio' : 'pill-label') + ' custom-pill';
            label.innerHTML = `<input type="${isSystem ? 'radio' : 'checkbox'}" name="${isSystem ? 'gameSystem' : 'tool'}" value="${val}" checked><span>${val}</span>`;

            let timer;
            label.addEventListener('touchstart', () => {
                timer = setTimeout(() => {
                    if (confirm(`「${val}」をリストから削除しますか？`)) {
                        customData[type] = customData[type].filter(v => v !== val);
                        renderCustomPills(type, containerId);
                        draw();
                        triggerSave(); // ★ 削除したら自動保存！
                    }
                }, 800);
            });
            label.addEventListener('touchend', () => clearTimeout(timer));
            container.appendChild(label);
        });
    }

    function getCheckedValues(name, separator = ' / ') {
        return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value).join(separator);
    }

    // ★ 保存用に配列のまま取得する関数
    function getCheckedValuesArray(name) {
        return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);
    }

    // --- 🖼️ Canvas描画ロジック ---
    function draw() {
        canvas.width = 1240; canvas.height = 1754;
        const colors = {
            bg: document.getElementById('colorBg').value,
            text: document.getElementById('colorText').value,
            card: document.getElementById('colorCard').value,
            cardText: document.getElementById('colorCardText').value,
            tag: document.getElementById('colorTagBg').value,
            tagText: document.getElementById('colorTagText').value
        };

        ctx.fillStyle = colors.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);

        const type = recruitTypeInput.value;
        ctx.font = 'bold 50px sans-serif';
        const typeW = ctx.measureText(type).width + 80;
        ctx.fillStyle = colors.tag; ctx.beginPath(); ctx.roundRect(0, 0, typeW, 140, [0, 0, 40, 0]); ctx.fill();
        ctx.fillStyle = colors.tagText; ctx.textAlign = 'center'; ctx.fillText(type, typeW / 2, 90);

        const system = getCheckedValues('gameSystem', '、');
        const scenario = document.getElementById('scenarioName').value || '未設定のシナリオ';

        ctx.textAlign = 'left'; ctx.fillStyle = colors.text; ctx.font = 'bold 45px sans-serif';
        ctx.fillText(system || 'システム未選択', 80, 220);
        ctx.font = 'bold 75px sans-serif'; ctx.fillText(scenario, 80, 310);

        ctx.fillStyle = colors.card; ctx.beginPath(); ctx.roundRect(60, 360, 1120, 1334, 60); ctx.fill();

        const startX = 140; let currentY = 500; const lineGap = 150;

        let items = [{ label: '開催日程', val: document.getElementById('schedule').value || '(未定)', icon: '📅' }];

        if (type === 'PL募集' || type === 'DL募集') {
            items.push({ label: '募集人数', val: document.getElementById('playerNum').value || '(未定)', icon: '👥' });
        }

        items.push(
            { label: '想定時間', val: document.getElementById('duration').value || '(未定)', icon: '⏰' },
            { label: '形式', val: getCheckedValues('format') || '(未定)', icon: '💬' },
            { label: '使用ツール', val: getCheckedValues('tool') || '(未定)', icon: '🛠️' },
            { label: '募集範囲', val: getCheckedValues('scope') || '(未定)', icon: '👥' },
            { label: '参加希望', val: getCheckedValues('method') || '(未定)', icon: '📩' }
        );

        items.forEach(item => {
            ctx.fillStyle = colors.tag; ctx.beginPath(); ctx.arc(startX, currentY - 20, 45, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = colors.tagText; ctx.font = '40px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(item.icon, startX, currentY - 5);
            ctx.textAlign = 'left'; ctx.fillStyle = '#888'; ctx.font = 'bold 28px sans-serif';
            ctx.fillText(item.label, startX + 80, currentY - 45);
            ctx.fillStyle = colors.cardText; ctx.font = 'bold 44px sans-serif';
            ctx.fillText(item.val, startX + 80, currentY + 15);
            currentY += lineGap;
        });

        const remarks = document.getElementById('recruitDetail').value;
        ctx.fillStyle = colors.tag; ctx.beginPath(); ctx.arc(startX, currentY - 20, 45, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = colors.tagText; ctx.font = '40px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('📝', startX, currentY - 5);
        ctx.textAlign = 'left'; ctx.fillStyle = '#888'; ctx.font = 'bold 28px sans-serif'; ctx.fillText('備考', startX + 80, currentY - 45);
        ctx.fillStyle = colors.cardText; ctx.font = 'bold 38px sans-serif';
        remarks.split('\n').forEach((line, i) => { if (i < 8) ctx.fillText(line, startX + 80, currentY + 15 + (i * 50)); });
    }

    // ★ フォームが入力されるたびに描画＆オートセーブを実行！
    form.addEventListener('input', () => {
        draw();
        triggerSave();
    });

    // ==========================================
    // ★ 3. フォームの状態を読み書きする関数
    // ==========================================
    function getFormState() {
        return {
            recruitType: document.getElementById('recruitType').value,
            scenarioName: document.getElementById('scenarioName').value,
            schedule: document.getElementById('schedule').value,
            playerNum: document.getElementById('playerNum').value,
            duration: document.getElementById('duration').value,
            recruitDetail: document.getElementById('recruitDetail').value,
            colors: {
                colorBg: document.getElementById('colorBg').value,
                colorText: document.getElementById('colorText').value,
                colorCard: document.getElementById('colorCard').value,
                colorCardText: document.getElementById('colorCardText').value,
                colorTagBg: document.getElementById('colorTagBg').value,
                colorTagText: document.getElementById('colorTagText').value
            },
            customData: customData,
            checks: {
                gameSystem: getCheckedValuesArray('gameSystem'),
                format: getCheckedValuesArray('format'),
                tool: getCheckedValuesArray('tool'),
                scope: getCheckedValuesArray('scope'),
                method: getCheckedValuesArray('method')
            }
        };
    }

    function applyFormState(data) {
        if (!data) return;

        if(data.recruitType) selectType(data.recruitType);
        if(data.scenarioName) document.getElementById('scenarioName').value = data.scenarioName;
        if(data.schedule) document.getElementById('schedule').value = data.schedule;
        if(data.playerNum) document.getElementById('playerNum').value = data.playerNum;
        if(data.duration) document.getElementById('duration').value = data.duration;
        if(data.recruitDetail) document.getElementById('recruitDetail').value = data.recruitDetail;

        if(data.colors) {
            for(const [id, color] of Object.entries(data.colors)) {
                const el = document.getElementById(id);
                if(el) {
                    el.value = color;
                    const previewEl = document.getElementById('preview-' + id);
                    if(previewEl) previewEl.style.backgroundColor = color;
                }
            }
        }

        if(data.customData) {
            customData = data.customData;
            renderCustomPills('system', 'system-pill-container');
            renderCustomPills('tool', 'tool-pill-container');
        }

        if(data.checks) {
            ['gameSystem', 'format', 'tool', 'scope', 'method'].forEach(name => {
                const savedVals = data.checks[name] || [];
                document.querySelectorAll(`input[name="${name}"]`).forEach(cb => {
                    cb.checked = savedVals.includes(cb.value);
                });
            });
        }
        draw();
    }

    function showConfirm(message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('customConfirmModal');
            document.getElementById('confirmMessage').innerText = message;
            modal.style.display = 'flex';
            if (previewSection) previewSection.style.display = 'none';
            document.getElementById('btnConfirmOK').onclick = () => {
                modal.style.display = 'none';
                if (previewSection) previewSection.style.display = 'flex';
                resolve(true);
            };
            document.getElementById('btnConfirmCancel').onclick = () => {
                modal.style.display = 'none';
                if (previewSection) previewSection.style.display = 'flex';
                resolve(false);
            };
        });
    }

    const performReset = () => {
        setTimeout(async () => {
            if (await showConfirm('入力内容をリセットしますか？')) {
                form.reset();
                customData = { system: [], tool: [] };
                renderCustomPills('system', 'system-pill-container');
                renderCustomPills('tool', 'tool-pill-container');

                const defaultColors = {
                    colorBg: '#67afad',
                    colorText: '#ffffff',
                    colorCard: '#ffffff',
                    colorCardText: '#333333',
                    colorTagBg: '#ffffff',
                    colorTagText: '#37a2ff'
                };
                for (const [id, color] of Object.entries(defaultColors)) {
                    document.getElementById(id).value = color;
                    document.getElementById('preview-' + id).style.backgroundColor = color;
                }

                recruitTypeInput.value = 'PL募集';
                if(typeSelectBtn) typeSelectBtn.innerText = 'PL募集';
                if(playerNumGroup) playerNumGroup.style.display = 'block';

                draw();
                triggerSave(); // ★ リセット状態もクラウドに保存！
            }
        }, 150);
    };

    document.getElementById('resetRecruitBtnTop').onclick = performReset;
    document.getElementById('resetRecruitBtnBottom').onclick = performReset;

    document.getElementById('downloadRecruitBtn').onclick = () => {
        setTimeout(() => {
            const dataUrl = canvas.toDataURL('image/png');
            if (window.Android) window.Android.saveImage(dataUrl);
            else { const a = document.createElement('a'); a.href = dataUrl; a.download = "Recruit.png"; a.click(); }
        }, 150);
    };

    draw();
});