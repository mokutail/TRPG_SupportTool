
document.addEventListener('DOMContentLoaded', () => {
    const warningData = [
        { category: "【ロスト・死】", items: ["PCの確定ロスト(救済なし)", "NPCの確定ロスト", "PC/NPC の出目によるロスト・死", "PC/NPCの選択によるロスト・死", "倫理的な選択でのロスト", "他PCやNPCだけの出目・選択でのロスト", "死に戻り・ループ", "永久ロスト", "実は死んでいる・実は人外", "余命付与", "自殺の描写・自殺の情報", "PC/NPCが自殺する(志願含む)", "安楽死・尊厳死の強要"] },
        { category: "【いじめ・差別・虐待】", items: ["いじめの情報・描写", "いじめる・いじめられる", "大勢から責められる", "差別の情報・描写(する/される)", "虐待の情報・描写(虐待する/される)", "罵声・罵り合い", "一方的に悪く思われる・恨まれる"] },
        { category: "【身体欠損・加工・グロテスク】", items: ["四肢欠損の情報・描写", "PCが四肢欠損をする・される", "内臓・断面の描写", "遺体修復・火葬の描写", "死体加工・損壊(善意・悪意問わず)", "グロテスク表現(全年齢/R18G)", "嘔吐(負傷/病気/治療/意図的なもの)", "流血・大量出血の描写", "眼球損壊・失明"] },
        { category: "【理不尽・強制】", items: ["神話生物や最強NPCによる理不尽な展開", "抗っても結果が変わらない", "感情・設定・過去の強制指定の可能性", "特定の行動を取らないと進まない", "RPの無茶振り", "PC間の秘密・秘匿(PvPの可能性)"] },
        { category: "【カニバリズム(食人)】", items: ["食人の情報・描写", "PCが食人をする(元々人間/元々怪物)", "PCが人に食べられる", "NPCが食人をする/食べられる"] },
        { category: "【ホラー・恐怖対象】", items: ["集合体・虫・深海・先端・内臓・人形", "実在/創作の怪談・事件・事故・災害", "実在/創作の宗教・神話", "ジャンプスケア(突然の音や画像)"] },
        { category: "【恋愛・関係性】", items: ["恋愛描写・恋愛RP(する/見る/強要)", "特定の性愛傾向(NL/BL/GL/無性愛)", "近親愛(親子/きょうだい)", "人外との恋愛(吸血鬼など人に近いもの)", "人外との恋愛(動物、無機物など)", "スキンシップ(キス-デリケートな接触)", "監禁する・される", "ストーカーする・される"] },
        { category: "【犯罪】", items: ["PCが殺人を犯す(または既に犯している)", "PCが犯罪を犯す(窃盗、不法侵入など)", "未成年の犯罪描写(飲酒喫煙など)", "薬物の情報・使用(合法/違法)", "洗脳・宗教への勧誘", "反社会勢力の描写"] },
        { category: "【世界観・変異】", items: ["夢オチ(出来事が存在する/しない)", "別次元・並行世界・異世界", "電脳世界・SF・ファンタジー設定", "歴史改変", "性転換・異性装-コスプレ", "人外になる・入れ替わり", "記憶喪失・記憶の改竄", "年齢操作(若返り・老化)"] },
        { category: "【暴力・拷問】", items: ["拷問の情報・描写", "PCが拷問を行う・行われる", "子供に対する暴力・殺害(事故含む)", "動物に対する暴力・殺害(事故含む)", "PCが暴行する・される", "痛々しい暴力描写", "性的暴行・レイプの描写・暗示"] },
        { category: "【汚物-その他】", items: ["PvP(口論/戦闘)", "排泄物・汚物の描写", "メタフィクション要素"] }
    ];

    const warnCanvas = document.getElementById('warningCanvas');
    const wCtx = warnCanvas.getContext('2d');
    const warnTitleInput = document.getElementById('warnTitle');
    const warnContainer = document.getElementById('warning-categories-container');

    function init() {
        warnContainer.innerHTML = '';
        warningData.forEach((section, secIdx) => {
            const div = document.createElement('div');
            div.className = 'input-group';
            let html = `<label class="group-label">${section.category}</label><div class="check-list-container">`;
            section.items.forEach((item, itemIdx) => {
                html += `<label class="check-list-label"><input type="checkbox" id="warn_${secIdx}_${itemIdx}">${item}</label>`;
            });
            html += `</div>`;
            div.innerHTML = html;
            warnContainer.appendChild(div);
        });
        document.querySelectorAll('#warning-view input').forEach(input => {
            input.addEventListener('input', drawWarningImage);
            input.addEventListener('change', drawWarningImage);
        });
    }

    function drawWarningImage() {
        warnCanvas.width = 1240;
        warnCanvas.height = 1754;
        const width = warnCanvas.width;
        const height = warnCanvas.height;

        // 背景と枠線
        wCtx.fillStyle = '#ffffff';
        wCtx.fillRect(0, 0, width, height);
        wCtx.fillStyle = '#f8f9fa';
        wCtx.fillRect(30, 30, width - 60, height - 60);
        wCtx.strokeStyle = '#333';
        wCtx.lineWidth = 4;
        wCtx.strokeRect(30, 30, width - 60, height - 60);

        // タイトル
        wCtx.fillStyle = '#333';
        wCtx.textAlign = 'center';
        wCtx.font = 'bold 42px sans-serif';
        wCtx.fillText('TRPG 地雷・注意事項チェックシート', width / 2, 155);
        wCtx.textAlign = 'left';
        wCtx.font = 'bold 28px sans-serif';
        wCtx.fillText(`シナリオ名: ${warnTitleInput.value || '未設定'}`, 60, 215);

        // ★ 修正：左右カラムの分割バランスを最適化する計算
        let sectionHeights = warningData.map(sec => 40 + (sec.items.length * 28) + 42);
        let totalContentHeight = sectionHeights.reduce((a, b) => a + b, 0);
        let halfHeight = totalContentHeight / 2;

        let splitIndex = 1;
        let accumulated = 0;
        for (let i = 0; i < sectionHeights.length; i++) {
            // そのセクションの「半分」が中央線を越えたら、右カラムに回す
            if (accumulated + (sectionHeights[i] / 2) >= halfHeight) {
                splitIndex = i;
                break;
            }
            accumulated += sectionHeights[i];
        }

        // 描画
        let startX = 60;
        let currentY = 260;
        warningData.forEach((section, secIdx) => {
            if (secIdx === splitIndex) {
                startX = (width / 2) + 20;
                currentY = 260;
            }

            wCtx.fillStyle = '#2b6e9c';
            wCtx.font = `bold 32px sans-serif`;
            wCtx.fillText(section.category, startX, currentY);
            currentY += 40;

            section.items.forEach((item, itemIdx) => {
                const isChecked = document.getElementById(`warn_${secIdx}_${itemIdx}`).checked;

                // チェックボックスの四角
                wCtx.strokeStyle = '#555';
                wCtx.lineWidth = 3;
                wCtx.strokeRect(startX, currentY - 21, 24, 24);

                // チェックマーク
                if (isChecked) {
                    wCtx.fillStyle = '#e53935';
                    wCtx.font = `bold 30px sans-serif`;
                    wCtx.fillText('✔', startX + 2, currentY + 2);
                }

                // テキスト
                wCtx.fillStyle = isChecked ? '#111' : '#777';
                wCtx.font = `bold 27px sans-serif`;
                wCtx.fillText(item, startX + 38, currentY);
                currentY += 28;
            });
            currentY += 42;
        });
    }

    function showCustomConfirm(message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('customConfirmModal');
            document.getElementById('confirmMessage').innerText = message;
            modal.style.display = 'flex';
            document.getElementById('btnConfirmOK').onclick = () => { modal.style.display = 'none'; resolve(true); };
            document.getElementById('btnConfirmCancel').onclick = () => { modal.style.display = 'none'; resolve(false); };
        });
    }

    const performReset = () => {
        setTimeout(async () => {
            if (await showCustomConfirm('地雷チェックシートをリセットしますか？')) {
                warnTitleInput.value = "";
                document.querySelectorAll('#warning-categories-container input[type="checkbox"]').forEach(cb => cb.checked = false);
                drawWarningImage();
            }
        }, 150);
    };

    document.getElementById('resetWarningBtn').addEventListener('click', performReset);
    if(document.getElementById('resetWarningBtnTop')) document.getElementById('resetWarningBtnTop').addEventListener('click', performReset);

    // 画像ダウンロード
    document.getElementById('downloadWarningBtn').addEventListener('click', () => {
        setTimeout(() => {
            const dataUrl = warnCanvas.toDataURL('image/png');
            if (window.Android && window.Android.saveImage) {
                window.Android.saveImage(dataUrl);
            } else {
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = "TRPG_Warning.png";
                link.click();
            }
        }, 150);
    });

    init();
    drawWarningImage();
});