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
    { arquivo: 'entradas.html',      nome: 'Entradas',      soAdmin: true,  pronta: false },
    { arquivo: 'saidas.html',        nome: 'Saídas',        soAdmin: true,  pronta: false },
    { arquivo: 'historico.html',     nome: 'Histórico',     soAdmin: false, pronta: false },
    { arquivo: 'relatorios.html',    nome: 'Relatórios',    soAdmin: false,
