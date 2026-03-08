document.addEventListener('DOMContentLoaded', () => {
    const scList = document.getElementById('scList');
    const hitCountDisplay = document.getElementById('scHitCount');
    let scenarios = JSON.parse(localStorage.getItem('trpg_scenarios')) || [];

    let editingIndex = null;

    // ★ 指定されたシステム配列
    const systems = ["CoC 6th", "CoC 7th", "エモクロア", "マダミス"];
    let currentSystemFilter = "すべて";

    // --- カスタムプルダウン共通化関数 ---
    function setupCustomSelect(displayId, optionsId, hiddenId, onChangeCallback = null) {
        const display = document.getElementById(displayId);
        const options = document.getElementById(optionsId);
        const hidden = document.getElementById(hiddenId);

        display.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.select-options').forEach(opt => {
                if (opt !== options) opt.classList.remove('active');
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

    setupCustomSelect('scStatusDisplay', 'scStatusOptions', 'scStatusHidden');
    setupCustomSelect('filterStatusDisplay', 'filterStatusOptions', 'filterStatusHidden', renderScenarios);

    window.addEventListener('click', () => {
        document.querySelectorAll('.select-options.active').forEach(el => {
            el.classList.remove('active');
        });
    });

    // --- システムタブ生成と制御 ---
    function updateFormTitle() {
        const sysLabel = currentSystemFilter === 'すべて' ? 'CoC 6th' : currentSystemFilter;
        document.getElementById('formTitleLabel').innerHTML = `🆕 新規シナリオ登録 <span style="font-size:12px; color:#999; font-weight:normal;">(${sysLabel})</span>`;
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
                renderScenarios();
            });
        });
        updateFormTitle();
    }

    // --- フィルターの開閉制御 ---
    document.getElementById('filterToggleBtn').addEventListener('click', function() {
        const box = document.getElementById('filterBox');
        if (box.style.display === 'none' || box.style.display === '') {
            box.style.display = 'block'; this.classList.add('open');
        } else {
            box.style.display = 'none'; this.classList.remove('open');
        }
    });

    ['filterScenario', 'filterPlayerNum', 'filterDuration'].forEach(id => {
        document.getElementById(id).addEventListener('input', renderScenarios);
    });

    document.getElementById('btnResetFilter').addEventListener('click', () => {
        document.getElementById('filterScenario').value = '';
        document.getElementById('filterPlayerNum').value = '';
        document.getElementById('filterDuration').value = '';
        document.getElementById('filterStatusHidden').value = 'すべて';
        document.getElementById('filterStatusDisplay').innerText = '状態: すべて';
        renderScenarios();
    });

    // --- リストの描画 ---
    function renderScenarios() {
        scList.innerHTML = '';

        const fScenario = document.getElementById('filterScenario').value.trim().toLowerCase();
        const fPlayerNum = document.getElementById('filterPlayerNum').value.trim().toLowerCase();
        const fDuration = document.getElementById('filterDuration').value.trim().toLowerCase();
        const fStatus = document.getElementById('filterStatusHidden').value;
        let hitCount = 0;

        if (scenarios.length === 0) {
            scList.innerHTML = '<div style="text-align:center; padding:20px; color:#999; font-size:14px; font-weight:bold;">登録されたシナリオはありません</div>';
            hitCountDisplay.innerText = "0";
            return;
        }

        scenarios.forEach((s, index) => {
            if (currentSystemFilter !== 'すべて' && s.system !== currentSystemFilter) return;
            if (fStatus !== 'すべて' && s.status !== fStatus) return;
            if (fScenario !== '' && (!s.title || !s.title.toLowerCase().includes(fScenario))) return;
            if (fPlayerNum !== '' && (!s.playerNum || !s.playerNum.toLowerCase().includes(fPlayerNum))) return;

            // ★ 魔法の追加：「時間」の範囲検索機能！
            if (fDuration !== '') {
                if (!s.duration) return; // 時間が設定されていなければ弾く

                // 通常の文字一致（例：「半日」などで検索した場合）
                let isMatch = s.duration.toLowerCase().includes(fDuration);

                // もし文字一致しなかった場合で、検索ワードに数字が含まれていたら範囲チェックを行う
                const searchNumMatch = fDuration.match(/(\d+(?:\.\d+)?)/);
                if (!isMatch && searchNumMatch) {
                    const searchNum = parseFloat(searchNumMatch[1]);

                    // "3-5", "3〜5", "3~5" のような範囲を検知する
                    const rangeMatch = s.duration.match(/(\d+(?:\.\d+)?)\s*[〜~-]\s*(\d+(?:\.\d+)?)/);
                    if (rangeMatch) {
                        const min = parseFloat(rangeMatch[1]);
                        const max = parseFloat(rangeMatch[2]);
                        // 検索した数字が、最小値と最大値の間にあればヒット！
                        if (searchNum >= min && searchNum <= max) {
                            isMatch = true;
                        }
                    } else {
                        // "4時間" のように数字が1つだけ書かれている場合
                        const singleMatch = s.duration.match(/(\d+(?:\.\d+)?)/);
                        if (singleMatch) {
                            const val = parseFloat(singleMatch[1]);
                            if (searchNum === val) {
                                isMatch = true;
                            }
                        }
                    }
                }
                if (!isMatch) return; // どの条件にも合わなければリストから除外
            }

            hitCount++;

            const item = document.createElement('div');
            item.className = 'list-item';

            const salesCounterHtml = s.status === '頒布中' ? `
                <div class="control-row" style="margin-top: 8px;">
                    <div class="count-display">売上数: <strong style="color:#ff6f00;">${s.sales || 0}</strong> 部</div>
                    <div style="display:flex; gap:8px;">
                        <button class="cnt-btn" onclick="updateSales(${index}, -1)">-</button>
                        <button class="cnt-btn" onclick="updateSales(${index}, 1)">+</button>
                    </div>
                </div>` : '';

            let linksHtml = '';
            if (s.docUrl) {
                linksHtml += `<a href="${s.docUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; background:#e3f2fd; color:#1565c0; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:bold; text-decoration:none;">📄 資料/PDF</a>`;
            }
            if (s.boothUrl) {
                linksHtml += `<a href="${s.boothUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; background:#ffe0b2; color:#e65100; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:bold; text-decoration:none;">🛍️ Booth</a>`;
            }
            if (s.ccfoliaUrl) {
                linksHtml += `<a href="${s.ccfoliaUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; background:#c8e6c9; color:#2e7d32; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:bold; text-decoration:none;">🎲 ココフォリア</a>`;
            }
            if (s.link && !s.boothUrl && !s.ccfoliaUrl && !s.docUrl) {
                linksHtml += `<a href="${s.link}" target="_blank" rel="noopener noreferrer" style="display:inline-block; background:#e0f2f1; color:#00695c; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:bold; text-decoration:none;">🔗 リンク</a>`;
            }

            const linksContainer = linksHtml ? `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-left:10px;">${linksHtml}</div>` : '';

            const infoHtml = (s.playerNum || s.duration) ? `<div class="sc-info-row"><span>👥 ${s.playerNum || '未定'}</span><span>⏳ ${s.duration || '未定'}</span></div>` : '';

            item.innerHTML = `
                <div class="item-actions-corner">
                    <button class="corner-btn edit" onclick="editScenario(${index})">修正</button>
                    <button class="corner-btn delete" onclick="deleteScenario(${index})">削除</button>
                </div>

                <span class="sys-badge">${s.system || 'CoC 6th'}</span>

                <div class="sc-title-row">${s.title}</div>
                ${infoHtml}

                <div style="margin-bottom: 16px; display: flex; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div class="custom-select-wrapper" style="width: 150px; flex-shrink: 0;">
                        <div class="select-display" style="padding: 10px; font-size: 13px;" onclick="toggleListStatus(${index}, event)">${s.status}</div>
                        <div class="select-options" id="listStatusOpt-${index}">
                            <div class="option-item" style="padding: 12px; font-size: 13px;" onclick="changeListStatus(${index}, '執筆中')">執筆中</div>
                            <div class="option-item" style="padding: 12px; font-size: 13px;" onclick="changeListStatus(${index}, 'テストプレイ中')">テストプレイ中</div>
                            <div class="option-item" style="padding: 12px; font-size: 13px;" onclick="changeListStatus(${index}, '頒布中')">頒布中</div>
                            <div class="option-item" style="padding: 12px; font-size: 13px;" onclick="changeListStatus(${index}, '頒布停止中')">頒布停止中</div>
                        </div>
                    </div>
                    ${linksContainer}
                </div>

                <div class="control-row">
                    <div class="count-display">現在: <strong>${s.zin || 0}</strong> 陣目</div>
                    <div style="display:flex; gap:8px;">
                        <button class="cnt-btn" onclick="updateZin(${index}, -1)">-</button>
                        <button class="cnt-btn" onclick="updateZin(${index}, 1)">+</button>
                    </div>
                </div>
                ${salesCounterHtml}
            `;
            scList.appendChild(item);
        });

        hitCountDisplay.innerText = hitCount;

        if (hitCount === 0 && scenarios.length > 0) {
            scList.innerHTML = '<div style="text-align:center; padding:20px; color:#999; font-size:14px; font-weight:bold;">条件に一致するシナリオはありません</div>';
        }
    }

    document.getElementById('btnAddScenario').addEventListener('click', () => {
        const title = document.getElementById('scTitle').value.trim();
        let playerNum = document.getElementById('scPlayerNum').value.trim();
        let duration = document.getElementById('scDuration').value.trim();
        const zin = document.getElementById('scZin').value || 0;
        const status = document.getElementById('scStatusHidden').value;
        const docUrl = document.getElementById('scDocUrl').value.trim();
        const boothUrl = document.getElementById('scBoothUrl').value.trim();
        const ccfoliaUrl = document.getElementById('scCcfoliaUrl').value.trim();

        if (playerNum && !playerNum.includes('PL') && !playerNum.includes('人') && !playerNum.includes('タイマン')) {
            playerNum += 'PL';
        }
        if (duration && !duration.includes('時間') && !duration.includes('分')) {
            duration += '時間';
        }

        if (!title) {
            alert('シナリオ名を入力してください');
            return;
        }

        if (editingIndex !== null) {
            scenarios[editingIndex].title = title;
            scenarios[editingIndex].playerNum = playerNum;
            scenarios[editingIndex].duration = duration;
            scenarios[editingIndex].zin = zin;
            scenarios[editingIndex].status = status;
            scenarios[editingIndex].docUrl = docUrl;
            scenarios[editingIndex].boothUrl = boothUrl;
            scenarios[editingIndex].ccfoliaUrl = ccfoliaUrl;
            scenarios[editingIndex].system = scenarios[editingIndex].system || 'CoC 6th';

            editingIndex = null;
            document.getElementById('formTitleLabel').innerText = '🆕 新規シナリオ登録';
            const btn = document.getElementById('btnAddScenario');
            btn.innerText = '作品リストに追加';
            btn.classList.remove('edit-mode');
        } else {
            const system = currentSystemFilter === 'すべて' ? 'CoC 6th' : currentSystemFilter;
            scenarios.unshift({ system, title, playerNum, duration, zin, status, docUrl, boothUrl, ccfoliaUrl, sales: 0 });
        }

        saveAndRender();

        document.getElementById('scTitle').value = '';
        document.getElementById('scPlayerNum').value = '';
        document.getElementById('scDuration').value = '';
        document.getElementById('scZin').value = '';
        document.getElementById('scDocUrl').value = '';
        document.getElementById('scBoothUrl').value = '';
        document.getElementById('scCcfoliaUrl').value = '';
        document.getElementById('scStatusDisplay').innerText = "執筆中";
        document.getElementById('scStatusHidden').value = "執筆中";
    });

    window.editScenario = (index) => {
        const s = scenarios[index];
        editingIndex = index;

        document.getElementById('scTitle').value = s.title || '';
        document.getElementById('scPlayerNum').value = s.playerNum ? s.playerNum.replace(/PL$/, '') : '';
        document.getElementById('scDuration').value = s.duration ? s.duration.replace(/時間$/, '') : '';
        document.getElementById('scZin').value = s.zin || '';
        document.getElementById('scDocUrl').value = s.docUrl || '';
        document.getElementById('scBoothUrl').value = s.boothUrl || '';
        document.getElementById('scCcfoliaUrl').value = s.ccfoliaUrl || '';

        document.getElementById('scStatusHidden').value = s.status || '執筆中';
        document.getElementById('scStatusDisplay').innerText = s.status || '執筆中';

        document.getElementById('formTitleLabel').innerText = `✍️ シナリオ情報の修正 (${s.system || 'CoC 6th'})`;
        const btn = document.getElementById('btnAddScenario');
        btn.innerText = '情報を更新する';
        btn.classList.add('edit-mode');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.toggleListStatus = (index, event) => {
        event.stopPropagation();
        const targetOpt = document.getElementById(`listStatusOpt-${index}`);
        document.querySelectorAll('.select-options').forEach(opt => {
            if (opt !== targetOpt) opt.classList.remove('active');
        });
        targetOpt.classList.toggle('active');
    };

    window.changeListStatus = (index, newStatus) => {
        scenarios[index].status = newStatus;
        saveAndRender();
    };

    window.updateZin = (index, delta) => {
        scenarios[index].zin = Math.max(0, (parseInt(scenarios[index].zin) || 0) + delta);
        saveAndRender();
    };

    window.updateSales = (index, delta) => {
        scenarios[index].sales = Math.max(0, (parseInt(scenarios[index].sales) || 0) + delta);
        saveAndRender();
    };

    window.deleteScenario = (index) => {
        if (!confirm('このシナリオを削除しますか？')) return;

        if (editingIndex === index) {
            editingIndex = null;
            document.getElementById('formTitleLabel').innerText = '🆕 新規シナリオ登録';
            const btn = document.getElementById('btnAddScenario');
            btn.innerText = '作品リストに追加';
            btn.classList.remove('edit-mode');
            document.getElementById('scTitle').value = '';
            document.getElementById('scPlayerNum').value = '';
            document.getElementById('scDuration').value = '';
            document.getElementById('scZin').value = '';
            document.getElementById('scDocUrl').value = '';
            document.getElementById('scBoothUrl').value = '';
            document.getElementById('scCcfoliaUrl').value = '';
        } else if (editingIndex !== null && editingIndex > index) {
            editingIndex--;
        }

        scenarios.splice(index, 1);
        saveAndRender();
    };

    function saveAndRender() {
        localStorage.setItem('trpg_scenarios', JSON.stringify(scenarios));
        renderScenarios();
    }

    renderSystemTabs();
    renderScenarios();
});