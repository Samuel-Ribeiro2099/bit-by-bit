
const API = '/api';

// =========================================================
// UTILITÁRIOS
// =========================================================

function getToken() {
    return localStorage.getItem('token');
}

function authHeaders() {
    return {
        Authorization: `Bearer ${getToken()}`
    };
}

function escapeHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => {
        const mapa = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };

        return mapa[caractere];
    });
}

function urlSegura(url) {
    if (!url) return '';

    try {
        const u = new URL(url, location.origin);

        if (
            u.protocol === 'http:' ||
            u.protocol === 'https:'
        ) {
            return u.href;
        }
    } catch {
        return '';
    }

    return '';
}

function mostrarMensagem(elemento, mensagem) {
    if (elemento) {
        elemento.textContent = mensagem;
    }
}

async function respostaJSON(response) {
    let data;

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw new Error(
            data.erro || 'Erro na requisição.'
        );
    }

    return data;
}

function abrirModal(id) {
    const modal = document.getElementById(id);

    if (modal) {
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    }
}

function fecharModal(id) {
    const modal = document.getElementById(id);

    if (modal) {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
    }
}

// =========================================================
// MODAIS
// =========================================================

document.querySelectorAll('[data-close]').forEach(botao => {
    botao.addEventListener('click', () => {
        fecharModal(botao.dataset.close);
    });
});

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', evento => {
        if (evento.target === modal) {
            fecharModal(modal.id);
        }
    });
});

document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape') {
        document.querySelectorAll('.modal.open').forEach(modal => {
            fecharModal(modal.id);
        });
    }
});

const abrirLogin = document.getElementById('abrirLogin');

if (abrirLogin) {
    abrirLogin.addEventListener('click', () => {
        abrirModal('modalLogin');
    });
}

const abrirCadastro = document.getElementById('abrirCadastro');

if (abrirCadastro) {
    abrirCadastro.addEventListener('click', () => {
        fecharModal('modalLogin');
        abrirModal('modalCadastro');
    });
}

const abrirRecuperacao = document.getElementById('abrirRecuperacao');

if (abrirRecuperacao) {
    abrirRecuperacao.addEventListener('click', () => {
        fecharModal('modalLogin');
        abrirModal('modalRecuperacao');
    });
}

// =========================================================
// CADASTRO ADMINISTRATIVO
// =========================================================

const formCadastro = document.getElementById('formCadastro');

if (formCadastro) {
    formCadastro.addEventListener('submit', async evento => {
        evento.preventDefault();

        const mensagem = document.getElementById(
            'mensagemCadastro'
        );

        const dados = {
            email: document.getElementById(
                'emailCadastro'
            ).value,

            senha: document.getElementById(
                'senhaCadastro'
            ).value,

            chaveCadastro: document.getElementById(
                'chaveCadastro'
            ).value
        };

        try {
            const response = await fetch(
                `${API}/auth/cadastro`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(dados)
                }
            );

            const data = await respostaJSON(response);

            mostrarMensagem(
                mensagem,
                data.mensagem
            );

            formCadastro.reset();
        } catch (error) {
            mostrarMensagem(
                mensagem,
                error.message
            );
        }
    });
}

// =========================================================
// LOGIN
// =========================================================

const formLogin = document.getElementById('formLogin');

if (formLogin) {
    formLogin.addEventListener('submit', async evento => {
        evento.preventDefault();

        const mensagem = document.getElementById(
            'mensagemLogin'
        );

        const dados = {
            email: document.getElementById(
                'emailLogin'
            ).value,

            senha: document.getElementById(
                'senhaLogin'
            ).value
        };

        try {
            const response = await fetch(
                `${API}/auth/login`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(dados)
                }
            );

            const data = await respostaJSON(response);

            localStorage.setItem(
                'token',
                data.token
            );

            localStorage.setItem(
                'adminEmail',
                data.admin.email
            );

            mostrarMensagem(
                mensagem,
                data.mensagem
            );

            window.location.href = 'admin.html';
        } catch (error) {
            mostrarMensagem(
                mensagem,
                error.message
            );
        }
    });
}

// =========================================================
// RECUPERAÇÃO
// =========================================================

const formRecuperacao = document.getElementById(
    'formRecuperacao'
);

if (formRecuperacao) {
    formRecuperacao.addEventListener(
        'submit',
        async evento => {
            evento.preventDefault();

            const mensagem = document.getElementById(
                'mensagemRecuperacao'
            );

            const email = document.getElementById(
                'emailRecuperacao'
            ).value;

            try {
                const response = await fetch(
                    `${API}/auth/recuperar`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ email })
                    }
                );

                const data = await respostaJSON(response);

                mostrarMensagem(
                    mensagem,
                    data.mensagem
                );
            } catch (error) {
                mostrarMensagem(
                    mensagem,
                    error.message
                );
            }
        }
    );
}

// =========================================================
// CATÁLOGO
// =========================================================

const listaJogos = document.getElementById('listaJogos');

const busca = document.getElementById('busca');

const categoriaFiltro = document.getElementById(
    'categoriaFiltro'
);

const idadeFiltro = document.getElementById(
    'idadeFiltro'
);

async function carregarJogos() {
    if (!listaJogos) return;

    listaJogos.innerHTML = '<p>Carregando jogos...</p>';

    const parametros = new URLSearchParams();

    if (busca && busca.value.trim()) {
        parametros.set(
            'busca',
            busca.value.trim()
        );
    }

    if (categoriaFiltro && categoriaFiltro.value) {
        parametros.set(
            'categoria',
            categoriaFiltro.value
        );
    }

    if (idadeFiltro && idadeFiltro.value) {
        parametros.set(
            'idade',
            idadeFiltro.value
        );
    }

    try {
        const response = await fetch(
            `${API}/jogos?${parametros.toString()}`
        );

        const jogos = await respostaJSON(response);

        if (jogos.length === 0) {
            listaJogos.innerHTML = `
                <div class="empty">
                    Nenhum jogo encontrado.
                </div>
            `;

            return;
        }

        listaJogos.innerHTML = jogos.map(jogo => {
            const imagem = urlSegura(jogo.IMAGEM_URL);

            const imagemHTML = imagem
                ? `<img src="${escapeHTML(imagem)}"
                     alt="Capa de ${escapeHTML(jogo.TITULO)}">`
                : `<div class="empty">Sem imagem</div>`;

            return `
                <article class="game-card">
                    ${imagemHTML}

                    <div class="game-card-body">

                        <h3>
                            ${escapeHTML(jogo.TITULO)}
                        </h3>

                        <div>
                            <span class="tag tag-category">
                                ${escapeHTML(jogo.CATEGORIA)}
                            </span>

                            <span class="tag tag-developer">
                                ${escapeHTML(jogo.DESENVOLVEDOR)}
                            </span>

                            <span class="tag tag-age">
                                ${escapeHTML(jogo.FAI_ETA)}
                            </span>
                        </div>

                        <p>
                            ${escapeHTML(
                                (jogo.DESCRICAO || '')
                                .slice(0, 120)
                            )}
                        </p>

                        <a
                            class="btn btn-purple"
                            href="jogo.html?id=${jogo.ID_JOGO}"
                        >
                            Ver detalhes
                        </a>

                    </div>
                </article>
            `;
        }).join('');

    } catch (error) {
        listaJogos.innerHTML = `
            <div class="empty">
                Erro ao carregar os jogos.
            </div>
        `;

        console.error(error);
    }
}

if (listaJogos) {
    carregarJogos();
}

if (busca) {
    const btnBuscar = document.getElementById(
        'btnBuscar'
    );

    if (btnBuscar) {
        btnBuscar.addEventListener(
            'click',
            carregarJogos
        );
    }

    busca.addEventListener('keydown', evento => {
        if (evento.key === 'Enter') {
            carregarJogos();
        }
    });
}

if (categoriaFiltro) {
    categoriaFiltro.addEventListener(
        'change',
        carregarJogos
    );
}

if (idadeFiltro) {
    idadeFiltro.addEventListener(
        'change',
        carregarJogos
    );
}

const limparFiltros = document.getElementById(
    'limparFiltros'
);

if (limparFiltros) {
    limparFiltros.addEventListener('click', () => {
        if (busca) busca.value = '';

        if (categoriaFiltro) {
            categoriaFiltro.value = '';
        }

        if (idadeFiltro) {
            idadeFiltro.value = '';
        }

        carregarJogos();
    });
}

document.querySelectorAll(
    '.suggestion-btn'
).forEach(botao => {
    botao.addEventListener('click', () => {
        if (busca) {
            busca.value = botao.dataset.search;
        }

        carregarJogos();
    });
});

// =========================================================
// DETALHES DO JOGO
// =========================================================

const detalhesJogo = document.getElementById(
    'detalhesJogo'
);

async function carregarDetalhes() {
    if (!detalhesJogo) return;

    const params = new URLSearchParams(
        window.location.search
    );

    const id = params.get('id');

    if (!id || !/^\d+$/.test(id)) {
        detalhesJogo.innerHTML = `
            <div class="empty">
                ID de jogo inválido.
            </div>
        `;

        return;
    }

    try {
        const response = await fetch(
            `${API}/jogos/${id}`
        );

        const jogo = await respostaJSON(response);

        const imagem = urlSegura(jogo.IMAGEM_URL);

        const imagemHTML = imagem
            ? `<img class="details-image"
                src="${escapeHTML(imagem)}"
                alt="${escapeHTML(jogo.TITULO)}">`
            : `<div class="empty">Sem imagem</div>`;

        const execucao = urlSegura(
            jogo.LINK_EXECUCAO
        );

        const download = urlSegura(
            jogo.LINK_DOWNLOAD
        );

        let botoes = '';

        if (execucao) {
            botoes += `
                <a
                    class="btn btn-purple"
                    href="${escapeHTML(execucao)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Jogar / Saiba Mais
                </a>
            `;
        }

        if (download) {
            botoes += `
                <a
                    class="btn btn-dark"
                    href="${escapeHTML(download)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Download
                </a>
            `;
        }

        if (!execucao && download) {
            botoes = `
                <a
                    class="btn btn-purple"
                    href="${escapeHTML(download)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Download — jogo não disponível online
                </a>
            `;
        }

        if (!execucao && !download) {
            botoes = `
                <p>
                    Links de acesso ainda não disponíveis.
                </p>
            `;
        }

        detalhesJogo.innerHTML = `
            ${imagemHTML}

            <h1>
                ${escapeHTML(jogo.TITULO)}
            </h1>

            <div>
                <span class="tag tag-category">
                    ${escapeHTML(jogo.CATEGORIA)}
                </span>

                <span class="tag tag-developer">
                    ${escapeHTML(jogo.DESENVOLVEDOR)}
                </span>

                <span class="tag tag-age">
                    ${escapeHTML(jogo.FAI_ETA)}
                </span>
            </div>

            <div class="details-actions">
                ${botoes}
            </div>

            <section class="details-description">
                <h2>Descrição</h2>

                <p>
                    ${escapeHTML(jogo.DESCRICAO)}
                </p>
            </section>
        `;

    } catch (error) {
        detalhesJogo.innerHTML = `
            <div class="empty">
                Não foi possível carregar o jogo.
            </div>
        `;
    }
}

carregarDetalhes();

// =========================================================
// ADMIN
// =========================================================

const adminEmail = document.getElementById(
    'adminEmail'
);

const formJogo = document.getElementById(
    'formJogo'
);

const listaAdminJogos = document.getElementById(
    'listaAdminJogos'
);

const listaSugestoes = document.getElementById(
    'listaSugestoes'
);

const mensagemAdmin = document.getElementById(
    'mensagemAdmin'
);

const mensagemSugestoes = document.getElementById(
    'mensagemSugestoes'
);

function exigirLogin() {
    if (!getToken()) {
        window.location.href = 'index.html';
        return false;
    }

    return true;
}

if (
    adminEmail ||
    formJogo ||
    listaAdminJogos ||
    listaSugestoes
) {
    exigirLogin();
}

if (adminEmail) {
    adminEmail.textContent =
        localStorage.getItem('adminEmail') ||
        'Administrador';
}

// =========================================================
// LOGOUT
// =========================================================

const logout = document.getElementById('logout');

if (logout) {
    logout.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('adminEmail');

        window.location.href = 'index.html';
    });
}

// =========================================================
// CARREGAR JOGOS ADMIN
// =========================================================

async function carregarAdminJogos() {
    if (!listaAdminJogos) return;

    try {
        const response = await fetch(
            `${API}/jogos`
        );

        const jogos = await respostaJSON(response);

        listaAdminJogos.innerHTML = jogos.map(jogo => `
            <div class="admin-item">

                <div class="admin-item-content">

                    <h3>
                        ${escapeHTML(jogo.TITULO)}
                    </h3>

                    <p>
                        ${escapeHTML(jogo.CATEGORIA)}
                        ·
                        ${escapeHTML(jogo.FAI_ETA)}
                    </p>

                </div>

                <div class="admin-item-actions">

                    <button
                        class="btn btn-purple editarJogo"
                        data-id="${jogo.ID_JOGO}"
                    >
                        Editar
                    </button>

                    <button
                        class="btn btn-danger excluirJogo"
                        data-id="${jogo.ID_JOGO}"
                    >
                        Excluir
                    </button>

                </div>

            </div>
        `).join('');

        document.querySelectorAll(
            '.editarJogo'
        ).forEach(botao => {
            botao.addEventListener(
                'click',
                () => preencherEdicao(
                    botao.dataset.id
                )
            );
        });

        document.querySelectorAll(
            '.excluirJogo'
        ).forEach(botao => {
            botao.addEventListener(
                'click',
                () => excluirJogo(
                    botao.dataset.id
                )
            );
        });

    } catch (error) {
        listaAdminJogos.textContent =
            'Erro ao carregar jogos.';
    }
}

// =========================================================
// EDITAR
// =========================================================

async function preencherEdicao(id) {
    try {
        const response = await fetch(
            `${API}/jogos/${id}`
        );

        const jogo = await respostaJSON(response);

        document.getElementById(
            'idJogo'
        ).value = jogo.ID_JOGO;

        document.getElementById(
            'titulo'
        ).value = jogo.TITULO;

        document.getElementById(
            'categoria'
        ).value = jogo.CATEGORIA;

        document.getElementById(
            'desenvolvedor'
        ).value = jogo.DESENVOLVEDOR;

        document.getElementById(
            'faixaEtaria'
        ).value = jogo.FAI_ETA;

        document.getElementById(
            'linkExecucao'
        ).value = jogo.LINK_EXECUCAO || '';

        document.getElementById(
            'linkDownload'
        ).value = jogo.LINK_DOWNLOAD || '';

        document.getElementById(
            'descricao'
        ).value = jogo.DESCRICAO || '';

        document.getElementById(
            'cadastro'
        ).scrollIntoView({
            behavior: 'smooth'
        });

        mostrarMensagem(
            mensagemAdmin,
            'Editando jogo. Ao salvar, as alterações ' +
            'serão submetidas à aprovação.'
        );

    } catch (error) {
        mostrarMensagem(
            mensagemAdmin,
            'Erro ao carregar jogo.'
        );
    }
}

// =========================================================
// EXCLUIR
// =========================================================

async function excluirJogo(id) {
    if (!confirm('Deseja excluir este jogo?')) {
        return;
    }

    try {
        const response = await fetch(
            `${API}/jogos/${id}`,
            {
                method: 'DELETE',
                headers: authHeaders()
            }
        );

        const data = await respostaJSON(response);

        mostrarMensagem(
            mensagemAdmin,
            data.mensagem
        );

        carregarAdminJogos();
    } catch (error) {
        mostrarMensagem(
            mensagemAdmin,
            error.message
        );
    }
}

// =========================================================
// SALVAR JOGO
// =========================================================

if (formJogo) {
    formJogo.addEventListener(
        'submit',
        async evento => {
            evento.preventDefault();

            const dados = new FormData();

            dados.append(
                'titulo',
                document.getElementById('titulo').value
            );

            dados.append(
                'categoria',
                document.getElementById('categoria').value
            );

            dados.append(
                'desenvolvedor',
                document.getElementById('desenvolvedor').value
            );

            dados.append(
                'faixaEtaria',
                document.getElementById('faixaEtaria').value
            );

            dados.append(
                'linkExecucao',
                document.getElementById('linkExecucao').value
            );

            dados.append(
                'linkDownload',
                document.getElementById('linkDownload').value
            );

            dados.append(
                'descricao',
                document.getElementById('descricao').value
            );

            const imagem = document.getElementById(
                'imagem'
            ).files[0];

            if (imagem) {
                dados.append('imagem', imagem);
            }

            const id = document.getElementById(
                'idJogo'
            ).value;

            const metodo = id ? 'PUT' : 'POST';

            const url = id
                ? `${API}/jogos/${id}`
                : `${API}/jogos`;

            try {
                const response = await fetch(
                    url,
                    {
                        method: metodo,
                        headers: authHeaders(),
                        body: dados
                    }
                );

                const data = await respostaJSON(response);

                mostrarMensagem(
                    mensagemAdmin,
                    data.mensagem
                );

                formJogo.reset();

                document.getElementById(
                    'idJogo'
                ).value = '';

                carregarAdminJogos();
                carregarSugestoes();

            } catch (error) {
                mostrarMensagem(
                    mensagemAdmin,
                    error.message
                );
            }
        }
    );
}

// =========================================================
// LIMPAR FORMULÁRIO
// =========================================================

const cancelarEdicao = document.getElementById(
    'cancelarEdicao'
);

if (cancelarEdicao && formJogo) {
    cancelarEdicao.addEventListener(
        'click',
        () => {
            formJogo.reset();

            document.getElementById(
                'idJogo'
            ).value = '';

            mostrarMensagem(
                mensagemAdmin,
                'Formulário limpo.'
            );
        }
    );
}

// =========================================================
// SUGESTÕES
// =========================================================

async function carregarSugestoes() {
    if (!listaSugestoes) return;

    try {
        const response = await fetch(
            `${API}/sugestoes`,
            {
                headers: authHeaders()
            }
        );

        const sugestoes = await respostaJSON(response);

        if (sugestoes.length === 0) {
            listaSugestoes.innerHTML = `
                <div class="empty">
                    Nenhuma sugestão pendente.
                </div>
            `;

            return;
        }

        listaSugestoes.innerHTML = sugestoes.map(sug => {
            const dados = typeof sug.DADOS_PROPOSTOS === 'string'
                ? JSON.parse(sug.DADOS_PROPOSTOS)
                : sug.DADOS_PROPOSTOS;

            return `
                <div class="admin-item">

                    <div class="admin-item-content">

                        <h3>
                            ${escapeHTML(sug.TITULO_JOGO)}
                        </h3>

                        <p>
                            Autor:
                            ${escapeHTML(sug.AUTOR)}
                        </p>

                        <p>
                            ${escapeHTML(sug.DES_ALTERACAO)}
                        </p>

                        <details>
                            <summary>Dados propostos</summary>

                            <pre>${escapeHTML(
                                JSON.stringify(dados, null, 2)
                            )}</pre>
                        </details>

                    </div>

                    <div class="admin-item-actions">

                        <button
                            class="btn btn-success aprovarSug"
                            data-id="${sug.ID_SUG}"
                        >
                            Aprovar
                        </button>

                        <button
                            class="btn btn-danger rejeitarSug"
                            data-id="${sug.ID_SUG}"
                        >
                            Rejeitar
                        </button>

                    </div>

                </div>
            `;
        }).join('');

        document.querySelectorAll(
            '.aprovarSug'
        ).forEach(botao => {
            botao.addEventListener(
                'click',
                () => processarSugestao(
                    botao.dataset.id,
                    'aprovar'
                )
            );
        });

        document.querySelectorAll(
            '.rejeitarSug'
        ).forEach(botao => {
            botao.addEventListener(
                'click',
                () => processarSugestao(
                    botao.dataset.id,
                    'rejeitar'
                )
            );
        });

    } catch (error) {
        listaSugestoes.innerHTML = `
            <div class="empty">
                Erro ao carregar sugestões.
            </div>
        `;
    }
}

async function processarSugestao(id, acao) {
    try {
        const response = await fetch(
            `${API}/sugestoes/${id}/${acao}`,
            {
                method: 'POST',
                headers: authHeaders()
            }
        );

        const data = await respostaJSON(response);

        mostrarMensagem(
            mensagemSugestoes,
            data.mensagem
        );

        carregarSugestoes();
        carregarAdminJogos();

    } catch (error) {
        mostrarMensagem(
            mensagemSugestoes,
            error.message
        );
    }
}

if (listaAdminJogos) {
    carregarAdminJogos();
}

if (listaSugestoes) {
    carregarSugestoes();
}
