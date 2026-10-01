// =====================================================
// TESOURARIA KEFAS - FORMULÁRIO DE LANÇAMENTOS
// Usado por entradas.html e saidas.html
// =====================================================

async function iniciarLancamento(tipo, arquivo) {
    const sessao = await iniciarPagina(arquivo);
    if (!sessao) return;

    const el = (id) => document.getElementById(id);
    const FORMAS = { dinheiro: 'Dinheiro', pix: 'PIX', transferencia: 'Transferência', outro: 'Outro' };
    const ehEntrada = tipo === 'entrada';
    let idEditando = null;
    let descAuto = true;

    // ---------- Descrição sugerida pela categoria ----------
    function mesAno() {
        const d = new Date();
        const m = d.toLocaleDateString('pt-BR', { month: 'long' });
        return m.charAt(0).toUpperCase() + m.slice(1) + '/' + d.getFullYear();
    }

    function sugestao(nome) {
        if (!ehEntrada) {
            const mensais = {
                'Energia elétrica': 'Conta de energia',
                'Água': 'Conta de água',
                'Internet': 'Internet',
                'Telefone': 'Telefone'
            };
            if (mensais[nome]) return mensais[nome] + ' — ' + mesAno();
            if (nome === 'Aluguel') return 'Aluguel do templo';
        }
        return nome === 'Outros' ? '' : nome;
    }

    function lerValor(texto) {
        let t = texto.replace(/[R$\s]/g, '');
        if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
        const n = Number(t);
        return isFinite(n) ? n : NaN;
    }

    // ---------- Categorias ----------
    const { data: cats, error: erroCats } = await db
        .from('categories')
        .select('id, nome')
        .eq('tipo', tipo)
        .eq('ativa', true);

    if (erroCats) {
        el('msg').textContent = 'Erro ao carregar categorias: ' + erroCats.message;
        return;
    }

    cats.sort((a, b) => (a.nome === 'Outros') - (b.nome === 'Outros') || a.nome.localeCompare(b.nome, 'pt-BR'));
    const selCat = el('categoria');
    selCat.innerHTML = '<option value="">Selecione...</option>';
    cats.forEach((c) => {
        const o = document.createElement('option');
        o.value = c.id;
        o.textContent = c.nome;
        selCat.appendChild(o);
    });

    selCat.addEventListener('change', () => {
        const cat = cats.find((c) => c.id === selCat.value);
        if (cat && (descAuto || !el('descricao').value)) {
            el('descricao').value = sugestao(cat.nome);
            descAuto = true;
        }
    });
    el('descricao').addEventListener('input', () => { descAuto = false; });

    // ---------- Formulário ----------
    function limpar() {
        el('form-lanc').reset();
        el('data').value = iso(new Date());
        idEditando = null;
        descAuto = true;
        el('titulo-form').textContent = ehEntrada ? 'Nova entrada' : 'Nova saída';
        el('botao-salvar').textContent = 'SALVAR';
        el('botao-cancelar').classList.add('oculto');
    }
    limpar();

    el('botao-cancelar').addEventListener('click', () => { el('msg').textContent = ''; limpar(); });

    el('form-lanc').addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = el('msg');
        msg.style.color = '#c0392b';
        msg.textContent = '';

        const valor = lerValor(el('valor').value);
        if (!selCat.value) { msg.textContent = 'Escolha a categoria.'; return; }
        if (!(valor > 0)) { msg.textContent = 'Digite um valor válido, maior que zero.'; return; }
        if (!el('data').value) { msg.textContent = 'Escolha a data.'; return; }

        const dados = {
            tipo: tipo,
            category_id: selCat.value,
            valor: valor,
            data: el('data').value,
            descricao: el('descricao').value.trim() || null,
            pessoa: el('pessoa').value.trim() || null,
            forma_pagamento: el('forma').value,
            observacoes: el('observacoes').value.trim() || null
        };

        el('botao-salvar').disabled = true;
        const consulta = idEditando
            ? db.from('transactions').update(dados).eq('id', idEditando)
            : db.from('transactions').insert(dados);
        const { error } = await consulta;
        el('botao-salvar').disabled = false;

        if (error) {
            msg.textContent = 'Não foi possível salvar: ' + error.message;
            return;
        }

        limpar();
        msg.style.color = '#1e8449';
        msg.textContent = 'Lançamento salvo!';
        carregarLista();
    });

    // ---------- Lista dos últimos lançamentos ----------
    function botaoPequeno(texto, cor) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = texto;
        b.style.cssText = 'width:auto;padding:6px 12px;font-size:12px;margin-left:6px;background:' + cor;
        return b;
    }

    async function carregarLista() {
        const { data, error } = await db
            .from('transactions')
            .select('id, category_id, valor, data, descricao, pessoa, forma_pagamento, observacoes, categories(nome)')
            .eq('tipo', tipo)
            .eq('excluido', false)
            .order('data', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(15);

        const lista = el('lista-lanc');
        lista.innerHTML = '';
        if (error) {
            lista.innerHTML = '<div class="vazio">Erro ao carregar: ' + error.message + '</div>';
            return;
        }
        if (data.length === 0) {
            lista.innerHTML = '<div class="vazio">Nenhum lançamento ainda.</div>';
            return;
        }

        data.forEach((l) => {
            const item = document.createElement('div');
            item.className = 'item';
            item.style.flexWrap = 'wrap';

            const esq = document.createElement('div');
            const d1 = document.createElement('div');
            d1.className = 'data';
            d1.textContent = dataBR(l.data) + (l.pessoa ? ' • ' + l.pessoa : '') +
                (l.forma_pagamento ? ' • ' + FORMAS[l.forma_pagamento] : '');
            const d2 = document.createElement('div');
            d2.className = 'desc';
            d2.textContent = l.descricao || '(sem descrição)';
            const d3 = document.createElement('div');
            d3.className = 'cat';
            d3.textContent = l.categories ? l.categories.nome : '';
            esq.appendChild(d1);
            esq.appendChild(d2);
            esq.appendChild(d3);

            const dir = document.createElement('div');
            dir.style.textAlign = 'right';
            const valor = document.createElement('div');
            valor.className = 'quanto ' + (ehEntrada ? 'verde' : 'vermelho');
            valor.textContent = (ehEntrada ? '+ ' : '- ') + brl(l.valor);
            const acoes = document.createElement('div');
            acoes.style.marginTop = '8px';

            const bEditar = botaoPequeno('Editar', '#b08d3c');
            bEditar.addEventListener('click', () => {
                idEditando = l.id;
                selCat.value = l.category_id;
                el('pessoa').value = l.pessoa || '';
                el('valor').value = String(l.valor).replace('.', ',');
                el('data').value = l.data;
                el('descricao').value = l.descricao || '';
                el('forma').value = l.forma_pagamento || 'dinheiro';
                el('observacoes').value = l.observacoes || '';
                descAuto = false;
                el('titulo-form').textContent = 'Editando lançamento';
                el('botao-salvar').textContent = 'SALVAR ALTERAÇÕES';
                el('botao-cancelar').classList.remove('oculto');
                el('msg').textContent = '';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            const bExcluir = botaoPequeno('Excluir', '#c0392b');
            bExcluir.addEventListener('click', async () => {
                if (!confirm('Excluir este lançamento? Ele sai das telas, mas fica guardado na auditoria.')) return;
                const { error: erroDel } = await db.from('transactions').update({ excluido: true }).eq('id', l.id);
                if (erroDel) {
                    el('msg').style.color = '#c0392b';
                    el('msg').textContent = 'Não foi possível excluir: ' + erroDel.message;
                    return;
                }
                if (idEditando === l.id) limpar();
                carregarLista();
            });

            acoes.appendChild(bEditar);
            acoes.appendChild(bExcluir);
            dir.appendChild(valor);
            dir.appendChild(acoes);

            item.appendChild(esq);
            item.appendChild(dir);
            lista.appendChild(item);
        });
    }

    carregarLista();
}
