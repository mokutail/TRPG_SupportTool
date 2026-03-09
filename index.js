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

// Firebaseの起動
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ログイン状態を管理する変数
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    const authBtn = document.getElementById('authBtn');
    const userInfoArea = document.getElementById('userInfoArea');
    const userNameDisplay = document.getElementById('userNameDisplay');

    // ==========================================
    // ★ ログイン・ログアウトの処理 ＆ メニューの同期
    // ==========================================
    auth.onAuthStateChanged((user) => {
        if (user) {
            // ログイン成功時
            currentUser = user;
            authBtn.innerHTML = '<span class="btn-icon">🚪</span> ログアウト';
            authBtn.style.backgroundColor = "#ffebee";
            authBtn.style.color = "#c62828";

            userInfoArea.style.display = "block";
            userNameDisplay.innerText = user.displayName || "名無し";

            console.log("ログイン成功！ユーザーID:", user.uid);

            // ★ Firebaseからメニューの色や並び順の設定を読み込む（リアルタイム同期）
            startMenuSync();

        } else {
            // ログアウト時
            currentUser = null;
            authBtn.innerHTML = '<span class="btn-icon">👤</span> ログイン';
            authBtn.style.backgroundColor = "#e3f2fd";
            authBtn.style.color = "#0277bd";

            userInfoArea.style.display = "none";
            console.log("ログアウトしました");

            // ログアウト中はローカルのデータで表示する
            renderMenu();
        }
    });

    // ボタンを押した時のアクション
    authBtn.addEventListener('click', () => {
        if (currentUser) {
            if (confirm("ログアウトしますか？")) {
                auth.signOut();
            }
        } else {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider).catch((error) => {
                console.error("ログインエラー:", error);
                alert("ログインに失敗しました。");
            });
        }
    });

    // ==========================================
    // メニュー管理コード
    // ==========================================
    const homeView = document.getElementById('home-view');
    const editToggle = document.getElementById('toggleEditMode');
    const settingsPanel = document.getElementById('settings-panel');
    const colorModal = document.getElementById('colorModal');
    const colorWheel = document.getElementById('colorWheel');
    const modalPreview = document.getElementById('modalPreview');
    const modalHexInput = document.getElementById('modalHexInput');

    const defaultMenu = [
        { id: 'recruit', label: '📢 募集画像シート作成', color: '#607d8b', href: 'recruit/recruit.html' },
        { id: 'warning', label: '⚠️ 地雷チェックシート作成', color: '#607d8b', href: 'warning/warning.html' },
        { id: 'scenario', label: '📚 自作シナリオ管理', color: '#607d8b', href: 'scenario/scenario.html' },
        { id: 'scenario_poss', label: '📚 所持シナリオ管理', color: '#607d8b', href: 'scenario_poss/scenario_poss.html' },
        { id: 'table_want', label: '💭 行きたいシナリオ一覧', color: '#607d8b', href: 'scenario_want/scenario_want.html' },
        { id: 'table_kp', label: '🗓️ 卓管理', color: '#607d8b', href: 'kp/table_kp.html' },
        { id: 'table_pl', label: '🎲 探索者管理', color: '#607d8b', href: 'table/table_pl.html' }
    ];

    // まずは端末に残っている古いデータを読み込んでおく
    let currentMenu = JSON.parse(localStorage.getItem('trpg_menu_config'));

    // ★ ここが修正ポイント！もしデータが空っぽ（長さ0）だったら初期状態に戻して直す！
    if (!currentMenu || currentMenu.length === 0) {
        currentMenu = JSON.parse(JSON.stringify(defaultMenu));
    } else {
        currentMenu = currentMenu.filter(m => m.id !== 'table');
        defaultMenu.forEach(def => {
            if (!currentMenu.find(m => m.id === def.id)) {
                currentMenu.push(JSON.parse(JSON.stringify(def)));
            }
        });
        currentMenu.forEach(item => {
            const def = defaultMenu.find(d => d.id === item.id);
            if (def) {
                item.href = def.href;
                item.label = def.label;
                if (item.isHidden === undefined) item.isHidden = false;
            }
        });
    }

    let isEditMode = false;
    let editingId = null;
    let favorites = JSON.parse(localStorage.getItem('trpg_fav_colors')) || Array(8).fill('#FFFFFF');

    // ★ メニューの同期システム（エラーに強い頑丈バージョン！）
    function startMenuSync() {
        db.collection("users").doc(currentUser.uid).collection("settings").doc("menu_config")
          .onSnapshot((doc) => {
              // doc.data().menu がちゃんと配列として存在するかチェック！
              if (doc.exists && doc.data() && Array.isArray(doc.data().menu) && doc.data().menu.length > 0) {
                  // Firebaseにデータがあれば、それを採用する
                  const firebaseMenu = doc.data().menu;

                  // 足りない項目（アップデートで増えたツールなど）があれば補充する
                  defaultMenu.forEach(def => {
                      if (!firebaseMenu.find(m => m.id === def.id)) {
                          firebaseMenu.push(JSON.parse(JSON.stringify(def)));
                      }
                  });
                  currentMenu = firebaseMenu;
              } else {
                  // まだFirebaseに保存されていなければ、今の設定を保存する
                  saveConfig();
              }
              // 必ずメニューを描画する！
              renderMenu();
              
          }, (error) => {
              // 万が一エラーが起きても止まらせない！
              console.error("メニュー同期エラー:", error);
              renderMenu(); // エラー時もローカルデータでとりあえず表示！
          });
    }

    // ★ 保存システム（ローカルにもFirebaseにも両方保存する）
    const saveConfig = () => {
        localStorage.setItem('trpg_menu_config', JSON.stringify(currentMenu));
        if (currentUser) {
            db.collection("users").doc(currentUser.uid).collection("settings").doc("menu_config")
              .set({ menu: currentMenu }, { merge: true })
              .catch(err => console.error("メニュー設定の保存に失敗:", err));
        }
    };

    function renderMenu() {
        homeView.innerHTML = '';
        currentMenu.forEach((item, index) => {
            if (!isEditMode && item.isHidden) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'menu-item-wrapper';

            if (isEditMode) {
                const visIcon = item.isHidden ? '◻️' : '✅';
                const opacity = item.isHidden ? '0.4' : '1';

                const editHtml = `
                <div class="edit-controls" style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="color-edit-group" style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="openColorPicker('${item.id}')">
                        <div class="color-preview-box" style="background:${item.color}; width:40px; height:40px; border-radius:10px; border:2px solid #ddd;"></div>
                        <span style="font-weight:bold; color:#777; font-size:13px;">${item.color.toUpperCase()}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap: 10px;">
                        <button onclick="toggleVisibility(${index})" style="background:none; border:none; font-size:26px; cursor:pointer; padding:0; margin-right:5px; -webkit-tap-highlight-color: transparent;" title="表示/非表示">${visIcon}</button>
                        <div class="order-btn-group">
                            <button class="order-btn order-up" onclick="moveItem(${index}, -1)"></button>
                            <button class="order-btn order-down" onclick="moveItem(${index}, 1)"></button>
                        </div>
                    </div>
                </div>`;
                wrapper.innerHTML = `<a href="javascript:void(0)" class="menu-btn" style="background-color: ${item.color}; opacity: ${opacity}; cursor: default;">${item.label}</a>${editHtml}`;
            } else {
                wrapper.innerHTML = `<a href="${item.href}" class="menu-btn" style="background-color: ${item.color};">${item.label}</a>`;
            }
            homeView.appendChild(wrapper);
        });
    }

    window.toggleVisibility = (index) => {
        currentMenu[index].isHidden = !currentMenu[index].isHidden;
        saveConfig();
    };

    function showCustomConfirm(message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('customConfirmModal');
            const msgElement = document.getElementById('confirmMessage');
            const btnOK = document.getElementById('btnConfirmOK');
            const btnCancel = document.getElementById('btnConfirmCancel');
            msgElement.innerText = message;
            modal.style.display = 'flex';
            btnOK.onclick = () => { modal.style.display = 'none'; resolve(true); };
            btnCancel.onclick = () => { modal.style.display = 'none'; resolve(false); };
        });
    }

    window.openColorPicker = (id) => {
        editingId = id;
        const item = currentMenu.find(m => m.id === id);
        updateModalUI(item.color);
        renderPalette();
        colorModal.style.display = 'flex';
        drawWheel();
    };

    function drawWheel() {
        const ctx = colorWheel.getContext('2d');
        const r = colorWheel.width / 2;
        ctx.clearRect(0,0,220,220);
        for(let a=0; a<360; a++) {
            const s=(a-2)*Math.PI/180; const e=(a+2)*Math.PI/180;
            ctx.beginPath(); ctx.moveTo(r,r); ctx.arc(r,r,r,s,e);
            const g = ctx.createRadialGradient(r,r,0,r,r,r);
            g.addColorStop(0, '#fff'); g.addColorStop(1, `hsl(${a},100%,50%)`);
            ctx.fillStyle = g; ctx.fill();
        }
    }

    function handleColorPick(e) {
        const rect = colorWheel.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        const x = cx - rect.left; const y = cy - rect.top;
        const ctx = colorWheel.getContext('2d');
        const p = ctx.getImageData(x, y, 1, 1).data;
        if(p[3] === 0) return;
        const hex = "#" + [p[0],p[1],p[2]].map(x => x.toString(16).padStart(2,'0')).join('').toUpperCase();
        updateModalUI(hex);
    }

    function updateModalUI(hex) {
        modalPreview.style.backgroundColor = hex;
        modalHexInput.value = hex;
    }

    colorWheel.addEventListener('mousedown', (e) => {
        handleColorPick(e);
        const move = (ev) => handleColorPick(ev);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', () => window.removeEventListener('mousemove', move), {once:true});
    });

    colorWheel.addEventListener('touchstart', (e) => {
        handleColorPick(e);
        const move = (ev) => handleColorPick(ev);
        window.addEventListener('touchmove', move);
        window.addEventListener('touchend', () => window.removeEventListener('touchmove', move), {once:true});
    }, {passive:false});

    function renderPalette() {
        const grid = document.getElementById('paletteGrid');
        grid.innerHTML = '';
        favorites.forEach((color, i) => {
            const slot = document.createElement('div');
            slot.className = 'palette-slot';
            slot.style.backgroundColor = color;
            slot.onclick = () => updateModalUI(color);
            let t;
            const start = () => t = setTimeout(() => {
                favorites[i] = modalHexInput.value;
                localStorage.setItem('trpg_fav_colors', JSON.stringify(favorites));
                renderPalette();
            }, 800);
            const end = () => clearTimeout(t);
            slot.onmousedown = start; slot.onmouseup = end;
            slot.ontouchstart = start; slot.ontouchend = end;
            grid.appendChild(slot);
        });
    }

    document.getElementById('btnModalApply').onclick = () => {
        const item = currentMenu.find(m => m.id === editingId);
        item.color = modalHexInput.value;
        saveConfig();
        colorModal.style.display = 'none';
    };
    document.getElementById('btnModalCancel').onclick = () => colorModal.style.display = 'none';

    editToggle.addEventListener('click', () => {
        isEditMode = !isEditMode;
        settingsPanel.style.display = isEditMode ? 'block' : 'none';
        editToggle.innerText = isEditMode ? '✅ 完了' : '⚙️ 設定';
        renderMenu();
    });

    window.moveItem = (index, dir) => {
        const next = index + dir;
        if(next >= 0 && next < currentMenu.length) {
            [currentMenu[index], currentMenu[next]] = [currentMenu[next], currentMenu[index]];
            saveConfig();
        }
    };

    window.resetMenuColors = () => {
        setTimeout(async () => {
            const result = await showCustomConfirm('ツールの色を初期状態に戻しますか？');
            if(result) {
                currentMenu.forEach((m) => {
                    const def = defaultMenu.find(d => d.id === m.id);
                    if(def) m.color = def.color;
                });
                saveConfig();
            }
        }, 150);
    };

    window.resetMenuOrder = () => {
        setTimeout(async () => {
            const result = await showCustomConfirm('並び順と表示設定を初期状態に戻しますか？');
            if(result) {
                const orderedMenu = defaultMenu.map(def => {
                    const current = currentMenu.find(c => c.id === def.id);
                    return {
                        ...def,
                        color: current ? current.color : def.color,
                        isHidden: false
                    };
                });
                currentMenu = orderedMenu;
                saveConfig();
            }
        }, 150);
    };

    window.exportData = () => {
        const allData = {};
        let dataCount = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('trpg_')) {
                allData[key] = localStorage.getItem(key);
                dataCount++;
            }
        }

        if (dataCount === 0) {
            alert("バックアップするデータがまだありません。");
            return;
        }

        const jsonStr = JSON.stringify(allData);
        const date = new Date();
        const dateStr = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
        const fileName = `TRPG_Backup_${dateStr}.json`;

        if (window.Android && window.Android.saveBackup) {
            window.Android.saveBackup(jsonStr, fileName);
        } else {
            const blob = new Blob([jsonStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert("バックアップ処理を実行しました！ダウンロードフォルダを確認してください。");
        }
    };

    const importFileInput = document.getElementById('importFile');
    if (importFileInput) {
        importFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    const isOk = await showCustomConfirm("データを復元しますか？\n※現在のデータは上書きされ、元に戻せません。");

                    if (isOk) {
                        for (const key in importedData) {
                            localStorage.setItem(key, importedData[key]);
                        }
                        alert("✅ データの復元が完了しました！アプリを再読み込みします。");
                        location.reload();
                    } else {
                        event.target.value = '';
                    }
                } catch (err) {
                    alert("❌ ファイルの読み込みに失敗しました。\n正しいバックアップファイルを選択してください。");
                    console.error(err);
                    event.target.value = '';
                }
            };
            reader.readAsText(file);
        });
    }
});

