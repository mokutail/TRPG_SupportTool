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
let pcData = [];

let currentImageBase64 = null;
let currentSystemFilter = "すべて";
let targetPcIdForContinue = null;
let editingPcId = null;
let editingPcSystem = null;

const systems = ["CoC 6th", "CoC 7th", "エモクロア"];

document.addEventListener('DOMContentLoaded', () => {
    const pcListContainer = document.getElementById('pcListContainer');

    // ==========================================
    // ★ ログインチェックとリアルタイム同期
    // ==========================================
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userDoc = await db.collection("users").doc(user.uid).get();
                const usedPass = userDoc.exists ? (userDoc.data().usedPassword || "") : "";
                if (usedPass === "admin2003" || usedPass.includes("admin")) {
                    currentUser = user;
                    startRealtimeSync();
                    return;
                }
                alert("❌ この機能を利用する権限がありません。");
                window.location.href = "../index.html";
            } catch (error) {
                console.error("権限チェックエラー:", error);
                window.location.href = "../index.html";
            }
        } else {
            window.location.href = "../index.html";
        }
    });

    function startRealtimeSync() {
        db.collection("users").doc(currentUser.uid).collection("characters")
          .orderBy("createdAt", "desc")
          .onSnapshot((snapshot) => {
              pcData = [];
              snapshot.forEach((doc) => {
                  pcData.push({ id: doc.id, ...doc.data() });
              });
              updateGenderFilterOptions(); // ★ ここで登録データから性別を自動抽出して更新！
              renderPcList();
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
        if(!display) return;
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

    // ★ 登録されている探索者データ(pcData)から性別を自動抽出して検索プルダウンを生成
    function updateGenderFilterOptions() {
        const filter = document.getElementById('filterGender');
        if (!filter) return;
        const currentVal = filter.value; // 現在の選択を覚えておく

        // pcDataの中から空ではない性別だけを抽出し、重複を消す
        const genders = [...new Set(pcData.map(pc => pc.gender).filter(g => g && g !== ''))];

        // セレクトボックスの中身を作り直す
        filter.innerHTML = '<option value="すべて">性別: すべて</option>';
        genders.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g;
            opt.innerText = g;
            filter.appendChild(opt);
        });

        // 前の選択がまだ選択肢にあれば元に戻す
        if (genders.includes(currentVal)) {
            filter.value = currentVal;
        } else {
            filter.value = 'すべて';
        }
    }

    // --- ★ 自由に追加＆削除できるカスタムプルダウン（登録用） ---
    function setupDynamicSelect(storageKey, defaultList, displayId, hiddenId, optionsId, placeholderText) {
        let currentList = defaultList;
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) currentList = parsed;
            }
        } catch (e) {
            console.warn("Storage error", e);
        }

        const display = document.getElementById(displayId);
        const hidden = document.getElementById(hiddenId);
        const options = document.getElementById(optionsId);
        if(!display) return { reset: () => {} };

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
                    }
                    display.innerText = val;
                    hidden.value = val;
                }
                options.classList.remove('active');
            });
            options.appendChild(addDiv);
        }

        renderOptions();

        return {
            reset: () => { display.innerText = placeholderText; hidden.value = ""; }
        };
    }

    const selectGender = setupDynamicSelect('trpg_custom_genders', ['女', '男', 'その他'], 'pcGenderDisplay', 'pcGenderHidden', 'pcGenderOptions', '性別');
    const selectAge = setupDynamicSelect('trpg_custom_ages', ['10代', '20代', '30代', '不明'], 'pcAgeDisplay', 'pcAgeHidden', 'pcAgeOptions', '年齢');
    const selectRace = setupDynamicSelect('trpg_custom_races', ['人間', '吸血鬼', 'エルフ', '不明'], 'pcRaceDisplay', 'pcRaceHidden', 'pcRaceOptions', '種族');
    const selectJob = setupDynamicSelect('trpg_custom_jobs', ['学生', '警察官', '医者', '探偵', '不明'], 'pcJobDisplay', 'pcJobHidden', 'pcJobOptions', '職業');

    window.addEventListener('click', () => {
        document.querySelectorAll('.select-options.active').forEach(el => el.classList.remove('active'));
    });

    // --- UI制御・リスト描画など ---
    function updateFormTitle() {
        const sysLabel = currentSystemFilter === 'すべて' ? 'CoC 6th' : currentSystemFilter;
        const el = document.getElementById('formTitleLabel');
        if(el) el.innerHTML = `👤 新規探索者の登録 <span style="font-size:12px; color:#999; font-weight:normal;">(${sysLabel}に追加)</span>`;
    }

    function renderSystemTabs() {
        const container = document.getElementById('systemTabs');
        if(!container) return;
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
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', renderPcList);
            el.addEventListener('change', renderPcList);
        }
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

    // ★ 生還・ロスト・継続不可の色付け
    function getStatusBadgeHtml(status) {
        if (!status) return '';
        let color = '#757575';
        let bg = '#f5f5f5';
        if (status === '生還' || status === '生存') {
            color = '#2e7d32'; bg = '#e8f5e9'; status = '生還';
        } else if (status === 'ロスト') {
            color = '#c62828'; bg = '#ffebee';
        } else if (status === '継続不可') {
            color = '#ef6c00'; bg = '#fff3e0';
        }
        return `<span style="display:inline-block; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:bold; color:${color}; background:${bg};">${status}</span>`;
    }

    function renderPcList() {
        if(!pcListContainer) return;
        pcListContainer.innerHTML = '';
        const fGender = document.getElementById('filterGender').value;
        const fStatus = document.getElementById('filterStatus').value;
        const fTags = document.getElementById('filterTags').value.trim().toLowerCase();
        const fScenario = document.getElementById('filterScenario').value.trim().toLowerCase();
        const fName = document.getElementById('filterName').value.trim().toLowerCase();
        const fHO = document.getElementById('filterHO').value.trim().toLowerCase();
        let hitCount = 0;

        if (pcData.length === 0) {
            pcListContainer.innerHTML = '<div class="empty-message-box">登録された探索者はいません</div>';
            document.getElementById('pcHitCount').innerText = "0"; return;
        }

        pcData.forEach((pc) => {
            if (currentSystemFilter !== "すべて" && pc.system !== currentSystemFilter) return;
            if (fGender !== 'すべて' && pc.gender !== fGender) return;
            if (fName !== '' && (!pc.name || !pc.name.toLowerCase().includes(fName))) return;
            if (fTags !== '' && (!pc.tags || !pc.tags.toLowerCase().includes(fTags))) return;

            const latestHistory = (pc.history && pc.history.length > 0) ? pc.history[pc.history.length - 1] : { scenario: '履歴なし', status: '不明', ho: '' };
            let latestStatus = latestHistory.status || '生還';
            if (latestStatus === '生存') latestStatus = '生還';

            if (fStatus !== 'すべて') {
                if (fStatus === '生還' && latestStatus !== '生還' && latestStatus !== '生存') return;
                if (fStatus !== '生還' && latestStatus !== fStatus) return;
            }
            if (fHO !== '' && (!latestHistory.ho || !latestHistory.ho.toLowerCase().includes(fHO))) return;

            if (fScenario !== '') {
                if(!pc.history) return;
                const matchScen = pc.history.some(h => h.scenario && h.scenario.toLowerCase().includes(fScenario));
                if (!matchScen) return;
            }

            hitCount++;
            const item = document.createElement('div');
            item.className = 'list-item';
            let tagsHtml = '';
            if (pc.tags) {
                tagsHtml = `<div style="margin-bottom:8px;">` + pc.tags.split(',').map(t => `<span class="tag-pill">${t.trim()}</span>`).join(' ') + `</div>`;
            }
            const imgStyle = pc.image ? `background-image: url(${pc.image});` : `display:flex; justify-content:center; align-items:center; color:#aaa; font-size:30px;`;

            let histHtml = '';
            if (pc.history && pc.history.length > 0) {
                const recent = pc.history.slice(-2);
                histHtml += `<div style="font-size:11px; color:#777; background:#f8f9fa; padding:8px; border-radius:8px; margin-top:10px;">`;
                histHtml += `<div style="font-weight:bold; margin-bottom:4px;">📚 通過シナリオ (${pc.history.length}件)</div>`;
                recent.forEach(h => {
                    const dText = h.date ? `[${h.date}] ` : '';
                    const hoText = h.ho ? ` - ${h.ho}` : '';
                    histHtml += `<div>・${dText}${h.scenario}${hoText} ${getStatusBadgeHtml(h.status)}</div>`;
                });
                if (pc.history.length > 2) histHtml += `<div style="text-align:right; font-size:10px; margin-top:4px;">...他 ${pc.history.length - 2}件</div>`;
                histHtml += `</div>`;
            }

            item.innerHTML = `
                <div class="item-actions-corner">
                    <button class="corner-btn detail" onclick="openDetail('${pc.id}')">詳細</button>
                    <button class="corner-btn continue" onclick="openContinueModal('${pc.id}')">継続</button>
                    <button class="corner-btn delete" onclick="deletePc('${pc.id}')">削除</button>
                </div>
                <div class="pl-list-layout">
                    <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0; gap:6px; width:80px;">
                        <div class="pl-list-image" style="${imgStyle}">${pc.image ? '' : '👤'}</div>
                        ${getStatusBadgeHtml(latestStatus)}
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
                ${histHtml}
            `;
            pcListContainer.appendChild(item);
        });

        document.getElementById('pcHitCount').innerText = hitCount;
    }

    // --- 継続シナリオの追加 ---
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

        const updatedHistory = [...(pc.history || []), newHist];

        db.collection("users").doc(currentUser.uid).collection("characters").doc(targetPcIdForContinue)
          .set({ history: updatedHistory, updatedAt: Date.now() }, { merge: true })
          .then(() => {
              closeContinueModal();
          });
    };

    // --- 削除処理 ---
    window.deletePc = (id) => {
        if (confirm('この探索者のデータを完全に削除しますか？')) {
            db.collection("users").doc(currentUser.uid).collection("characters").doc(id).delete();
        }
    };

    window.openDetail = (id) => {
        localStorage.setItem('trpg_current_pc_id', id);
        window.location.href = './detail.html';
    };

    // --- 新規登録 ---
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

        db.collection("users").doc(currentUser.uid).collection("characters").add(newPc).then(() => {
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

    // ★ ここが抜けていたため、すべてが動かなくなっていました！！
    renderSystemTabs();
});