document.addEventListener('DOMContentLoaded', () => {
    const scList = document.getElementById('scList');
    const hitCountDisplay = document.getElementById('scHitCount');
    let scenarios = JSON.parse(localStorage.getItem('trpg_scenario_want')) || [];

    let editingIndex = null;

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
                display.innerText = val;
                hidden.value = val;
                options.classList.remove('active');
                if (onChangeCallback) onChangeCallback();
            });
        });
    }

    setupCustomSelect('scSystemDisplay', 'scSystemOptions', 'scSystemHidden');

    window.addEventListener('click', () => {
        document.querySelectorAll('.select-options.active').forEach(el => {
            el.classList.remove('active');
        });
    });

    // --- システムタブ生成と制御 ---
    function updateFormTitle() {
        const sysLabel = currentSystemFilter === 'すべて' ? 'CoC 6th' : currentSystemFilter;
        document.getElementById('formTitleLabel').innerHTML = `🆕 行きたいシナリオ登録 <span style="font-size:12px; color:#999; font-weight:normal;">(${sysLabel})</span>`;

        if (editingIndex === null) {
            document.getElementById('scSystemDisplay').innerText = sysLabel;
            document.getElementById('scSystemHidden').value = sysLabel;
        }
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
        renderScenarios();
    });

    // --- リストの描画 ---
    function renderScenarios() {
        scList.innerHTML = '';

        const fScenario = document.getElementById('filterScenario').value.trim().toLowerCase();
        const fPlayerNum = document.getElementById('filterPlayerNum').value.trim().toLowerCase();
        const fDuration = document.getElementById('filterDuration').value.trim().toLowerCase();
        let hitCount = 0;

        if (scenarios.length === 0) {
            scList.innerHTML = '<div style="text-align:center; padding:20px; color:#999; font-size:14px; font-weight:bold;">登録されたシナリオはありません</div>';
            hitCountDisplay.innerText = "0";
            return;
        }

        scenarios.forEach((s, index) => {
            if (currentSystemFilter !== 'すべて' && s.system !== currentSystemFilter) return;
            if (fScenario !== '' && (!s.title || !s.title.toLowerCase().includes(fScenario))) return;
            if (fPlayerNum !== '' && (!s.playerNum || !s.playerNum.toLowerCase().includes(fPlayerNum))) return;

            // 時間の範囲検索機能
            if (fDuration !== '') {
                if (!s.duration) return;
                let isMatch = s.duration.toLowerCase().includes(fDuration);
                const searchNumMatch = fDuration.match(/(\d+(?:\.\d+)?)/);
                if (!isMatch && searchNumMatch) {
                    const searchNum = parseFloat(searchNumMatch[1]);
                    const rangeMatch = s.duration.match(/(\d+(?:\.\d+)?)\s*[〜~-]\s*(\d+(?:\.\d+)?)/);
                    if (rangeMatch) {
                        const min = parseFloat(rangeMatch[1]);
                        const max = parseFloat(rangeMatch[2]);
                        if (searchNum >= min && searchNum <= max) isMatch = true;
                    } else {
                        const singleMatch = s.duration.match(/(\d+(?:\.\d+)?)/);
                        if (singleMatch && parseFloat(singleMatch[1]) === searchNum) isMatch = true;
                    }
                }
                if (!isMatch) return;
            }

            hitCount++;

            const item = document.createElement('div');
            item.className = 'list-item';

            let linkHtml = '';
            if (s.url) {
                linkHtml = `<a href="${s.url}" target="_blank" rel="noopener noreferrer" style="display:inline-block; background:#ffe0b2; color:#e65100; padding:8px 16px; border-radius:10px; font-size:13px; font-weight:bold; text-decoration:none; margin-bottom:10px;">🛍️ Booth / URL</a>`;
            }

            const infoHtml = (s.playerNum || s.duration) ? `<div class="sc-info-row"><span>👥 ${s.playerNum || '未定'}</span><span>⏳ ${s.duration || '未定'}</span></div>` : '';

            // ★ 追加：握りたいHOの表示用HTML（統一感のある#76ADAFカラーでデザイン）
            const hoHtml = s.ho ? `<div style="font-size: 13px; font-weight: bold; color: #76ADAF; margin-bottom: 10px; border-left: 3px solid #76ADAF; padding-left: 8px;">✋ 握りたいHO: ${s.ho}</div>` : '';

            const memoHtml = s.memo ? `<div class="memo-display-box">${s.memo.replace(/\n/g, '<br>')}</div>` : '';

            item.innerHTML = `
                <div class="item-actions-corner">
                    <button class="corner-btn edit" onclick="editScenario(${index})">修正</button>
                    <button class="corner-btn delete" onclick="deleteScenario(${index})">削除</button>
                </div>

                <span class="sys-badge">${s.system || 'CoC 6th'}</span>

                <div class="sc-title-row">${s.title}</div>
                ${infoHtml}
                ${hoHtml}
                ${linkHtml}
                ${memoHtml}
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
        const system = document.getElementById('scSystemHidden').value;
        const url = document.getElementById('scUrl').value.trim();
        const ho = document.getElementById('scHo').value.trim(); // ★ 取得
        const memo = document.getElementById('scMemo').value.trim();

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
            scenarios[editingIndex].system = system;
            scenarios[editingIndex].url = url;
            scenarios[editingIndex].ho = ho; // ★ 更新
            scenarios[editingIndex].memo = memo;

            editingIndex = null;
            document.getElementById('formTitleLabel').innerText = '🆕 行きたいシナリオ登録';
            const btn = document.getElementById('btnAddScenario');
            btn.innerText = 'リストに追加';
            btn.classList.remove('edit-mode');
        } else {
            scenarios.unshift({ system, title, playerNum, duration, url, ho, memo }); // ★ 追加
        }

        saveAndRender();

        document.getElementById('scTitle').value = '';
        document.getElementById('scPlayerNum').value = '';
        document.getElementById('scDuration').value = '';
        document.getElementById('scUrl').value = '';
        document.getElementById('scHo').value = ''; // ★ リセット
        document.getElementById('scMemo').value = '';
        updateFormTitle();
    });

    window.editScenario = (index) => {
        const s = scenarios[index];
        editingIndex = index;

        document.getElementById('scTitle').value = s.title || '';
        document.getElementById('scPlayerNum').value = s.playerNum ? s.playerNum.replace(/PL$/, '') : '';
        document.getElementById('scDuration').value = s.duration ? s.duration.replace(/時間$/, '') : '';
        document.getElementById('scUrl').value = s.url || '';
        document.getElementById('scHo').value = s.ho || ''; // ★ 編集時に読み込み
        document.getElementById('scMemo').value = s.memo || '';

        document.getElementById('scSystemHidden').value = s.system || 'CoC 6th';
        document.getElementById('scSystemDisplay').innerText = s.system || 'CoC 6th';

        document.getElementById('formTitleLabel').innerText = `✍️ 登録情報の修正 (${s.system || 'CoC 6th'})`;
        const btn = document.getElementById('btnAddScenario');
        btn.innerText = '情報を更新する';
        btn.classList.add('edit-mode');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.deleteScenario = (index) => {
        if (!confirm('このシナリオを削除しますか？')) return;

        if (editingIndex === index) {
            editingIndex = null;
            document.getElementById('formTitleLabel').innerText = '🆕 行きたいシナリオ登録';
            const btn = document.getElementById('btnAddScenario');
            btn.innerText = 'リストに追加';
            btn.classList.remove('edit-mode');
            document.getElementById('scTitle').value = '';
            document.getElementById('scPlayerNum').value = '';
            document.getElementById('scDuration').value = '';
            document.getElementById('scUrl').value = '';
            document.getElementById('scHo').value = ''; // ★ 削除中断時にもリセット
            document.getElementById('scMemo').value = '';
        } else if (editingIndex !== null && editingIndex > index) {
            editingIndex--;
        }

        scenarios.splice(index, 1);
        saveAndRender();
    };

    function saveAndRender() {
        localStorage.setItem('trpg_scenario_want', JSON.stringify(scenarios));
        renderScenarios();
    }

    renderSystemTabs();
    renderScenarios();
});