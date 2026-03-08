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
let scenarios = []; // localStorageの代わりに空の配列を用意
let editingId = null; // indexではなくIDで管理します

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // ★ 2. ログインチェックとリアルタイム同期
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
        // "scenario_self" という名前の引き出し（自作シナリオ用）を監視
        db.collection("users").doc(currentUser.uid).collection("scenario_self")
          .orderBy("createdAt", "desc")
          .onSnapshot((snapshot) => {
              scenarios = [];
              snapshot.forEach((doc) => {
                  scenarios.push({ id: doc.id, ...doc.data() });
              });
              renderScenarios(); // データが変わるたびに自動で画面更新！
          });
    }

    // ==========================================
    // UI制御のコード
    // ==========================================
    const scList = document.getElementById('scList');
    const hitCountDisplay = document.getElementById('scHitCount');

    const systems = ["CoC 6th", "CoC 7th", "エモクロア", "マダミス"];
    let currentSystemFilter = "すべて";

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

        scenarios.forEach((s) => {
            if (currentSystemFilter !== 'すべて' && s.system !== currentSystemFilter) return;
            if (fStatus !== 'すべて' && s.status !== fStatus) return;
            if (fScenario !== '' && (!s.title || !s.title.toLowerCase().includes(fScenario))) return;
            if (fPlayerNum !== '' && (!s.playerNum || !s.playerNum.toLowerCase().includes(fPlayerNum))) return;

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

            // ★ 売上カウンター
            const salesCounterHtml = s.status === '頒布中' ? `
                <div class="control-row" style="margin-top: 8px;">
                    <div class="count-display">売上数: <strong style="color:#ff6f00;">${s.sales || 0}</strong> 部</div>
                    <div style="display:flex; gap:8px;">
                        <button class="cnt-btn" onclick="updateSales('${s.id}', -1)">-</button>
                        <button class="cnt-btn" onclick="updateSales('${s.id}', 1)">+</button>
                    </div>
                </div>` : '';

            let linksHtml = '';
            if (s.docUrl) linksHtml += `<a href="${s.docUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; background:#e3f2fd; color:#1565c0; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:bold; text-decoration:none;">📄 資料/PDF</a>`;
            if (s.boothUrl) linksHtml += `<a href="${s.boothUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; background:#ffe0b2; color:#e65100; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:bold; text-decoration:none;">🛍️ Booth</a>`;
            if (s.ccfoliaUrl) linksHtml += `<a href="${s.ccfoliaUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; background:#c8e6c9; color:#2e7d32; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:bold; text-decoration:none;">🎲 ココフォリア</a>`;

            const linksContainer = linksHtml ? `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-left:10px;">${linksHtml}</div>` : '';

            const infoHtml = (s.playerNum || s.duration) ? `<div class="sc-info-row"><span>👥 ${s.playerNum || '未定'}</span><span>⏳ ${s.duration || '未定'}</span></div>` : '';

            // ★ IDを使ってボタン類を描画するよう修正
            item.innerHTML = `
                <div class="item-actions-corner">
                    <button class="corner-btn edit" onclick="editScenario('${s.id}')">修正</button>
                    <button class="corner-btn delete" onclick="deleteScenario('${s.id}')">削除</button>
                </div>

                <span class="sys-badge">${s.system || 'CoC 6th'}</span>

                <div class="sc-title-row">${s.title}</div>
                ${infoHtml}

                <div style="margin-bottom: 16px; display: flex; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div class="custom-select-wrapper" style="width: 150px; flex-shrink: 0;">
                        <div class="select-display" style="padding: 10px; font-size: 13px;" onclick="toggleListStatus('${s.id}', event)">${s.status}</div>
                        <div class="select-options" id="listStatusOpt-${s.id}">
                            <div class="option-item" style="padding: 12px; font-size: 13px;" onclick="changeListStatus('${s.id}', '執筆中')">執筆中</div>
                            <div class="option-item" style="padding: 12px; font-size: 13px;" onclick="changeListStatus('${s.id}', 'テストプレイ中')">テストプレイ中</div>
                            <div class="option-item" style="padding: 12px; font-size: 13px;" onclick="changeListStatus('${s.id}', '頒布中')">頒布中</div>
                            <div class="option-item" style="padding: 12px; font-size: 13px;" onclick="changeListStatus('${s.id}', '頒布停止中')">頒布停止中</div>
                        </div>
                    </div>
                    ${linksContainer}
                </div>

                <div class="control-row">
                    <div class="count-display">現在: <strong>${s.zin || 0}</strong> 陣目</div>
                    <div style="display:flex; gap:8px;">
                        <button class="cnt-btn" onclick="updateZin('${s.id}', -1)">-</button>
                        <button class="cnt-btn" onclick="updateZin('${s.id}', 1)">+</button>
                    </div>
                </div>
                ${salesCounterHtml}
            `;
            scList.appendChild(item);
        });

        hitCountDisplay.innerText = hitCount;
    }

    // ==========================================
    // ★ 3. Firebaseへのデータ保存・更新処理
    // ==========================================
    document.getElementById('btnAddScenario').addEventListener('click', () => {
        if (!currentUser) return alert("ログインしてください");

        const title = document.getElementById('scTitle').value.trim();
        let playerNum = document.getElementById('scPlayerNum').value.trim();
        let duration = document.getElementById('scDuration').value.trim();
        const zin = parseInt(document.getElementById('scZin').value) || 0;
        const status = document.getElementById('scStatusHidden').value;
        const docUrl = document.getElementById('scDocUrl').value.trim();
        const boothUrl = document.getElementById('scBoothUrl').value.trim();
        const ccfoliaUrl = document.getElementById('scCcfoliaUrl').value.trim();

        if (playerNum && !playerNum.includes('PL') && !playerNum.includes('人') && !playerNum.includes('タイマン')) playerNum += 'PL';
        if (duration && !duration.includes('時間') && !duration.includes('分')) duration += '時間';

        if (!title) {
            alert('シナリオ名を入力してください');
            return;
        }

        const system = currentSystemFilter === 'すべて' ? 'CoC 6th' : currentSystemFilter;
        const now = Date.now();

        const newData = {
            system: editingId ? (scenarios.find(d => d.id === editingId)?.system || 'CoC 6th') : system,
            title, playerNum, duration, zin, status, docUrl, boothUrl, ccfoliaUrl,
            updatedAt: now
        };

        const targetCollection = db.collection("users").doc(currentUser.uid).collection("scenario_self");

        if (editingId) {
            targetCollection.doc(editingId).set(newData, { merge: true }).then(() => {
                editingId = null;
                resetFormUI();
            });
        } else {
            newData.createdAt = now;
            newData.sales = 0; // 新規登録時は売上0
            targetCollection.add(newData).then(() => {
                resetFormUI();
            });
        }
    });

    function resetFormUI() {
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
        document.getElementById('scStatusDisplay').innerText = "執筆中";
        document.getElementById('scStatusHidden').value = "執筆中";

        updateFormTitle();
    }

    // ★ リスト内の状態変更（Firebase直接書き換え）
    window.toggleListStatus = (id, event) => {
        event.stopPropagation();
        const targetOpt = document.getElementById(`listStatusOpt-${id}`);
        document.querySelectorAll('.select-options').forEach(opt => {
            if (opt !== targetOpt) opt.classList.remove('active');
        });
        targetOpt.classList.toggle('active');
    };

    window.changeListStatus = (id, newStatus) => {
        db.collection("users").doc(currentUser.uid).collection("scenario_self")
          .doc(id).set({ status: newStatus }, { merge: true });
    };

    // ★ 陣数・売上カウンター（Firebase直接書き換え）
    window.updateZin = (id, delta) => {
        const item = scenarios.find(d => d.id === id);
        if (item) {
            const newZin = Math.max(0, (parseInt(item.zin) || 0) + delta);
            db.collection("users").doc(currentUser.uid).collection("scenario_self")
              .doc(id).set({ zin: newZin }, { merge: true });
        }
    };

    window.updateSales = (id, delta) => {
        const item = scenarios.find(d => d.id === id);
        if (item) {
            const newSales = Math.max(0, (parseInt(item.sales) || 0) + delta);
            db.collection("users").doc(currentUser.uid).collection("scenario_self")
              .doc(id).set({ sales: newSales }, { merge: true });
        }
    };

    // ★ 修正・削除処理
    window.editScenario = (id) => {
        const s = scenarios.find(d => d.id === id);
        if (!s) return;
        editingId = id;

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

    window.deleteScenario = (id) => {
        if (!confirm('このシナリオを削除しますか？')) return;

        db.collection("users").doc(currentUser.uid).collection("scenario_self").doc(id).delete();

        if (editingId === id) {
            editingId = null;
            resetFormUI();
        }
    };

    renderSystemTabs();
});