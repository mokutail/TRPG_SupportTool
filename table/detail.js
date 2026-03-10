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
let pc = null;
let sortOrder = 'asc';

document.addEventListener('DOMContentLoaded', () => {
    const detailView = document.getElementById('detailView');
    const targetId = localStorage.getItem('trpg_current_pc_id');

    if (!targetId) {
        detailView.innerHTML = '<div style="text-align:center; padding:30px; color:#999; font-weight:bold;">キャラクターが選択されていません。</div>';
        return;
    }

    // ==========================================
    // ★ ログインチェック
    // ==========================================
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            startRealtimeSync();
        } else {
            alert("データの同期にはログインが必要です。トップページに戻ります。");
            window.location.href = '../index.html';
        }
    });

    function startRealtimeSync() {
        db.collection("users").doc(currentUser.uid).collection("characters").doc(targetId)
          .onSnapshot((doc) => {
              if (doc.exists) {
                  pc = { id: doc.id, ...doc.data() };
                  renderDetail();
              } else {
                  detailView.innerHTML = '<div style="text-align:center; padding:30px; color:#999; font-weight:bold;">データが見つかりません（削除された可能性があります）。</div>';
              }
          }, (error) => {
              console.error("データ取得エラー:", error);
              detailView.innerHTML = `<div style="padding:20px; color:#d32f2f; font-weight:bold;">エラーが発生しました: ${error.message}</div>`;
          });
    }

    // ==========================================
    // ★ UI描画ロジック
    // ==========================================
    function renderDetail() {
        if (!pc) return;

        const imgStyle = pc.image ? `background-image: url(${pc.image});` : `display:flex; justify-content:center; align-items:center; color:#aaa; font-size:40px; background-color:#f0f0f0; content:'👤';`;

        let tagsHtml = '';
        if (pc.tags && typeof pc.tags === 'string') {
            tagsHtml = `<div style="margin-top:12px;">` + pc.tags.split(',').map(t => `<span class="tag-pill">${t.trim()}</span>`).join(' ') + `</div>`;
        }

        // ★ ボタンを縦並びにして、写真の下に配置するためのHTML
        let actionButtonsHtml = `<div style="display:flex; flex-direction:column; gap:8px; margin-top:12px; width:100%;">`;
        if (pc.url) {
            actionButtonsHtml += `<a href="${pc.url}" target="_blank" style="background:#e3f2fd; color:#0277bd; padding:8px 0; border-radius:8px; font-size:11px; font-weight:bold; text-decoration:none; text-align:center; display:block; width:100%; box-sizing:border-box;">🔗 キャラシ</a>`;
        }
        actionButtonsHtml += `<button onclick="jumpToEditMode()" style="background:#fff3e0; color:#e65100; border:none; padding:8px 0; border-radius:8px; font-size:11px; font-weight:bold; cursor:pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.05); width:100%; box-sizing:border-box;">✍️ データ修正</button>`;
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
            const lines = pc.skills.split('\n');
            const parsedSkills = [];

            lines.forEach(line => {
                const tLine = line.trim();
                if (!tLine) return;

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

                const match = tLine.match(/(?:<=?|>=?)\s*(\d+)\s*(【.+】|\S+)/);
                if (match) {
                    let val = match[1];
                    let name = match[2];
                    if (!name.startsWith('【')) name = '【' + name + '】';
                    parsedSkills.push({ name: name, val: val });
                }
            });

            if (parsedSkills.length > 0) {
                let flexHtml = `<div style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px;">`;
                parsedSkills.forEach(s => {
                    flexHtml += `
                        <div style="display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 12px 16px; border-radius: 10px; border: 1px solid #eee; border-left: 5px solid #76ADAF; box-shadow: 0 2px 5px rgba(0,0,0,0.03);">
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

        const safeKana = pc.kana ? `<div style="font-size:12px; color:#888; font-weight:bold; margin-bottom:2px;">${pc.kana}</div>` : '';

        // ★ 自動「歳」付与
        const displayAge = pc.age ? (/^\d+$/.test(pc.age) ? pc.age + '歳' : pc.age) : '未設定';

        // ★ 自動「cm」付与
        const displayHeight = pc.height ? (/^\d+(\.\d+)?$/.test(pc.height) ? pc.height + 'cm' : pc.height) : '未設定';

        // ★ 自動「月日」変換 (0405, 405, 1225 などを 4月5日, 12月25日 に)
        let displayBirthday = pc.birthday || '未設定';
        if (/^\d{3,4}$/.test(displayBirthday)) {
            const numStr = displayBirthday;
            if (numStr.length === 3) {
                displayBirthday = `${numStr.substring(0, 1)}月${numStr.substring(1, 3)}日`;
            } else if (numStr.length === 4) {
                const m = parseInt(numStr.substring(0, 2), 10);
                const d = parseInt(numStr.substring(2, 4), 10);
                displayBirthday = `${m}月${d}日`;
            }
        }

        // ★ 全体のレイアウト構造を調整
        // align-items: flex-start を付与し、左側に画像とボタンのコンテナを作成
        detailView.innerHTML = `
            <div class="detail-header" style="align-items: flex-start;">

                <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0; width: 110px;">
                    <div class="detail-img" style="${imgStyle} width:100px; height:100px; margin:0 auto;">${pc.image ? '' : '👤'}</div>
                    ${actionButtonsHtml}
                </div>

                <div class="detail-info" style="flex: 1; min-width: 0;">
                    <span style="font-size:11px; color:#999; font-weight:bold;">${pc.system || 'システム未設定'}</span>
                    ${safeKana}
                    <h2 style="margin-top:0; margin-bottom: 8px;">${pc.name || '名無し'}</h2>

                    <div style="font-size:13px; color:#555; font-weight:bold; line-height:1.8;">
                        <div>性別: ${pc.gender || '未設定'}</div>
                        <div>誕生日: ${displayBirthday}</div>
                        <div>年齢: ${displayAge}</div>
                        <div>職業: ${pc.job || '未設定'}</div>
                        <div>身長: ${displayHeight}</div>
                        <div>種族: ${pc.race || '未設定'}</div>
                    </div>

                    ${tagsHtml}
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

    window.jumpToEditMode = () => {
        localStorage.setItem('trpg_edit_pc_id', pc.id);
        window.location.href = 'edit_pc.html';
    };
});