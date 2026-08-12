/* ============================================================
   COLETOR THOR
   SCRIPT.JS
   ============================================================ */

"use strict";

/* ============================================================
   ESTADO DA APLICAÇÃO
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
let lendoCodigo = false;

let produtosColetados = new Set();

let ultimoCodigoProcessado = "";
let ultimoProcessamento = 0;


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

window.addEventListener("load", async function () {

    console.log("=================================");
    console.log("COLETOR THOR - INICIANDO");
    console.log("=================================");

    /*
     * IMPORTANTE:
     * O campo manual e a câmera são iniciados ANTES da API.
     * Assim, se a API demorar, a câmera não fica bloqueada.
     */

    try {
        configurarCampoManual();
    } catch (erro) {
        console.error(
            "Erro ao configurar campo manual:",
            erro
        );
    }


    /* --------------------------------------------------------
       INICIA A CÂMERA
       -------------------------------------------------------- */

    try {

        await iniciarCamera();

    } catch (erro) {

        console.error(
            "Erro ao iniciar câmera:",
            erro
        );

    }


    /* --------------------------------------------------------
       CARREGA CONFIGURAÇÃO
       -------------------------------------------------------- */

    try {

        await carregarConfiguracao();

    } catch (erro) {

        console.error(
            "Erro carregando configuração:",
            erro
        );

        mostrarStatus(
            "Não foi possível carregar a configuração.",
            "erro"
        );

    }

});


/* ============================================================
   CARREGAR CONFIGURAÇÃO
   ============================================================ */

async function carregarConfiguracao() {

    if (typeof API === "undefined") {

        console.error(
            "A variável API não foi encontrada."
        );

        return;

    }

    try {

        const resposta = await fetch(
            API + "?acao=config",
            {
                method: "GET",
                cache: "no-store"
            }
        );

        if (!resposta.ok) {

            throw new Error(
                "Erro HTTP: " + resposta.status
            );

        }

        const dados = await resposta.json();

        console.log(
            "Configuração recebida:",
            dados
        );

        configuracao = dados || {};

        aplicarConfiguracao(configuracao);

    } catch (erro) {

        console.error(
            "Erro na configuração:",
            erro
        );

        /*
         * Não interrompe a câmera.
         */

        throw erro;
    }
}


/* ============================================================
   APLICAR CONFIGURAÇÃO
   ============================================================ */

function aplicarConfiguracao(dados) {

    /*
     * Aceita diferentes nomes de campos para evitar
     * problemas caso o Code.gs retorne nomes diferentes.
     */

    sessao.usuario =
        dados.usuario ??
        dados.Usuario ??
        dados.idUsuario ??
        dados.IDUsuario ??
        null;

    sessao.nomeUsuario =
        dados.nomeUsuario ??
        dados.NomeUsuario ??
        dados.nome ??
        dados.Nome ??
        "";

    sessao.inventario =
        dados.inventario ??
        dados.Inventario ??
        "";

    sessao.endereco =
        dados.endereco ??
        dados.Endereco ??
        "";

    /*
     * Caso o backend retorne a quantidade de produtos
     * existentes no endereço.
     */

    sessao.totalEndereco = Number(
        dados.totalEndereco ??
        dados.totalProdutos ??
        dados.produtosEndereco ??
        0
    );

    /*
     * Atualiza tela.
     */

    atualizarTela();

}


/* ============================================================
   ATUALIZAR TELA
   ============================================================ */

function atualizarTela() {

    definirTexto(
        [
            "usuario",
            "nomeUsuario"
        ],
        sessao.nomeUsuario || "-"
    );

    definirTexto(
        [
            "inventario"
        ],
        sessao.inventario || "-"
    );

    definirTexto(
        [
            "endereco"
        ],
        sessao.endereco || "-"
    );

    definirTexto(
        [
            "totalEndereco",
            "produtosEndereco"
        ],
        String(sessao.totalEndereco)
    );

    definirTexto(
        [
            "totalColeta",
            "totalColetado"
        ],
        String(sessao.totalColeta)
    );
}


/* ============================================================
   DEFINIR TEXTO
   ============================================================ */

function definirTexto(ids, valor) {

    ids.forEach(function (id) {

        const elemento =
            document.getElementById(id);

        if (elemento) {
            elemento.textContent = valor;
        }

    });
}


/* ============================================================
   CONFIGURAR CAMPO MANUAL
   ============================================================ */

function configurarCampoManual() {

    const campo =
        document.getElementById("codigoManual");

    const botao =
        document.getElementById("btnRegistrar");

    if (campo) {

        campo.addEventListener(
            "keydown",
            function (evento) {

                if (evento.key === "Enter") {

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
        document.getElementById("camera");

    if (!video) {

        console.error(
            "Elemento #camera não encontrado."
        );

        return;

    }


    /*
     * Verifica suporte.
     */

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        console.error(
            "getUserMedia não disponível."
        );

        mostrarStatus(
            "Este navegador não permite acesso à câmera.",
            "erro"
        );

        return;

    }


    try {

        console.log(
            "Solicitando acesso à câmera..."
        );


        /*
         * Câmera traseira.
         */

        cameraStream =
            await navigator.mediaDevices.getUserMedia({

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


        console.log(
            "Câmera autorizada."
        );


        /*
         * Coloca o stream no vídeo.
         */

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

        video.muted = true;


        /*
         * iPhone/Safari.
         */

        try {

            await video.play();

        } catch (erroVideo) {

            console.warn(
                "Autoplay bloqueado:",
                erroVideo
            );

            /*
             * Tenta novamente.
             */

            video.play().catch(
                function () {}
            );

        }


        cameraAtiva = true;


        console.log(
            "Câmera funcionando."
        );


        /*
         * Inicia o leitor.
         */

        iniciarZXing();


    } catch (erro) {

        cameraAtiva = false;

        console.error(
            "ERRO AO ABRIR CÂMERA:",
            erro
        );


        let mensagem =
            "Não foi possível abrir a câmera.";


        if (
            erro &&
            erro.name === "NotAllowedError"
        ) {

            mensagem =
                "Permita o acesso à câmera no navegador.";

        }


        if (
            erro &&
            erro.name === "NotFoundError"
        ) {

            mensagem =
                "Nenhuma câmera foi encontrada.";

        }


        mostrarStatus(
            mensagem,
            "erro"
        );

        throw erro;

    }

}


/* ============================================================
   INICIAR ZXING
   ============================================================ */

function iniciarZXing() {

    const video =
        document.getElementById("camera");


    if (!video) {

        console.error(
            "Vídeo não encontrado."
        );

        return;

    }


    /*
     * Verifica se a biblioteca ZXing existe.
     */

    if (
        typeof ZXingBrowser === "undefined"
    ) {

        console.error(
            "ZXingBrowser não encontrado."
        );

        mostrarStatus(
            "Biblioteca de leitura não carregada.",
            "erro"
        );

        return;

    }


    try {

        console.log(
            "Iniciando leitor ZXing..."
        );


        /*
         * Leitor para múltiplos formatos.
         */

        leitorZXing =
            new ZXingBrowser.BrowserMultiFormatReader();


        /*
         * Alguns códigos de barras podem exigir
         * um pequeno intervalo entre leituras.
         */

        leitorZXing.decodeFromVideoElement(
            video,
            function (
                resultado,
                erro
            ) {

                if (resultado) {

                    const codigo =
                        extrairCodigoResultado(
                            resultado
                        );

                    if (codigo) {

                        processarCodigo(
                            codigo
                        );

                    }

                }

            }
        );


        console.log(
            "ZXing iniciado."
        );


    } catch (erro) {

        console.error(
            "Erro ao iniciar ZXing:",
            erro
        );

    }

}


/* ============================================================
   EXTRAIR CÓDIGO DO RESULTADO
   ============================================================ */

function extrairCodigoResultado(resultado) {

    if (!resultado) {
        return "";
    }


    /*
     * Formato mais comum.
     */

    if (
        typeof resultado.getText === "function"
    ) {

        return limparCodigo(
            resultado.getText()
        );

    }


    /*
     * Alguns retornos podem vir como text.
     */

    if (
        typeof resultado.text === "string"
    ) {

        return limparCodigo(
            resultado.text
        );

    }


    return "";

}


/* ============================================================
   LIMPAR CÓDIGO
   ============================================================ */

function limparCodigo(codigo) {

    if (codigo === null ||
        codigo === undefined) {

        return "";

    }

    return String(codigo)
        .trim()
        .replace(/\r/g, "")
        .replace(/\n/g, "")
        .replace(/\t/g, "");

}


/* ============================================================
   PROCESSAR CÓDIGO
   ============================================================ */

function processarCodigo(codigo) {

    codigo =
        limparCodigo(codigo);


    if (!codigo) {

        return;

    }


    /*
     * Evita processamento duplicado imediato
     * do mesmo frame da câmera.
     */

    const agora =
        Date.now();


    if (
        codigo === ultimoCodigoProcessado &&
        agora - ultimoProcessamento < 1200
    ) {

        return;

    }


    ultimoCodigoProcessado =
        codigo;

    ultimoProcessamento =
        agora;


    console.log(
        "Código detectado:",
        codigo
    );


    /*
     * REGRA PRINCIPAL:
     *
     * LETRA = ENDEREÇO
     * NÚMERO = PRODUTO
     */

    const primeiroCaractere =
        codigo.charAt(0);


    if (
        /^[A-Za-z]$/.test(
            primeiroCaractere
        )
    ) {

        processarEndereco(
            codigo
        );

        return;

    }


    if (
        /^[0-9]$/.test(
            primeiroCaractere
        )
    ) {

        processarProduto(
            codigo
        );

        return;

    }


    /*
     * Código inválido.
     */

    mostrarUltimaLeitura(
        codigo + " - INVÁLIDO"
    );

    mostrarStatus(
        "Código inválido.",
        "erro"
    );

}


/* ============================================================
   PROCESSAR ENDEREÇO
   ============================================================ */

function processarEndereco(codigo) {

    console.log(
        "Endereço detectado:",
        codigo
    );


    /*
     * Troca o endereço.
     */

    sessao.endereco =
        codigo;


    /*
     * Zera a lista de produtos do endereço.
     *
     * Isso é importante porque o mesmo produto
     * pode existir em outro endereço.
     */

    produtosColetados =
        new Set();


    /*
     * Atualiza contadores.
     */

    sessao.totalColeta =
        0;


    /*
     * Tenta obter a quantidade do endereço
     * no backend.
     */

    consultarEndereco(
        codigo
    );


    atualizarTela();


    mostrarUltimaLeitura(
        codigo
    );


    mostrarStatus(
        "Endereço alterado.",
        "sucesso"
    );

}


/* ============================================================
   PROCESSAR PRODUTO
   ============================================================ */

function processarProduto(codigo) {

    console.log(
        "Produto detectado:",
        codigo
    );


    /*
     * Não permite produto sem endereço.
     */

    if (
        !sessao.endereco
    ) {

        mostrarUltimaLeitura(
            codigo + " - SEM ENDEREÇO"
        );

        mostrarStatus(
            "Leia primeiro o endereço.",
            "erro"
        );

        return;

    }


    /*
     * NÃO PERMITE PRODUTO REPETIDO
     * NO MESMO ENDEREÇO.
     */

    if (
        produtosColetados.has(codigo)
    ) {

        mostrarUltimaLeitura(
            codigo + " - DUPLICADO"
        );

        mostrarStatus(
            "Produto já coletado neste endereço.",
            "erro"
        );

        return;

    }


    /*
     * Adiciona imediatamente ao Set.
     *
     * Isso acontece ANTES do fetch.
     *
     * Assim, mesmo que o servidor demore,
     * uma segunda leitura do mesmo código
     * não será registrada.
     */

    produtosColetados.add(
        codigo
    );


    /*
     * Atualização imediata da tela.
     */

    sessao.totalColeta++;

    atualizarTela();


    mostrarUltimaLeitura(
        codigo
    );


    /*
     * Registra no servidor sem bloquear
     * a leitura seguinte.
     */

    registrarProduto(
        codigo
    );

}


/* ============================================================
   REGISTRAR PRODUTO
   ============================================================ */

async function registrarProduto(codigo) {

    if (
        typeof API === "undefined"
    ) {

        console.error(
            "API não definida."
        );

        /*
         * Remove do Set se não conseguiu
         * nem tentar enviar.
         */

        produtosColetados.delete(
            codigo
        );

        sessao.totalColeta =
            Math.max(
                0,
                sessao.totalColeta - 1
            );

        atualizarTela();

        return;

    }


    /*
     * Monta os dados.
     */

    const dados = {

        id:
            gerarID(),

        inventario:
            sessao.inventario,

        endereco:
            sessao.endereco,

        dataHora:
            new Date().toISOString(),

        usuario:
            sessao.usuario,

        codigoBarras:
            codigo,

        tipoLeitura:
            "PRODUTO",

        nomeUsuario:
            sessao.nomeUsuario

    };


    console.log(
        "Registrando:",
        dados
    );


    try {

        /*
         * POST rápido.
         *
         * keepalive permite que a requisição
         * continue mesmo se a página sofrer
         * alguma atualização.
         */

        const resposta =
            await fetch(
                API,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "text/plain;charset=utf-8"
                    },

                    body:
                        JSON.stringify(dados),

                    keepalive: true
                }
            );


        if (!resposta.ok) {

            throw new Error(
                "HTTP " +
                resposta.status
            );

        }


        /*
         * Tenta ler a resposta.
         */

        let retorno = null;

        try {

            retorno =
                await resposta.json();

        } catch (erroJSON) {

            /*
             * Alguns Apps Script retornam
             * texto mesmo quando deu certo.
             */

            console.log(
                "Resposta não JSON."
            );

        }


        console.log(
            "Registro concluído:",
            retorno
        );


        mostrarStatus(
            "Registrado.",
            "sucesso"
        );


    } catch (erro) {

        console.error(
            "Erro ao registrar:",
            erro
        );


        /*
         * Se o servidor rejeitou,
         * libera novamente o código.
         */

        produtosColetados.delete(
            codigo
        );


        sessao.totalColeta =
            Math.max(
                0,
                sessao.totalColeta - 1
            );


        atualizarTela();


        mostrarUltimaLeitura(
            codigo + " - ERRO"
        );


        mostrarStatus(
            "Erro ao registrar.",
            "erro"
        );

    }

}


/* ============================================================
   CONSULTAR ENDEREÇO
   ============================================================ */

async function consultarEndereco(endereco) {

    if (
        typeof API === "undefined"
    ) {

        return;

    }


    try {

        const resposta =
            await fetch(
                API +
                "?acao=endereco&endereco=" +
                encodeURIComponent(
                    endereco
                ) +
                "&inventario=" +
                encodeURIComponent(
                    sessao.inventario
                ),
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!resposta.ok) {

            return;

        }


        const dados =
            await resposta.json();


        console.log(
            "Dados do endereço:",
            dados
        );


        /*
         * Atualiza quantidade esperada.
         */

        if (
            dados &&
            dados.total !== undefined
        ) {

            sessao.totalEndereco =
                Number(
                    dados.total
                );

        }


        if (
            dados &&
            dados.totalEndereco !== undefined
        ) {

            sessao.totalEndereco =
                Number(
                    dados.totalEndereco
                );

        }


        atualizarTela();


    } catch (erro) {

        console.warn(
            "Não foi possível consultar endereço:",
            erro
        );

    }

}


/* ============================================================
   GERAR ID
   ============================================================ */

function gerarID() {

    /*
     * UUID moderno.
     */

    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {

        return crypto.randomUUID();

    }


    /*
     * Fallback.
     */

    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2, 10)
    );

}


/* ============================================================
   MOSTRAR ÚLTIMA LEITURA
   ============================================================ */

function mostrarUltimaLeitura(texto) {

    const ids = [
        "ultimaLeitura",
        "ultima-leitura",
        "ultimoCodigo",
        "ultimaLeituraCodigo"
    ];


    let elemento = null;


    for (
        let i = 0;
        i < ids.length;
        i++
    ) {

        elemento =
            document.getElementById(
                ids[i]
            );

        if (elemento) {
            break;
        }

    }


    if (elemento) {

        elemento.textContent =
            texto;

    }

}


/* ============================================================
   MOSTRAR STATUS
   ============================================================ */

function mostrarStatus(
    mensagem,
    tipo
) {

    console.log(
        "[" +
        tipo +
        "] " +
        mensagem
    );


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


    /*
     * Remove mensagem depois de alguns segundos.
     */

    setTimeout(
        function () {

            if (
                elemento.textContent ===
                mensagem
            ) {

                elemento.textContent =
                    "";

            }

        },
        1800
    );

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

    } catch (erro) {

        console.warn(
            "Erro ao parar ZXing:",
            erro
        );

    }


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
   VISIBILIDADE DA PÁGINA
   ============================================================ */

document.addEventListener(
    "visibilitychange",
    async function () {

        /*
         * No iPhone, quando o navegador vai para
         * segundo plano, a câmera pode ser encerrada.
         */

        if (
            document.visibilityState ===
            "visible"
        ) {

            /*
             * Só reinicia se não houver câmera ativa.
             */

            if (!cameraAtiva) {

                try {

                    await iniciarCamera();

                } catch (erro) {

                    console.warn(
                        "Não foi possível reiniciar câmera:",
                        erro
                    );

                }

            }

        }

    }
);


/* ============================================================
   GARANTIR VÍDEO NO IPHONE
   ============================================================ */

document.addEventListener(
    "click",
    async function () {

        const video =
            document.getElementById(
                "camera"
            );


        if (!video) {
            return;
        }


        /*
         * Se o stream existe mas o vídeo
         * foi pausado, tenta tocar novamente.
         */

        if (
            cameraStream &&
            video.paused
        ) {

            try {

                await video.play();

            } catch (erro) {

                console.warn(
                    "Não foi possível reproduzir vídeo:",
                    erro
                );

            }

        }

    }
);


/* ============================================================
   IMPEDIR SUBMIT PADRÃO DE FORMULÁRIO
   ============================================================ */

document.addEventListener(
    "submit",
    function (evento) {

        evento.preventDefault();

    }
);


/* ============================================================
   LIMPAR CAMPO MANUAL APÓS REGISTRO
   ============================================================ */

function limparCampoManual() {

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
   FOCO NO CAMPO MANUAL
   ============================================================ */

function focarCampoManual() {

    const campo =
        document.getElementById(
            "codigoManual"
        );


    if (campo) {

        campo.focus();

    }

}


/* ============================================================
   EXPORTA FUNÇÕES PARA USO NO HTML
   ============================================================ */

window.processarCodigo =
    processarCodigo;

window.iniciarCamera =
    iniciarCamera;

window.pararCamera =
    pararCamera;

window.reiniciarCamera =
    reiniciarCamera;

window.limparCampoManual =
    limparCampoManual;


/* ============================================================
   FIM
   ============================================================ */

console.log(
    "COLETOR THOR - script.js carregado."
);
