document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('recruitCanvas');
    const ctx = canvas.getContext('2d');
    const form = document.getElementById('recruit-form');
    const previewSection = document.getElementById('preview-section');

    let customData = { system: [], tool: [] };

    // --- 🎨 カラーピッカー連動ロジック ---
    let currentPickingId = null;
    const colorModal = document.getElementById('colorModal');
    const colorWheel = document.getElementById('colorWheel');
    const grayScaleBar = document.getElementById('grayScaleBar'); // ★ グレースケールバー
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
            drawGrayScaleBar(); // ★ バーも描画
        }, 10);
    };

    // カラーホイールの描画
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

    // ★ グレースケールバーの描画 (白 → 黒 のグラデーション)
    function drawGrayScaleBar() {
        if (!grayScaleBar) return;
        const ctx = grayScaleBar.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, grayScaleBar.width, 0);
        grad.addColorStop(0, '#FFFFFF'); // 左端は白
        grad.addColorStop(1, '#000000'); // 右端は黒
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, grayScaleBar.width, grayScaleBar.height);
    }

    // ホイールからの色取得
    function handleColorPick(e) {
        const rect = colorWheel.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        const x = cx - rect.left; const y = cy - rect.top;
        const cwCtx = colorWheel.getContext('2d');
        const p = cwCtx.getImageData(x, y, 1, 1).data;
        if (p[3] === 0) return; // 透明部分は無視
        const hex = "#" + [p[0], p[1], p[2]].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
        updateModalUI(hex);
    }

    // ★ バーからの色取得
    function handleGrayScalePick(e) {
        const rect = grayScaleBar.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        // x座標がはみ出さないように制限 (Clamp)
        let x = Math.max(0, Math.min(cx - rect.left, grayScaleBar.width - 1));

        const ctx = grayScaleBar.getContext('2d');
        // y=15(バーの中央) から1ピクセル取得
        const p = ctx.getImageData(x, 15, 1, 1).data;
        const hex = "#" + [p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
        updateModalUI(hex);
    }

    function updateModalUI(hex) {
        if(modalPreview) modalPreview.style.backgroundColor = hex;
        if(modalHexInput) modalHexInput.value = hex;
    }

    // ホイールのイベント
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

    // ★ バーのイベント
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

    typeSelectBtn.onclick = () => {
        typeModal.style.display = 'flex';
        if (previewSection) previewSection.style.display = 'none';
    };

    typeModal.onclick = (e) => {
        if (e.target === typeModal) {
            typeModal.style.display = 'none';
            if (previewSection) previewSection.style.display = 'flex';
        }
    };

    window.selectType = (val) => {
        recruitTypeInput.value = val;
        typeSelectBtn.innerText = val;
        playerNumGroup.style.display = (val === 'PL募集' || val === 'DL募集') ? 'block' : 'none';

        typeModal.style.display = 'none';
        if (previewSection) previewSection.style.display = 'flex';
        draw();
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

    form.addEventListener('input', draw);

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
                typeSelectBtn.innerText = 'PL募集';
                playerNumGroup.style.display = 'block';

                draw();
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