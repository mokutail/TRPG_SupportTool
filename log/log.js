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
let currentParsedData = {}; 
let currentMyChar = null; 
let savedLogs = []; 
let currentMainFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            db.collection("users").doc(currentUser.uid).collection("logs")
              .orderBy("createdAt", "desc")
              .onSnapshot((snapshot) => {
                  savedLogs = [];
                  snapshot.forEach((doc) => { savedLogs.push({ id: doc.id, ...doc.data() }); });
                  renderSavedLogs();
              });
        } else {
            alert("ログインが必要です");
            window.location.href = '../index.html';
        }
    });

    const tabAnalyzeBtn = document.getElementById('tabAnalyzeBtn');
    const tabSavedBtn = document.getElementById('tabSavedBtn');
    const viewAnalyze = document.getElementById('viewAnalyze');
    const viewSaved = document.getElementById('viewSaved');

    tabAnalyzeBtn.onclick = () => {
        tabAnalyzeBtn.classList.add('active'); tabSavedBtn.classList.remove('active');
        viewAnalyze.style.display = 'block'; viewSaved.style.display = 'none';
    };
    tabSavedBtn.onclick = () => {
        tabSavedBtn.classList.add('active'); tabAnalyzeBtn.classList.remove('active');
        viewSaved.style.display = 'block'; viewAnalyze.style.display = 'none';
    };

    document.querySelectorAll('.main-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.main-filter').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentMainFilter = e.target.getAttribute('data-filter');
            renderParsedResult(currentParsedData, currentMainFilter, 'parsedListContainer', 'overallStatsArea');
        });
    });

    // ★ 保存済み一覧の検索を「ボタン押下」と「エンターキー」に変更！
    document.getElementById('btnSearchTitle').addEventListener('click', renderSavedLogs);
    document.getElementById('btnSearchChar').addEventListener('click', renderSavedLogs);
    
    document.getElementById('filterLogTitle').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') renderSavedLogs();
    });
    document.getElementById('filterLogChar').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') renderSavedLogs();
    });

    const logFileInput = document.getElementById('logFileInput');
    const dropZone = document.getElementById('dropZone');

    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault(); dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
    });

    logFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) processFile(e.target.files[0]);
    });

    function processFile(file) {
        if (!file.name.endsWith('.html')) return alert("ココフォリアのHTMLログファイルを選択してください！");
        
        let defaultTitle = file.name.replace('.html', '').replace('[main]', '').trim();
        document.getElementById('saveLogTitle').value = defaultTitle;

        const reader = new FileReader();
        reader.onload = (e) => {
            const htmlText = e.target.result;
            parseCocofoliaHTML(htmlText);
        };
        reader.readAsText(file);
    }

    function parseCocofoliaHTML(htmlText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const paragraphs = doc.querySelectorAll('p');
        
        currentParsedData = {};
        currentMyChar = null; 

        paragraphs.forEach(p => {
            const spans = p.querySelectorAll('span');
            if (spans.length >= 3) {
                const charName = spans[1].innerText.trim();
                const logText = spans[2].innerText.trim();
                
                if (!logText.includes('<=') && !logText.includes('&lt;=') && !logText.includes('＞') && !logText.includes('&gt;')) return;

                let type = null;
                if (logText.includes('決定的成功') || logText.includes('クリティカル')) type = 'critical';
                else if (logText.includes('致命的失敗') || logText.includes('ファンブル')) type = 'fumble';
                else if (logText.includes('スペシャル')) type = 'special';
                else if (logText.includes('成功')) type = 'success';
                else if (logText.includes('失敗')) type = 'failure';
                
                if (type) {
                    let rollValue = '?';
                    const match = logText.match(/＞\s*(\d+)\s*＞/);
                    if (match) {
                        rollValue = match[1];
                    } else {
                        const matchEnd = logText.match(/＞\s*(\d+)\s*$/);
                        if(matchEnd) rollValue = matchEnd[1];
                    }

                    if (!currentParsedData[charName]) currentParsedData[charName] = [];
                    currentParsedData[charName].push({ text: logText, type: type, val: rollValue });
                }
            }
        });

        if (Object.keys(currentParsedData).length === 0) {
            alert("抽出できるダイスロールが見つかりませんでした。");
            return;
        }

        document.getElementById('analyzeResultArea').style.display = 'block';
        document.getElementById('saveLogSection').style.display = 'block';
        currentMainFilter = 'all';
        document.querySelectorAll('.main-filter').forEach(b => b.classList.remove('active'));
        document.querySelector('.main-filter[data-filter="all"]').classList.add('active');
        
        renderParsedResult(currentParsedData, currentMainFilter, 'parsedListContainer', 'overallStatsArea');
    }

    window.setMyChar = (charName) => {
        currentMyChar = currentMyChar === charName ? null : charName;
        renderParsedResult(currentParsedData, currentMainFilter, 'parsedListContainer', 'overallStatsArea');
    };

    function renderParsedResult(dataObj, filterType, containerId, statsAreaId) {
        const container = document.getElementById(containerId);
        const statsArea = document.getElementById(statsAreaId);
        container.innerHTML = '';
        
        let hasDisplayedAny = false;
        let allTotal = 0, allC = 0, allF = 0, allS = 0, allFail = 0;

        for (const charName in dataObj) {
            const charAllLogs = dataObj[charName];
            charAllLogs.forEach(l => {
                allTotal++;
                if(l.type === 'critical') allC++;
                if(l.type === 'fumble') allF++;
                if(l.type === 'success' || l.type === 'special') allS++;
                if(l.type === 'failure') allFail++;
            });

            const displayLogs = charAllLogs.filter(log => filterType === 'all' || log.type === filterType);
            
            const total = charAllLogs.length;
            let cCount = 0, fCount = 0;
            charAllLogs.forEach(l => {
                if(l.type === 'critical') cCount++;
                if(l.type === 'fumble') fCount++;
            });
            const cPer = total > 0 ? ((cCount / total) * 100).toFixed(1) : 0;
            const fPer = total > 0 ? ((fCount / total) * 100).toFixed(1) : 0;

            if (displayLogs.length > 0) {
                hasDisplayedAny = true;
                
                const charBox = document.createElement('details');
                charBox.className = 'log-char-accordion';
                if (charName === currentMyChar) charBox.classList.add('my-char');

                const isActive = charName === currentMyChar ? 'active' : '';
                const btnText = charName === currentMyChar ? '⭐ 自分のキャラ' : '自分のキャラに設定';
                const myCharBtnHtml = `<button class="btn-my-char ${isActive}" onclick="setMyChar('${charName}'); event.preventDefault();">${btnText}</button>`;

                charBox.innerHTML = `
                    <summary class="log-char-summary">
                        <div class="log-char-header-top">
                            <div class="log-char-title">${charName} ${myCharBtnHtml}</div>
                            <div class="log-char-toggle-icon">▼</div>
                        </div>
                        <div class="log-char-stats">
                            <span style="background:#eee; padding:2px 8px; border-radius:10px;">🎲 ${total}回</span>
                            <span style="color:#0277bd; background:#E1F5FE; padding:2px 8px; border-radius:10px;">✨クリ ${cCount}回 (${cPer}%)</span>
                            <span style="color:#c62828; background:#FFEBEE; padding:2px 8px; border-radius:10px;">💀ファン ${fCount}回 (${fPer}%)</span>
                        </div>
                    </summary>
                    <div class="log-char-content"></div>
                `;
                
                const contentDiv = charBox.querySelector('.log-char-content');
                
                displayLogs.forEach(log => {
                    let typeLabel = log.type.toUpperCase();
                    if (log.type === 'critical') typeLabel = 'Critical';
                    if (log.type === 'fumble') typeLabel = 'Fumble';
                    if (log.type === 'special') typeLabel = 'Special';
                    if (log.type === 'success') typeLabel = 'Success';
                    if (log.type === 'failure') typeLabel = 'Failure';

                    const item = document.createElement('div');
                    item.className = `log-item ${log.type}`;
                    item.innerHTML = `
                        <div class="log-item-content">
                            <span class="log-type-label">${typeLabel}</span>
                            <span>${log.text}</span>
                        </div>
                        <div class="roll-value-badge">${log.val}</div>
                    `;
                    contentDiv.appendChild(item);
                });
                
                container.appendChild(charBox);
            }
        }

        if (hasDisplayedAny && allTotal > 0) {
            const allCPer = ((allC / allTotal) * 100).toFixed(1);
            const allFPer = ((allF / allTotal) * 100).toFixed(1);
            const allSPer = ((allS / allTotal) * 100).toFixed(1);
            const allFailPer = ((allFail / allTotal) * 100).toFixed(1);

            statsArea.innerHTML = `
                <div style="font-size:12px; color:#555; font-weight:bold; margin-bottom:8px;">📊 参加者全員の合計ダイス割合 (計 ${allTotal} 回)</div>
                <div style="display:flex; gap:10px; flex-wrap:wrap; font-size:13px; font-weight:bold;">
                    <span style="color:#2e7d32;">✅ 成功: ${allSPer}%</span>
                    <span style="color:#616161;">❌ 失敗: ${allFailPer}%</span>
                    <span style="color:#0277bd;">✨ クリ: ${allCPer}%</span>
                    <span style="color:#c62828;">💀 ファン: ${allFPer}%</span>
                </div>
            `;
            statsArea.style.display = 'block';
        } else {
            statsArea.style.display = 'none';
            container.innerHTML = `<div style="text-align:center; color:#999; font-weight:bold; padding:20px;">該当するログがありません</div>`;
        }
    }

    document.getElementById('btnSaveLog').addEventListener('click', () => {
        if (!currentUser) return;
        const title = document.getElementById('saveLogTitle').value.trim();
        if (!title) return alert('タイトルを入力してください！');

        const saveData = {
            title: title,
            parsedData: currentParsedData,
            myChar: currentMyChar,
            createdAt: Date.now()
        };

        db.collection("users").doc(currentUser.uid).collection("logs").add(saveData).then(() => {
            alert('クラウドに保存しました！「保存済みログ」からいつでも見返せます！');
            tabSavedBtn.click();
        });
    });

    function renderSavedLogs() {
        const container = document.getElementById('savedLogList');
        const cumulativeArea = document.getElementById('cumulativeStatsArea');
        container.innerHTML = '';
        cumulativeArea.style.display = 'none';

        const fTitle = document.getElementById('filterLogTitle').value.trim().toLowerCase();
        const fChar = document.getElementById('filterLogChar').value.trim().toLowerCase();

        let filteredLogs = savedLogs.filter(logDoc => {
            if (fTitle && !logDoc.title.toLowerCase().includes(fTitle)) return false;
            
            if (fChar) {
                const chars = Object.keys(logDoc.parsedData);
                const matchChar = chars.some(c => c.toLowerCase().includes(fChar));
                if (!matchChar) return false;
            }
            return true;
        });

        if (fChar && filteredLogs.length > 0) {
            let sumTotal = 0, sumC = 0, sumF = 0;
            let targetCharName = '';

            filteredLogs.forEach(logDoc => {
                for (const charName in logDoc.parsedData) {
                    if (charName.toLowerCase().includes(fChar)) {
                        targetCharName = charName;
                        const logs = logDoc.parsedData[charName];
                        sumTotal += logs.length;
                        logs.forEach(l => {
                            if (l.type === 'critical') sumC++;
                            if (l.type === 'fumble') sumF++;
                        });
                    }
                }
            });

            if (sumTotal > 0) {
                const sumCPer = ((sumC / sumTotal) * 100).toFixed(1);
                const sumFPer = ((sumF / sumTotal) * 100).toFixed(1);
                cumulativeArea.innerHTML = `
                    <div style="font-size:12px; color:#f57c00; font-weight:bold; margin-bottom:8px;">📈 「${targetCharName}」の全シナリオ累計データ</div>
                    <div style="display:flex; gap:10px; flex-wrap:wrap; font-size:14px; font-weight:bold;">
                        <span style="color:#555;">🎲 振った回数: ${sumTotal}回</span>
                        <span style="color:#0277bd;">✨ クリ率: ${sumCPer}%</span>
                        <span style="color:#c62828;">💀 ファン率: ${sumFPer}%</span>
                    </div>
                `;
                cumulativeArea.style.display = 'block';
            }
        }

        if (filteredLogs.length === 0) {
            container.innerHTML = '<div class="empty-message-box">該当する保存済みログはありません</div>';
            return;
        }

        filteredLogs.forEach(logDoc => {
            const div = document.createElement('div');
            div.className = 'saved-list-item';
            
            const dateStr = new Date(logDoc.createdAt).toLocaleDateString('ja-JP');
            
            let charsStatsHtml = `<div style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">`;
            
            for (const charName in logDoc.parsedData) {
                if (fChar && !charName.toLowerCase().includes(fChar)) continue;

                const logs = logDoc.parsedData[charName];
                const totalRolls = logs.length;
                let cCount = 0, fCount = 0;

                logs.forEach(l => {
                    if (l.type === 'critical') cCount++;
                    if (l.type === 'fumble') fCount++;
                });

                const cPer = totalRolls > 0 ? ((cCount / totalRolls) * 100).toFixed(1) : 0;
                const fPer = totalRolls > 0 ? ((fCount / totalRolls) * 100).toFixed(1) : 0;

                const bgStyle = (charName === logDoc.myChar) ? 'background:#fff8e1; border:1px solid #ffb74d;' : 'background:#f8f9fa; border:1px solid #eee;';

                charsStatsHtml += `
                    <div style="display:flex; flex-direction:column; gap:6px; padding:10px 14px; border-radius:12px; ${bgStyle}">
                        <span style="font-size:14px; font-weight:bold; color:#444;">${charName} ${(charName === logDoc.myChar) ? '⭐' : ''}</span>
                        <div style="display:flex; gap:6px; font-size:11px; font-weight:bold; flex-wrap:wrap;">
                            <span style="color:#555; background:#e0e0e0; padding:4px 8px; border-radius:10px;">🎲 ${totalRolls}回</span>
                            <span style="color:#0277bd; background:#E1F5FE; padding:4px 8px; border-radius:10px;">✨クリ ${cCount}回 (${cPer}%)</span>
                            <span style="color:#c62828; background:#FFEBEE; padding:4px 8px; border-radius:10px;">💀ファン ${fCount}回 (${fPer}%)</span>
                        </div>
                    </div>
                `;
            }
            charsStatsHtml += `</div>`;

            div.innerHTML = `
                <div style="position: absolute; top: 12px; right: 12px; display: flex; gap: 6px;">
                    <button class="corner-btn delete" style="background: #ffebee; color: #d32f2f; border: none; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: pointer;" onclick="deleteLog('${logDoc.id}', event)">削除</button>
                </div>
                <div style="font-size:12px; color:#888; font-weight:bold; margin-bottom:6px;">${dateStr}</div>
                <div style="font-size:18px; font-weight:bold; color:#333; margin-bottom:4px; line-height:1.3; padding-right:60px;">${logDoc.title}</div>
                ${charsStatsHtml}
            `;

            div.addEventListener('click', () => {
                localStorage.setItem('trpg_current_log_id', logDoc.id);
                window.location.href = 'log_detail.html';
            });

            container.appendChild(div);
        });
    }

    window.deleteLog = (id, event) => {
        event.stopPropagation();
        if (confirm('この保存済みログを削除しますか？')) {
            db.collection("users").doc(currentUser.uid).collection("logs").doc(id).delete();
        }
    };
});