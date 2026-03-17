/**
 * script.js
 * Toda a lógica da SPA (buscando o TSV, parse e filtragem iterativa)
 */

// Estado global da aplicação para estarmos preparados para expansão futura
const state = {
    itinerary: [], // Guardará todos os dados parseados
    filters: {
        dia: 'todos',
        categoria: 'todos'
    }
};

// Mapeamento de categorias para ícones (fallback caso não exista na string)
const categoryIcons = {
    transporte: '✈️',
    hotel: '🏨',
    cafe: '☕',
    restaurante: '🍽️',
    ponto_turistico: '📸',
    museu: '🖼️',
    parque: '🌳',
    shopping: '🛍️',
    evento: '🎫',
};

// Inicialização da app após carregamento do DOM
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    init();
});

async function init() {
    setupThemeToggle();
    setupFilterListeners();
    await loadData();
    renderCards();
}

/**
 * Controla e inicializa o tema escuro/claro
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    
    // Verifica a preferência do sistema, se não houver preferência local
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }
}

/**
 * Listener do botão Dark/Light Mode
 */
function setupThemeToggle() {
    const themeBtn = document.getElementById('theme-toggle');
    if (!themeBtn) return;
    
    themeBtn.addEventListener('click', () => {
        let currentTheme = document.documentElement.getAttribute('data-theme');
        let newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

/**
 * Registra os Listeners de eventos para os botões de filtro.
 */
function setupFilterListeners() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.dataset.type; // 'dia' ou 'categoria'
            const value = e.target.dataset.value;
            
            // Atualiza o estado de filtro selecionado
            state.filters[type] = value;
            
            // Alterna a classe 'active' entre os botões do MESMO TIPO de filtro
            const siblings = document.querySelectorAll(`.filter-btn[data-type="${type}"]`);
            siblings.forEach(s => s.classList.remove('active'));
            e.target.classList.add('active');
            
            // Renderiza novamente a lista baseado na nova combinação
            renderCards();
        });
    });
}

/**
 * Busca o arquivo TSV externo e popula o state.itinerary
 */
async function loadData() {
    try {
        const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSy-CiVuVKaoApS5_-C1g0lkEnF8El-JrRqmf6A5gQPGXC0wu_MfKLC1RZjUWGYpsUtgAbieG9Yd9nB/pub?output=tsv';
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Status de erro HTTP: ${response.status} ao carregar TSV.`);
        }
        
        const tsvText = await response.text();
        state.itinerary = parseTSV(tsvText);
        
    } catch (error) {
        console.error("Oops! Houve um erro ao obter os dados:", error);
        
        const listDiv = document.getElementById('itinerary-list');
        listDiv.innerHTML = `
            <div class="empty-state">
                <p>⚠️ <strong>Erro:</strong> Não foi possível carregar o arquivo <em>roteiro.tsv</em>.</p>
                <p style="margin-top: 10px; font-size: 0.9em;">Se você estiver abrindo o arquivo index.html direto no navegador (protocolo file://), o navegador pode bloquear por motivos de segurança (CORS).<br>Use um servidor local (ex: extensão "Live Server" do VS Code) para testar perfeitamente.</p>
            </div>
        `;
    }
}

/**
 * Converte o conteúdo de texto (TSV) para um array de objetos Javascript
 */
function parseTSV(tsvText) {
    const lines = tsvText.trim().split('\n');
    
    // Ignorar arquivos vazios (menos de 2 linhas)
    if (lines.length < 2) return [];

    // Linha de cabeçalho (usada como chaves dos objetos)
    // Garantimos que tiramos \r caso estejamos em line-endings no Windows
    const headers = lines[0].replace(/\r/g, '').split('\t').map(h => h.trim());

    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const lineStr = lines[i].replace(/\r/g, '');
        
        // Ignora linhas que estejam totalmente em branco
        if (lineStr.trim() === "") continue;

        const currentLineValues = lineStr.split('\t');

        const item = {};
        for (let j = 0; j < headers.length; j++) {
            item[headers[j]] = currentLineValues[j] ? currentLineValues[j].trim() : '';
        }
        data.push(item);
    }
    
    return data;
}

/**
 * Filtra as informações usando o "state" atual e renderiza no documento
 */
function renderCards() {
    const container = document.getElementById('itinerary-list');
    
    // Filtro usando lógica AND: Deve satisfazer ambos Dia E Categoria
    const filteredItinerary = state.itinerary.filter(item => {
        // Ignora espaços acidentais nas chaves
        const itemDia = (item.dia || '').toLowerCase();
        const itemCat = (item.categoria || '').toLowerCase();
        
        const matchDay = state.filters.dia === 'todos' || itemDia === state.filters.dia;
        const matchCategory = state.filters.categoria === 'todos' || itemCat === state.filters.categoria;
        
        return matchDay && matchCategory;
    });
    
    container.innerHTML = '';
    
    // Trata UI se nada for encontrado nos filtros
    if (filteredItinerary.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                🤷 Não encontramos atividades para esta combinação de filtros.
            </div>
        `;
        return;
    }
    
    // Renderização dos cards via template strings com HTML limpo
    filteredItinerary.forEach(item => {
        // Resolve ícone se estiver dentro da lista. Default para pinheiro.
        const catKey = (item.categoria || '').toLowerCase();
        const icon = categoryIcons[catKey] || '📍';
        
        // Só renderiza partes se elas existirem (evita campos vazios sujos)
        const locationHTML = item.local ? `<div class="card-location">📍 ${item.local}</div>` : '';
        const obsHTML = item.obs ? `<div class="card-obs">${item.obs}</div>` : '';
        
        const cardHtml = `
            <article class="card" data-category="${catKey}">
                <div class="card-header">
                    <h3 class="card-title">${icon} ${item.titulo}</h3>
                    <div class="card-time">
                        <span class="day-label">${item.dia}</span> • <span>${item.horario}</span>
                    </div>
                </div>
                <div class="card-body">
                    ${locationHTML}
                    ${obsHTML}
                </div>
            </article>
        `;
        
        container.insertAdjacentHTML('beforeend', cardHtml);
    });
}
