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
    { arquivo: 'dashboard.html',     nome: 'Dashboard',     soAdmin: false, pronta: true },
    { arquivo: 'entradas.html',      nome: 'Entradas',      soAdmin: true,  pronta: true },
    { arquivo: 'saidas.html',        nome: 'Saídas',        soAdmin: true,  pronta: true },
    { arquivo: 'historico.html',     nome: 'Histórico',     soAdmin: false, pronta: true },
    { arquivo: 'membros.html',       nome: 'Membros',       soAdmin: false, pronta: false },
    { arquivo: 'relatorios.html',    nome: 'Relatórios',    soAdmin: false, pronta: true },
    { arquivo: 'configuracoes.html', nome: 'Configurações', soAdmin: true,  pronta: true }
];

// ---------- Esconder valores (botão de olho) ----------
// A escolha fica guardada neste aparelho.
function lerValoresOcultos() {
    try { return localStorage.getItem('valoresOcultos') === '1'; } catch (e) { return false; }
}
const VALORES_OCULTOS = lerValoresOcultos();

function alternarValores() {
    try { localStorage.setItem('valoresOcultos', VALORES_OCULTOS ? '0' : '1'); } catch (e) {}
    window.location.reload();
}

const ICONE_OLHO = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICONE_OLHO_RISCADO = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

// ---------- Funções de dinheiro e data ----------
function pad(n) {
    return String(n).padStart(2, '0');
}

function iso(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function brl(valor) {
    if (VALORES_OCULTOS) return 'R$ ****';
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

// Preenche nome, selo, menu, botão do olho e botão SAIR
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
    if (botaoSair) {
        botaoSair.addEventListener('click', sairDoSistema);

        // Botão de olho, ao lado do SAIR
        const grupo = document.createElement('div');
        grupo.style.cssText = 'display:flex;gap:8px;align-items:center;flex:0 0 auto';
        botaoSair.parentNode.insertBefore(grupo, botaoSair);

        const olho = document.createElement('button');
        olho.type = 'button';
        olho.className = 'botao-sair';
        olho.style.cssText = 'display:flex;align-items:center;justify-content:center;padding:8px 12px';
        olho.innerHTML = VALORES_OCULTOS ? ICONE_OLHO_RISCADO : ICONE_OLHO;
        olho.setAttribute('aria-label', VALORES_OCULTOS ? 'Mostrar valores' : 'Esconder valores');
        olho.title = VALORES_OCULTOS ? 'Mostrar valores' : 'Esconder valores';
        if (VALORES_OCULTOS) olho.style.color = '#c59b27';
        olho.addEventListener('click', alternarValores);

        grupo.appendChild(olho);
        grupo.appendChild(botaoSair);
    }

    const ano = document.getElementById('ano-atual');
    if (ano) ano.textContent = new Date().getFullYear();
}

// ---------- App instalável (PWA) ----------
(function configurarApp() {
    const adicionar = (tag, atributos) => {
        const e = document.createElement(tag);
        Object.keys(atributos).forEach((k) => e.setAttribute(k, atributos[k]));
        document.head.appendChild(e);
    };
    adicionar('link', { rel: 'manifest', href: '/manifest.json' });
    adicionar('link', { rel: 'icon', type: 'image/png', href: '/icon-192.png' });
    adicionar('link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' });
    adicionar('meta', { name: 'theme-color', content: '#060200' });
    adicionar('meta', { name: 'mobile-web-app-capable', content: 'yes' });
    adicionar('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
    adicionar('meta', { name: 'apple-mobile-web-app-title', content: 'Tesouraria Kefas' });
    adicionar('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        });
    }
})();

// ---------- Botão "Instalar aplicação" (só aparece se existir um elemento com id btnInstalar) ----------
let instaladorPWA;
const btnInstalar = document.getElementById('btnInstalar');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    instaladorPWA = e;
    if (btnInstalar) {
        btnInstalar.classList.remove('oculto');
    }
});

if (btnInstalar) {
    btnInstalar.addEventListener('click', async () => {
        if (!instaladorPWA) return;
        instaladorPWA.prompt();
        await instaladorPWA.userChoice;
        instaladorPWA = null;
        btnInstalar.classList.add('oculto');
    });
}

window.addEventListener('appinstalled', () => {
    if (btnInstalar) btnInstalar.classList.add('oculto');
});
