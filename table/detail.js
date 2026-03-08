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

            // ★ 修正：技能値を縦並びにして、全体をプルダウンの中に収納する魔法
            let skillsHtml = '';
            if (pc.skills) {
                const lines = pc.skills.split('\n');
                const parsedSkills = [];

                lines.forEach(line => {
                    const tLine = line.trim();
                    if (!tLine) return;

                    // 不要な行（正気度、ダメージ、×5など）を完全に無視
                    if (
                        tLine.includes('×') ||
                        tLine.includes('*') ||
                        tLine.includes('正気度') ||
                        tLine.includes('ダメージ') ||
                        tLine.includes('SAN') ||
                        /([a-zA-Z]+)[xXｘＸ]\d+/.test(tLine)
                    ) {
                        return;
                    }

                    // 「CCB<=90 【目星】」等から抽出
                    const match = tLine.match(/(?:<=?|>=?)\s*(\d+)\s*(【.+】|\S+)/);
                    if (match) {
                        let val = match[1];
                        let name = match[2];
                        if (!name.startsWith('【')) name = '【' + name + '】';
                        parsedSkills.push({ name: name, val: val });
                    }
                });

                if (parsedSkills.length > 0) {
                    // ★ 縦並び（flex-direction: column）に変更
                    let flexHtml = `<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px;">`;
                    parsedSkills.forEach(s => {
                        flexHtml += `
                            <div style="display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 12px 16px; border-radius: 10px; border-left: 5px solid #76ADAF; box-shadow: 0 2px 5px rgba(0,0,0,0.03); border: 1px solid #eee; border-left: 5px solid #76ADAF;">
                                <span style="font-size: 14px; font-weight: bold; color: #444;">${s.name}</span>
                                <span style="font-size: 18px; font-weight: bold; color: #76ADAF;">${s.val}%</span>
                            </div>
                        `;
                    });
                    flexHtml += `</div>`;

                    skillsHtml = `
                        <div style="margin-bottom: 25px;">
                            <details id="skillsDetailsAccordion" class="skills-accordion">
                                <summary style="font-weight: bold; color: #76ADAF; padding: 14px 16px; background: #f0f7f7; border-radius: 12px; cursor: pointer; border: 2px solid #76ADAF; outline: none; -webkit-tap-highlight-color: transparent; font-size: 15px;">
                                    🛠️ 技能値を開く
                                </summary>
                                <div style="padding-top: 10px;">
                                    ${flexHtml}

                                    <details class="skills-accordion" style="margin-top: 20px;">
                                        <summary style="font-size: 12px; color: #888; background: #f8f9fa; border: 1px solid #eee; padding: 10px 15px; border-radius: 10px; font-weight: bold; cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent;">📋 ココフォリア用チャパレ (コピー用)</summary>
                                        <div class="skills-content" style="margin-top: 8px; font-size: 11px; background: #fff; border: 1px solid #eee; border-radius: 10px; padding: 10px; max-height: 200px; overflow-y: auto;">${pc.skills}</div>
                                    </details>

                                    <button onclick="document.getElementById('skillsDetailsAccordion').removeAttribute('open');" style="margin-top: 20px; width: 100%; background: #e0e0e0; color: #555; border: none; padding: 14px; border-radius: 12px; font-weight: bold; font-size: 14px; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">▲ 一覧をたたむ</button>
                                </div>
                            </details>
                        </div>
                    `;
                } else {
                    // 特殊な形式で抽出できなかった場合の安全設計
                    skillsHtml = `
                        <div style="margin-bottom: 25px;">
                            <details id="skillsDetailsAccordion" class="skills-accordion">
                                <summary style="font-weight: bold; color: #76ADAF; padding: 14px 16px; background: #f0f7f7; border-radius: 12px; cursor: pointer; border: 2px solid #76ADAF; outline: none; -webkit-tap-highlight-color: transparent; font-size: 15px;">
                                    🛠️ 技能値・チャットパレットを開く
                                </summary>
                                <div style="padding-top: 15px;">
                                    <div class="skills-content">${pc.skills}</div>
                                    <button onclick="document.getElementById('skillsDetailsAccordion').removeAttribute('open');" style="margin-top: 20px; width: 100%; background: #e0e0e0; color: #555; border: none; padding: 14px; border-radius: 12px; font-weight: bold; font-size: 14px; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">▲ プルダウンをたたむ</button>
                                </div>
                            </details>
                        </div>
                    `;
                }
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