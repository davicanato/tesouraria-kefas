// =====================================================
// TESOURARIA KEFAS - CÓDIGO COMPARTILHADO
// Usado por todas as páginas. Mexa aqui só quando a
// mudança valer para o sistema inteiro.
// =====================================================

// ---------- Conexão com o Supabase (a chave publishable é pública) ----------
const SUPABASE_URL = 'https://hzlmiojvtlieyybpqgsh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_goagYxbDY883ytUGkvLoSA_eAiVX-6P';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------- Páginas do sistema ----------
const PAGINA_LOGIN = 'index.html';
const PAGINA_INICIAL = 'dashboard.html';

// pronta: true  -> aparece no menu
// soAdmin: true -> só o Administrador vê e acessa
const PAGINAS = [
    { arquivo: 'dashboard.html',     nome: 'Dashboard',     soAdmin: false, pronta: true  },
    { arquivo: 'entradas.html',      nome: 'Entradas',      soAdmin: true,  pronta: true },
    { arquivo: 'saidas.html',        nome: 'Saídas',        soAdmin: true,  pronta: true },
    { arquivo: 'historico.html',     nome: 'Histórico',     soAdmin: false, pronta: true },
    { arquivo: 'relatorios.html',    nome: 'Relatórios',    soAdmin: false, pronta: true },
    { arquivo: 'configuracoes.html', nome: 'Configurações', soAdmin: true,  pronta: true }
];

// ---------- Funções de dinheiro e data ----------
function pad(n) {
    return String(n).padStart(2, '0');
}

function iso(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function brl(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dataBR(dataIso) {
    return dataIso.slice(8, 10) + '/' + dataIso.slice(5, 7);
}

// Datas de início e fim de cada período (formato AAAA-MM-DD)
function intervalo(periodo) {
    const h = new Date();
    const y = h.getFullYear();
    const m = h.getMonth();
    if (periodo === 'mes') return [iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0))];
    if (periodo === 'mes_anterior') return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))];
    if (periodo === 'ano') return [y + '-01-01', y + '-12-31'];
    return ['0000-01-01', '9999-12-31'];
}

function nomeDoPeriodo(periodo) {
    const h = new Date();
    const y = h.getFullYear();
    const m = h.getMonth();
    const nomeMes = (data) => {
        const t = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return t.charAt(0).toUpperCase() + t.slice(1);
    };
    if (periodo === 'mes') return nomeMes(new Date(y, m, 1));
    if (periodo === 'mes_anterior') return nomeMes(new Date(y, m - 1, 1));
    if (periodo === 'ano') return 'Ano de ' + y;
    return 'Desde o primeiro lançamento';
}

// ---------- Login e proteção das páginas ----------
async function sairDoSistema() {
    await db.auth.signOut();
    window.location.replace(PAGINA_LOGIN);
}

// Chame no começo de cada página interna:
//   const sessao = await iniciarPagina('dashboard.html');
//   if (!sessao) return;
async function iniciarPagina(arquivoAtual) {
    const { data } = await db.auth.getSession();

    // Sem login: volta para a tela de entrada
    if (!data.session) {
        window.location.replace(PAGINA_LOGIN);
        return null;
    }

    // Busca nome e perfil (admin ou viewer)
    const { data: perfil, error } = await db
        .from('profiles')
        .select('nome, role')
        .eq('id', data.session.user.id)
        .single();

    if (error || !perfil) {
        await db.auth.signOut();
        window.location.replace(PAGINA_LOGIN + '?erro=perfil');
        return null;
    }

    // Página só de administrador: quem não é admin volta ao início
    const pagina = PAGINAS.find((p) => p.arquivo === arquivoAtual);
    if (pagina && pagina.soAdmin && perfil.role !== 'admin') {
        window.location.replace(PAGINA_INICIAL);
        return null;
    }

    preencherTopo(perfil, arquivoAtual);
    return { usuario: data.session.user, perfil: perfil };
}

// Preenche nome, selo, menu e botão SAIR
function preencherTopo(perfil, arquivoAtual) {
    const ola = document.getElementById('ola');
    if (ola) ola.textContent = 'Olá, ' + perfil.nome;

    // Selo: aparece só para o Administrador
    const selo = document.getElementById('selo');
    if (selo) {
        if (perfil.role === 'admin') {
            selo.textContent = 'Administrador';
        } else {
            selo.classList.add('oculto');
        }
    }

    const menu = document.getElementById('menu');
    if (menu) {
        menu.innerHTML = '';
        PAGINAS.forEach((p) => {
            if (!p.pronta) return;
            if (p.soAdmin && perfil.role !== 'admin') return;
            const link = document.createElement('a');
            link.href = p.arquivo;
            link.textContent = p.nome;
            if (p.arquivo === arquivoAtual) link.className = 'ativo';
            menu.appendChild(link);
        });
    }

    const botaoSair = document.getElementById('botao-sair');
    if (botaoSair) botaoSair.addEventListener('click', sairDoSistema);

    const ano = document.getElementById('ano-atual');
    if (ano) ano.textContent = new Date().getFullYear();
}


let instaladorPWA;
const btnInstalar = document.getElementById('btnInstalar');

// O navegador deteta que o site pode ser instalado e ativa o botão
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    instaladorPWA = e;
    
    // Revela o botão no próprio site para o utilizador clicar
    if (btnInstalar) {
        btnInstalar.classList.remove('oculto');
    }
});

// Quando o utilizador clica no botão "Instalar Aplicação" no teu site
if (btnInstalar) {
    btnInstalar.addEventListener('click', async () => {
        if (!instaladorPWA) return;
        
        // Abre a janela oficial de instalação do telemóvel
        instaladorPWA.prompt();
        
        const { outcome } = await instaladorPWA.userChoice;
        if (outcome === 'accepted') {
            console.log('Aplicação instalada com sucesso!');
        }
        
        instaladorPWA = null;
        btnInstalar.classList.add('oculto');
    });
}

// Oculta o botão se a aplicação já estiver instalada/aberta
window.addEventListener('appinstalled', () => {
    if (btnInstalar) btnInstalar.classList.add('oculto');
});
