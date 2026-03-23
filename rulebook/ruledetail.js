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

let userRole = "none";
let currentRuleId = null;
let ruleData = null;

document.addEventListener('DOMContentLoaded', () => {
    // URLからIDを取得 (?id=XXXXXX)
    const urlParams = new URLSearchParams(window.location.search);
    currentRuleId = urlParams.get('id');

    if (!currentRuleId) {
        alert("データが見つかりません。一覧に戻ります。");
        window.location.href = 'rulebook.html';
        return;
    }

    // ログイン＆権限チェック
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userDoc = await db.collection("users").doc(user.uid).get();
                const usedPass = userDoc.exists ? (userDoc.data().usedPassword || "") : "";
                const passDoc = await db.collection("valid_passwords").doc(usedPass).get();
                if (passDoc.exists) userRole = passDoc.data().role || "";

                if (userRole === "admin" || userRole === "friend") {
                    document.getElementById('detail-view').style.display = 'block';
                    if (userRole === "admin") {
                        document.getElementById('admin-action-btns').style.display = 'flex';
                    }
                    loadDetailData();
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

    // データの読み込みと表示
    async function loadDetailData() {
        try {
            const doc = await db.collection("admin_rules").doc(currentRuleId).get();
            if (doc.exists) {
                ruleData = doc.data();
                
                // KP非公開データなのにfriendだった場合は追い返す
                if (ruleData.isSecret && userRole !== "admin") {
                    alert("このデータは非公開です。");
                    window.location.href = 'rulebook.html';
                    return;
                }
                renderDisplayMode();
            } else {
                alert("データが削除されているか、存在しません。");
                window.location.href = 'rulebook.html';
            }
        } catch (e) {
            console.error(e);
        }
    }

    function renderDisplayMode() {
        // バッジ（非公開＋タグ）
        let badgesHtml = '';
        if (ruleData.isSecret) badgesHtml += `<span class="secret-badge">🔒 非公開（KPのみ）</span> `;
        if (ruleData.tags && ruleData.tags.length > 0) {
            badgesHtml += ruleData.tags.map(t => `<span class="rule-tag">#${t}</span>`).join(' ');
        }
        document.getElementById('display-badges').innerHTML = badgesHtml;

        // タイトル
        document.getElementById('display-title').innerText = ruleData.title;

        // 出典
        const sourceDiv = document.getElementById('display-source');
        if (ruleData.book || ruleData.page) {
            sourceDiv.style.display = 'inline-block';
            sourceDiv.innerText = `📖 ${ruleData.book || ''} ${ruleData.page ? '('+ruleData.page+')' : ''}`;
        } else {
            sourceDiv.style.display = 'none';
        }

        // 本文
        document.getElementById('display-content').innerHTML = ruleData.content ? ruleData.content.replace(/\n/g, '<br>') : '';

        // 表
        const tableArea = document.getElementById('display-table-area');
        if (ruleData.table && ruleData.table.length > 0) {
            const trs = ruleData.table.map(row => `<tr><td>${row.col1}</td><td>${row.col2}</td></tr>`).join('');
            tableArea.innerHTML = `<table class="rule-table"><thead><tr><th>ダイス / 条件</th><th>結果 / 内容</th></tr></thead><tbody>${trs}</tbody></table>`;
        } else {
            tableArea.innerHTML = '';
        }
    }

    // ==========================================
    // 修正（編集）モードの制御
    // ==========================================
    const readModeArea = document.getElementById('read-mode-area');
    const editModeArea = document.getElementById('edit-mode-area');
    const tableContainer = document.getElementById('table-rows-container');

    document.getElementById('start-edit-btn').addEventListener('click', () => {
        readModeArea.classList.add('hidden');
        editModeArea.classList.remove('hidden');

        // フォームにデータを流し込む
        document.getElementById('rule-title').value = ruleData.title || "";
        document.getElementById('rule-tags').value = ruleData.tags ? ruleData.tags.join('、') : "";
        document.getElementById('rule-book').value = ruleData.book || "";
        document.getElementById('rule-page').value = ruleData.page || "";
        document.getElementById('rule-content').value = ruleData.content || "";
        document.getElementById('rule-is-secret').checked = ruleData.isSecret || false;

        tableContainer.innerHTML = '';
        if (ruleData.table && ruleData.table.length > 0) {
            ruleData.table.forEach(row => addTableRowUI(row.col1, row.col2));
        }
    });

    document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        editModeArea.classList.add('hidden');
        readModeArea.classList.remove('hidden');
    });

    function addTableRowUI(col1 = "", col2 = "") {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'table-row-input';
        rowDiv.innerHTML = `
            <input type="text" class="form-input table-col-1" placeholder="左の列" value="${col1}" style="flex:1;">
            <input type="text" class="form-input table-col-2" placeholder="右の列" value="${col2}" style="flex:3;">
            <button class="add-row-btn" style="color:#d32f2f; border-color:#d32f2f;" onclick="this.parentElement.remove()">消</button>
        `;
        tableContainer.appendChild(rowDiv);
    }
    document.getElementById('add-table-row-btn').addEventListener('click', () => addTableRowUI());

    // 上書き保存
    document.getElementById('save-btn').addEventListener('click', async () => {
        try {
            const title = document.getElementById('rule-title').value.trim();
            const tagsStr = document.getElementById('rule-tags').value.trim();
            if (!title) return alert('タイトルは必須です！');

            const tagsArray = tagsStr ? tagsStr.split(/[,、，]/).map(t => t.trim()).filter(t => t !== "") : [];
            const tableData = [];
            tableContainer.querySelectorAll('.table-row-input').forEach(row => {
                const col1 = row.querySelector('.table-col-1').value.trim();
                const col2 = row.querySelector('.table-col-2').value.trim();
                if(col1 || col2) tableData.push({ col1, col2 });
            });

            const updatedData = {
                title: title,
                tags: tagsArray,
                book: document.getElementById('rule-book').value.trim(),
                page: document.getElementById('rule-page').value.trim(),
                content: document.getElementById('rule-content').value.trim(),
                table: tableData,
                isSecret: document.getElementById('rule-is-secret').checked,
                updatedAt: Date.now() 
            };

            await db.collection("admin_rules").doc(currentRuleId).update(updatedData);
            alert('✅ 修正を保存しました！');
            
            // 画面を閲覧モードに戻して再読み込み
            editModeArea.classList.add('hidden');
            readModeArea.classList.remove('hidden');
            loadDetailData();

        } catch (e) {
            alert('❌ 保存エラー: ' + e.message);
        }
    });

    // 削除
    document.getElementById('delete-btn').addEventListener('click', async () => {
        if (confirm('このルールを本当に削除しますか？\n※元には戻せません')) {
            try {
                await db.collection("admin_rules").doc(currentRuleId).delete();
                alert('削除しました。一覧に戻ります。');
                window.location.href = 'rulebook.html';
            } catch (e) {
                alert('削除に失敗しました');
            }
        }
    });
});