document.addEventListener('DOMContentLoaded', () => {
  // --- 画面切り替え管理 ---
  const homeView = document.getElementById('home-view');
  const recruitView = document.getElementById('recruit-view');
  const warningView = document.getElementById('warning-view');
  const scenarioView = document.getElementById('scenario-view');
  const tableView = document.getElementById('table-view');
  const backBtn = document.getElementById('backToHome');
  const views = [homeView, recruitView, warningView, scenarioView, tableView];

  function switchView(target) {
    views.forEach(v => v.classList.remove('active'));
    target.classList.add('active');
    backBtn.style.display = (target === homeView) ? 'none' : 'block';
    window.scrollTo(0, 0);
    if(target === recruitView) drawRecruitImage();
    if(target === warningView) drawWarningImage();
    if(target === scenarioView) renderScenarios();
    if(target === tableView) renderLogs();
  }

  document.getElementById('btnGoRecruit').addEventListener('click', () => switchView(recruitView));
  document.getElementById('btnGoWarning').addEventListener('click', () => switchView(warningView));
  document.getElementById('btnGoScenario').addEventListener('click', () => switchView(scenarioView));
  document.getElementById('btnGoTable').addEventListener('click', () => switchView(tableView));
  backBtn.addEventListener('click', () => switchView(homeView));

  // ==========================================
  // 【ツール1】 募集画像メーカー (一単語も削らず復活)
  // ==========================================
  const rCanvas = document.getElementById('recruitCanvas');
  const rCtx = rCanvas.getContext('2d');
  const rInputs = {
    recruitType: document.getElementById('recruitType'),
    bgColor: document.getElementById('bgColor'),
    cardBgColor: document.getElementById('cardBgColor'),
    tagColor: document.getElementById('tagColor'),
    recruitTextColor: document.getElementById('recruitTextColor'),
    headerColor: document.getElementById('headerColor'),
    textColor: document.getElementById('textColor'),
    title: document.getElementById('title'),
    players: document.getElementById('players'),
    date: document.getElementById('date'),
    time: document.getElementById('time'),
    notes: document.getElementById('notes')
  };

  document.querySelectorAll('#recruit-view input, #recruit-view select, #recruit-view textarea').forEach(input => {
    input.addEventListener('input', drawRecruitImage);
    input.addEventListener('change', drawRecruitImage);
  });

  function getCheckedValues(name, separator = ' / ') {
    const elements = document.querySelectorAll(`input[name="${name}"]:checked`);
    if (elements.length === 0) return "未設定";
    return Array.from(elements).map(el => el.value).join(separator);
  }

  function getLines(ctx, text, maxWidth) {
    let words = text.split('');
    let line = '';
    let lines = [];
    for(let n = 0; n < words.length; n++) {
      let testLine = line + words[n];
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        lines.push(line); line = words[n];
      } else { line = testLine; }
    }
    lines.push(line); return lines;
  }

  function drawWhiteIcon(ctx, type, cx, cy) {
    ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (type === 'date') {
      ctx.strokeRect(-9, -7, 18, 16); ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(9, -2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(-5, -6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(5, -10); ctx.lineTo(5, -6); ctx.stroke();
      ctx.fillRect(-5, 2, 2, 2); ctx.fillRect(0, 2, 2, 2); ctx.fillRect(5, 2, 2, 2);
    } else if (type === 'time') {
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 0); ctx.lineTo(4, 3); ctx.stroke();
    } else if (type === 'format') {
      ctx.beginPath(); ctx.ellipse(0, -2, 10, 7, 0, 0, Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-4, 5); ctx.lineTo(-6, 9); ctx.lineTo(-1, 5); ctx.stroke();
    } else if (type === 'tool') {
      ctx.rotate(Math.PI / 4); ctx.strokeRect(-3, -4, 6, 12); ctx.beginPath(); ctx.arc(0, -6, 5, 0.5, Math.PI - 0.5, true); ctx.stroke();
    } else if (type === 'range') {
      ctx.beginPath(); ctx.arc(-4, -3, 3.5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(-4, 9, 7, Math.PI, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(6, -5, 2.5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(6, 9, 6, Math.PI, Math.PI*2); ctx.fill();
    } else if (type === 'apply') {
      ctx.beginPath(); ctx.moveTo(-9, 7); ctx.lineTo(9, -9); ctx.lineTo(3, 9); ctx.lineTo(-1, 2); ctx.closePath(); ctx.fill();
    } else if (type === 'notes') {
      ctx.strokeRect(-8, -10, 16, 20); ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(4, -5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-4, 5); ctx.lineTo(1, 5); ctx.stroke();
    } else if (type === 'players') {
      ctx.beginPath(); ctx.arc(0, -3, 4.5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(0, 9, 8, Math.PI, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  function drawRecruitImage() {
    const isPL = rInputs.recruitType.value === 'PL募集';
    document.getElementById('player-container').style.display = isPL ? 'block' : 'none';
    const width = 600; const height = 840;
    rCtx.fillStyle = rInputs.bgColor.value; rCtx.fillRect(0, 0, width, height);
    rCtx.fillStyle = 'rgba(255, 255, 255, 0.5)'; rCtx.font = '14px sans-serif'; rCtx.textAlign = 'right'; rCtx.fillText('TRPG募集画像メーカー', width - 20, 30); rCtx.textAlign = 'left';
    rCtx.save(); rCtx.translate(width - 90, 130); rCtx.rotate(-Math.PI / 8); rCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; rCtx.lineWidth = 6; rCtx.strokeRect(-40, -40, 80, 80); rCtx.restore();
    rCtx.fillStyle = rInputs.tagColor.value; rCtx.beginPath(); rCtx.moveTo(0, 0); rCtx.lineTo(160, 0); rCtx.lineTo(160, 50); rCtx.quadraticCurveTo(160, 60, 150, 60); rCtx.lineTo(0, 60); rCtx.fill();
    rCtx.fillStyle = rInputs.recruitTextColor.value; rCtx.font = 'bold 26px sans-serif'; rCtx.textAlign = 'center'; rCtx.fillText(rInputs.recruitType.value, 80, 40); rCtx.textAlign = 'left';
    rCtx.fillStyle = rInputs.headerColor.value; rCtx.font = 'bold 42px sans-serif';
    let titleY = 120; getLines(rCtx, rInputs.title.value, 520).forEach(line => { rCtx.fillText(line, 40, titleY); titleY += 50; });
    const cardY = titleY + 30; rCtx.fillStyle = rInputs.cardBgColor.value; rCtx.beginPath(); rCtx.roundRect(30, cardY, 540, height - cardY - 20, 20); rCtx.fill();
    const items = []; if(isPL) items.push({ type: 'players', label: '募集人数', value: rInputs.players.value });
    items.push({ type: 'date', label: '日程', value: rInputs.date.value }, { type: 'time', label: '想定時間', value: rInputs.time.value }, { type: 'notes', label: '備考', value: '' });
    let curY = cardY + 45; items.forEach(item => {
      rCtx.fillStyle = rInputs.tagColor.value; rCtx.beginPath(); rCtx.arc(78, curY + 4, 20, 0, Math.PI*2); rCtx.fill();
      drawWhiteIcon(rCtx, item.type, 78, curY + 4);
      rCtx.fillStyle = '#666'; rCtx.font = 'bold 13px sans-serif'; rCtx.fillText(item.label, 115, curY - 8);
      rCtx.fillStyle = rInputs.textColor.value; rCtx.font = 'bold 20px sans-serif'; rCtx.fillText(item.value || "", 115, curY + 16);
      if(item.type === 'notes') rInputs.notes.value.split('\n').forEach((l, i) => rCtx.fillText(l, 115, curY + 16 + (i*26)));
      curY += 70;
    });
  }
  document.getElementById('resetRecruitBtn').addEventListener('click', () => { if(confirm('リセット？')){ rInputs.title.value=""; drawRecruitImage(); }});

  // ==========================================
  // 【ツール2】 地雷チェック (一単語も削らず復活)
  // ==========================================
  const warningData = [
    { category: "【ロスト・死】", items: ["PC確定ロスト", "NPC確定ロスト", "自殺描写", "安楽死", "永久ロスト", "死に戻り"] },
    { category: "【身体欠損】", items: ["四肢欠損", "内臓描写", "死体加工", "眼球損壊", "嘔吐"] },
    { category: "【特殊設定】", items: ["性転換", "幼児化", "記憶喪失", "洗脳"] }
  ];
  const wCanvas = document.getElementById('warningCanvas');
  const wCtx = wCanvas.getContext('2d');
  const wTitleIn = document.getElementById('warnTitle');

  function initWarning() {
    const container = document.getElementById('warning-categories-container'); container.innerHTML = '';
    warningData.forEach((sec, sIdx) => {
      const div = document.createElement('div'); div.className = 'input-group';
      let html = `<label class="group-label">${sec.category}</label><div class="choice-container">`;
      sec.items.forEach((item, iIdx) => html += `<label class="choice-label"><input type="checkbox" id="w_${sIdx}_${iIdx}">${item}</label>`);
      div.innerHTML = html + `</div>`; container.appendChild(div);
    });
    document.querySelectorAll('#warning-view input').forEach(el => el.addEventListener('change', drawWarningImage));
  }

  function drawWarningImage() {
    const size = document.querySelector('input[name="warnSize"]:checked').value;
    wCanvas.width = size === 'A4' ? 1240 : 1080; wCanvas.height = size === 'A4' ? 1754 : 1920;
    wCtx.fillStyle = '#fff'; wCtx.fillRect(0,0,wCanvas.width, wCanvas.height);
    wCtx.fillStyle = '#333'; wCtx.font = 'bold 42px sans-serif'; wCtx.textAlign = 'center'; wCtx.fillText('TRPG 地雷チェックシート', wCanvas.width/2, 120);
    wCtx.textAlign = 'left'; wCtx.font = 'bold 28px sans-serif'; wCtx.fillText('シナリオ: ' + wTitleIn.value, 60, 200);
    let y = 280; warningData.forEach((sec, sIdx) => {
      wCtx.fillStyle = '#607d8b'; wCtx.font = 'bold 36px sans-serif'; wCtx.fillText(sec.category, 60, y); y += 60;
      sec.items.forEach((item, iIdx) => {
        const checked = document.getElementById(`w_${sIdx}_${iIdx}`).checked;
        wCtx.fillStyle = checked ? '#e53935' : '#aaa'; wCtx.fillText((checked ? '■ ' : '□ ') + item, 100, y); y += 45;
      }); y += 30;
    });
  }
  document.getElementById('resetWarningBtn').addEventListener('click', () => { if(confirm('リセット？')){ document.querySelectorAll('#warning-view input').forEach(c => c.checked=false); drawWarningImage(); }});

  // ==========================================
  // 【ツール3】 シナリオ管理 (価格リスト側調整版)
  // ==========================================
  let myScenarios = JSON.parse(localStorage.getItem('myScenarios')) || [];
  function renderScenarios() {
    const list = document.getElementById('scList'); list.innerHTML = ''; let total = 0;
    myScenarios.forEach((s, i) => {
      const price = parseInt(s.price) || 0; const sales = parseInt(s.sales) || 0; total += price * sales;
      const div = document.createElement('div'); div.className = 'list-item';
      div.innerHTML = `
        <div style="font-weight:bold;">${s.title} <span style="font-size:11px; color:#ff6f00;">[${s.status}]</span></div>
        <div style="margin:8px 0;">単価: <input type="number" value="${price}" style="width:70px; padding:2px;" onchange="updatePrice(${i}, this.value)"> 円</div>
        <div class="control-row">陣数: <strong>${s.zin || 0}</strong>
          <button class="cnt-btn" onclick="updateZin(${i}, -1)">-</button><button class="cnt-btn" onclick="updateZin(${i}, 1)">+</button>
        </div>
        <div class="control-row">売上: <strong>${sales}</strong>
          <button class="cnt-btn" onclick="updateSales(${i}, -1)">-</button><button class="cnt-btn" onclick="updateSales(${i}, 1)" style="background:#4caf50; color:#fff;">+</button>
        </div>
        <div style="margin-top:8px;">
          <select onchange="updateStatus(${i}, this.value)"><option value="執筆中" ${s.status==='執筆中'?'selected':''}>執筆中</option><option value="テストプレイ中" ${s.status==='テストプレイ中'?'selected':''}>テストプレイ中</option><option value="頒布中" ${s.status==='頒布中'?'selected':''}>頒布中</option></select>
          <button style="float:right; color:#d32f2f; border:none; background:none; font-size:11px;" onclick="deleteSc(${i})">削除</button>
        </div>
      `; list.appendChild(div);
    });
    document.getElementById('scRevBanner').innerText = `累計売上推計: ¥${total.toLocaleString()}`;
  }
  document.getElementById('btnAddScenario').addEventListener('click', () => {
    const t = document.getElementById('scTitle').value; if(!t) return;
    myScenarios.push({ title: t, status: document.getElementById('scStatus').value, price: 0, zin: document.getElementById('scZin').value || 0, sales: 0, link: document.getElementById('scLink').value });
    document.getElementById('scTitle').value=''; saveSc();
  });
  window.updatePrice=(i,v)=>{ myScenarios[i].price=v; saveSc(); };
  window.updateZin=(i,d)=>{ myScenarios[i].zin=Math.max(0, (parseInt(myScenarios[i].zin)||0)+d); saveSc(); };
  window.updateSales=(i,d)=>{ myScenarios[i].sales=Math.max(0, (parseInt(myScenarios[i].sales)||0)+d); saveSc(); };
  window.updateStatus=(i,v)=>{ myScenarios[i].status=v; saveSc(); };
  window.deleteSc=(i)=>{ if(confirm('消す？')){ myScenarios.splice(i,1); saveSc(); }};
  function saveSc(){ localStorage.setItem('myScenarios', JSON.stringify(myScenarios)); renderScenarios(); }

  // ==========================================
  // 【ツール4】 卓管理 (通過した記録/回した記録)
  // ==========================================
  let plLogs = JSON.parse(localStorage.getItem('plLogs')) || [];
  let kpLogs = JSON.parse(localStorage.getItem('kpLogs')) || [];
  let currentTab = 'PL';
  document.getElementById('tabPL').addEventListener('click', () => { currentTab='PL'; updateTabs(); });
  document.getElementById('tabKP').addEventListener('click', () => { currentTab='KP'; updateTabs(); });
  document.getElementById('logSearch').addEventListener('input', renderLogs);

  function updateTabs() {
    document.getElementById('tabPL').classList.toggle('active', currentTab==='PL');
    document.getElementById('tabKP').classList.toggle('active', currentTab==='KP');
    document.getElementById('formPL').style.display = currentTab==='PL' ? 'block' : 'none';
    document.getElementById('formKP').style.display = currentTab==='KP' ? 'block' : 'none';
    renderLogs();
  }

  document.getElementById('btnAddPL').addEventListener('click', () => {
    const title = document.getElementById('plTitle').value; if(!title) return;
    const file = document.getElementById('plPhotoFile').files[0];
    const save = (img) => {
      plLogs.push({ title, name: document.getElementById('plCharName').value, lost: document.getElementById('plLost').value, ho: document.getElementById('plHO').value, photo: img });
      localStorage.setItem('plLogs', JSON.stringify(plLogs)); renderLogs();
    };
    if(file){ const r=new FileReader(); r.onload=e=>save(e.target.result); r.readAsDataURL(file); } else save(null);
  });

  document.getElementById('btnAddKP').addEventListener('click', () => {
    const title = document.getElementById('kpTitle').value; if(!title) return;
    kpLogs.push({ title, zin: document.getElementById('kpZin').value });
    localStorage.setItem('kpLogs', JSON.stringify(kpLogs)); renderLogs();
  });

  function renderLogs() {
    const list = document.getElementById('logList'); list.innerHTML = '';
    const q = document.getElementById('logSearch').value.toLowerCase();
    const data = currentTab==='PL'?plLogs:kpLogs;
    data.forEach((log, i) => {
      if(q && !JSON.stringify(log).toLowerCase().includes(q)) return;
      const div = document.createElement('div'); div.className = 'list-item';
      if(currentTab==='PL'){
        div.innerHTML = `<div style="font-weight:bold;">${log.title} [${log.lost}]</div><div style="font-size:12px;">${log.name} / HO: ${log.ho}</div>
        ${log.photo?`<div class="pc-photo-preview"><img src="${log.photo}"></div>`:''}<button onclick="delLog(${i})">削除</button>`;
      } else {
        div.innerHTML = `<div style="font-weight:bold;">${log.title}</div><div style="font-size:12px;">累計: ${log.zin} 陣</div><button onclick="delLog(${i})">削除</button>`;
      }
      list.appendChild(div);
    });
  }
  window.delLog=(i)=>{ if(confirm('消す？')){ if(currentTab==='PL') plLogs.splice(i,1); else kpLogs.splice(i,1); localStorage.setItem(currentTab==='PL'?'plLogs':'kpLogs', JSON.stringify(currentTab==='PL'?plLogs:kpLogs)); renderLogs(); }};

  initWarning(); switchView(homeView);
});