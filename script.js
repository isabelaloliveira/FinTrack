// ════ ESTADO ════
let tipo = 'receita';
let transactions = JSON.parse(localStorage.getItem('ft_data') || '[]');
let metas = JSON.parse(localStorage.getItem('ft_metas') || '[]');
let pieChart = null, lineChart = null;

const catIcons = {
  'Salário':'💼','Freelance':'💻','Investimentos':'📊','Alimentação':'🍔',
  'Transporte':'🚌','Moradia':'🏠','Saúde':'💊','Educação':'📚','Lazer':'🎮','Outros':'✨'
};

// ════ INIT ════
const savedTheme = localStorage.getItem('ft_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
document.getElementById('themeBtn').textContent = savedTheme === 'dark' ? '🌙' : '☀️';
document.getElementById('data').valueAsDate = new Date();
preencherFiltroMes();
render();
renderMetas();
renderInsights();

// ════ TEMA ════
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ft_theme', next);
  document.getElementById('themeBtn').textContent = next === 'dark' ? '🌙' : '☀️';
  render();
}

// ════ NAVEGAÇÃO ════
function showPage(p) {
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
  document.getElementById('page-'+p).classList.add('active');
  document.getElementById('tab-'+p).classList.add('active');
  if (p === 'insights') renderInsights();
  if (p === 'transacoes') { preencherFiltroMes(); renderTransacoes(); }
}

// ════ TIPO ════
function setTipo(t) {
  tipo = t;
  document.getElementById('btnReceita').className = 'tipo-btn receita' + (t==='receita' ? ' active' : '');
  document.getElementById('btnDespesa').className = 'tipo-btn despesa' + (t==='despesa' ? ' active' : '');
}

// ════ ADICIONAR TRANSAÇÃO ════
function addTransaction() {
  const desc  = document.getElementById('desc').value.trim();
  const valor = parseFloat(document.getElementById('valor').value);
  const cat   = document.getElementById('categoria').value;
  const data  = document.getElementById('data').value;
  const rec   = document.getElementById('recorrente').checked;

  if (!desc)            return showToast('⚠️ Informe uma descrição.');
  if (!valor||valor<=0) return showToast('⚠️ Informe um valor válido.');
  if (!cat)             return showToast('⚠️ Selecione uma categoria.');
  if (!data)            return showToast('⚠️ Informe uma data.');

  transactions.unshift({ id: Date.now(), tipo, desc, valor, cat, data, recorrente: rec });
  save(); render(); renderInsights();
  showToast('✅ Transação adicionada!');
  document.getElementById('desc').value = '';
  document.getElementById('valor').value = '';
  document.getElementById('categoria').value = '';
  document.getElementById('recorrente').checked = false;
  document.getElementById('data').valueAsDate = new Date();
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  save(); render(); renderInsights();
  showToast('🗑️ Transação removida.');
}

function save() {
  localStorage.setItem('ft_data', JSON.stringify(transactions));
  localStorage.setItem('ft_metas', JSON.stringify(metas));
}

// ════ RENDER GERAL ════
function render() {
  const receitas = transactions.filter(t=>t.tipo==='receita').reduce((a,t)=>a+t.valor,0);
  const despesas = transactions.filter(t=>t.tipo==='despesa').reduce((a,t)=>a+t.valor,0);
  document.getElementById('totalReceitas').textContent = fmt(receitas);
  document.getElementById('totalDespesas').textContent = fmt(despesas);
  document.getElementById('totalSaldo').textContent    = fmt(receitas-despesas);
  renderListDash();
  renderPie();
  renderLine();
}

function itemHTML(t) {
  return `
  <div class="transaction-item${t.recorrente?' recorrente-item':''}">
    <div class="transaction-info">
      <div class="transaction-icon icon-${t.tipo}">${catIcons[t.cat]||'📌'}</div>
      <div>
        <div class="transaction-desc">${t.desc}${t.recorrente?'<span class="recorrente-tag">🔁 recorrente</span>':''}</div>
        <div class="transaction-meta">${t.cat} · ${fmtDate(t.data)}</div>
      </div>
    </div>
    <div class="transaction-right">
      <div class="transaction-value val-${t.tipo}">${t.tipo==='receita'?'+':'−'} ${fmt(t.valor)}</div>
      <button class="btn-del" onclick="deleteTransaction(${t.id})" title="Remover">✕</button>
    </div>
  </div>`;
}

function renderListDash() {
  const el = document.getElementById('transactionListDash');
  if (!transactions.length) {
    el.innerHTML = `<div class="empty-state"><span class="emoji">🪙</span>Nenhuma transação ainda.</div>`;
    return;
  }
  el.innerHTML = transactions.slice(0,10).map(itemHTML).join('');
}

// ════ FILTROS ════
function preencherFiltroMes() {
  const sel = document.getElementById('filtroMes');
  const meses = [...new Set(transactions.map(t=>t.data.slice(0,7)))].sort().reverse();
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todos os meses</option>' +
    meses.map(m => {
      const [y,mo] = m.split('-');
      const label = new Date(y,mo-1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
      return `<option value="${m}"${m===cur?' selected':''}>${label}</option>`;
    }).join('');
}

function renderTransacoes() {
  const texto = (document.getElementById('filtroTexto')?.value||'').toLowerCase();
  const tipoF = document.getElementById('filtroTipo')?.value||'';
  const catF  = document.getElementById('filtroCategoria')?.value||'';
  const mesF  = document.getElementById('filtroMes')?.value||'';

  let list = transactions.filter(t => {
    if (texto && !t.desc.toLowerCase().includes(texto) && !t.cat.toLowerCase().includes(texto)) return false;
    if (tipoF && t.tipo !== tipoF) return false;
    if (catF  && t.cat  !== catF)  return false;
    if (mesF  && !t.data.startsWith(mesF)) return false;
    return true;
  });

  const el = document.getElementById('transactionListAll');
  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><span class="emoji">🔍</span>Nenhuma transação encontrada.</div>`;
    return;
  }
  el.innerHTML = list.map(itemHTML).join('');
}

function limparFiltros() {
  document.getElementById('filtroTexto').value = '';
  document.getElementById('filtroTipo').value = '';
  document.getElementById('filtroCategoria').value = '';
  document.getElementById('filtroMes').value = '';
  renderTransacoes();
}

// ════ METAS ════
function addMeta() {
  const nome  = document.getElementById('metaNome').value.trim();
  const alvo  = parseFloat(document.getElementById('metaAlvo').value);
  const prazo = document.getElementById('metaPrazo').value;
  if (!nome)          return showToast('⚠️ Informe um nome para a meta.');
  if (!alvo||alvo<=0) return showToast('⚠️ Informe um valor alvo.');
  metas.push({ id: Date.now(), nome, alvo, prazo, depositado: 0 });
  save(); renderMetas();
  showToast('🎯 Meta criada!');
  document.getElementById('metaNome').value = '';
  document.getElementById('metaAlvo').value = '';
  document.getElementById('metaPrazo').value = '';
}

function deleteMeta(id) {
  metas = metas.filter(m => m.id !== id);
  save(); renderMetas();
  showToast('🗑️ Meta removida.');
}

function depositar(id) {
  const val = parseFloat(document.getElementById('dep-'+id).value);
  if (!val||val<=0) return showToast('⚠️ Valor inválido.');
  const m = metas.find(m=>m.id===id);
  if (!m) return;
  m.depositado = Math.min(m.depositado + val, m.alvo);
  save(); renderMetas();
  showToast('💰 Depósito registrado!');
}

function renderMetas() {
  const el = document.getElementById('metasGrid');
  if (!metas.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><span class="emoji">🎯</span>Nenhuma meta criada ainda.</div>`;
    return;
  }
  el.innerHTML = metas.map(m => {
    const pct = Math.min(Math.round((m.depositado/m.alvo)*100),100);
    const concluida = pct >= 100;
    const prazoStr = m.prazo ? (() => { const [y,mo]=m.prazo.split('-'); return new Date(y,mo-1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'}); })() : 'Sem prazo';
    return `
    <div class="meta-card${concluida?' meta-concluida':''}">
      <div class="glow"></div>
      <div class="meta-top">
        <div>
          <div class="meta-nome">${concluida?'✅ ':''} ${m.nome}</div>
          <div class="meta-prazo">📅 ${prazoStr}</div>
        </div>
        <button class="meta-del" onclick="deleteMeta(${m.id})">✕</button>
      </div>
      <div class="meta-valores">
        <span>Guardado: <span class="meta-valor-atual">${fmt(m.depositado)}</span></span>
        <span>Meta: ${fmt(m.alvo)}</span>
      </div>
      <div class="meta-progress-bg"><div class="meta-progress-fill" style="width:${pct}%"></div></div>
      <div class="meta-pct">${pct}% ${concluida?'🎉 Concluída!':''}</div>
      ${!concluida ? `<div class="meta-depositar">
        <input type="number" id="dep-${m.id}" placeholder="Depositar R$..." min="0" step="0.01"/>
        <button class="btn-depositar" onclick="depositar(${m.id})">+ Guardar</button>
      </div>` : ''}
    </div>`;
  }).join('');
}

// ════ INSIGHTS ════
function renderInsights() {
  const el = document.getElementById('insightGrid');
  if (!transactions.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><span class="emoji">💡</span>Adicione transações para ver seus insights!</div>`;
    return;
  }

  const receitas = transactions.filter(t=>t.tipo==='receita').reduce((a,t)=>a+t.valor,0);
  const despesas = transactions.filter(t=>t.tipo==='despesa').reduce((a,t)=>a+t.valor,0);
  const saldo    = receitas - despesas;
  const txRate   = receitas > 0 ? (despesas/receitas)*100 : 0;

  const cats = {};
  transactions.filter(t=>t.tipo==='despesa').forEach(t=>{ cats[t.cat]=(cats[t.cat]||0)+t.valor; });
  const topCat = Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];

  const recorrentes = transactions.filter(t=>t.recorrente && t.tipo==='despesa');
  const totalRec = recorrentes.reduce((a,t)=>a+t.valor,0);

  const insights = [];

  if (saldo > 0) {
    insights.push({ icon:'💚', tag:'ok', tagLabel:'Saúde: Boa', title:'Suas finanças estão positivas!', text:`Você tem um saldo de ${fmt(saldo)}. Continue assim — tente manter sempre ao menos 1 mês de despesas de reserva.` });
  } else {
    insights.push({ icon:'🔴', tag:'alert', tagLabel:'Atenção', title:'Saldo negativo detectado', text:`Suas despesas (${fmt(despesas)}) superam as receitas (${fmt(receitas)}). Revise os gastos e identifique onde cortar.` });
  }

  if (txRate > 80) {
    insights.push({ icon:'⚠️', tag:'warn', tagLabel:'Alerta', title:`Você gasta ${Math.round(txRate)}% do que recebe`, text:`O ideal é gastar no máximo 70% da renda e guardar o restante. Tente reduzir gastos variáveis como lazer e alimentação fora.` });
  } else if (txRate > 0) {
    insights.push({ icon:'📉', tag:'ok', tagLabel:'Controle', title:`Taxa de gastos: ${Math.round(txRate)}%`, text:`Você está gastando ${Math.round(txRate)}% da sua renda. Isso está ${txRate < 70 ? 'dentro do ideal! 🎉' : 'um pouco acima do recomendado (70%).'}` });
  }

  if (topCat) {
    insights.push({ icon: catIcons[topCat[0]]||'📌', tag:'tip', tagLabel:'Maior gasto', title:`${topCat[0]} consome ${fmt(topCat[1])}`, text:`Essa é sua categoria com maior gasto. Analise se todos esses gastos são necessários e veja se há como reduzir.` });
  }

  if (totalRec > 0) {
    insights.push({ icon:'🔁', tag:'warn', tagLabel:'Recorrentes', title:`R$ ${totalRec.toLocaleString('pt-BR',{minimumFractionDigits:2})} em gastos fixos`, text:`Você tem ${recorrentes.length} transação(ões) recorrente(s) por mês. Garanta que sua renda cubra esses compromissos antes de gastar com variáveis.` });
  }

  if (metas.length > 0) {
    const em_andamento = metas.filter(m=>m.depositado<m.alvo).length;
    insights.push({ icon:'🎯', tag:'tip', tagLabel:'Metas', title:`${em_andamento} meta(s) em andamento`, text:`Você tem ${metas.length} meta(s) configurada(s). Tente separar ao menos 10% da renda mensalmente para suas metas.` });
  }

  insights.push({ icon:'📚', tag:'tip', tagLabel:'Dica', title:'Regra 50/30/20', text:'Uma boa prática: 50% da renda para necessidades, 30% para desejos e 20% para poupança e investimentos. Use como referência para equilibrar suas finanças.' });

  el.innerHTML = insights.map(i => `
    <div class="insight-card">
      <div class="insight-icon">${i.icon}</div>
      <div>
        <div class="insight-tag tag-${i.tag}">${i.tagLabel}</div>
        <div class="insight-title">${i.title}</div>
        <div class="insight-text">${i.text}</div>
      </div>
    </div>
  `).join('');
}

// ════ GRÁFICOS ════
function getCC() {
  const dark = document.documentElement.getAttribute('data-theme')==='dark';
  return { muted: dark?'#6a6a88':'#8888a8', grid: dark?'#1e1e2a':'#e2e2ec' };
}

function renderPie() {
  const desp = transactions.filter(t=>t.tipo==='despesa');
  const canvas = document.getElementById('pieChart');
  const empty  = document.getElementById('pieEmpty');
  if (!desp.length) {
    canvas.style.display='none'; empty.style.display='flex';
    if (pieChart) { pieChart.destroy(); pieChart=null; } return;
  }
  canvas.style.display=''; empty.style.display='none';
  const cats={};
  desp.forEach(t=>{ cats[t.cat]=(cats[t.cat]||0)+t.valor; });
  const c=getCC();
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(canvas, {
    type:'doughnut',
    data:{ labels:Object.keys(cats), datasets:[{ data:Object.values(cats), backgroundColor:['#e879a0','#a78bfa','#2dd4a0','#f07070','#fbbf24','#60a5fa','#fb923c'], borderWidth:0, hoverOffset:8 }] },
    options:{ cutout:'68%', plugins:{ legend:{ position:'bottom', labels:{ color:c.muted, font:{size:11}, boxWidth:10, padding:14 } } } }
  });
}

function renderLine() {
  const canvas = document.getElementById('lineChart');
  const months={};
  transactions.forEach(t=>{ const k=t.data.slice(0,7); if(!months[k]) months[k]={receita:0,despesa:0}; months[k][t.tipo]+=t.valor; });
  const sorted=Object.keys(months).sort();
  const labels=sorted.map(k=>{ const[y,m]=k.split('-'); return new Date(y,m-1).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}); });
  const c=getCC();
  if (lineChart) lineChart.destroy();
  lineChart = new Chart(canvas, {
    type:'line',
    data:{ labels, datasets:[
      { label:'Receitas', data:sorted.map(k=>months[k].receita), borderColor:'#2dd4a0', backgroundColor:'rgba(45,212,160,.08)', tension:.4, fill:true, pointRadius:4, pointBackgroundColor:'#2dd4a0' },
      { label:'Despesas', data:sorted.map(k=>months[k].despesa), borderColor:'#f07070', backgroundColor:'rgba(240,112,112,.08)', tension:.4, fill:true, pointRadius:4, pointBackgroundColor:'#f07070' }
    ]},
    options:{ scales:{ x:{ ticks:{color:c.muted,font:{size:11}}, grid:{color:c.grid} }, y:{ ticks:{color:c.muted,font:{size:11},callback:v=>'R$'+v.toLocaleString('pt-BR')}, grid:{color:c.grid} } }, plugins:{ legend:{ labels:{color:c.muted,font:{size:11},boxWidth:10,padding:14} } } }
  });
}

// ════ EXPORT ════
function exportCSV() {
  if (!transactions.length) return showToast('⚠️ Nenhuma transação para exportar.');
  const header = 'Data,Tipo,Descrição,Categoria,Valor,Recorrente';
  const rows = transactions.map(t =>
    `${fmtDate(t.data)},${t.tipo==='receita'?'Receita':'Despesa'},"${t.desc}",${t.cat},${t.valor.toFixed(2)},${t.recorrente?'Sim':'Não'}`
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download='fintrack_transacoes.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('📥 CSV exportado!');
}

function exportPDF() {
  if (!transactions.length) return showToast('⚠️ Nenhuma transação para exportar.');
  const receitas = transactions.filter(t=>t.tipo==='receita').reduce((a,t)=>a+t.valor,0);
  const despesas = transactions.filter(t=>t.tipo==='despesa').reduce((a,t)=>a+t.valor,0);
  const rows = transactions.map(t =>
    `<tr style="border-bottom:1px solid #eee">
      <td style="padding:6px 10px">${fmtDate(t.data)}</td>
      <td style="padding:6px 10px">${t.desc}</td>
      <td style="padding:6px 10px">${t.cat}</td>
      <td style="padding:6px 10px;color:${t.tipo==='receita'?'#0ea876':'#e05555'};font-weight:600">${t.tipo==='receita'?'+':'−'} ${fmt(t.valor)}</td>
      <td style="padding:6px 10px">${t.recorrente?'🔁':''}</td>
    </tr>`
  ).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>FinTrack</title></head><body style="font-family:Inter,sans-serif;padding:32px;color:#111">
    <h1 style="color:#d6518a;margin-bottom:4px">FinTrack — Relatório</h1>
    <p style="color:#888;margin-bottom:24px">Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
    <div style="display:flex;gap:32px;margin-bottom:28px">
      <div><div style="font-size:.7rem;text-transform:uppercase;color:#888">Receitas</div><div style="font-size:1.4rem;font-weight:700;color:#0ea876">${fmt(receitas)}</div></div>
      <div><div style="font-size:.7rem;text-transform:uppercase;color:#888">Despesas</div><div style="font-size:1.4rem;font-weight:700;color:#e05555">${fmt(despesas)}</div></div>
      <div><div style="font-size:.7rem;text-transform:uppercase;color:#888">Saldo</div><div style="font-size:1.4rem;font-weight:700;color:#d6518a">${fmt(receitas-despesas)}</div></div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:.88rem">
      <thead><tr style="background:#f4f4f8"><th style="padding:8px 10px;text-align:left">Data</th><th style="padding:8px 10px;text-align:left">Descrição</th><th style="padding:8px 10px;text-align:left">Categoria</th><th style="padding:8px 10px;text-align:left">Valor</th><th style="padding:8px 10px;text-align:left">Rec.</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </body></html>`;
  const w = window.open('','_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(()=>{ w.print(); }, 400);
  showToast('🖨️ Abrindo para impressão/PDF...');
}

// ════ UTILS ════
function fmt(v){ return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function fmtDate(d){ const[y,m,day]=d.split('-'); return `${day}/${m}/${y}`; }
function showToast(msg){
  const el=document.getElementById('toast');
  el.textContent=msg; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2800);
}
