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
let pc = {}; // Firebaseから取得したデータを入れる箱
let currentImageBase64 = null;
let historyList = [];

document.addEventListener('DOMContentLoaded', () => {
    // どのPCを編集するか、IDだけはlocalStorageから受け取る
    const targetId = localStorage.getItem('trpg_edit_pc_id');

    if (!targetId) {
        alert("データが見つかりません");
        window.location.href = 'table_pl.html';
        return;
    }

    // ==========================================
    // ★ ログインチェックと金庫からのデータ読み込み
    // ==========================================
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadPcDataFromFirebase();
        } else {
            alert("データの同期にはログインが必要です。トップページに戻ります。");
            window.location.href = '../index.html';
        }
    });

    // 編集画面は、編集中に裏でデータが変わると入力中の文字が消えてしまうので、
    // 「画面を開いた時に1回だけ」金庫からデータを持ってきます！（getを使います）
    function loadPcDataFromFirebase() {
        db.collection("users").doc(currentUser.uid).collection("characters").doc(targetId)
          .get().then((doc) => {
              if (doc.exists) {
                  pc = { id: doc.id, ...doc.data() };
                  currentImageBase64 = pc.image || null;

                  // 履歴データの準備（日付順に並び替え）
                  historyList = [...(pc.history || [])];
                  historyList.sort((a, b) => {
                      const dateA = new Date(a.date).getTime();
                      const dateB = new Date(b.date).getTime();
                      const validA = !isNaN(dateA);
                      const validB = !isNaN(dateB);

                      if (!validA && validB) return -1;
                      if (validA && !validB) return 1;
                      if (!validA && !validB) return 0;
                      return dateA - dateB;
                  });

                  // データの準備ができたら画面を描画する！
                  initFormUI();
              } else {
                  alert("データが見つかりません（削除された可能性があります）");
                  window.location.href = 'table_pl.html';
              }
          }).catch(err => {
              console.error("データ取得エラー:", err);
              alert("データの読み込みに失敗しました。");
          });
    }

    // ==========================================
    // ★ UIの準備と描画（データ取得後に呼ばれます）
    // ==========================================
    function initFormUI() {
        // --- 汎用ドロップダウン設定関数 ---
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
                addDiv.innerText = `➕ 新しい${placeholderText}を追加`;
                addDiv.addEventListener('click', () => {
                    const newVal = prompt(`新しい${placeholderText}を入力してください`);
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
                setValue: (val) => {
                    if (val) {
                        if (!currentList.includes(val)) {
                            currentList.push(val);
                            localStorage.setItem(storageKey, JSON.stringify(currentList));
                            renderOptions();
                        }
                        display.innerText = val;
                        hidden.value = val;
                    }
                }
            };
        }

        // ★ 性別の初期値から「その他」を削除
        const editGender = setupDynamicSelect('trpg_custom_genders', ['女', '男'], 'editPcGenderDisplay', 'editPcGenderHidden', 'editPcGenderOptions', '性別');
        const editRace = setupDynamicSelect('trpg_custom_races', ['人間', '吸血鬼', 'エルフ', '不明'], 'editPcRaceDisplay', 'editPcRaceHidden', 'editPcRaceOptions', '種族');
        const editJob = setupDynamicSelect('trpg_custom_jobs', ['学生', '警察官', '医者', '探偵', '不明'], 'editPcJobDisplay', 'editPcJobHidden', 'editPcJobOptions', '職業');

        window.addEventListener('click', () => { document.querySelectorAll('.select-options').forEach(opt => opt.classList.remove('active')); });

        // --- 値のセット ---
        document.getElementById('editPcName').value = pc.name || '';
        document.getElementById('editPcKana').value = pc.kana || ''; // ★ 読み方セット
        document.getElementById('editPcAgeInput').value = pc.age || ''; // ★ 年齢（直打ち）セット
        document.getElementById('editPcHeightInput').value = pc.height || ''; // ★ 身長セット
        document.getElementById('editPcBirthdayInput').value = pc.birthday || ''; // ★ 誕生日セット

        document.getElementById('editPcTags').value = pc.tags || '';
        document.getElementById('editPcUrl').value = pc.url || '';

        editGender.setValue(pc.gender);
        editRace.setValue(pc.race);
        editJob.setValue(pc.job);

        if (currentImageBase64) {
            document.getElementById('editImagePreview').style.backgroundImage = `url(${currentImageBase64})`;
            document.getElementById('editImagePreviewText').style.display = 'none';
            document.getElementById('editBtnClearImage').style.display = 'block';
        }

        renderHistory();
    }

    // --- 画像処理 ---
    document.getElementById('editImageUploadWrapper').addEventListener('click', () => { document.getElementById('editPcImage').click(); });
    document.getElementById('editPcImage').addEventListener('change', function(e) {
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
                document.getElementById('editImagePreview').style.backgroundImage = `url(${currentImageBase64})`;
                document.getElementById('editImagePreviewText').style.display = 'none';
                document.getElementById('editBtnClearImage').style.display = 'block';
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
    });
    document.getElementById('editBtnClearImage').addEventListener('click', (e) => {
        e.stopPropagation(); currentImageBase64 = null;
        document.getElementById('editImagePreview').style.backgroundImage = 'none';
        document.getElementById('editImagePreviewText').style.display = 'flex';
        document.getElementById('editPcImage').value = '';
        document.getElementById('editBtnClearImage').style.display = 'none';
    });

    // --- 履歴のレンダリング ---
    const historyContainer = document.getElementById('editHistoryContainer');
    function renderHistory() {
        historyContainer.innerHTML = '';
        historyList.forEach((h, index) => {
            const div = document.createElement('div');
            div.className = 'edit-history-item';
            div.innerHTML = `
                <div class="edit-history-header">
                    <span style="font-size:12px; color:#888; font-weight:bold;">シナリオ ${index + 1}</span>
                    <button class="edit-history-delete" onclick="removeHistory(${index})">削除</button>
                </div>
                <input type="text" class="sc-band-input hist-scen" placeholder="シナリオ名" value="${h.scenario || ''}" style="margin-bottom:8px;">
                <div style="display:flex; gap:8px; margin-bottom:8px;">
                    <input type="text" class="sc-band-input hist-ho" placeholder="HO" value="${h.ho || ''}" style="flex:1;">
                    <input type="text" class="sc-band-input hist-date" placeholder="通過完了日" value="${h.date || ''}" style="flex:1;" onfocus="this.type='date'" onblur="if(!this.value)this.type='text'">
                </div>
                <select class="sc-band-select hist-status" style="padding:10px;">
                    <option value="生還" ${h.status === '生還' ? 'selected' : ''}>生還</option>
                    <option value="ロスト" ${h.status === 'ロスト' ? 'selected' : ''}>ロスト</option>
                    <option value="継続不可" ${h.status === '継続不可' ? 'selected' : ''}>継続不可</option>
                </select>
            `;
            historyContainer.appendChild(div);
        });
    }

    window.removeHistory = (index) => {
        if(confirm('この履歴を削除しますか？')) {
            updateHistoryArrayFromDOM();
            historyList.splice(index, 1);
            renderHistory();
        }
    };

    document.getElementById('btnAddHistoryRow').addEventListener('click', () => {
        updateHistoryArrayFromDOM();
        historyList.push({ scenario: '', date: '', ho: '', status: '生還' });
        renderHistory();
    });

    function updateHistoryArrayFromDOM() {
        const items = document.querySelectorAll('.edit-history-item');
        historyList = [];
        items.forEach(item => {
            historyList.push({
                scenario: item.querySelector('.hist-scen').value.trim(),
                date: item.querySelector('.hist-date').value,
                ho: item.querySelector('.hist-ho').value.trim(),
                status: item.querySelector('.hist-status').value
            });
        });
    }

    // ==========================================
    // ★ 4. 保存処理（Firebaseの金庫へ書き込む！）
    // ==========================================
    document.getElementById('btnSaveEdit').addEventListener('click', () => {
        if (!currentUser) return alert("ログインしてください");

        const name = document.getElementById('editPcName').value.trim();
        if (!name) { alert('PC名は必須です'); return; }

        updateHistoryArrayFromDOM();

        // 技能値（いあきゃら）データのパース
        const iacharaText = document.getElementById('editPcIachara').value.trim();
        if (iacharaText) {
            try {
                const dataObj = JSON.parse(iacharaText);
                if (dataObj.data) {
                    let newStats = [];
                    if (dataObj.data.status) dataObj.data.status.forEach(s => newStats.push({ label: s.label, value: s.value }));
                    if (dataObj.data.params) dataObj.data.params.forEach(p => newStats.push({ label: p.label, value: p.value }));
                    if (newStats.length > 0) pc.stats = newStats;
                    if (dataObj.data.commands) pc.skills = dataObj.data.commands;
                }
            } catch(e) {
                pc.skills = iacharaText;
            }
        }

        // データの組み立て
        pc.name = name;
        pc.kana = document.getElementById('editPcKana').value.trim(); // ★ 読み方保存
        pc.gender = document.getElementById('editPcGenderHidden').value;
        pc.height = document.getElementById('editPcHeightInput').value.trim(); // ★ 身長保存
        pc.age = document.getElementById('editPcAgeInput').value.trim(); // ★ 年齢保存
        pc.birthday = document.getElementById('editPcBirthdayInput').value.trim(); // ★ 誕生日保存
        pc.race = document.getElementById('editPcRaceHidden').value;
        pc.job = document.getElementById('editPcJobHidden').value;
        pc.tags = document.getElementById('editPcTags').value.trim();
        pc.url = document.getElementById('editPcUrl').value.trim();
        pc.image = currentImageBase64;
        pc.updatedAt = Date.now();

        // リスト表示用に裏側では「降順(最新が一番上)」に逆転させて保存
        pc.history = historyList.slice().reverse();

        // 金庫へ上書き保存！
        db.collection("users").doc(currentUser.uid).collection("characters").doc(pc.id)
          .set(pc, { merge: true })
          .then(() => {
              // 保存が成功したら詳細画面に戻る
              window.location.href = 'detail.html';
          })
          .catch(err => {
              console.error("保存エラー:", err);
              alert("データの保存に失敗しました。");
          });
    });
});