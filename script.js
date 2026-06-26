// ════ ESTADO ════

// tipo de transação atual, começa como receita
let tipo = 'receita';

// carrega as transações salvas no navegador, se não tiver nada começa com lista vazia
let transactions = JSON.parse(localStorage.getItem('ft_data') || '[]');

// carrega as metas salvas no navegador, se não tiver nada começa com lista vazia
let metas = JSON.parse(localStorage.getItem('ft_metas') || '[]');

// guarda as referências dos dois gráficos para poder destruí-los antes de recriar
let pieChart = null, lineChart = null;

// mapeamento de categoria para emoji
const catIcons = {
  'Salário':'💼','Freelance':'💻','Investimentos':'📊','Alimentação':'🍔',
  'Transporte':'🚌','Moradia':'🏠','Saúde':'💊','Educação':'📚','Lazer':'🎮','Outros':'✨'
};

// ════ INIT ════

// pega o tema que o usuário escolheu antes, se não tiver usa o escuro
const savedTheme = localStorage.getItem('ft_theme') || 'dark';

// aplica o tema no elemento raiz do html
document.documentElement.setAttribute('data-theme', savedTheme);

// coloca o ícone certo no botão de tema
document.getElementById('themeBtn').textContent = savedTheme === 'dark' ? '🌙' : '☀️';

// coloca a data de hoje no campo de data do formulário
document.getElementById('data').valueAsDate = new Date();

// popula o select de filtro de mês com os meses disponíveis nas transações
preencherFiltroMes();

// renderiza tudo na tela ao carregar a página
render();
renderMetas();
renderInsights();

// ════ TEMA ════

// troca entre tema claro e escuro
function toggleTheme() {
  // pega qual tema está ativo agora
  const cur = document.documentElement.getAttribute('data-theme');

  // define o próximo tema (inverte o atual)
  const next = cur === 'dark' ? 'light' : 'dark';

  // aplica o novo tema na página
  document.documentElement.setAttribute('data-theme', next);

  // salva a escolha do usuário no navegador
  localStorage.setItem('ft_theme', next);

  // atualiza o ícone do botão de tema
  document.getElementById('themeBtn').textContent = next === 'dark' ? '🌙' : '☀️';

  // redesenha os gráficos com as cores do novo tema
  render();
}

// ════ NAVEGAÇÃO ════

// mostra a página escolhida e marca a aba como ativa
function showPage(p) {
  // esconde todas as páginas tirando a classe active
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));

  // desmarca todas as abas do menu
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));

  // mostra só a página que foi clicada
  document.getElementById('page-'+p).classList.add('active');

  // marca a aba correspondente como ativa
  document.getElementById('tab-'+p).classList.add('active');

  // se for a página de insights, atualiza os cards
  if (p === 'insights') renderInsights();

  // se for a página de transações, atualiza filtros e lista
  if (p === 'transacoes') { preencherFiltroMes(); renderTransacoes(); }
}

// ════ TIPO ════

// muda o tipo entre receita e despesa
function setTipo(t) {
  tipo = t;

  // atualiza a aparência visual dos botões de tipo
  document.getElementById('btnReceita').className = 'tipo-btn receita' + (t==='receita' ? ' active' : '');
  document.getElementById('btnDespesa').className = 'tipo-btn despesa' + (t==='despesa' ? ' active' : '');
}

// ════ ADICIONAR TRANSAÇÃO ════

// lê os campos do formulário e salva uma nova transação
function addTransaction() {
  // pega o texto da descrição sem espaços extras
  const desc  = document.getElementById('desc').value.trim();

  // converte o valor para número decimal
  const valor = parseFloat(document.getElementById('valor').value);

  // pega a categoria selecionada
  const cat   = document.getElementById('categoria').value;

  // pega a data preenchida
  const data  = document.getElementById('data').value;

  // verifica se o checkbox de recorrente está marcado
  const rec   = document.getElementById('recorrente').checked;

  // valida cada campo antes de salvar
  if (!desc)            return showToast('⚠️ Informe uma descrição.');
  if (!valor||valor<=0) return showToast('⚠️ Informe um valor válido.');
  if (!cat)             return showToast('⚠️ Selecione uma categoria.');
  if (!data)            return showToast('⚠️ Informe uma data.');

  // adiciona a nova transação no início da lista usando a hora atual como id único
  transactions.unshift({ id: Date.now(), tipo, desc, valor, cat, data, recorrente: rec });

  // salva no localStorage e atualiza a tela
  save(); render(); renderInsights();
  showToast('✅ Transação adicionada!');

  // limpa todos os campos do formulário
  document.getElementById('desc').value = '';
  document.getElementById('valor').value = '';
  document.getElementById('categoria').value = '';
  document.getElementById('recorrente').checked = false;
  document.getElementById('data').valueAsDate = new Date();
}

// remove uma transação da lista pelo id
function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  save(); render(); renderInsights();
  showToast('🗑️ Transação removida.');
}

// salva transações e metas no localStorage do navegador
function save() {
  localStorage.setItem('ft_data', JSON.stringify(transactions));
  localStorage.setItem('ft_metas', JSON.stringify(metas));
}

// ════ RENDER GERAL ════

// calcula os totais e atualiza os cards de resumo e os gráficos
function render() {
  // soma todos os valores de receita
  const receitas = transactions.filter(t=>t.tipo==='receita').reduce((a,t)=>a+t.valor,0);

  // soma todos os valores de despesa
  const despesas = transactions.filter(t=>t.tipo==='despesa').reduce((a,t)=>a+t.valor,0);

  // atualiza os três cards de resumo no topo
  document.getElementById('totalReceitas').textContent = fmt(receitas);
  document.getElementById('totalDespesas').textContent = fmt(despesas);
  document.getElementById('totalSaldo').textContent    = fmt(receitas-despesas);

  // atualiza a lista do dashboard e os dois gráficos
  renderListDash();
  renderPie();
  renderLine();
}

// monta o html de um item da lista de transações
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

// mostra as 10 transações mais recentes no dashboard
function renderListDash() {
  const el = document.getElementById('transactionListDash');

  // se a lista estiver vazia, mostra um estado vazio
  if (!transactions.length) {
    el.innerHTML = `<div class="empty-state"><span class="emoji">🪙</span>Nenhuma transação ainda.</div>`;
    return;
  }

  // pega só os 10 primeiros (mais recentes) e gera o html
  el.innerHTML = transactions.slice(0,10).map(itemHTML).join('');
}

// ════ FILTROS ════

// popula o select de mês com os meses que existem nas transações
function preencherFiltroMes() {
  const sel = document.getElementById('filtroMes');

  // pega os meses únicos e ordena do mais recente para o mais antigo
  const meses = [...new Set(transactions.map(t=>t.data.slice(0,7)))].sort().reverse();

  // guarda o valor atual para manter a seleção ao atualizar
  const cur = sel.value;

  // monta as opções do select com o nome do mês em português
  sel.innerHTML = '<option value="">Todos os meses</option>' +
    meses.map(m => {
      const [y,mo] = m.split('-');
      const label = new Date(y,mo-1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
      return `<option value="${m}"${m===cur?' selected':''}>${label}</option>`;
    }).join('');
}

// filtra a lista de transações com base nos filtros ativos e mostra na tela
function renderTransacoes() {
  // pega os valores de cada filtro
  const texto = (document.getElementById('filtroTexto')?.value||'').toLowerCase();
  const tipoF = document.getElementById('filtroTipo')?.value||'';
  const catF  = document.getElementById('filtroCategoria')?.value||'';
  const mesF  = document.getElementById('filtroMes')?.value||'';

  // aplica todos os filtros na lista de transações
  let list = transactions.filter(t => {
    if (texto && !t.desc.toLowerCase().includes(texto) && !t.cat.toLowerCase().includes(texto)) return false;
    if (tipoF && t.tipo !== tipoF) return false;
    if (catF  && t.cat  !== catF)  return false;
    if (mesF  && !t.data.startsWith(mesF)) return false;
    return true;
  });

  const el = document.getElementById('transactionListAll');

  // se nenhuma transação bater com os filtros, mostra mensagem
  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><span class="emoji">🔍</span>Nenhuma transação encontrada.</div>`;
    return;
  }

  // renderiza a lista filtrada
  el.innerHTML = list.map(itemHTML).join('');
}

// limpa todos os filtros e mostra a lista completa
function limparFiltros() {
  document.getElementById('filtroTexto').value = '';
  document.getElementById('filtroTipo').value = '';
  document.getElementById('filtroCategoria').value = '';
  document.getElementById('filtroMes').value = '';
  renderTransacoes();
}

// ════ METAS ════

// cria uma nova meta financeira e salva
function addMeta() {
  // pega os dados do formulário de metas
  const nome  = document.getElementById('metaNome').value.trim();
  const alvo  = parseFloat(document.getElementById('metaAlvo').value);
  const prazo = document.getElementById('metaPrazo').value;

  // valida os campos obrigatórios
  if (!nome)          return showToast('⚠️ Informe um nome para a meta.');
  if (!alvo||alvo<=0) return showToast('⚠️ Informe um valor alvo.');

  // adiciona a meta na lista com depósito inicial zerado
  metas.push({ id: Date.now(), nome, alvo, prazo, depositado: 0 });
  save(); renderMetas();
  showToast('🎯 Meta criada!');

  // limpa o formulário de metas
  document.getElementById('metaNome').value = '';
  document.getElementById('metaAlvo').value = '';
  document.getElementById('metaPrazo').value = '';
}

// remove uma meta pelo id
function deleteMeta(id) {
  metas = metas.filter(m => m.id !== id);
  save(); renderMetas();
  showToast('🗑️ Meta removida.');
}

// registra um valor depositado em uma meta específica
function depositar(id) {
  const val = parseFloat(document.getElementById('dep-'+id).value);
  if (!val||val<=0) return showToast('⚠️ Valor inválido.');

  // acha a meta pelo id
  const m = metas.find(m=>m.id===id);
  if (!m) return;

  // soma o depósito mas não deixa passar do valor alvo
  m.depositado = Math.min(m.depositado + val, m.alvo);
  save(); renderMetas();
  showToast('💰 Depósito registrado!');
}

// renderiza os cards de metas na tela
function renderMetas() {
  const el = document.getElementById('metasGrid');

  // se não tiver metas, mostra estado vazio
  if (!metas.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><span class="emoji">🎯</span>Nenhuma meta criada ainda.</div>`;
    return;
  }

  el.innerHTML = metas.map(m => {
    // calcula o percentual de progresso da meta
    const pct = Math.min(Math.round((m.depositado/m.alvo)*100),100);

    // marca como concluída se chegou a 100%
    const concluida = pct >= 100;

    // formata o prazo para texto legível em português
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

// gera e mostra os cards de análise financeira inteligente
function renderInsights() {
  const el = document.getElementById('insightGrid');

  // se não tiver nenhuma transação ainda, mostra mensagem de espera
  if (!transactions.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><span class="emoji">💡</span>Adicione transações para ver seus insights!</div>`;
    return;
  }

  // soma todas as receitas
  const receitas = transactions.filter(t=>t.tipo==='receita').reduce((a,t)=>a+t.valor,0);

  // soma todas as despesas
  const despesas = transactions.filter(t=>t.tipo==='despesa').reduce((a,t)=>a+t.valor,0);

  // calcula o saldo (receitas menos despesas)
  const saldo    = receitas - despesas;

  // percentual do quanto foi gasto em relação à renda
  const txRate   = receitas > 0 ? (despesas/receitas)*100 : 0;

  // agrupa os valores gastos por categoria
  const cats = {};
  transactions.filter(t=>t.tipo==='despesa').forEach(t=>{ cats[t.cat]=(cats[t.cat]||0)+t.valor; });

  // pega a categoria que mais gastou
  const topCat = Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];

  // filtra só as despesas marcadas como recorrentes
  const recorrentes = transactions.filter(t=>t.recorrente && t.tipo==='despesa');
  const totalRec = recorrentes.reduce((a,t)=>a+t.valor,0);

  // lista de insights que serão mostrados
  const insights = [];

  // insight de saldo: positivo ou negativo
  if (saldo > 0) {
    insights.push({ icon:'💚', tag:'ok', tagLabel:'Saúde: Boa', title:'Suas finanças estão positivas!', text:`Você tem um saldo de ${fmt(saldo)}. Continue assim — tente manter sempre ao menos 1 mês de despesas de reserva.` });
  } else {
    insights.push({ icon:'🔴', tag:'alert', tagLabel:'Atenção', title:'Saldo negativo detectado', text:`Suas despesas (${fmt(despesas)}) superam as receitas (${fmt(receitas)}). Revise os gastos e identifique onde cortar.` });
  }

  // insight sobre taxa de gastos em relação à renda
  if (txRate > 80) {
    insights.push({ icon:'⚠️', tag:'warn', tagLabel:'Alerta', title:`Você gasta ${Math.round(txRate)}% do que recebe`, text:`O ideal é gastar no máximo 70% da renda e guardar o restante. Tente reduzir gastos variáveis como lazer e alimentação fora.` });
  } else if (txRate > 0) {
    insights.push({ icon:'📉', tag:'ok', tagLabel:'Controle', title:`Taxa de gastos: ${Math.round(txRate)}%`, text:`Você está gastando ${Math.round(txRate)}% da sua renda. Isso está ${txRate < 70 ? 'dentro do ideal! 🎉' : 'um pouco acima do recomendado (70%).'}` });
  }

  // insight da categoria que mais pesou no bolso
  if (topCat) {
    insights.push({ icon: catIcons[topCat[0]]||'📌', tag:'tip', tagLabel:'Maior gasto', title:`${topCat[0]} consome ${fmt(topCat[1])}`, text:`Essa é sua categoria com maior gasto. Analise se todos esses gastos são necessários e veja se há como reduzir.` });
  }

  // insight sobre o total de gastos fixos recorrentes
  if (totalRec > 0) {
    insights.push({ icon:'🔁', tag:'warn', tagLabel:'Recorrentes', title:`R$ ${totalRec.toLocaleString('pt-BR',{minimumFractionDigits:2})} em gastos fixos`, text:`Você tem ${recorrentes.length} transação(ões) recorrente(s) por mês. Garanta que sua renda cubra esses compromissos antes de gastar com variáveis.` });
  }

  // insight sobre as metas em andamento
  if (metas.length > 0) {
    const em_andamento = metas.filter(m=>m.depositado<m.alvo).length;
    insights.push({ icon:'🎯', tag:'tip', tagLabel:'Metas', title:`${em_andamento} meta(s) em andamento`, text:`Você tem ${metas.length} meta(s) configurada(s). Tente separar ao menos 10% da renda mensalmente para suas metas.` });
  }

  // dica fixa sobre a regra 50/30/20
  insights.push({ icon:'📚', tag:'tip', tagLabel:'Dica', title:'Regra 50/30/20', text:'Uma boa prática: 50% da renda para necessidades, 30% para desejos e 20% para poupança e investimentos. Use como referência para equilibrar suas finanças.' });

  // monta e injeta o html de todos os cards de insight
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

// retorna as cores de texto e grade certas para o tema atual
function getCC() {
  const dark = document.documentElement.getAttribute('data-theme')==='dark';
  return { muted: dark?'#6a6a88':'#8888a8', grid: dark?'#1e1e2a':'#e2e2ec' };
}

// renderiza o gráfico de rosca com as despesas agrupadas por categoria
function renderPie() {
  const desp = transactions.filter(t=>t.tipo==='despesa');
  const canvas = document.getElementById('pieChart');
  const empty  = document.getElementById('pieEmpty');

  // se não tiver despesas, esconde o gráfico e mostra o estado vazio
  if (!desp.length) {
    canvas.style.display='none'; empty.style.display='flex';
    if (pieChart) { pieChart.destroy(); pieChart=null; } return;
  }

  // esconde o estado vazio e mostra o canvas
  canvas.style.display=''; empty.style.display='none';

  // agrupa os gastos por categoria para o gráfico
  const cats={};
  desp.forEach(t=>{ cats[t.cat]=(cats[t.cat]||0)+t.valor; });

  const c=getCC();

  // destroi o gráfico anterior para evitar sobreposição
  if (pieChart) pieChart.destroy();

  // cria o gráfico de rosca com as categorias e cores
  pieChart = new Chart(canvas, {
    type:'doughnut',
    data:{ labels:Object.keys(cats), datasets:[{ data:Object.values(cats), backgroundColor:['#e879a0','#a78bfa','#2dd4a0','#f07070','#fbbf24','#60a5fa','#fb923c'], borderWidth:0, hoverOffset:8 }] },
    options:{ cutout:'68%', plugins:{ legend:{ position:'bottom', labels:{ color:c.muted, font:{size:11}, boxWidth:10, padding:14 } } } }
  });
}

// renderiza o gráfico de linha com a evolução de receitas e despesas por mês
function renderLine() {
  const canvas = document.getElementById('lineChart');

  // agrupa as transações por mês
  const months={};
  transactions.forEach(t=>{ const k=t.data.slice(0,7); if(!months[k]) months[k]={receita:0,despesa:0}; months[k][t.tipo]+=t.valor; });

  // ordena os meses do mais antigo para o mais recente
  const sorted=Object.keys(months).sort();

  // formata os rótulos do eixo X com nome do mês abreviado
  const labels=sorted.map(k=>{ const[y,m]=k.split('-'); return new Date(y,m-1).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}); });

  const c=getCC();

  // destroi o gráfico anterior para evitar sobreposição
  if (lineChart) lineChart.destroy();

  // cria o gráfico de linha com duas séries: receitas e despesas
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

// exporta todas as transações para um arquivo CSV
function exportCSV() {
  if (!transactions.length) return showToast('⚠️ Nenhuma transação para exportar.');

  // cabeçalho das colunas do arquivo
  const header = 'Data,Tipo,Descrição,Categoria,Valor,Recorrente';

  // converte cada transação em uma linha do CSV
  const rows = transactions.map(t =>
    `${fmtDate(t.data)},${t.tipo==='receita'?'Receita':'Despesa'},"${t.desc}",${t.cat},${t.valor.toFixed(2)},${t.recorrente?'Sim':'Não'}`
  );

  // junta cabeçalho e linhas
  const csv = [header, ...rows].join('\n');

  // cria o arquivo e dispara o download no navegador
  const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download='fintrack_transacoes.csv'; a.click();

  // libera o objeto de url da memória
  URL.revokeObjectURL(url);
  showToast('📥 CSV exportado!');
}

// abre o relatório em uma nova janela e dispara a impressão para salvar como PDF
function exportPDF() {
  if (!transactions.length) return showToast('⚠️ Nenhuma transação para exportar.');

  // calcula totais para o resumo do relatório
  const receitas = transactions.filter(t=>t.tipo==='receita').reduce((a,t)=>a+t.valor,0);
  const despesas = transactions.filter(t=>t.tipo==='despesa').reduce((a,t)=>a+t.valor,0);

  // monta as linhas da tabela de transações do relatório
  const rows = transactions.map(t =>
    `<tr style="border-bottom:1px solid #eee">
      <td style="padding:6px 10px">${fmtDate(t.data)}</td>
      <td style="padding:6px 10px">${t.desc}</td>
      <td style="padding:6px 10px">${t.cat}</td>
      <td style="padding:6px 10px;color:${t.tipo==='receita'?'#0ea876':'#e05555'};font-weight:600">${t.tipo==='receita'?'+':'−'} ${fmt(t.valor)}</td>
      <td style="padding:6px 10px">${t.recorrente?'🔁':''}</td>
    </tr>`
  ).join('');

  // monta o html completo da página do relatório
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

  // abre uma nova aba e escreve o html do relatório
  const w = window.open('','_blank');
  w.document.write(html);
  w.document.close();

  // aguarda um pouco para o html carregar antes de abrir a impressão
  setTimeout(()=>{ w.print(); }, 400);
  showToast('🖨️ Abrindo para impressão/PDF...');
}

// ════ UTILS ════

// formata um número como moeda brasileira (ex: R$ 1.234,56)
function fmt(v){ return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }

// converte data do formato aaaa-mm-dd para dd/mm/aaaa
function fmtDate(d){ const[y,m,day]=d.split('-'); return `${day}/${m}/${y}`; }

// mostra uma notificação temporária no canto da tela
function showToast(msg){
  const el=document.getElementById('toast');
  el.textContent=msg; el.classList.add('show');

  // remove o toast depois de 2,8 segundos
  setTimeout(()=>el.classList.remove('show'),2800);
}
