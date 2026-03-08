document.addEventListener('DOMContentLoaded', () => {
    try {
        const detailView = document.getElementById('detailView');
        const targetId = localStorage.getItem('trpg_current_pc_id');
        const pcData = JSON.parse(localStorage.getItem('trpg_pcs_v1')) || [];

        const pc = pcData.find(p => p.id === targetId);

        if (!pc) {
            detailView.innerHTML = '<div style="text-align:center; padding:30px; color:#999; font-weight:bold;">データが見つかりません。</div>';
            return;
        }

        let sortOrder = 'asc';

        function renderDetail() {
            const imgStyle = pc.image ? `background-image: url(${pc.image});` : `display:flex; justify-content:center; align-items:center; color:#aaa; font-size:40px; background-color:#f0f0f0; content:'👤';`;

            let tagsHtml = '';
            if (pc.tags && typeof pc.tags === 'string') {
                tagsHtml = `<div style="margin-top:8px;">` + pc.tags.split(',').map(t => `<span class="tag-pill">${t.trim()}</span>`).join(' ') + `</div>`;
            }

            let actionButtonsHtml = `<div style="display:flex; gap:10px; margin-top:8px;">`;
            if (pc.url) {
                actionButtonsHtml += `<a href="${pc.url}" target="_blank" style="background:#e3f2fd; color:#0277bd; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:bold; text-decoration:none;">🔗 キャラシURL</a>`;
            }
            actionButtonsHtml += `<button onclick="jumpToEditMode()" style="background:#fff3e0; color:#e65100; border:none; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:bold; cursor:pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">✍️ データを修正</button>`;
            actionButtonsHtml += `</div>`;

            let statsHtml = '';
            if (pc.stats && pc.stats.length > 0) {
                const getStat = (label) => pc.stats.find(s => s.label.toUpperCase() === label.toUpperCase());

                const group1 = ['STR', 'CON', 'POW', 'DEX', 'APP', 'SIZ'];
                const group2 = ['INT', 'EDU'];
                const group3 = ['HP', 'MP', 'SAN'];

                const renderGroup = (keys) => {
                    let html = `<div class="stats-group">`;
                    let hasItem = false;
                    keys.forEach(k => {
                        const stat = getStat(k);
                        if (stat) {
                            html += `<div class="stat-box" style="flex:1; min-width:45px;"><div class="stat-label">${stat.label}</div><div class="stat-value">${stat.value}</div></div>`;
                            hasItem = true;
                        }
                    });
                    html += `</div>`;
                    return hasItem ? html : '';
                };

                const otherStats = pc.stats.filter(s => !group1.includes(s.label.toUpperCase()) && !group2.includes(s.label.toUpperCase()) && !group3.includes(s.label.toUpperCase()));

                statsHtml += `<div style="margin-bottom: 20px;">`;
                statsHtml += renderGroup(group1); // 1段目
                statsHtml += renderGroup(group2); // 2段目
                statsHtml += renderGroup(group3); // 3段目

                if (otherStats.length > 0) {
                    statsHtml += `<div class="stats-group" style="margin-top: 8px; border-top: 1px dashed #eee; padding-top: 8px;">`;
                    otherStats.forEach(s => {
                        statsHtml += `<div class="stat-box" style="flex:1; min-width:45px;"><div class="stat-label">${s.label}</div><div class="stat-value">${s.value}</div></div>`;
                    });
                    statsHtml += `</div>`;
                }
                statsHtml += `</div>`;
            }

            let skillsHtml = '';
            if (pc.skills) {
                skillsHtml = `
                    <details class="skills-accordion">
                        <summary>🛠️ 技能値・チャットパレットを開く</summary>
                        <div class="skills-content">${pc.skills}</div>
                    </details>
                `;
            }

            const sortToggleHtml = `
                <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #eee; padding-bottom:8px; margin-bottom:15px;">
                    <h3 style="color:#76ADAF; margin:0;">📌 通過シナリオ履歴</h3>
                    <div class="history-sort-toggle">
                        <input type="radio" id="sortAsc" name="historySort" value="asc" ${sortOrder === 'asc' ? 'checked' : ''}>
                        <label for="sortAsc">初回から</label>
                        <input type="radio" id="sortDesc" name="historySort" value="desc" ${sortOrder === 'desc' ? 'checked' : ''}>
                        <label for="sortDesc">最新から</label>
                    </div>
                </div>
            `;

            let historyHtml = sortToggleHtml;
            let historyList = [...(pc.history || [])];

            historyList.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                const validA = !isNaN(dateA);
                const validB = !isNaN(dateB);

                if (!validA && validB) return 1;
                if (validA && !validB) return -1;
                if (!validA && !validB) return 0;

                if (sortOrder === 'desc') { return dateB - dateA; }
                else { return dateA - dateB; }
            });

            if (historyList.length === 0) {
                historyHtml += `<p style="color:#999; font-size:14px;">履歴がありません</p>`;
            } else {
                historyList.forEach((h) => {
                    const status = h.status || '不明';
                    const badgeClass = status === '生還' ? 'alive' : (status === 'ロスト' ? 'lost' : 'other');
                    historyHtml += `
                        <div class="history-item">
                            <div class="history-date">${h.date || '日付不明'}</div>
                            <div class="history-title">${h.scenario || 'シナリオ名不明'}</div>
                            <span class="status-badge ${badgeClass}">${status}</span>
                            <span style="font-size:12px; color:#666; font-weight:bold; margin-left:8px;">HO: ${h.ho || 'なし'}</span>
                        </div>
                    `;
                });
            }

            // ★ 修正：詳細画面のプロフィール情報に「種族」と「職業」を追加
            detailView.innerHTML = `
                <div class="detail-header">
                    <div class="detail-img" style="${imgStyle}">${pc.image ? '' : '👤'}</div>
                    <div class="detail-info">
                        <span style="font-size:11px; color:#999; font-weight:bold;">${pc.system || 'システム未設定'}</span>
                        <h2>${pc.name || '名無し'}</h2>
                        <p>性別: ${pc.gender || '未設定'} / 年齢: ${pc.age || '未設定'}</p>
                        <p>種族: ${pc.race || '未設定'} / 職業: ${pc.job || '未設定'}</p>
                        ${tagsHtml}
                        ${actionButtonsHtml}
                    </div>
                </div>
                ${statsHtml}
                ${skillsHtml}
                ${historyHtml}
            `;

            const sortRadios = document.querySelectorAll('input[name="historySort"]');
            sortRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    sortOrder = e.target.value;
                    renderDetail();
                });
            });
        }

        renderDetail();

        window.jumpToEditMode = () => {
            localStorage.setItem('trpg_edit_pc_id', pc.id);
            window.location.href = 'edit_pc.html';
        };

    } catch (error) {
        console.error(error);
        document.getElementById('detailView').innerHTML = `<div style="padding:20px; color:#d32f2f; font-weight:bold;">エラーが発生しました: ${error.message}</div>`;
    }
});