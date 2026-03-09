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

// もし既に初期化されていなければ初期化する
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let scenarios = []; // 端末の引き出し（localStorage）ではなく、この空箱を使います！
let editingIndex = null;

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // ★ 2. ログインチェックと、リアルタイム同期の魔法！
    // ==========================================
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            console.log("ログイン確認OK！ ID:", user.uid);
            // ログインしていたら、金庫の監視（同期）をスタート！
            startRealtimeSync();
        } else {
            // ログインしていなければトップページに強制送還！
            alert("データの同期にはログインが必要です。トップページに戻ります。");
            window.location.href = '../index.html';
        }
    });

    // 🏆 これがFirebase最大の魔法「onSnapshot」です！
    // 金庫の中身が変わった瞬間、自動的に画面が書き換わります！
    function startRealtimeSync() {
        db.collection("users").doc(currentUser.uid).collection("scenario_want")
          .orderBy("createdAt", "desc") // 新しい順に並べる
          .onSnapshot((snapshot) => {
              scenarios = []; // 一旦空っぽにする
              snapshot.forEach((doc) => {
                  // 金庫の中からデータを取り出してリストに入れる
                  scenarios.push({ id: doc.id, ...doc.data() });
              });
              renderScenarios(); // データが届くたびに自動で画面を作る！
          });
    }

    // ==========================================
    // 以降は司令官が作った最高のUIコード（少しだけFirestore用に調整）
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

    function renderScenarios() {
        scList.innerHTML = '';

        const fScenario = document.getElementById('filterScenario').value.trim().toLowerCase();
        const fPlayerNum = document.getElementById('filterPlayerNum').value.trim().toLowerCase();
        const fDuration = document.getElementById('filterDuration').value.trim().toLowerCase();
        let hitCount = 0;

        if (scenarios.length === 0) {
            scList.innerHTML = '<div class="empty-message-box">登録された行きたいシナリオはありません</div>';
            hitCountDisplay.innerText = "0";
            return;
        }

        scenarios.forEach((s) => {
            if (currentSystemFilter !== 'すべて' && s.system !== currentSystemFilter) return;
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

            let linkHtml = '';
            if (s.url) {
                linkHtml = `<a href="${s.url}" target="_blank" rel="noopener noreferrer" style="display:inline-block; background:#ffe0b2; color:#e65100; padding:8px 16px; border-radius:10px; font-size:13px; font-weight:bold; text-decoration:none; margin-bottom:10px;">🛍️ Booth / URL</a>`;
            }

            const infoHtml = (s.playerNum || s.duration) ? `<div class="sc-info-row"><span>👥 ${s.playerNum || '未定'}</span><span>⏳ ${s.duration || '未定'}</span></div>` : '';
            const hoHtml = s.ho ? `<div style="font-size: 13px; font-weight: bold; color: #76ADAF; margin-bottom: 10px; border-left: 3px solid #76ADAF; padding-left: 8px;">✋ 握りたいHO: ${s.ho}</div>` : '';
            const memoHtml = s.memo ? `<div class="memo-display-box">${s.memo.replace(/\n/g, '<br>')}</div>` : '';

            // ★ idを使って修正・削除を実行するように変更
            item.innerHTML = `
                <div class="item-actions-corner">
                    <button class="corner-btn edit" onclick="editScenario('${s.id}')">修正</button>
                    <button class="corner-btn delete" onclick="deleteScenario('${s.id}')">削除</button>
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

    // ==========================================
    // ★ 3. Firebaseの金庫へデータを保存する処理
    // ==========================================
    document.getElementById('btnAddScenario').addEventListener('click', () => {
        if (!currentUser) return alert("ログインしてください");

        const title = document.getElementById('scTitle').value.trim();
        let playerNum = document.getElementById('scPlayerNum').value.trim();
        let duration = document.getElementById('scDuration').value.trim();
        const system = document.getElementById('scSystemHidden').value;
        const url = document.getElementById('scUrl').value.trim();
        const ho = document.getElementById('scHo').value.trim();
        const memo = document.getElementById('scMemo').value.trim();

        if (playerNum && !playerNum.includes('PL') && !playerNum.includes('人') && !playerNum.includes('タイマン')) playerNum += 'PL';
        if (duration && !duration.includes('時間') && !duration.includes('分')) duration += '時間';

        if (!title) {
            alert('シナリオ名を入力してください');
            return;
        }

        const now = Date.now();
        const newData = {
            title: title,
            playerNum: playerNum,
            duration: duration,
            system: system,
            url: url,
            ho: ho,
            memo: memo,
            updatedAt: now // 更新日時
        };

        const targetCollection = db.collection("users").doc(currentUser.uid).collection("scenario_want");

        if (editingIndex !== null) {
            // ★ 修正モード：既存のデータを上書き保存
            targetCollection.doc(editingIndex).set(newData, { merge: true }).then(() => {
                editingIndex = null;
                resetFormUI();
            });
        } else {
            // ★ 新規登録モード：新しくデータを追加（作られた時間も記録する）
            newData.createdAt = now;
            targetCollection.add(newData).then(() => {
                resetFormUI();
            });
        }
    });

    function resetFormUI() {
        document.getElementById('formTitleLabel').innerText = '🆕 行きたいシナリオ登録';
        const btn = document.getElementById('btnAddScenario');
        btn.innerText = 'リストに追加';
        btn.classList.remove('edit-mode');
        document.getElementById('scTitle').value = '';
        document.getElementById('scPlayerNum').value = '';
        document.getElementById('scDuration').value = '';
        document.getElementById('scUrl').value = '';
        document.getElementById('scHo').value = '';
        document.getElementById('scMemo').value = '';
        updateFormTitle();
    }

    // ★ 修正ボタンを押したときの処理
    window.editScenario = (id) => {
        const s = scenarios.find(doc => doc.id === id);
        if (!s) return;
        editingIndex = id; // 今回はIndex番号ではなくFirebaseのIDを使います！

        document.getElementById('scTitle').value = s.title || '';
        document.getElementById('scPlayerNum').value = s.playerNum ? s.playerNum.replace(/PL$/, '') : '';
        document.getElementById('scDuration').value = s.duration ? s.duration.replace(/時間$/, '') : '';
        document.getElementById('scUrl').value = s.url || '';
        document.getElementById('scHo').value = s.ho || '';
        document.getElementById('scMemo').value = s.memo || '';

        document.getElementById('scSystemHidden').value = s.system || 'CoC 6th';
        document.getElementById('scSystemDisplay').innerText = s.system || 'CoC 6th';

        document.getElementById('formTitleLabel').innerText = `✍️ 登録情報の修正 (${s.system || 'CoC 6th'})`;
        const btn = document.getElementById('btnAddScenario');
        btn.innerText = '情報を更新する';
        btn.classList.add('edit-mode');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ★ 削除ボタンを押したときの処理
    window.deleteScenario = (id) => {
        if (!confirm('このシナリオを削除しますか？')) return;
        // 金庫から指定したIDのデータを消し去る！
        db.collection("users").doc(currentUser.uid).collection("scenario_want").doc(id).delete();

        if (editingIndex === id) {
            editingIndex = null;
            resetFormUI();
        }
    };

    renderSystemTabs();
});