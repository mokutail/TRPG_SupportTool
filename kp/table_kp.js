document.addEventListener('DOMContentLoaded', () => {
    const kpListContainer = document.getElementById('kpListContainer');
    const hitCountDisplay = document.getElementById('kpHitCount');

    let kpData = JSON.parse(localStorage.getItem('trpg_kp_v1')) || [];

    let currentImageBase64 = null;
    let currentSystemFilter = "すべて";
    let editingId = null;
    let editingSystem = null;

    const systems = ["CoC 6th", "CoC 7th", "エモクロア", "マダミス"];

    // --- 🎨 画像アップロード ---
    document.getElementById('imageUploadWrapper').addEventListener('click', () => {
        document.getElementById('kpImage').click();
    });

    document.getElementById('kpImage').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const size = 200;
                canvas.width = size; canvas.height = size;
                const ctx = canvas.getContext('2d');
                let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
                if (img.width > img.height) { sWidth = img.height; sx = (img.width - img.height) / 2; }
                else { sHeight = img.width; sy = (img.height - img.width) / 2; }
                ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, size, size);
                currentImageBase64 = canvas.toDataURL('image/jpeg', 0.8);
                document.getElementById('imagePreview').style.backgroundImage = `url(${currentImageBase64})`;
                document.getElementById('imagePreviewText').style.display = 'none';
                document.getElementById('btnClearImage').style.display = 'block';
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
    });

    document.getElementById('btnClearImage').addEventListener('click', (e) => {
        e.stopPropagation();
        currentImageBase64 = null;
        document.getElementById('imagePreview').style.backgroundImage = 'none';
        document.getElementById('imagePreviewText').style.display = 'flex';
        document.getElementById('kpImage').value = '';
        document.getElementById('btnClearImage').style.display = 'none';
    });

    // --- 📋 プルダウン制御 ---
    function setupCustomSelect(displayId, optionsId, hiddenId, onChangeCallback = null) {
        const display = document.getElementById(displayId);
        const options = document.getElementById(optionsId);
        const hidden = document.getElementById(hiddenId);

        display.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.select-options').forEach(opt => {
                if(opt !== options) opt.classList.remove('active');
            });
            options.classList.toggle('active');
        });

        options.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', () => {
                const val = item.getAttribute('data-value');
                if (displayId === 'filterStatusDisplay' && val === 'すべて') {
                    display.innerText = '状態: すべて';
                } else {
                    display.innerText = val;
                }
                hidden.value = val;
                options.classList.remove('active');
                if (onChangeCallback) onChangeCallback();
            });
        });
    }

    setupCustomSelect('kpStatusDisplay', 'kpStatusOptions', 'kpStatusHidden');
    setupCustomSelect('filterStatusDisplay', 'filterStatusOptions', 'filterStatusHidden', renderKpList);

    window.addEventListener('click', () => {
        document.querySelectorAll('.select-options.active').forEach(el => el.classList.remove('active'));
    });

    // --- 🗂️ システムタブ生成 ---
    function updateFormTitle() {
        const sysLabel = currentSystemFilter === 'すべて' ? 'CoC 6th' : currentSystemFilter;
        document.getElementById('formTitleLabel').innerHTML = `✏️ 新規KP卓の登録 <span style="font-size:12px; color:#999; font-weight:normal;">(${sysLabel}に追加)</span>`;
    }

    function renderSystemTabs() {
        const container = document.getElementById('systemTabs');
        container.innerHTML = `<button class="sys-tab-btn active" data-sys="すべて">すべて</button>`;
        systems.forEach(sys => {
            container.innerHTML += `<button class="sys-tab-btn" data-sys="${sys}">${sys}</button>`;
        });

        container.querySelectorAll('.sys-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                container.querySelectorAll('.sys-tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentSystemFilter = e.target.getAttribute('data-sys');
                updateFormTitle();
                renderKpList();
            });
        });
        updateFormTitle();
    }

    // --- 🔍 フィルター制御 ---
    document.getElementById('filterToggleBtn').addEventListener('click', function() {
        const box = document.getElementById('filterBox');
        if (box.style.display === 'none' || box.style.display === '') {
            box.style.display = 'block'; this.classList.add('open');
        } else {
            box.style.display = 'none'; this.classList.remove('open');
        }
    });

    ['filterScenario', 'filterPlayers', 'filterTags'].forEach(id => {
        document.getElementById(id).addEventListener('input', renderKpList);
    });

    document.getElementById('btnResetFilter').addEventListener('click', () => {
        document.getElementById('filterScenario').value = '';
        document.getElementById('filterPlayers').value = '';
        document.getElementById('filterTags').value = '';
        document.getElementById('filterStatusHidden').value = 'すべて';
        document.getElementById('filterStatusDisplay').innerText = '状態: すべて';
        renderKpList();
    });

    // --- 🎨 ステータスバッジのスタイル ---
    function getStatusBadgeStyle(status) {
        switch(status) {
            case '完走': return 'alive';
            case '回し中': return 'other';
            case '流卓': return 'lost';
            case '予定': default: return 'other';
        }
    }

    // --- 📊 リスト描画 ---
    function renderKpList() {
        kpListContainer.innerHTML = '';

        const fScenario = document.getElementById('filterScenario').value.trim().toLowerCase();
        const fPlayers = document.getElementById('filterPlayers').value.trim().toLowerCase();
        const fTags = document.getElementById('filterTags').value.trim().toLowerCase();
        const fStatus = document.getElementById('filterStatusHidden').value;
        let hitCount = 0;

        if (kpData.length === 0) {
            kpListContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#999; font-weight:bold;">登録されたKP卓はありません</div>';
            hitCountDisplay.innerText = "0"; return;
        }

        kpData.forEach((kp) => {
            if (currentSystemFilter !== "すべて" && kp.system !== currentSystemFilter) return;
            if (fStatus !== 'すべて' && kp.status !== fStatus) return;
            if (fScenario !== '' && (!kp.scenario || !kp.scenario.toLowerCase().includes(fScenario))) return;
            if (fPlayers !== '' && (!kp.players || !kp.players.toLowerCase().includes(fPlayers))) return;
            if (fTags !== '' && (!kp.tags || !kp.tags.toLowerCase().includes(fTags))) return;

            hitCount++;

            const item = document.createElement('div');
            item.className = 'list-item';

            let tagsHtml = '';
            if (kp.tags) {
                tagsHtml = `<div style="margin-bottom:8px;">` + kp.tags.split(',').map(t => `<span class="tag-pill">${t.trim()}</span>`).join(' ') + `</div>`;
            }

            const imgStyle = kp.image ? `background-image: url(${kp.image});` : `display:flex; justify-content:center; align-items:center; color:#aaa; font-size:30px;`;
            const statusClass = getStatusBadgeStyle(kp.status);

            let linksHtml = '';
            if (kp.docUrl) {
                linksHtml += `<a href="${kp.docUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; background:#e3f2fd; color:#1565c0; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:bold; text-decoration:none;">📄 資料/PDF</a>`;
            }
            if (kp.boothUrl) {
                linksHtml += `<a href="${kp.boothUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; background:#ffe0b2; color:#e65100; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:bold; text-decoration:none;">🛍️ Booth</a>`;
            }
            if (kp.ccfoliaUrl) {
                linksHtml += `<a href="${kp.ccfoliaUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; background:#c8e6c9; color:#2e7d32; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:bold; text-decoration:none;">🎲 ココフォリア</a>`;
            }

            if (kp.url && !kp.ccfoliaUrl && !kp.docUrl && !kp.boothUrl) {
                linksHtml += `<a href="${kp.url}" target="_blank" rel="noopener noreferrer" style="display:inline-block; background:#e0f2f1; color:#00695c; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:bold; text-decoration:none;">🔗 ココフォリアURL</a>`;
            }

            const linksContainer = linksHtml ? `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">${linksHtml}</div>` : '';

            // ★ 修正：ボタンの並び順を「次陣を作成」「修正」「削除」に変更。テキストを「卓開始日」に変更。
            item.innerHTML = `
                <div class="item-actions-corner">
                    <button class="corner-btn continue" onclick="createNextZin('${kp.id}')">次陣を作成</button>
                    <button class="corner-btn" style="background:#fff3e0; color:#e65100;" onclick="editKp('${kp.id}')">修正</button>
                    <button class="corner-btn delete" onclick="deleteKp('${kp.id}')">削除</button>
                </div>
                <div class="pl-list-layout">
                    <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0; gap:6px; width:80px;">
                        <div class="pl-list-image" style="${imgStyle}">${kp.image ? '' : '🎲'}</div>
                        <span class="status-badge ${statusClass}" style="margin:0; text-align:center;">${kp.status}</span>
                        <span style="font-size:10px; color:#999; font-weight:bold; text-align:center;">${kp.system}</span>
                    </div>
                    <div class="pl-list-content" style="margin-top: 28px;">
                        <div class="item-header" style="padding-right:0; margin-bottom:4px;">
                            <div class="item-title" style="margin-top:0;">${kp.scenario}</div>
                            <div class="item-subtitle" style="margin-bottom:4px;">第 ${kp.zin || 1} 陣</div>
                        </div>
                        ${tagsHtml}
                        <div class="item-details">
                            卓開始日: ${kp.date || '未定'} <br>
                            PL: ${kp.players || '未定'} <br>
                        </div>
                        ${linksContainer}
                    </div>
                </div>
            `;

            let pressTimer;
            const startPress = (e) => {
                if (e.target.closest('.corner-btn') || e.target.closest('a') || e.target.closest('.select-options')) return;
                pressTimer = setTimeout(() => { editKp(kp.id); }, 600);
            };
            const cancelPress = () => clearTimeout(pressTimer);

            item.addEventListener('touchstart', startPress, {passive: true});
            item.addEventListener('touchend', cancelPress);
            item.addEventListener('touchmove', cancelPress);
            item.addEventListener('mousedown', startPress);
            item.addEventListener('mouseup', cancelPress);
            item.addEventListener('mouseleave', cancelPress);

            kpListContainer.appendChild(item);
        });

        hitCountDisplay.innerText = hitCount;
    }

    // --- 🚀 新規登録・更新 ---
    document.getElementById('btnAddKp').addEventListener('click', () => {
        const scenario = document.getElementById('kpScenario').value.trim();
        const zin = document.getElementById('kpZin').value || 1;
        const date = document.getElementById('kpDate').value.trim();
        const players = document.getElementById('kpPlayers').value.trim();
        const status = document.getElementById('kpStatusHidden').value;
        const tags = document.getElementById('kpTags').value.trim();

        const docUrl = document.getElementById('kpDocUrl').value.trim();
        const boothUrl = document.getElementById('kpBoothUrl').value.trim();
        const ccfoliaUrl = document.getElementById('kpCcfoliaUrl').value.trim();

        if (!scenario) { alert('シナリオ名は必須です'); return; }

        if (editingId) {
            const index = kpData.findIndex(k => k.id === editingId);
            if (index > -1) {
                kpData[index] = { ...kpData[index], scenario, zin, date, players, status, tags, docUrl, boothUrl, ccfoliaUrl, image: currentImageBase64 };
            }
            editingId = null;
            editingSystem = null;
            document.getElementById('formTitleLabel').innerText = '✏️ 新規KP卓の登録';
            const btn = document.getElementById('btnAddKp');
            btn.innerText = 'リストに追加';
            btn.classList.remove('edit-mode');
        } else {
            const system = currentSystemFilter === "すべて" ? "CoC 6th" : currentSystemFilter;
            const newKp = {
                id: Date.now().toString(),
                system, scenario, zin, date, players, status, tags, docUrl, boothUrl, ccfoliaUrl, image: currentImageBase64
            };
            kpData.unshift(newKp);
        }

        saveData();
        resetForm();
        updateFormTitle();
    });

    // --- ✍️ 編集モード ---
    window.editKp = (id) => {
        const kp = kpData.find(k => k.id === id);
        if(!kp) return;
        editingId = id;
        editingSystem = kp.system;

        document.getElementById('kpScenario').value = kp.scenario || '';
        document.getElementById('kpZin').value = kp.zin || '';
        document.getElementById('kpDate').value = kp.date || '';
        document.getElementById('kpPlayers').value = kp.players || '';
        document.getElementById('kpTags').value = kp.tags || '';

        document.getElementById('kpDocUrl').value = kp.docUrl || '';
        document.getElementById('kpBoothUrl').value = kp.boothUrl || '';
        document.getElementById('kpCcfoliaUrl').value = kp.ccfoliaUrl || kp.url || '';

        document.getElementById('kpStatusHidden').value = kp.status || '予定';
        document.getElementById('kpStatusDisplay').innerText = kp.status || '予定';

        currentImageBase64 = kp.image || null;
        if(currentImageBase64) {
            document.getElementById('imagePreview').style.backgroundImage = `url(${currentImageBase64})`;
            document.getElementById('imagePreviewText').style.display = 'none';
            document.getElementById('btnClearImage').style.display = 'block';
        } else {
            document.getElementById('btnClearImage').click();
        }

        document.getElementById('formTitleLabel').innerText = `✍️ KP卓情報の編集 (${editingSystem})`;
        const btn = document.getElementById('btnAddKp');
        btn.innerText = '情報を更新する';
        btn.classList.add('edit-mode');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- ✨ 次陣を作成 ---
    window.createNextZin = (id) => {
        const kp = kpData.find(k => k.id === id);
        if(!kp) return;

        document.getElementById('kpScenario').value = kp.scenario || '';
        document.getElementById('kpZin').value = (parseInt(kp.zin) || 1) + 1;
        document.getElementById('kpDate').value = '';
        document.getElementById('kpPlayers').value = '';
        document.getElementById('kpTags').value = kp.tags || '';

        document.getElementById('kpDocUrl').value = kp.docUrl || '';
        document.getElementById('kpBoothUrl').value = kp.boothUrl || '';
        document.getElementById('kpCcfoliaUrl').value = kp.ccfoliaUrl || kp.url || '';

        document.getElementById('kpStatusHidden').value = '予定';
        document.getElementById('kpStatusDisplay').innerText = '予定';

        currentImageBase64 = kp.image || null;
        if(currentImageBase64) {
            document.getElementById('imagePreview').style.backgroundImage = `url(${currentImageBase64})`;
            document.getElementById('imagePreviewText').style.display = 'none';
            document.getElementById('btnClearImage').style.display = 'block';
        } else {
            document.getElementById('btnClearImage').click();
        }

        editingId = null;
        document.getElementById('formTitleLabel').innerText = `✨ ${kp.scenario} の次陣を作成 (${kp.system})`;
        const btn = document.getElementById('btnAddKp');
        btn.innerText = '新しい陣を追加';
        btn.classList.remove('edit-mode');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.deleteKp = (id) => {
        if (confirm('このKP卓データを完全に削除しますか？')) {
            kpData = kpData.filter(k => k.id !== id);
            saveData();
        }
    };

    function resetForm() {
        document.getElementById('kpScenario').value = '';
        document.getElementById('kpZin').value = '';
        document.getElementById('kpDate').value = '';
        document.getElementById('kpPlayers').value = '';
        document.getElementById('kpTags').value = '';
        document.getElementById('kpDocUrl').value = '';
        document.getElementById('kpBoothUrl').value = '';
        document.getElementById('kpCcfoliaUrl').value = '';
        document.getElementById('kpStatusDisplay').innerText = "予定";
        document.getElementById('kpStatusHidden').value = "予定";
        document.getElementById('btnClearImage').click();
    }

    function saveData() {
        localStorage.setItem('trpg_kp_v1', JSON.stringify(kpData));
        renderKpList();
    }

    renderSystemTabs();
    renderKpList();
});