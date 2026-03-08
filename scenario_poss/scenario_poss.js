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
let possData = []; // localStorageの代わりに空の配列を用意
let editingId = null;

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
        // "scenario_poss" という名前の引き出しを監視する
        db.collection("users").doc(currentUser.uid).collection("scenario_poss")
          .orderBy("createdAt", "desc")
          .onSnapshot((snapshot) => {
              possData = [];
              snapshot.forEach((doc) => {
                  possData.push({ id: doc.id, ...doc.data() });
              });
              renderList(); // データが変わるたびに自動で画面更新！
          });
    }

    // ==========================================
    // UI制御のコード（既存のまま）
    // ==========================================
    const listContainer = document.getElementById('possListContainer');
    const hitCountDisplay = document.getElementById('hitCount');

    const systems = ["CoC 6th", "CoC 7th", "エモクロア", "マダミス"];
    let currentSystemFilter = "すべて";

    function setupSelect(displayId, optionsId, hiddenId, onChange = null) {
        const display = document.getElementById(displayId);
        const options = document.getElementById(optionsId);
        const hidden = document.getElementById(hiddenId);
        if(!display) return;

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
                display.innerText = item.innerText;
                hidden.value = val;
                options.classList.remove('active');
                if (onChange) onChange();
            });
        });
    }

    setupSelect('filterStatusDisplay', 'filterStatusOptions', 'filterStatusHidden', renderList);
    setupSelect('possStatusDisplay', 'possStatusOptions', 'possStatusHidden');

    window.addEventListener('click', () => {
        document.querySelectorAll('.select-options.active').forEach(el => el.classList.remove('active'));
    });

    function updateFormTitle() {
        const sysLabel = currentSystemFilter === 'すべて' ? 'CoC 6th' : currentSystemFilter;
        document.getElementById('formTitleLabel').innerHTML = `🆕 所持シナリオの登録 <span style="font-size:12px; color:#999; font-weight:normal;">(${sysLabel}に追加)</span>`;
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
                renderList();
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

    ['filterTitle', 'filterMemo', 'filterTime'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', renderList);
    });

    document.getElementById('btnResetFilter').addEventListener('click', () => {
        if(document.getElementById('filterTitle')) document.getElementById('filterTitle').value = '';
        if(document.getElementById('filterMemo')) document.getElementById('filterMemo').value = '';
        if(document.getElementById('filterTime')) document.getElementById('filterTime').value = '';

        document.getElementById('filterStatusHidden').value = 'すべて';
        document.getElementById('filterStatusDisplay').innerText = '状態';
        renderList();
    });

    function getStatusClass(status) {
        if (status.includes('未読')) return 'unread';
        if (status.includes('読了')) return 'read';
        if (status.includes('回せる')) return 'ready';
        if (status.includes('PL通過')) return 'played';
        return '';
    }

    function renderList() {
        listContainer.innerHTML = '';

        const fTitle = document.getElementById('filterTitle') ? document.getElementById('filterTitle').value.trim().toLowerCase() : '';
        const fMemo = document.getElementById('filterMemo') ? document.getElementById('filterMemo').value.trim().toLowerCase() : '';
        const fTime = document.getElementById('filterTime') ? document.getElementById('filterTime').value.trim().toLowerCase() : '';
        const fStatus = document.getElementById('filterStatusHidden').value;
        let hitCount = 0;

        if (possData.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#999; font-weight:bold;">登録されたシナリオはありません</div>';
            hitCountDisplay.innerText = "0"; return;
        }

        possData.forEach((item) => {
            if (currentSystemFilter !== 'すべて' && item.system !== currentSystemFilter) return;
            if (fStatus !== 'すべて' && item.status !== fStatus) return;
            if (fTitle !== '' && (!item.title || !item.title.toLowerCase().includes(fTitle))) return;
            if (fMemo !== '' && (!item.memo || !item.memo.toLowerCase().includes(fMemo))) return;

            if (fTime !== '') {
                if (!item.time) return;
                let isMatch = item.time.toLowerCase().includes(fTime);
                const searchNumMatch = fTime.match(/(\d+(?:\.\d+)?)/);
                if (!isMatch && searchNumMatch) {
                    const searchNum = parseFloat(searchNumMatch[1]);
                    const rangeMatch = item.time.match(/(\d+(?:\.\d+)?)\s*[〜~-]\s*(\d+(?:\.\d+)?)/);
                    if (rangeMatch) {
                        const min = parseFloat(rangeMatch[1]);
                        const max = parseFloat(rangeMatch[2]);
                        if (searchNum >= min && searchNum <= max) isMatch = true;
                    } else {
                        const singleMatch = item.time.match(/(\d+(?:\.\d+)?)/);
                        if (singleMatch) {
                            const val = parseFloat(singleMatch[1]);
                            if (searchNum === val) isMatch = true;
                        }
                    }
                }
                if (!isMatch) return;
            }

            hitCount++;

            const div = document.createElement('div');
            div.className = 'list-item';

            const badgeClass = getStatusClass(item.status);

            let linksHtml = '';
            if (item.url) {
                linksHtml += `<a href="${item.url}" target="_blank" style="display:inline-block; background:#ffe0b2; color:#e65100; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:bold; text-decoration:none;">🛍️ 配布元</a>`;
            }
            if (item.ccfoliaUrl) {
                linksHtml += `<a href="${item.ccfoliaUrl}" target="_blank" style="display:inline-block; background:#c8e6c9; color:#2e7d32; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:bold; text-decoration:none;">🎲 ココフォリア</a>`;
            }
            const linksContainer = linksHtml ? `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">${linksHtml}</div>` : '';

            const infoHtml = (item.players || item.time) ? `<div class="item-info-row"><span>👥 ${item.players || '未定'}</span><span>⏳ ${item.time || '未定'}</span></div>` : '';
            const memoHtml = item.memo ? `<div style="font-size:12px; color:#777; background:#f8f9fa; padding:8px; border-radius:8px; margin-top:8px;">📝 ${item.memo}</div>` : '';

            const counterHtml = `
                <div class="control-row">
                    <div class="count-display">KP/GM回数: <strong>${item.runCount || 0}</strong> 回</div>
                    <div style="display:flex; gap:8px;">
                        <button class="cnt-btn" onclick="updateRunCount('${item.id}', -1)">-</button>
                        <button class="cnt-btn" onclick="updateRunCount('${item.id}', 1)">+</button>
                    </div>
                </div>
            `;

            div.innerHTML = `
                <div class="item-actions-corner">
                    <button class="corner-btn edit" onclick="editItem('${item.id}')">修正</button>
                    <button class="corner-btn delete" onclick="deleteItem('${item.id}')">削除</button>
                </div>

                <span class="status-badge ${badgeClass}">${item.status}</span>
                <span class="sys-badge">${item.system || 'CoC 6th'}</span>

                <div class="item-title">${item.title}</div>
                ${infoHtml}
                ${memoHtml}
                ${linksContainer}
                ${counterHtml}
            `;
            listContainer.appendChild(div);
        });

        hitCountDisplay.innerText = hitCount;
    }

    // ==========================================
    // ★ 3. Firebaseへのデータ保存処理
    // ==========================================
    document.getElementById('btnAddPoss').addEventListener('click', () => {
        if (!currentUser) return alert("ログインしてください");

        const title = document.getElementById('possTitle').value.trim();
        const status = document.getElementById('possStatusHidden').value;
        let players = document.getElementById('possPlayers').value.trim();
        let time = document.getElementById('possTime').value.trim();
        const url = document.getElementById('possUrl').value.trim();
        const ccfoliaUrl = document.getElementById('possCcfoliaUrl').value.trim();
        const runCount = parseInt(document.getElementById('possRunCount').value) || 0;
        const memo = document.getElementById('possMemo').value.trim();

        if (!title) { alert('シナリオ名を入力してください'); return; }

        if (players && /[0-9０-９]$/.test(players) && !players.includes('人')) players += 'PL';
        if (time && /[0-9０-９]$/.test(time) && !time.includes('分')) time += '時間';

        const now = Date.now();
        const system = currentSystemFilter === 'すべて' ? 'CoC 6th' : currentSystemFilter;

        const newData = {
            system: editingId ? (possData.find(d => d.id === editingId)?.system || 'CoC 6th') : system,
            title, status, players, time, url, ccfoliaUrl, runCount, memo,
            updatedAt: now
        };

        const targetCollection = db.collection("users").doc(currentUser.uid).collection("scenario_poss");

        if (editingId) {
            targetCollection.doc(editingId).set(newData, { merge: true }).then(() => {
                editingId = null;
                resetForm();
                document.getElementById('formTitleLabel').innerText = '🆕 所持シナリオの登録';
                const btn = document.getElementById('btnAddPoss');
                btn.innerText = '本棚に追加';
                btn.classList.remove('edit-mode');
            });
        } else {
            newData.createdAt = now;
            targetCollection.add(newData).then(() => {
                resetForm();
            });
        }
    });

    // ★ カウンター増減処理（Firebaseの金庫を直接書き換える）
    window.updateRunCount = (id, delta) => {
        const item = possData.find(d => d.id === id);
        if (item) {
            const newCount = Math.max(0, (parseInt(item.runCount) || 0) + delta);
            db.collection("users").doc(currentUser.uid).collection("scenario_poss")
              .doc(id).set({ runCount: newCount }, { merge: true });
        }
    };

    window.editItem = (id) => {
        const item = possData.find(d => d.id === id);
        if(!item) return;
        editingId = id;

        document.getElementById('possTitle').value = item.title || '';
        document.getElementById('possPlayers').value = item.players ? item.players.replace(/PL$/, '') : '';
        document.getElementById('possTime').value = item.time ? item.time.replace(/時間$/, '') : '';
        document.getElementById('possUrl').value = item.url || '';
        document.getElementById('possCcfoliaUrl').value = item.ccfoliaUrl || '';
        document.getElementById('possRunCount').value = item.runCount || 0;
        document.getElementById('possMemo').value = item.memo || '';

        document.getElementById('possStatusHidden').value = item.status || '未読 (積読)';
        document.getElementById('possStatusDisplay').innerText = item.status || '未読 (積読)';

        document.getElementById('formTitleLabel').innerText = `✍️ シナリオ情報の修正 (${item.system || 'CoC 6th'})`;
        const btn = document.getElementById('btnAddPoss');
        btn.innerText = '情報を更新する';
        btn.classList.add('edit-mode');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.deleteItem = (id) => {
        if (confirm('このシナリオを本棚から削除しますか？')) {
            db.collection("users").doc(currentUser.uid).collection("scenario_poss").doc(id).delete();
            if (editingId === id) {
                editingId = null;
                resetForm();
                document.getElementById('formTitleLabel').innerText = '🆕 所持シナリオの登録';
                const btn = document.getElementById('btnAddPoss');
                btn.innerText = '本棚に追加';
                btn.classList.remove('edit-mode');
            }
        }
    };

    function resetForm() {
        document.getElementById('possTitle').value = '';
        document.getElementById('possPlayers').value = '';
        document.getElementById('possTime').value = '';
        document.getElementById('possUrl').value = '';
        document.getElementById('possCcfoliaUrl').value = '';
        document.getElementById('possRunCount').value = '';
        document.getElementById('possMemo').value = '';
    }

    renderSystemTabs();
});