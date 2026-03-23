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

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let allRules = [];
let isEditMode = false;
let userRole = "none";
let activeTagFilter = null; 

document.addEventListener('DOMContentLoaded', () => {
    // ログイン＆権限チェック
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userDoc = await db.collection("users").doc(user.uid).get();
                const usedPass = userDoc.exists ? (userDoc.data().usedPassword || "") : "";
                const passDoc = await db.collection("valid_passwords").doc(usedPass).get();
                if (passDoc.exists) userRole = passDoc.data().role || "";

                if (userRole === "admin" || userRole === "friend") {
                    currentUser = user;
                    document.getElementById('rulebook-view').style.display = 'block';
                    if (userRole === "friend") {
                        const toggleBtn = document.getElementById('toggle-edit-btn');
                        if(toggleBtn) toggleBtn.style.display = 'none';
                    }
                    loadRules();
                } else {
                    alert("⚠️ アクセス権がありません。");
                    window.location.href = '../index.html';
                }
            } catch (error) {
                console.error("権限エラー:", error);
                window.location.href = '../index.html';
            }
        } else {
            alert("ログインが必要です。");
            window.location.href = '../index.html';
        }
    });

    const inputFormArea = document.getElementById('input-form-area');
    const rulesList = document.getElementById('rules-list');
    const toggleBtn = document.getElementById('toggle-edit-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const tableContainer = document.getElementById('table-rows-container');
    const addTableRowBtn = document.getElementById('add-table-row-btn');
    const isSecretCheckbox = document.getElementById('rule-is-secret');

    function addTableRowUI(col1 = "", col2 = "") {
        if (!tableContainer) return;
        const rowDiv = document.createElement('div');
        rowDiv.className = 'table-row-input';
        rowDiv.innerHTML = `
            <input type="text" class="form-input table-col-1" placeholder="左の列 (例: 1-2)" value="${col1}" style="flex:1;">
            <input type="text" class="form-input table-col-2" placeholder="右の列 (例: 健忘症)" value="${col2}" style="flex:3;">
            <button class="add-row-btn" style="color:#d32f2f; border-color:#d32f2f;" onclick="this.parentElement.remove()">消</button>
        `;
        tableContainer.appendChild(rowDiv);
    }

    if(addTableRowBtn) addTableRowBtn.addEventListener('click', () => addTableRowUI());

    if(toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            isEditMode = !isEditMode;
            if (isEditMode) {
                inputFormArea.classList.remove('hidden');
                toggleBtn.classList.add('active');
                toggleBtn.innerHTML = "🔒 登録を終了";
            } else {
                inputFormArea.classList.add('hidden');
                toggleBtn.classList.remove('active');
                toggleBtn.innerHTML = "🔓 新規登録モード";
                resetForm(); 
            }
        });
    }

    function resetForm() {
        document.getElementById('rule-title').value = '';
        document.getElementById('rule-tags').value = '';
        document.getElementById('rule-book').value = '';
        document.getElementById('rule-page').value = '';
        document.getElementById('rule-content').value = '';
        if(isSecretCheckbox) isSecretCheckbox.checked = false;
        if(tableContainer) tableContainer.innerHTML = ''; 
    }

    if(cancelEditBtn) cancelEditBtn.addEventListener('click', resetForm);

    if(saveBtn) {
        saveBtn.addEventListener('click', async () => {
            try {
                const title = document.getElementById('rule-title').value.trim();
                const tagsStr = document.getElementById('rule-tags').value.trim();
                const book = document.getElementById('rule-book').value.trim();
                const page = document.getElementById('rule-page').value.trim();
                const content = document.getElementById('rule-content').value.trim();
                const isSecret = isSecretCheckbox ? isSecretCheckbox.checked : false;

                if (!title || !content) {
                    alert('タイトルと内容は必須です！');
                    return;
                }

                // ★句点「、」や「，」でもタグを区切れるように修正
                const tagsArray = tagsStr ? tagsStr.split(/[,、，]/).map(t => t.trim()).filter(t => t !== "") : [];

                const tableData = [];
                if (tableContainer) {
                    const tableRows = tableContainer.querySelectorAll('.table-row-input');
                    tableRows.forEach(row => {
                        const col1 = row.querySelector('.table-col-1').value.trim();
                        const col2 = row.querySelector('.table-col-2').value.trim();
                        if(col1 || col2) tableData.push({ col1, col2 });
                    });
                }

                const ruleData = {
                    title: title,
                    tags: tagsArray,
                    book: book,
                    page: page,
                    content: content,
                    table: tableData,
                    isSecret: isSecret,
                    createdAt: Date.now(),
                    updatedAt: Date.now() 
                };

                await db.collection("admin_rules").add(ruleData);
                alert('✅ 新しいルールを登録しました！');
                resetForm();

            } catch (e) {
                console.error("保存エラー詳細: ", e);
                alert('❌ エラーが発生しました。\n詳細: ' + e.message);
            }
        });
    }

    function loadRules() {
        rulesList.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">読み込み中...</div>';
        db.collection("admin_rules").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
            allRules = [];
            snapshot.forEach((doc) => {
                allRules.push({ id: doc.id, ...doc.data() });
            });
            displayRules(allRules); 
        });
    }

    function updateFilterUI() {
        const filterContainer = document.getElementById('active-filter-container');
        if (!filterContainer) return;
        
        if (activeTagFilter) {
            filterContainer.innerHTML = `
                <div class="filter-badge">
                    🏷️ #${activeTagFilter} で絞り込み中
                    <span class="filter-clear" onclick="clearTagFilter(event)">✖</span>
                </div>
            `;
        } else {
            filterContainer.innerHTML = '';
        }
    }

    window.displayRules = function(rulesToDisplay) {
        rulesList.innerHTML = '';
        updateFilterUI();
        
        let visibleRules = rulesToDisplay.filter(rule => {
            if (rule.isSecret === true && userRole !== "admin") return false; 
            return true;
        });

        if (activeTagFilter) {
            visibleRules = visibleRules.filter(rule => rule.tags && rule.tags.includes(activeTagFilter));
        }

        if (visibleRules.length === 0) {
            rulesList.innerHTML = '<div class="empty-message-box">データがありません</div>';
            return;
        }

        visibleRules.forEach(rule => {
            const card = document.createElement('div');
            card.className = 'rule-card';
            // ★カード全体をクリックすると、詳細ページに飛ぶ！
            card.style.cursor = "pointer";
            card.onclick = () => { window.location.href = `ruledetail.html?id=${rule.id}`; };

            let secretBadgeHtml = rule.isSecret ? `<span class="secret-badge">🔒 非公開</span>` : '';
            
            let tagsHtml = '';
            if (rule.tags && rule.tags.length > 0) {
                // タグをクリックした時はページ遷移させずに絞り込みを発動する (event.stopPropagation)
                const tagsList = rule.tags.map(t => `<span class="rule-tag" onclick="filterByTag('${t}', event)">#${t}</span>`).join('');
                tagsHtml = `<div class="tag-container">${secretBadgeHtml}${tagsList}</div>`;
            } else if (rule.isSecret) {
                tagsHtml = `<div class="tag-container">${secretBadgeHtml}</div>`;
            }

            // 本文は最初の50文字だけ見せる（プレビュー）
            const summary = rule.content.length > 50 ? rule.content.substring(0, 50) + '...' : rule.content;

            card.innerHTML = `
                ${tagsHtml}
                <div class="rule-title" style="margin-top: 5px;">${rule.title}</div>
                <div class="rule-content" style="color: #666; font-size: 13px;">${summary}</div>
            `;
            rulesList.appendChild(card);
        });
    };

    window.filterByTag = (tag, event) => {
        if (event) event.stopPropagation(); // ページジャンプを防ぐ
        activeTagFilter = tag;
        displayRules(allRules);
    };

    window.clearTagFilter = (event) => {
        if (event) event.stopPropagation();
        activeTagFilter = null;
        displayRules(allRules);
    };

    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase();
            const filteredRules = allRules.filter(rule => {
                const searchStr = `${rule.title} ${rule.content} ${rule.tags ? rule.tags.join(' ') : ''} ${rule.book || ''}`.toLowerCase();
                return searchStr.includes(keyword);
            });
            displayRules(filteredRules);
        });
    }
});