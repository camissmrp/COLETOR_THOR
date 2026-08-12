"use strict";


/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */

let configuracao = {};


let sessao = {

    usuario: null,

    nomeUsuario: "",

    inventario: "",

    endereco: "",

    totalEndereco: 0,

    totalColeta: 0

};


let cameraStream = null;

let cameraAtiva = false;

let leitorZXing = null;


/*
 * Produtos já coletados nesta sessão/endereço.
 *
 * Evita duplicidade imediata sem precisar esperar
 * a resposta do servidor.
 */

let produtosColetados =
    new Set();


/*
 * Evita que o mesmo código seja processado
 * repetidamente pela câmera.
 */

let ultimoCodigo = "";

let ultimoCodigoHora = 0;


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "COLETOR THOR iniciado."
        );


        /*
         * Garante que a tela inicial apareça.
         */

        mostrarTelaLogin();


        /*
         * Configura botão inicial.
         */

        const btnEntrar =
            document.getElementById(
                "btnEntrar"
            );


        if (btnEntrar) {

            btnEntrar.addEventListener(
                "click",
                iniciarColeta
            );

        }


        /*
         * Botão voltar.
         */

        const btnVoltar =
            document.getElementById(
                "btnVoltar"
            );


        if (btnVoltar) {

            btnVoltar.addEventListener(
                "click",
                voltarParaLogin
            );

        }


        /*
         * Campo manual.
         */

        configurarCampoManual();


        /*
         * Carrega configuração.
         *
         * IMPORTANTE:
         * NÃO inicia a câmera aqui.
         */

        carregarConfiguracao();

    }
);


/* ============================================================
   MOSTRAR TELA LOGIN
   ============================================================ */

function mostrarTelaLogin() {

    const login =
        document.getElementById(
            "login"
        );


    const coleta =
        document.getElementById(
            "coleta"
        );


    if (login) {

        login.style.display =
            "flex";

    }


    if (coleta) {

        coleta.style.display =
            "none";

    }

}


/* ============================================================
   MOSTRAR TELA COLETA
   ============================================================ */

function mostrarTelaColeta() {

    const login =
        document.getElementById(
            "login"
        );


    const coleta =
        document.getElementById(
            "coleta"
        );


    if (login) {

        login.style.display =
            "none";

    }


    if (coleta) {

        coleta.style.display =
            "flex";

    }

}


/* ============================================================
   CARREGAR CONFIGURAÇÃO
   ============================================================ */

async function carregarConfiguracao() {

    try {

        if (
            typeof API ===
            "undefined"
        ) {

            throw new Error(
                "API não definida no config.js"
            );

        }


        const resposta =
            await fetch(
                API +
                "?acao=config",
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!resposta.ok) {

            throw new Error(
                "Erro HTTP " +
                resposta.status
            );

        }


        const dados =
            await resposta.json();


        console.log(
            "Configuração:",
            dados
        );


        configuracao =
            dados;


        preencherUsuarios();


    }
    catch (erro) {

        console.error(
            "Erro ao carregar configuração:",
            erro
        );


        mostrarLoginStatus(
            "Erro ao carregar configuração.",
            "erro"
        );

    }

}


/* ============================================================
   PREENCHER USUÁRIOS
   ============================================================ */

function preencherUsuarios() {

    const select =
        document.getElementById(
            "usuario"
        );


    if (!select) {

        return;

    }


    select.innerHTML =
        "";


    const usuarios =
        configuracao.Usuarios ||
        [];


    if (
        usuarios.length ===
        0
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            "";


        option.textContent =
            "Nenhum usuário";


        select.appendChild(
            option
        );


        return;

    }


    usuarios.forEach(
        function (usuario) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                usuario.id;


            option.textContent =
                usuario.nome;


            select.appendChild(
                option
            );

        }
    );


    /*
     * Carrega primeiro usuário.
     */

    atualizarConfiguracaoUsuario(
        usuarios[0].id
    );


    /*
     * Troca de usuário.
     */

    select.addEventListener(
        "change",
        function () {

            atualizarConfiguracaoUsuario(
                this.value
            );

        }
    );

}


/* ============================================================
   CONFIGURAÇÃO DO USUÁRIO
   ============================================================ */

function atualizarConfiguracaoUsuario(
    usuarioId
) {

    const campoInventario =
        document.getElementById(
            "inventario"
        );


    const campoEndereco =
        document.getElementById(
            "endereco"
        );


    if (
        !campoInventario ||
        !campoEndereco
    ) {

        return;

    }


    const configuracoes =
        configuracao.Configuracoes ||
        [];


    const configUsuario =
        configuracoes.find(
            function (config) {

                return (
                    String(
                        config.usuario
                    ) ===
                    String(
                        usuarioId
                    )
                );

            }
        );


    if (!configUsuario) {

        campoInventario.value =
            "";

        campoEndereco.value =
            "";

        return;

    }


    campoInventario.value =
        configUsuario.inventario ||
        "";


    campoEndereco.value =
        configUsuario.enderecoAtual ||
        "";

}


/* ============================================================
   INICIAR COLETA
   ============================================================ */

async function iniciarColeta() {

    const btn =
        document.getElementById(
            "btnEntrar"
        );


    const usuario =
        document.getElementById(
            "usuario"
        );


    const inventario =
        document.getElementById(
            "inventario"
        );


    const endereco =
        document.getElementById(
            "endereco"
        );


    if (
        !usuario ||
        !inventario ||
        !endereco
    ) {

        return;

    }


    /*
     * Desabilita enquanto inicia.
     */

    if (btn) {

        btn.disabled =
            true;

    }


    sessao.usuario =
        usuario.value;


    if (
        usuario.selectedIndex >=
        0
    ) {

        sessao.nomeUsuario =
            usuario.options[
                usuario.selectedIndex
            ].text;

    }


    sessao.inventario =
        inventario.value.trim();


    sessao.endereco =
        endereco.value.trim();


    /*
     * Validação.
     */

    if (
        !sessao.usuario
    ) {

        mostrarLoginStatus(
            "Selecione o usuário.",
            "erro"
        );


        if (btn) {
            btn.disabled = false;
        }


        return;

    }


    if (
        !sessao.inventario
    ) {

        mostrarLoginStatus(
            "Informe o inventário.",
            "erro"
        );


        if (btn) {
            btn.disabled = false;
        }


        return;

    }


    if (
        !sessao.endereco
    ) {

        mostrarLoginStatus(
            "Informe o endereço.",
            "erro"
        );


        if (btn) {
            btn.disabled = false;
        }


        return;

    }


    /*
     * Zera contadores.
     */

    sessao.totalEndereco =
        0;


    sessao.totalColeta =
        0;


    produtosColetados =
        new Set();


    atualizarTelaColeta();


    /*
     * Troca para a tela de coleta.
     */

    mostrarTelaColeta();


    /*
     * Agora sim abre a câmera.
     *
     * Isso garante que ela não abra
     * na tela inicial.
     */

    try {

        await iniciarCamera();

    }
    catch (erro) {

        console.error(
            "Erro câmera:",
            erro
        );

    }


    /*
     * Foco no campo manual.
     */

    setTimeout(
        function () {

            const campo =
                document.getElementById(
                    "codigoManual"
                );


            if (campo) {

                campo.focus();

            }

        },
        300
    );


    if (btn) {

        btn.disabled =
            false;

    }

}


/* ============================================================
   ATUALIZAR TELA DE COLETA
   ============================================================ */

function atualizarTelaColeta() {

    definirTexto(
        "lblUsuario",
        sessao.nomeUsuario ||
        "-"
    );


    definirTexto(
        "lblInventario",
        sessao.inventario ||
        "-"
    );


    definirTexto(
        "lblEndereco",
        sessao.endereco ||
        "-"
    );


    definirTexto(
        "contadorEndereco",
        sessao.totalEndereco
    );


    definirTexto(
        "contadorTotal",
        sessao.totalColeta
    );

}


/* ============================================================
   DEFINIR TEXTO
   ============================================================ */

function definirTexto(
    id,
    valor
) {

    const elemento =
        document.getElementById(
            id
        );


    if (elemento) {

        elemento.textContent =
            valor;

    }

}


/* ============================================================
   CAMPO MANUAL
   ============================================================ */

function configurarCampoManual() {

    const campo =
        document.getElementById(
            "codigoManual"
        );


    const botao =
        document.getElementById(
            "btnRegistrar"
        );


    if (campo) {

        campo.addEventListener(
            "keydown",
            function (evento) {

                if (
                    evento.key ===
                    "Enter"
                ) {

                    evento.preventDefault();


                    processarCodigo(
                        campo.value
                    );

                }

            }
        );

    }


    if (botao) {

        botao.addEventListener(
            "click",
            function () {

                if (!campo) {

                    return;

                }


                processarCodigo(
                    campo.value
                );

            }
        );

    }

}


/* ============================================================
   INICIAR CÂMERA
   ============================================================ */

async function iniciarCamera() {

    const video =
        document.getElementById(
            "camera"
        );


    if (!video) {

        console.error(
            "Elemento camera não encontrado."
        );

        return;

    }


    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        mostrarStatus(
            "Este navegador não permite câmera.",
            "erro"
        );

        return;

    }


    /*
     * Se já estiver ativa, não abre novamente.
     */

    if (cameraAtiva) {

        return;

    }


    try {

        console.log(
            "Solicitando câmera..."
        );


        cameraStream =
            await navigator.mediaDevices
                .getUserMedia({

                    video: {

                        facingMode: {
                            ideal: "environment"
                        },

                        width: {
                            ideal: 1280
                        },

                        height: {
                            ideal: 720
                        }

                    },

                    audio: false

                });


        video.srcObject =
            cameraStream;


        video.setAttribute(
            "playsinline",
            ""
        );


        video.setAttribute(
            "autoplay",
            ""
        );


        video.muted =
            true;


        await video.play();


        cameraAtiva =
            true;


        console.log(
            "Câmera iniciada."
        );


        /*
         * Inicia ZXing.
         */

        iniciarZXing();


    }
    catch (erro) {

        cameraAtiva =
            false;


        console.error(
            "Erro ao abrir câmera:",
            erro
        );


        if (
            erro.name ===
            "NotAllowedError"
        ) {

            mostrarStatus(
                "Permita o acesso à câmera.",
                "erro"
            );

        }
        else {

            mostrarStatus(
                "Não foi possível abrir a câmera.",
                "erro"
            );

        }

    }

}


/* ============================================================
   ZXING
   ============================================================ */

function iniciarZXing() {

    const video =
        document.getElementById(
            "camera"
        );


    if (!video) {

        return;

    }


    if (
        typeof ZXingBrowser ===
        "undefined"
    ) {

        console.error(
            "ZXingBrowser não carregado."
        );


        mostrarStatus(
            "Leitor de código não carregado.",
            "erro"
        );


        return;

    }


    try {

        leitorZXing =
            new ZXingBrowser
                .BrowserMultiFormatReader();


        leitorZXing.decodeFromVideoElement(
            video,
            function (
                resultado,
                erro
            ) {

                if (!resultado) {

                    return;

                }


                let codigo =
                    "";


                try {

                    codigo =
                        resultado.getText();

                }
                catch (e) {

                    codigo =
                        resultado.text ||
                        "";

                }


                codigo =
                    limparCodigo(
                        codigo
                    );


                if (codigo) {

                    processarCodigo(
                        codigo
                    );

                }

            }
        );


        console.log(
            "ZXing ativo."
        );

    }
    catch (erro) {

        console.error(
            "Erro ZXing:",
            erro
        );

    }

}


/* ============================================================
   LIMPAR CÓDIGO
   ============================================================ */

function limparCodigo(
    codigo
) {

    return String(
        codigo ||
        ""
    )
        .trim()
        .replace(
            /[\r\n\t]/g,
            ""
        );

}


/* ============================================================
   PROCESSAR CÓDIGO
   ============================================================ */

function processarCodigo(
    codigo
) {

    codigo =
        limparCodigo(
            codigo
        );


    if (!codigo) {

        return;

    }


    /*
     * Evita o mesmo código sendo lido
     * várias vezes pela câmera.
     */

    const agora =
        Date.now();


    if (
        codigo ===
        ultimoCodigo
        &&
        (
            agora -
            ultimoCodigoHora
        ) < 1200
    ) {

        return;

    }


    ultimoCodigo =
        codigo;


    ultimoCodigoHora =
        agora;


    console.log(
        "Código:",
        codigo
    );


    /*
     * REGRA:
     *
     * começa com LETRA = ENDEREÇO
     *
     * começa com NÚMERO = PRODUTO
     */

    if (
        /^[A-Za-z]/.test(
            codigo
        )
    ) {

        processarEndereco(
            codigo.toUpperCase()
        );


        limparCampo();


        return;

    }


    if (
        /^[0-9]/.test(
            codigo
        )
    ) {

        processarProduto(
            codigo
        );


        limparCampo();


        return;

    }


    mostrarUltimaLeitura(
        codigo +
        " - INVÁLIDO"
    );


    mostrarStatus(
        "Código inválido.",
        "erro"
    );


    limparCampo();

}


/* ============================================================
   PROCESSAR ENDEREÇO
   ============================================================ */

async function processarEndereco(
    novoEndereco
) {

    console.log(
        "Novo endereço:",
        novoEndereco
    );


    /*
     * Atualiza imediatamente a tela.
     */

    sessao.endereco =
        novoEndereco;


    /*
     * Zera contador do endereço.
     */

    sessao.totalEndereco =
        0;


    /*
     * Zera produtos locais.
     */

    produtosColetados =
        new Set();


    atualizarTelaColeta();


    mostrarUltimaLeitura(
        novoEndereco
    );


    mostrarStatus(
        "Endereço alterado.",
        "sucesso"
    );


    /*
     * Grava no TB_CONFIG.
     *
     * O Code.gs atual recebe:
     * acao = novoEndereco
     */

    try {

        await fetch(
            API,
            {

                method: "POST",

                mode: "no-cors",

                headers: {

                    "Content-Type":
                        "text/plain"

                },

                body:
                    JSON.stringify({

                        acao:
                            "novoEndereco",

                        usuario:
                            sessao.usuario,

                        inventario:
                            sessao.inventario,

                        endereco:
                            novoEndereco

                    }),

                keepalive:
                    true

            }
        );


        console.log(
            "Endereço enviado ao servidor."
        );


    }
    catch (erro) {

        console.error(
            "Erro ao salvar endereço:",
            erro
        );

    }

}


/* ============================================================
   PROCESSAR PRODUTO
   ============================================================ */

function processarProduto(
    codigo
) {

    if (
        !sessao.endereco
    ) {

        mostrarUltimaLeitura(
            codigo +
            " - SEM ENDEREÇO"
        );


        mostrarStatus(
            "Leia primeiro o endereço.",
            "erro"
        );


        return;

    }


    /*
     * DUPLICIDADE LOCAL
     *
     * Impede imediatamente que o mesmo
     * produto seja enviado duas vezes
     * durante a mesma sessão/endereço.
     */

    const chave =
        sessao.inventario +
        "|" +
        sessao.endereco +
        "|" +
        codigo;


    if (
        produtosColetados.has(
            chave
        )
    ) {

        mostrarUltimaLeitura(
            codigo +
            " - DUPLICADO"
        );


        mostrarStatus(
            "Produto já coletado neste endereço.",
            "erro"
        );


        return;

    }


    /*
     * Reserva imediatamente.
     */

    produtosColetados.add(
        chave
    );


    /*
     * Atualiza tela imediatamente.
     *
     * Não espera o servidor.
     */

    sessao.totalEndereco++;

    sessao.totalColeta++;


    atualizarTelaColeta();


    mostrarUltimaLeitura(
        codigo
    );


    mostrarStatus(
        "Registrando...",
        "sucesso"
    );


    /*
     * Envia sem bloquear a câmera.
     */

    registrarProduto(
        codigo,
        chave
    );

}


/* ============================================================
   REGISTRAR PRODUTO
   ============================================================ */

async function registrarProduto(
    codigo,
    chave
) {

    try {

        await fetch(
            API,
            {

                method: "POST",

                mode: "no-cors",

                headers: {

                    "Content-Type":
                        "text/plain"

                },

                body:
                    JSON.stringify({

                        usuario:
                            sessao.usuario,

                        nomeUsuario:
                            sessao.nomeUsuario,

                        inventario:
                            sessao.inventario,

                        endereco:
                            sessao.endereco,

                        codigo:
                            codigo,

                        tipoLeitura:
                            "PRODUTO"

                    }),

                keepalive:
                    true

            }
        );


        /*
         * Com no-cors não podemos ler a resposta.
         * O Code.gs continua fazendo a proteção
         * definitiva contra duplicidade.
         */

        mostrarStatus(
            "Registrado.",
            "sucesso"
        );


    }
    catch (erro) {

        console.error(
            "Erro ao registrar:",
            erro
        );


        /*
         * Libera a chave local.
         */

        produtosColetados.delete(
            chave
        );


        /*
         * Corrige contadores.
         */

        sessao.totalEndereco =
            Math.max(
                0,
                sessao.totalEndereco -
                1
            );


        sessao.totalColeta =
            Math.max(
                0,
                sessao.totalColeta -
                1
            );


        atualizarTelaColeta();


        mostrarUltimaLeitura(
            codigo +
            " - ERRO"
        );


        mostrarStatus(
            "Erro ao registrar.",
            "erro"
        );

    }

}


/* ============================================================
   LIMPAR CAMPO
   ============================================================ */

function limparCampo() {

    const campo =
        document.getElementById(
            "codigoManual"
        );


    if (campo) {

        campo.value =
            "";

    }

}


/* ============================================================
   ÚLTIMA LEITURA
   ============================================================ */

function mostrarUltimaLeitura(
    texto
) {

    definirTexto(
        "ultimaLeitura",
        texto
    );

}


/* ============================================================
   STATUS
   ============================================================ */

function mostrarStatus(
    mensagem,
    tipo
) {

    const elemento =
        document.getElementById(
            "status"
        );


    if (!elemento) {

        return;

    }


    elemento.textContent =
        mensagem;


    elemento.className =
        "status " +
        (
            tipo ||
            ""
        );


    setTimeout(
        function () {

            if (
                elemento.textContent ===
                mensagem
            ) {

                elemento.textContent =
                    "";

                elemento.className =
                    "status";

            }

        },
        1800
    );

}


/* ============================================================
   STATUS LOGIN
   ============================================================ */

function mostrarLoginStatus(
    mensagem,
    tipo
) {

    const elemento =
        document.getElementById(
            "loginStatus"
        );


    if (!elemento) {

        return;

    }


    elemento.textContent =
        mensagem;


    elemento.className =
        "status " +
        (
            tipo ||
            ""
        );

}


/* ============================================================
   VOLTAR PARA LOGIN
   ============================================================ */

function voltarParaLogin() {

    pararCamera();


    sessao.totalEndereco =
        0;


    sessao.totalColeta =
        0;


    produtosColetados =
        new Set();


    mostrarTelaLogin();

}


/* ============================================================
   PARAR CÂMERA
   ============================================================ */

function pararCamera() {

    try {

        if (
            leitorZXing &&
            typeof leitorZXing.reset ===
            "function"
        ) {

            leitorZXing.reset();

        }

    }
    catch (erro) {

        console.warn(
            "Erro ao parar ZXing:",
            erro
        );

    }


    leitorZXing =
        null;


    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(
                function (track) {

                    track.stop();

                }
            );


        cameraStream =
            null;

    }


    const video =
        document.getElementById(
            "camera"
        );


    if (video) {

        video.srcObject =
            null;

    }


    cameraAtiva =
        false;

}


/* ============================================================
   REINICIAR CÂMERA
   ============================================================ */

async function reiniciarCamera() {

    pararCamera();


    await iniciarCamera();

}


/* ============================================================
   VOLTAR PARA CÂMERA APÓS SEGUNDO PLANO
   ============================================================ */

document.addEventListener(
    "visibilitychange",
    function () {

        if (
            document.visibilityState ===
            "visible"
            &&
            document.getElementById(
                "coleta"
            )?.style.display !==
            "none"
            &&
            !cameraAtiva
        ) {

            iniciarCamera();

        }

    }
);


/* ============================================================
   EXPOR FUNÇÕES
   ============================================================ */

window.iniciarCamera =
    iniciarCamera;


window.pararCamera =
    pararCamera;


window.reiniciarCamera =
    reiniciarCamera;


window.processarCodigo =
    processarCodigo;


console.log(
    "COLETOR THOR - script.js carregado."
);
