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
let pcData = []; // Firebaseから取得したデータをここに入れます！

let currentImageBase64 = null;
let currentSystemFilter = "すべて";
let targetPcIdForContinue = null;
let editingPcId = null;
let editingPcSystem = null;

const systems = ["CoC 6th", "CoC 7th", "エモクロア"];

document.addEventListener('DOMContentLoaded', () => {
    const pcListContainer = document.getElementById('pcListContainer');

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
        // "characters" という名前の引き出しを監視する
        db.collection("users").doc(currentUser.uid).collection("characters")
          .orderBy("createdAt", "desc") // 新しく作られた順に並べる
          .onSnapshot((snapshot) => {
              pcData = [];
              snapshot.forEach((doc) => {
                  pcData.push({ id: doc.id, ...doc.data() });
              });
              renderPcList(); // データが変わるたびに自動でリストを再描画！
          });
    }

    // --- 🎨 画像アップロード ---
    document.getElementById('imageUploadWrapper').addEventListener('click', () => { document.getElementById('pcImage').click(); });
    document.getElementById('pcImage').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const size = 200; canvas.width = size; canvas.height = size;
                const ctx = canvas.getContext('2d');
                let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
                if (img.width > img.height) { sWidth = img.height; sx = (img.width - img.height) / 2; }
                else { sHeight = img.width; sy = (img.height - img.width) / 2; }
                ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, size, size);
                currentImageBase64 = canvas.toDataURL('image/jpeg', 0.8);
                document.getElementById('imagePreview').style.backgroundImage = `url(${currentImageBase64})`;
                document.getElementById('imagePreviewText').style.display = 'none';
                document.getElementById('btnClearImage').style.display = 'block';
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
    });
    document.getElementById('btnClearImage').addEventListener('click', (e) => {
        e.stopPropagation(); currentImageBase64 = null;
        document.getElementById('imagePreview').style.backgroundImage = 'none';
        document.getElementById('imagePreviewText').style.display = 'flex';
        document.getElementById('pcImage').value = '';
        document.getElementById('btnClearImage').style.display = 'none';
    });

    // --- 固定のプルダウン（履歴ステータス用） ---
    function setupFixedSelect(displayId, optionsId, hiddenId) {
        const display = document.getElementById(displayId);
        const options = document.getElementById(optionsId);
        const hidden = document.getElementById(hiddenId);
        display.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.select-options').forEach(opt => { if(opt !== options) opt.classList.remove('active'); });
            options.classList.toggle('active');
        });
        options.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', () => {
                const val = item.getAttribute('data-value');
                if(val) { display.innerText = val; hidden.value = val; }
                options.classList.remove('active');
            });
        });
    }
    setupFixedSelect('histStatusDisplay', 'histStatusOptions', 'histStatusHidden');
    setupFixedSelect('contStatusDisplay', 'contStatusOptions', 'contStatusHidden');

    // --- ★ 自由に追加＆削除できるカスタムプルダウン（これは端末ごとの保存でOK） ---
    function updateFilterGenderOptions(list) {
        const filter = document.getElementById('filterGender');
        if (!filter) return;
        const currentVal = filter.value;
        filter.innerHTML = '<option value="すべて">すべて</option>';
        list.forEach(g => {
            const opt = document.createElement('option'); opt.value = g; opt.innerText = g;
            filter.appendChild(opt);
        });
        filter.value = currentVal;
    }

    function setupDynamicSelect(storageKey, defaultList, displayId, hiddenId, optionsId, placeholderText) {
        let currentList = JSON.parse(localStorage.getItem(storageKey)) || defaultList;
        const display = document.getElementById(displayId);
        const hidden = document.getElementById(hiddenId);
        const options = document.getElementById(optionsId);

        display.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.select-options').forEach(opt => { if(opt !== options) opt.classList.remove('active'); });
            options.classList.toggle('active');
        });

        function renderOptions() {
            options.innerHTML = '';
            currentList.forEach(item => {
                const div = document.createElement('div');
                div.className = 'option-item';
                div.setAttribute('data-value', item);
                div.innerText = item;
                let isLongPress = false;

                div.addEventListener('click', (e) => {
                    if (isLongPress) { isLongPress = false; return; }
                    display.innerText = item;
                    hidden.value = item;
                    options.classList.remove('active');
                });

                if (!defaultList.includes(item)) {
                    let timer;
                    const startPress = () => {
                        isLongPress = false;
                        timer = setTimeout(() => {
                            isLongPress = true;
                            if (confirm(`追加した${placeholderText}「${item}」を削除しますか？`)) {
                                currentList = currentList.filter(v => v !== item);
                                localStorage.setItem(storageKey, JSON.stringify(currentList));
                                if (hidden.value === item) { display.innerText = placeholderText; hidden.value = ""; }
                                renderOptions();
                                if (storageKey === 'trpg_custom_genders') updateFilterGenderOptions(currentList);
                            }
                        }, 800);
                    };
                    const cancelPress = () => clearTimeout(timer);
                    div.addEventListener('touchstart', startPress, {passive: true});
                    div.addEventListener('touchend', cancelPress);
                    div.addEventListener('mousedown', startPress);
                    div.addEventListener('mouseup', cancelPress);
                }
                options.appendChild(div);
            });

            const addDiv = document.createElement('div');
            addDiv.className = 'option-item';
            addDiv.style.color = '#76ADAF';
            addDiv.innerText = `➕ ${placeholderText}を追加`;
            addDiv.addEventListener('click', () => {
                const newVal = prompt(`${placeholderText}を入力してください`);
                if (newVal && newVal.trim() !== '') {
                    const val = newVal.trim();
                    if (!currentList.includes(val)) {
                        currentList.push(val);
                        localStorage.setItem(storageKey, JSON.stringify(currentList));
                        renderOptions();
                        if (storageKey === 'trpg_custom_genders') updateFilterGenderOptions(currentList);
                    }
                    display.innerText = val;
                    hidden.value = val;
                }
                options.classList.remove('active');
            });
            options.appendChild(addDiv);
        }

        renderOptions();
        if (storageKey === 'trpg_custom_genders') updateFilterGenderOptions(currentList);

        return {
            reset: () => { display.innerText = placeholderText; hidden.value = ""; },
            setValue: (val) => {
                if (val) {
                    if (!currentList.includes(val)) {
                        currentList.push(val);
                        localStorage.setItem(storageKey, JSON.stringify(currentList));
                        renderOptions();
                        if (storageKey === 'trpg_custom_genders') updateFilterGenderOptions(currentList);
                    }
                    display.innerText = val;
                    hidden.value = val;
                } else {
                    display.innerText = placeholderText;
                    hidden.value = "";
                }
            }
        };
    }

    const selectGender = setupDynamicSelect('trpg_custom_genders', ['女', '男', 'その他'], 'pcGenderDisplay', 'pcGenderHidden', 'pcGenderOptions', '性別');
    const selectAge = setupDynamicSelect('trpg_custom_ages', ['10代', '20代', '30代', '不明'], 'pcAgeDisplay', 'pcAgeHidden', 'pcAgeOptions', '年齢');
    const selectRace = setupDynamicSelect('trpg_custom_races', ['人間', '吸血鬼', 'エルフ', '不明'], 'pcRaceDisplay', 'pcRaceHidden', 'pcRaceOptions', '種族');
    const selectJob = setupDynamicSelect('trpg_custom_jobs', ['学生', '警察官', '医者', '探偵', '不明'], 'pcJobDisplay', 'pcJobHidden', 'pcJobOptions', '職業');

    window.addEventListener('click', () => {
        document.querySelectorAll('.select-options').forEach(opt => opt.classList.remove('active'));
    });

    // --- UI制御・リスト描画など ---
    function updateFormTitle() {
        const sysLabel = currentSystemFilter === 'すべて' ? 'CoC 6th' : currentSystemFilter;
        document.getElementById('formTitleLabel').innerHTML = `👤 新規探索者の登録 <span style="font-size:12px; color:#999; font-weight:normal;">(${sysLabel}に追加)</span>`;
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
                renderPcList();
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

    ['filterGender', 'filterTags', 'filterScenario', 'filterName', 'filterStatus', 'filterHO'].forEach(id => {
        document.getElementById(id).addEventListener('input', renderPcList);
        document.getElementById(id).addEventListener('change', renderPcList);
    });

    document.getElementById('btnResetFilter').addEventListener('click', () => {
        document.getElementById('filterName').value = '';
        document.getElementById('filterScenario').value = '';
        document.getElementById('filterGender').value = 'すべて';
        document.getElementById('filterStatus').value = 'すべて';
        document.getElementById('filterHO').value = '';
        document.getElementById('filterTags').value = '';
        renderPcList();
    });

    function renderPcList() {
        pcListContainer.innerHTML = '';
        const fGender = document.getElementById('filterGender').value;
        const fStatus = document.getElementById('filterStatus').value;
        const fTags = document.getElementById('filterTags').value.trim().toLowerCase();
        const fScenario = document.getElementById('filterScenario').value.trim().toLowerCase();
        const fName = document.getElementById('filterName').value.trim().toLowerCase();
        const fHO = document.getElementById('filterHO').value.trim().toLowerCase();
        let hitCount = 0;

        if (pcData.length === 0) {
            pcListContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">登録された探索者はいません</div>';
            document.getElementById('pcHitCount').innerText = "0"; return;
        }

        pcData.forEach((pc) => {
            if (currentSystemFilter !== "すべて" && pc.system !== currentSystemFilter) return;
            if (fGender !== 'すべて' && pc.gender !== fGender) return;
            if (fName !== '' && (!pc.name || !pc.name.toLowerCase().includes(fName))) return;
            if (fTags !== '' && (!pc.tags || !pc.tags.toLowerCase().includes(fTags))) return;

            const latestHistory = (pc.history && pc.history.length > 0) ? pc.history[0] : { scenario: '履歴なし', status: '不明', ho: '' };

            if (fStatus !== 'すべて' && latestHistory.status !== fStatus) return;
            if (fHO !== '' && (!latestHistory.ho || !latestHistory.ho.toLowerCase().includes(fHO))) return;

            if (fScenario !== '') {
                if(!pc.history) return;
                const matchScen = pc.history.some(h => h.scenario.toLowerCase().includes(fScenario));
                if (!matchScen) return;
            }

            hitCount++;
            const statusClass = latestHistory.status === '生還' ? 'alive' : (latestHistory.status === 'ロスト' ? 'lost' : 'other');
            const item = document.createElement('div');
            item.className = 'list-item';
            let tagsHtml = '';
            if (pc.tags) {
                tagsHtml = `<div style="margin-bottom:8px;">` + pc.tags.split(',').map(t => `<span class="tag-pill">${t.trim()}</span>`).join(' ') + `</div>`;
            }
            const imgStyle = pc.image ? `background-image: url(${pc.image});` : `display:flex; justify-content:center; align-items:center; color:#aaa; font-size:30px;`;

            item.innerHTML = `
                <div class="item-actions-corner">
                    <button class="corner-btn detail" onclick="openDetail('${pc.id}')">詳細</button>
                    <button class="corner-btn continue" onclick="openContinueModal('${pc.id}')">継続</button>
                    <button class="corner-btn delete" onclick="deletePc('${pc.id}')">削除</button>
                </div>
                <div class="pl-list-layout">
                    <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0; gap:6px; width:80px;">
                        <div class="pl-list-image" style="${imgStyle}">${pc.image ? '' : '👤'}</div>
                        <span class="status-badge ${statusClass}" style="margin:0;">${latestHistory.status}</span>
                        <span style="font-size:10px; color:#999; font-weight:bold; text-align:center;">${pc.system}</span>
                    </div>
                    <div class="pl-list-content">
                        <div class="item-header">
                            <div class="item-title">${pc.name}</div>
                            <div class="item-subtitle">最新: ${latestHistory.scenario}</div>
                        </div>
                        ${tagsHtml}
                        <div class="item-details">通過数: ${pc.history ? pc.history.length : 0} シナリオ</div>
                    </div>
                </div>
            `;
            pcListContainer.appendChild(item);
        });

        document.getElementById('pcHitCount').innerText = hitCount;
    }

    // ==========================================
    // ★ 3. Firebaseへのデータ保存・更新処理
    // ==========================================

    // --- 新規登録（Firebaseに保存） ---
    document.getElementById('btnAddPc').addEventListener('click', () => {
        if (!currentUser) return alert("ログインしてください");

        const name = document.getElementById('pcName').value.trim();
        const gender = document.getElementById('pcGenderHidden').value;
        const age = document.getElementById('pcAgeHidden').value;
        const race = document.getElementById('pcRaceHidden').value;
        const job = document.getElementById('pcJobHidden').value;
        const tags = document.getElementById('pcTags').value.trim();
        const url = document.getElementById('pcUrl').value.trim();
        const iacharaText = document.getElementById('pcIachara').value.trim();

        if (!name) { alert('PC名は必須です'); return; }

        let parsedStats = [];
        let parsedSkills = '';
        if (iacharaText) {
            try {
                const dataObj = JSON.parse(iacharaText);
                if (dataObj.data) {
                    if (dataObj.data.status) dataObj.data.status.forEach(s => parsedStats.push({ label: s.label, value: s.value }));
                    if (dataObj.data.params) dataObj.data.params.forEach(p => parsedStats.push({ label: p.label, value: p.value }));
                    if (dataObj.data.commands) parsedSkills = dataObj.data.commands;
                }
            } catch(e) { parsedSkills = iacharaText; }
        }

        const system = currentSystemFilter === "すべて" ? "CoC 6th" : currentSystemFilter;
        const hScen = document.getElementById('histScenario').value.trim();
        const hHO = document.getElementById('histHO').value.trim();
        const hDate = document.getElementById('histDate').value;
        const hStatus = document.getElementById('histStatusHidden').value;

        if (!hScen) { alert('初回シナリオ名は必須です'); return; }

        const now = Date.now();
        const newPc = {
            system, name, gender, age, race, job, tags, url, image: currentImageBase64,
            stats: parsedStats, skills: parsedSkills,
            history: [{ scenario: hScen, ho: hHO, date: hDate, status: hStatus }],
            createdAt: now,
            updatedAt: now
        };

        // Firebaseの金庫に追加！
        db.collection("users").doc(currentUser.uid).collection("characters").add(newPc).then(() => {
            // フォームのリセット
            document.getElementById('pcName').value = '';
            document.getElementById('pcTags').value = '';
            document.getElementById('pcUrl').value = '';
            document.getElementById('pcIachara').value = '';
            document.getElementById('histScenario').value = '';
            document.getElementById('histHO').value = '';
            const histDate = document.getElementById('histDate');
            histDate.value = ''; histDate.type = 'text';

            selectGender.reset(); selectAge.reset(); selectRace.reset(); selectJob.reset();
            document.getElementById('btnClearImage').click();
        });
    });

    // --- 継続シナリオの追加（Firebaseのデータを更新） ---
    window.openContinueModal = (id) => {
        targetPcIdForContinue = id;
        const pc = pcData.find(p => p.id === id);
        if(!pc) return;
        document.getElementById('continuePcName').innerText = `${pc.name} (${pc.system})`;
        document.getElementById('contScenario').value = '';
        const contDate = document.getElementById('contDate');
        contDate.value = ''; contDate.type = 'text';
        document.getElementById('contHO').value = '';
        document.getElementById('contStatusHidden').value = '生還';
        document.getElementById('contStatusDisplay').innerText = '生還';
        document.getElementById('continueModal').style.display = 'flex';
    };

    window.closeContinueModal = () => {
        document.getElementById('continueModal').style.display = 'none';
        targetPcIdForContinue = null;
    };

    window.saveContinueHistory = () => {
        if(!targetPcIdForContinue) return;
        const pc = pcData.find(p => p.id === targetPcIdForContinue);
        if(!pc) return;

        const scenario = document.getElementById('contScenario').value.trim();
        if(!scenario) { alert('シナリオ名は必須です'); return; }

        const newHist = {
            scenario: scenario,
            date: document.getElementById('contDate').value,
            ho: document.getElementById('contHO').value.trim(),
            status: document.getElementById('contStatusHidden').value
        };

        // 現在の履歴の一番上（先頭）に新しい履歴を追加
        const updatedHistory = [newHist, ...(pc.history || [])];

        // Firebaseの金庫を上書き更新！
        db.collection("users").doc(currentUser.uid).collection("characters").doc(targetPcIdForContinue)
          .set({ history: updatedHistory, updatedAt: Date.now() }, { merge: true })
          .then(() => {
              closeContinueModal();
          });
    };

    // --- 削除処理（Firebaseから削除） ---
    window.deletePc = (id) => {
        if (confirm('この探索者のデータを完全に削除しますか？')) {
            db.collection("users").doc(currentUser.uid).collection("characters").doc(id).delete();
        }
    };

    // 詳細画面・編集画面への遷移（これだけは今まで通りlocalStorageでIDを渡します）
    window.openDetail = (id) => {
        localStorage.setItem('trpg_current_pc_id', id);
        window.location.href = './detail.html'; // ※ファイル名は適宜合わせてください
    };

    renderSystemTabs();
});