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

const systems = ["CoC 6th", "CoC 7th", "エモクロア"];

document.addEventListener('DOMContentLoaded', () => {
    const pcListContainer = document.getElementById('pcListContainer');

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userDoc = await db.collection("users").doc(user.uid).get();
                const userData = userDoc.exists ? userDoc.data() : {};

                if (userData.hasValidOrder === true) {
                    const usedPass = userData.usedPassword || "";
                    const verifiedAt = userData.verifiedAt ? userData.verifiedAt.toDate() : new Date();
                    const now = new Date();
                    const limitTime = 30 * 24 * 60 * 60 * 1000;

                    if (usedPass === "admin2003" || usedPass.includes("admin") || usedPass.includes("pro") || usedPass.includes("tail_pro")) {
                        currentUser = user;
                        startRealtimeSync();
                        return;
                    }

                    if (now - verifiedAt < limitTime) {
                        currentUser = user;
                        startRealtimeSync();
                        return;
                    } else {
                        alert("⌛ お試し期間(30日)が終了しました。プロ版の合言葉を入力してください。");
                        window.location.href = "../index.html";
                        return;
                    }
                }

                alert("❌ この機能を利用するには合言葉の認証が必要です。");
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
              updateGenderFilterOptions();
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

    // ==========================================
    // ★ プルダウン設定関数
    // ==========================================

    function setupFixedSelect(displayId, optionsId, hiddenId, onChange = null) {
        const display = document.getElementById(displayId);
        const options = document.getElementById(optionsId);
        const hidden = document.getElementById(hiddenId);
        if (!display || !options || !hidden) return;

        display.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.select-options').forEach(opt => {
                if(opt !== options) opt.classList.remove('active');
            });
            options.classList.toggle('active');
        });

        options.addEventListener('click', (e) => {
            if (e.target.classList.contains('option-item')) {
                const val = e.target.getAttribute('data-value');
                if (val !== null) {
                    display.innerText = e.target.innerText;
                    hidden.value = val;
                }
                options.classList.remove('active');
                if (onChange) onChange();
            }
        });
    }

    function setupDynamicSelect(storageKey, defaultList, displayId, hiddenId, optionsId, placeholderText, onUpdate = null) {
        let currentList = defaultList;
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) currentList = parsed;
            }
        } catch (e) {}

        const display = document.getElementById(displayId);
        const hidden = document.getElementById(hiddenId);
        const options = document.getElementById(optionsId);

        if (!display || !hidden || !options) return { reset: () => {} };

        display.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.select-options').forEach(opt => {
                if(opt !== options) opt.classList.remove('active');
            });
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
                                if(onUpdate) onUpdate();
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
            addDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                const newVal = prompt(`${placeholderText}を入力してください`);
                options.classList.remove('active');

                if (newVal && newVal.trim() !== '') {
                    const val = newVal.trim();
                    if (!currentList.includes(val)) {
                        currentList.push(val);
                        localStorage.setItem(storageKey, JSON.stringify(currentList));
                        renderOptions();
                        if(onUpdate) onUpdate();
                    }
                    display.innerText = val;
                    hidden.value = val;
                }
            });
            options.appendChild(addDiv);
        }

        renderOptions();

        return {
            reset: () => { display.innerText = placeholderText; hidden.value = ""; }
        };
    }

    function updateGenderFilterOptions() {
        const filter = document.getElementById('filterGender');
        if (!filter) return;
        const currentVal = filter.value;

        const dataGenders = pcData.map(pc => pc.gender).filter(g => g && g !== '');

        let customGenders = [];
        try {
            const stored = localStorage.getItem('trpg_custom_genders');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) customGenders = parsed;
            }
        } catch (e) {}

        const defaultGenders = ['女', '男'];
        const genders = [...new Set([...defaultGenders, ...customGenders, ...dataGenders])];

        filter.innerHTML = '<option value="すべて">性別: すべて</option>';
        genders.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g;
            // ★ 「女」「男」のようにシンプルに表示する
            opt.innerText = g;
            filter.appendChild(opt);
        });

        if (genders.includes(currentVal)) {
            filter.value = currentVal;
        } else {
            filter.value = 'すべて';
        }
    }

    setupFixedSelect('histStatusDisplay', 'histStatusOptions', 'histStatusHidden');
    setupFixedSelect('contStatusDisplay', 'contStatusOptions', 'contStatusHidden');

    const fGen = document.getElementById('filterGender');
    if(fGen) fGen.addEventListener('change', renderPcList);
    const fStat = document.getElementById('filterStatus');
    if(fStat) fStat.addEventListener('change', renderPcList);

    const sSel = document.getElementById('sortSelect');
    if(sSel) sSel.addEventListener('change', renderPcList);

    // ★ 昇順・降順 切り替えボタンの処理
    const sOrderBtn = document.getElementById('sortOrderBtn');
    if (sOrderBtn) {
        sOrderBtn.addEventListener('click', () => {
            const currentOrder = sOrderBtn.getAttribute('data-order');
            if (currentOrder === 'desc') {
                sOrderBtn.setAttribute('data-order', 'asc');
                sOrderBtn.innerText = '🔼 昇順';
            } else {
                sOrderBtn.setAttribute('data-order', 'desc');
                sOrderBtn.innerText = '🔽 降順';
            }
            renderPcList(); // リストを再描画
        });
    }

    const selectGender = setupDynamicSelect('trpg_custom_genders', ['女', '男'], 'pcGenderDisplay', 'pcGenderHidden', 'pcGenderOptions', '性別', updateGenderFilterOptions);
    const selectRace = setupDynamicSelect('trpg_custom_races', ['人間', '吸血鬼', 'エルフ', '不明'], 'pcRaceDisplay', 'pcRaceHidden', 'pcRaceOptions', '種族');
    const selectJob = setupDynamicSelect('trpg_custom_jobs', ['学生', '警察官', '医者', '探偵', '不明'], 'pcJobDisplay', 'pcJobHidden', 'pcJobOptions', '職業');

    window.addEventListener('click', () => {
        document.querySelectorAll('.select-options.active').forEach(el => el.classList.remove('active'));
    });

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

    ['filterTags', 'filterScenario', 'filterName', 'filterHO', 'filterAge'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', renderPcList);
    });

    document.getElementById('btnResetFilter').addEventListener('click', () => {
        document.getElementById('filterName').value = '';
        document.getElementById('filterScenario').value = '';
        document.getElementById('filterHO').value = '';
        document.getElementById('filterTags').value = '';
        if(document.getElementById('filterAge')) document.getElementById('filterAge').value = '';

        document.getElementById('filterGender').value = 'すべて';
        document.getElementById('filterStatus').value = 'すべて';

        if(document.getElementById('sortSelect')) document.getElementById('sortSelect').value = 'default';
        if(document.getElementById('sortOrderBtn')) {
            document.getElementById('sortOrderBtn').setAttribute('data-order', 'desc');
            document.getElementById('sortOrderBtn').innerText = '🔽 降順';
        }

        renderPcList();
    });

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
        return `<span style="display:inline-block; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:bold; color:${color}; background:${bg}; margin-bottom:4px;">${status}</span>`;
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
        const fAge = document.getElementById('filterAge') ? document.getElementById('filterAge').value.trim() : '';

        const sortVal = document.getElementById('sortSelect') ? document.getElementById('sortSelect').value : 'default';
        const sortOrder = document.getElementById('sortOrderBtn') ? document.getElementById('sortOrderBtn').getAttribute('data-order') : 'desc';

        if (pcData.length === 0) {
            pcListContainer.innerHTML = '<div class="empty-message-box">登録された探索者はいません</div>';
            document.getElementById('pcHitCount').innerText = "0"; return;
        }

        let filteredPcs = [];

        pcData.forEach((pc) => {
            if (currentSystemFilter !== "すべて" && pc.system !== currentSystemFilter) return;

            if (fGender !== 'すべて' && pc.gender !== fGender) return;
            if (fName !== '' && (!pc.name || !pc.name.toLowerCase().includes(fName))) return;
            if (fTags !== '' && (!pc.tags || !pc.tags.toLowerCase().includes(fTags))) return;

            if (fAge !== '') {
                const pcAgeStr = (pc.age || '').toString().toLowerCase();

                if (fAge.includes('代')) {
                    const targetDecade = parseInt(fAge.replace(/[^0-9]/g, ''));
                    const pcAgeNum = parseInt(pcAgeStr.replace(/[^0-9]/g, ''));
                    if (isNaN(pcAgeNum) || pcAgeNum < targetDecade || pcAgeNum >= targetDecade + 10) {
                        return;
                    }
                } else {
                    if (!pcAgeStr.includes(fAge.toLowerCase())) {
                        const cleanAge = pcAgeStr.replace(/[^0-9]/g, '');
                        const searchAge = fAge.replace(/[^0-9]/g, '');
                        if (cleanAge !== searchAge || searchAge === '') {
                            return;
                        }
                    }
                }
            }

            const latestHistory = (pc.history && pc.history.length > 0) ? pc.history[pc.history.length - 1] : { scenario: '履歴なし', status: '不明', ho: '' };
            let latestStatus = latestHistory.status || '生還';
            if (latestStatus === '生存') latestStatus = '生還';

            let filterStatusVal = fStatus;
            if (filterStatusVal !== 'すべて' && filterStatusVal.startsWith('状態: ')) {
                filterStatusVal = filterStatusVal.replace('状態: ', '').trim();
            }
            if (filterStatusVal !== 'すべて') {
                if (filterStatusVal === '生還' && latestStatus !== '生還' && latestStatus !== '生存') return;
                if (filterStatusVal !== '生還' && latestStatus !== filterStatusVal) return;
            }

            if (fHO !== '' && (!latestHistory.ho || !latestHistory.ho.toLowerCase().includes(fHO))) return;

            if (fScenario !== '') {
                if(!pc.history) return;
                const matchScen = pc.history.some(h => h.scenario && h.scenario.toLowerCase().includes(fScenario));
                if (!matchScen) return;
            }

            filteredPcs.push({
                pc: pc,
                latestStatus: latestStatus,
                latestHistory: latestHistory
            });
        });

        // ★ 並べ替え処理（昇順・降順対応）
        filteredPcs.sort((a, b) => {
            let result = 0;

            if (sortVal === 'age') {
                const numA = parseInt((a.pc.age || '').replace(/[^0-9]/g, '')) || 0;
                const numB = parseInt((b.pc.age || '').replace(/[^0-9]/g, '')) || 0;
                result = numA - numB;
            } else if (sortVal === 'height') {
                const numA = parseFloat((a.pc.height || '').replace(/[^0-9.]/g, '')) || 0;
                const numB = parseFloat((b.pc.height || '').replace(/[^0-9.]/g, '')) || 0;
                result = numA - numB;
            } else if (sortVal === 'birthday') {
                const parseDate = (str) => {
                    if (!str) return 9999;
                    const match = str.match(/(\d+)[^\d]+(\d+)/);
                    if (match) return parseInt(match[1]) * 100 + parseInt(match[2]);
                    return 9999;
                };
                result = parseDate(a.pc.birthday) - parseDate(b.pc.birthday);
            } else if (sortVal === 'kana') {
                const strA = a.pc.kana || a.pc.name || '';
                const strB = b.pc.kana || b.pc.name || '';
                result = strA.localeCompare(strB, 'ja');
            } else {
                // デフォルト（登録順）の場合は createdAt で判定
                const timeA = a.pc.createdAt || 0;
                const timeB = b.pc.createdAt || 0;
                result = timeA - timeB;
            }

            // 降順(desc)なら結果を反転させる
            return sortOrder === 'desc' ? -result : result;
        });

        if (filteredPcs.length === 0) {
            pcListContainer.innerHTML = '<div class="empty-message-box">条件に一致する探索者はいません</div>';
            document.getElementById('pcHitCount').innerText = "0"; return;
        }

        let hitCount = 0;

        filteredPcs.forEach((itemObj) => {
            hitCount++;
            const pc = itemObj.pc;
            const latestStatus = itemObj.latestStatus;
            const latestHistory = itemObj.latestHistory;

            const item = document.createElement('div');
            item.className = 'list-item';

            const safeImage = pc.image ? `background-image: url(${pc.image});` : `display:flex; justify-content:center; align-items:center; color:#aaa; font-size:30px;`;
            const safeName = pc.name || '名無し';
            const safeSystem = pc.system || '';
            const safeScenario = latestHistory.scenario || '履歴なし';
            const historyCount = pc.history ? pc.history.length : 0;

            item.innerHTML = `
                <div class="item-actions-corner" style="position: absolute; top: 12px; right: 12px; display: flex; gap: 6px; z-index: 10;">
                    <button class="corner-btn detail" onclick="openDetail('${pc.id}')" style="background: #e8f5e9; color: #2e7d32; border: none; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: pointer;">詳細</button>
                    <button class="corner-btn continue" onclick="openContinueModal('${pc.id}')" style="background: #e3f2fd; color: #0277bd; border: none; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: pointer;">継続</button>
                    <button class="corner-btn delete" onclick="deletePc('${pc.id}')" style="background: #ffebee; color: #d32f2f; border: none; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: pointer;">削除</button>
                </div>

                <div class="pl-list-layout" style="display: flex; gap: 15px; align-items: flex-start;">
                    <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0; width:85px;">
                        <div class="pl-list-image" style="width: 80px; height: 80px; border-radius: 12px; background-color: #f0f0f0; background-size: cover; background-position: center; border: 1px solid #eee; margin-bottom: 8px; ${safeImage}">${pc.image ? '' : '👤'}</div>
                        ${getStatusBadgeHtml(latestStatus)}
                        <span style="font-size:11px; color:#999; font-weight:bold; text-align:center;">${safeSystem}</span>
                    </div>

                    <div class="pl-list-content" style="flex: 1; min-width: 0; margin-top: 38px;">
                        <div class="item-title" style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 8px; line-height: 1.3; word-break: break-all;">${safeName}</div>
                        <div class="item-subtitle" style="font-size: 13px; font-weight: bold; color: #666; margin-bottom: 6px;">最新: ${safeScenario}</div>
                        <div class="item-details" style="font-size: 13px; color: #777; font-weight: bold;">通過数: ${historyCount} シナリオ</div>
                    </div>
                </div>
            `;
            pcListContainer.appendChild(item);
        });

        document.getElementById('pcHitCount').innerText = hitCount;
    }

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

    window.deletePc = (id) => {
        if (confirm('この探索者のデータを完全に削除しますか？')) {
            db.collection("users").doc(currentUser.uid).collection("characters").doc(id).delete();
        }
    };

    window.openDetail = (id) => {
        localStorage.setItem('trpg_current_pc_id', id);
        window.location.href = './detail.html';
    };

    document.getElementById('btnAddPc').addEventListener('click', () => {
        if (!currentUser) return alert("ログインしてください");

        const name = document.getElementById('pcName').value.trim();
        const kana = document.getElementById('pcKana') ? document.getElementById('pcKana').value.trim() : '';
        const gender = document.getElementById('pcGenderHidden').value;
        const height = document.getElementById('pcHeightInput') ? document.getElementById('pcHeightInput').value.trim() : '';
        const ageEl = document.getElementById('pcAgeInput');
        const age = ageEl ? ageEl.value.trim() : '';
        const birthday = document.getElementById('pcBirthdayInput') ? document.getElementById('pcBirthdayInput').value.trim() : '';
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
            system, name, kana, gender, height, age, birthday, race, job, tags, url, image: currentImageBase64,
            stats: parsedStats, skills: parsedSkills,
            history: [{ scenario: hScen, ho: hHO, date: hDate, status: hStatus }],
            createdAt: now,
            updatedAt: now
        };

        db.collection("users").doc(currentUser.uid).collection("characters").add(newPc).then(() => {
            document.getElementById('pcName').value = '';
            if(document.getElementById('pcKana')) document.getElementById('pcKana').value = '';
            if(document.getElementById('pcAgeInput')) document.getElementById('pcAgeInput').value = '';
            if(document.getElementById('pcHeightInput')) document.getElementById('pcHeightInput').value = '';
            if(document.getElementById('pcBirthdayInput')) document.getElementById('pcBirthdayInput').value = '';
            document.getElementById('pcTags').value = '';
            document.getElementById('pcUrl').value = '';
            document.getElementById('pcIachara').value = '';
            document.getElementById('histScenario').value = '';
            document.getElementById('histHO').value = '';
            const histDate = document.getElementById('histDate');
            histDate.value = ''; histDate.type = 'text';

            selectGender.reset(); selectRace.reset(); selectJob.reset();
            document.getElementById('btnClearImage').click();
        });
    });

    renderSystemTabs();
});