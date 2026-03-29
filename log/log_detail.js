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

// ★ フィルターを「配列」にして複数選択できるように変更
let currentDetailFilters = ['all'];
const targetId = localStorage.getItem('trpg_current_log_id');

document.addEventListener('DOMContentLoaded', () => {
    const detailView = document.getElementById('detailView');

    if (!targetId) {
        detailView.style.display = 'block';
        detailView.innerHTML = '<div style="text-align:center; padding:30px; color:#999; font-weight:bold;">ログが選択されていません。</div>';
        return;
    }

    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadLogData();
        } else {
            alert("ログインが必要です");
            window.location.href = '../index.html';
        }
    });

    function loadLogData() {
        db.collection("users").doc(currentUser.uid).collection("logs").doc(targetId).get()
          .then((doc) => {
              if (doc.exists) {
                  const data = doc.data();
                  currentParsedData = data.parsedData;
                  currentMyChar = data.myChar || null;
                  
                  document.getElementById('pageTitle').innerText = data.title;
                  detailView.style.display = 'block';
                  
                  renderParsedResult();
              } else {
                  detailView.style.display = 'block';
                  detailView.innerHTML = '<div style="text-align:center; padding:30px; color:#999; font-weight:bold;">データが見つかりません。</div>';
              }
          });
    }

    // ★ フィルターボタンの動作（複数選択可能にする魔法！）
    document.querySelectorAll('.detail-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = e.target.getAttribute('data-filter');

            if (filter === 'all') {
                // ALLが押されたら、他の選択をすべて解除してALLだけにする
                document.querySelectorAll('.detail-filter').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentDetailFilters = ['all'];
            } else {
                // ALL以外のボタンが押された場合
                const allBtn = document.querySelector('.detail-filter[data-filter="all"]');
                allBtn.classList.remove('active');
                currentDetailFilters = currentDetailFilters.filter(f => f !== 'all');

                if (currentDetailFilters.includes(filter)) {
                    // すでに選択されていれば解除する（トグル）
                    e.target.classList.remove('active');
                    currentDetailFilters = currentDetailFilters.filter(f => f !== filter);
                } else {
                    // 新しく選択する
                    e.target.classList.add('active');
                    currentDetailFilters.push(filter);
                }

                // もし全部の選択が解除されてしまったら、自動的に ALL に戻す
                if (currentDetailFilters.length === 0) {
                    allBtn.classList.add('active');
                    currentDetailFilters = ['all'];
                }
            }
            renderParsedResult();
        });
    });

    window.setMyChar = (charName) => {
        currentMyChar = currentMyChar === charName ? null : charName;
        renderParsedResult();

        db.collection("users").doc(currentUser.uid).collection("logs").doc(targetId)
          .update({ myChar: currentMyChar });
    };

    function renderParsedResult() {
        const container = document.getElementById('detailParsedListContainer');
        const statsArea = document.getElementById('detailOverallStatsArea');
        container.innerHTML = '';
        
        let hasDisplayedAny = false;
        let allTotal = 0, allC = 0, allF = 0, allS = 0, allFail = 0;

        for (const charName in currentParsedData) {
            const charAllLogs = currentParsedData[charName];
            charAllLogs.forEach(l => {
                allTotal++;
                if(l.type === 'critical') allC++;
                if(l.type === 'fumble') allF++;
                if(l.type === 'success' || l.type === 'special') allS++;
                if(l.type === 'failure') allFail++;
            });

            // ★ currentDetailFilters（配列）に含まれているタイプだけを抽出する
            const displayLogs = charAllLogs.filter(log => currentDetailFilters.includes('all') || currentDetailFilters.includes(log.type));
            
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
});