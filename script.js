// ============================================================
// COLETOR THOR
// ============================================================
// Leitura de códigos de barras
//
// REGRA:
// - Código começando com LETRA = ENDEREÇO
// - Código começando com NÚMERO = PRODUTO
//
// Leitor:
// ZXing Browser
// Formato priorizado:
// CODE 128
// ============================================================


// ============================================================
// VARIÁVEIS DO LEITOR
// ============================================================

let leitor = null;

let controlesCamera = null;

let cameraAtiva = false;

let processando = false;


// ============================================================
// CONTROLE DE LEITURA
// ============================================================

let ultimoCodigoDetectado = "";

let quantidadeLeituras = 0;

let tempoUltimaLeitura = 0;


// ============================================================
// CONTROLE DE DUPLICIDADE
// ============================================================

let codigosColetados = new Set();


// ============================================================
// SESSÃO
// ============================================================

let sessao = {

    usuario: null,

    nomeUsuario: "",

    inventario: "",

    endereco: "",

    totalEndereco: 0,

    totalColeta: 0

};


// ============================================================
// INICIALIZAÇÃO
// ============================================================

window.addEventListener(
    "load",
    async function () {

        console.log(
            "Iniciando Coletor THOR..."
        );


        try {

            await carregarConfiguracao();


            configurarCampoManual();


            await iniciarCamera();


        } catch (erro) {

            console.error(
                "Erro na inicialização:",
                erro
            );


            mostrarStatus(
                "Erro ao iniciar o coletor.",
                "erro"
            );

        }

    }
);


// ============================================================
// CARREGAR CONFIGURAÇÃO
// ============================================================

async function carregarConfiguracao() {

    try {

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
                "HTTP " +
                resposta.status
            );

        }


        const dados =
            await resposta.json();


        console.log(
            "Configuração recebida:",
            dados
        );


        // ----------------------------------------------------
        // USUÁRIO
        // ----------------------------------------------------

        sessao.usuario =
            dados.usuario ??
            dados.Usuario ??
            null;


        // ----------------------------------------------------
        // NOME DO USUÁRIO
        // ----------------------------------------------------

        sessao.nomeUsuario =
            dados.nomeUsuario ??
            dados.NomeUsuario ??
            "";


        // ----------------------------------------------------
        // INVENTÁRIO
        // ----------------------------------------------------

        sessao.inventario =
            dados.inventario ??
            dados.Inventario ??
            "";


        // ----------------------------------------------------
        // ENDEREÇO
        // ----------------------------------------------------

        sessao.endereco =
            dados.endereco ??
            dados.EnderecoAtual ??
            dados.enderecoAtual ??
            "";


        // ----------------------------------------------------
        // TOTAL DO ENDEREÇO
        // ----------------------------------------------------

        sessao.totalEndereco =
            Number(
                dados.totalEndereco ??
                dados.TotalEndereco ??
                0
            );


        // ----------------------------------------------------
        // TOTAL DA COLETA
        // ----------------------------------------------------

        sessao.totalColeta =
            Number(
                dados.totalColeta ??
                dados.TotalColeta ??
                0
            );


        atualizarTela();


    } catch (erro) {

        console.error(
            "Erro carregando configuração:",
            erro
        );


        throw erro;

    }

}


// ============================================================
// ATUALIZAR TELA
// ============================================================

function atualizarTela() {

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


    const contadorEndereco =
        document.getElementById(
            "contadorEndereco"
        );


    const contadorTotal =
        document.getElementById(
            "contadorTotal"
        );


    if (usuario) {

        usuario.textContent =
            sessao.nomeUsuario || "-";

    }


    if (inventario) {

        inventario.textContent =
            sessao.inventario || "-";

    }


    if (endereco) {

        endereco.textContent =
            sessao.endereco || "-";

    }


    if (contadorEndereco) {

        contadorEndereco.textContent =
            sessao.totalEndereco;

    }


    if (contadorTotal) {

        contadorTotal.textContent =
            sessao.totalColeta;

    }

}


// ============================================================
// INICIAR CAMERA
// ============================================================

async function iniciarCamera() {

    if (cameraAtiva) {

        return;

    }


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


    try {

        // ----------------------------------------------------
        // VERIFICA ZXING
        // ----------------------------------------------------

        if (
            typeof ZXingBrowser ===
            "undefined"
        ) {

            throw new Error(
                "ZXingBrowser não foi carregado."
            );

        }


        // ----------------------------------------------------
        // SOLICITA CAMERA TRASEIRA
        // ----------------------------------------------------

        const stream =
            await navigator
                .mediaDevices
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
                        },

                        frameRate: {
                            ideal: 30
                        }

                    },

                    audio: false

                });


        video.srcObject =
            stream;


        await video.play();


        cameraAtiva = true;


        console.log(
            "Câmera ativada."
        );


        iniciarZXing();


    } catch (erro) {

        console.error(
            "Erro ao abrir câmera:",
            erro
        );


        mostrarStatus(
            "Não foi possível acessar a câmera.",
            "erro"
        );

    }

}


// ============================================================
// ZXING
// ============================================================

function iniciarZXing() {

    try {

        if (
            typeof ZXingBrowser ===
            "undefined"
        ) {

            throw new Error(
                "ZXingBrowser não carregado."
            );

        }


        const video =
            document.getElementById(
                "camera"
            );


        if (!video) {

            throw new Error(
                "Câmera não encontrada."
            );

        }


        // ====================================================
        // CONFIGURAÇÃO DO ZXING
        // ====================================================

        const hints =
            new Map();


        // ----------------------------------------------------
        // CODE 128
        // ----------------------------------------------------

        hints.set(

            ZXingBrowser.DecodeHintType
                ? ZXingBrowser.DecodeHintType.POSSIBLE_FORMATS
                : null,

            [
                ZXingBrowser.BarcodeFormat
                    ? ZXingBrowser.BarcodeFormat.CODE_128
                    : null
            ]

        );


        // ====================================================
        // CORREÇÃO PARA VERSÕES ONDE OS ENUMS ESTÃO NO
        // @zxing/library
        // ====================================================

        if (
            typeof ZXingBrowser.DecodeHintType ===
            "undefined"
        ) {

            console.log(
                "Usando configuração padrão do ZXing Browser."
            );

            leitor =
                new ZXingBrowser
                    .BrowserMultiFormatReader(
                        undefined,
                        {
                            delayBetweenScanSuccess:
                                800,

                            delayBetweenScanAttempts:
                                150
                        }
                    );

        } else {

            leitor =
                new ZXingBrowser
                    .BrowserMultiFormatReader(
                        hints,
                        {
                            delayBetweenScanSuccess:
                                800,

                            delayBetweenScanAttempts:
                                150
                        }
                    );

        }


        console.log(
            "ZXing iniciado."
        );


        // ====================================================
        // LEITURA CONTÍNUA
        // ====================================================

        controlesCamera =
            leitor.decodeFromVideoElement(
                video,
                function (
                    resultado,
                    erro,
                    controles
                ) {

                    if (!resultado) {

                        return;

                    }


                    processarResultadoZXing(
                        resultado
                    );

                }
            );


        console.log(
            "Leitor contínuo ativado."
        );


    } catch (erro) {

        console.error(
            "Erro iniciando ZXing:",
            erro
        );


        mostrarStatus(
            "Erro ao iniciar leitor.",
            "erro"
        );

    }

}


// ============================================================
// PROCESSAR RESULTADO DO ZXING
// ============================================================

function processarResultadoZXing(
    resultado
) {

    if (processando) {

        return;

    }


    if (!resultado) {

        return;

    }


    let codigo = "";


    try {

        codigo =
            resultado
                .getText();


    } catch (erro) {

        console.error(
            "Erro lendo resultado:",
            erro
        );

        return;

    }


    if (!codigo) {

        return;

    }


    codigo =
        codigo
            .trim()
            .replace(
                /\s+/g,
                ""
            );


    if (!codigo) {

        return;

    }


    console.log(
        "Código detectado:",
        codigo
    );


    // ====================================================
    // VALIDAÇÃO DE CARACTERES
    // ====================================================
    //
    // Evita registrar caracteres estranhos.
    //
    // Aceitamos somente:
    // A-Z
    // a-z
    // 0-9
    // ====================================================

    if (
        !/^[A-Za-z0-9]+$/.test(
            codigo
        )
    ) {

        console.warn(
            "Leitura descartada:",
            codigo
        );


        mostrarUltimaLeitura(
            codigo +
            " - LEITURA INVÁLIDA"
        );


        return;

    }


    // ====================================================
    // CONFIRMAÇÃO DE LEITURA
    // ====================================================
    //
    // O mesmo código precisa aparecer duas vezes.
    //
    // Isso reduz leituras parciais.
    // ====================================================

    if (
        codigo ===
        ultimoCodigoDetectado
    ) {

        quantidadeLeituras++;

    } else {

        ultimoCodigoDetectado =
            codigo;

        quantidadeLeituras = 1;

    }


    console.log(
        "Confirmação:",
        quantidadeLeituras,
        "/ 2"
    );


    if (
        quantidadeLeituras < 2
    ) {

        return;

    }


    // ====================================================
    // EVITA REGISTRO REPETIDO IMEDIATO
    // ====================================================

    const agora =
        Date.now();


    if (
        agora -
        tempoUltimaLeitura
        <
        800
    ) {

        return;

    }


    tempoUltimaLeitura =
        agora;


    quantidadeLeituras =
        0;


    // ====================================================
    // REGISTRAR
    // ====================================================

    registrarCodigo(
        codigo,
        "CAMERA"
    );

}


// ============================================================
// CAMPO MANUAL
// ============================================================

function configurarCampoManual() {

    const campo =
        document.getElementById(
            "codigo"
        );


    const botao =
        document.getElementById(
            "btnRegistrar"
        );


    if (
        !campo ||
        !botao
    ) {

        return;

    }


    // ====================================================
    // ENTER
    // ====================================================

    campo.addEventListener(
        "keydown",
        function (evento) {

            if (
                evento.key ===
                "Enter"
            ) {

                evento.preventDefault();


                registrarCodigo(
                    campo.value,
                    "MANUAL"
                );

            }

        }
    );


    // ====================================================
    // BOTÃO
    // ====================================================

    botao.addEventListener(
        "click",
        function () {

            registrarCodigo(
                campo.value,
                "MANUAL"
            );

        }
    );

}


// ============================================================
// REGISTRAR CÓDIGO
// ============================================================

async function registrarCodigo(
    codigoRecebido,
    origem
) {

    if (processando) {

        return;

    }


    let codigo =
        String(
            codigoRecebido ??
            ""
        )
        .trim()
        .replace(
            /\s+/g,
            ""
        );


    if (!codigo) {

        mostrarStatus(
            "Informe ou leia um código.",
            "erro"
        );

        return;

    }


    // ====================================================
    // VALIDA CARACTERES
    // ====================================================

    if (
        !/^[A-Za-z0-9]+$/.test(
            codigo
        )
    ) {

        mostrarUltimaLeitura(
            codigo +
            " - INVÁLIDO"
        );


        mostrarStatus(
            "Código contém caracteres inválidos.",
            "erro"
        );


        limparCampo();


        return;

    }


    // ====================================================
    // IDENTIFICAR TIPO
    // ====================================================

    const primeiroCaractere =
        codigo.charAt(0);


    const ehEndereco =
        /^[A-Za-z]$/.test(
            primeiroCaractere
        );


    const tipoLeitura =
        ehEndereco
            ? "ENDERECO"
            : "PRODUTO";


    console.log(
        "Código:",
        codigo
    );


    console.log(
        "Tipo:",
        tipoLeitura
    );


    processando = true;


    try {


        // ==================================================
        // ENDEREÇO
        // ==================================================

        if (
            tipoLeitura ===
            "ENDERECO"
        ) {

            await registrarEndereco(
                codigo
            );


            limparCampo();


            return;

        }


        // ==================================================
        // PRODUTO
        // ==================================================

        await registrarProduto(
            codigo
        );


        limparCampo();


    } catch (erro) {

        console.error(
            "Erro registrando:",
            erro
        );


    } finally {

        processando =
            false;

    }

}


// ============================================================
// REGISTRAR ENDEREÇO
// ============================================================

async function registrarEndereco(
    endereco
) {

    try {

        const parametros =
            new URLSearchParams();


        parametros.append(
            "acao",
            "novoEndereco"
        );


        parametros.append(
            "usuario",
            sessao.usuario
        );


        parametros.append(
            "nomeUsuario",
            sessao.nomeUsuario
        );


        parametros.append(
            "inventario",
            sessao.inventario
        );


        parametros.append(
            "endereco",
            endereco
        );


        const resposta =
            await fetch(
                API,
                {

                    method: "POST",

                    body: parametros,

                    redirect: "follow"

                }
            );


        const texto =
            await resposta.text();


        console.log(
            "Resposta endereço:",
            texto
        );


        let dados = null;


        try {

            dados =
                JSON.parse(
                    texto
                );

        } catch (erro) {

            dados = null;

        }


        if (
            dados &&
            dados.ok === false
        ) {

            throw new Error(
                dados.mensagem ||
                "Erro alterando endereço."
            );

        }


        // ==================================================
        // ATUALIZAR SESSÃO
        // ==================================================

        sessao.endereco =
            endereco;


        sessao.totalEndereco =
            0;


        // ==================================================
        // NOVO ENDEREÇO = LIMPA DUPLICIDADES
        // ==================================================

        codigosColetados.clear();


        ultimoCodigoDetectado =
            "";


        quantidadeLeituras =
            0;


        atualizarTela();


        mostrarUltimaLeitura(
            endereco
        );


        mostrarStatus(
            "Endereço alterado para " +
            endereco,
            "sucesso"
        );


    } catch (erro) {

        console.error(
            "Erro endereço:",
            erro
        );


        mostrarUltimaLeitura(
            endereco +
            " - ERRO"
        );


        mostrarStatus(
            "Não foi possível alterar o endereço.",
            "erro"
        );


        throw erro;

    }

}


// ============================================================
// REGISTRAR PRODUTO
// ============================================================

async function registrarProduto(
    codigo
) {

    // ====================================================
    // PRECISA TER ENDEREÇO
    // ====================================================

    if (
        !sessao.endereco
    ) {

        mostrarStatus(
            "Leia primeiro um endereço.",
            "erro"
        );


        return;

    }


    // ====================================================
    // DUPLICIDADE
    // ====================================================

    if (
        codigosColetados.has(
            codigo
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


    try {

        const parametros =
            new URLSearchParams();


        parametros.append(
            "acao",
            "coleta"
        );


        parametros.append(
            "usuario",
            sessao.usuario
        );


        parametros.append(
            "nomeUsuario",
            sessao.nomeUsuario
        );


        parametros.append(
            "inventario",
            sessao.inventario
        );


        parametros.append(
            "endereco",
            sessao.endereco
        );


        parametros.append(
            "codigo",
            codigo
        );


        parametros.append(
            "tipoLeitura",
            "PRODUTO"
        );


        const resposta =
            await fetch(
                API,
                {

                    method: "POST",

                    body: parametros,

                    redirect: "follow"

                }
            );


        const texto =
            await resposta.text();


        console.log(
            "Resposta produto:",
            texto
        );


        let dados = null;


        try {

            dados =
                JSON.parse(
                    texto
                );

        } catch (erro) {

            dados = null;

        }


        // ==================================================
        // BACKEND RECUSOU
        // ==================================================

        if (
            dados &&
            dados.ok === false
        ) {

            mostrarUltimaLeitura(

                codigo +
                " - " +
                (
                    dados.mensagem ||
                    "INVÁLIDO"
                )

            );


            mostrarStatus(

                dados.mensagem ||
                "Código não registrado.",

                "erro"

            );


            return;

        }


        // ==================================================
        // REGISTRO CONFIRMADO
        // ==================================================

        codigosColetados.add(
            codigo
        );


        sessao.totalEndereco++;


        sessao.totalColeta++;


        atualizarTela();


        mostrarUltimaLeitura(
            codigo
        );


        mostrarStatus(
            "Registrado",
            "sucesso"
        );


    } catch (erro) {

        console.error(
            "Erro registrando produto:",
            erro
        );


        mostrarUltimaLeitura(
            codigo +
            " - ERRO"
        );


        mostrarStatus(
            "Erro de comunicação com o servidor.",
            "erro"
        );


        throw erro;

    }

}


// ============================================================
// LIMPAR CAMPO
// ============================================================

function limparCampo() {

    const campo =
        document.getElementById(
            "codigo"
        );


    if (!campo) {

        return;

    }


    campo.value =
        "";

}


// ============================================================
// ÚLTIMA LEITURA
// ============================================================

function mostrarUltimaLeitura(
    texto
) {

    const elemento =
        document.getElementById(
            "ultimaLeitura"
        );


    if (!elemento) {

        return;

    }


    elemento.textContent =
        texto;

}


// ============================================================
// STATUS
// ============================================================

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
        tipo;


    setTimeout(
        function () {

            elemento.textContent =
                "";

            elemento.className =
                "status";

        },
        1800
    );

}


// ============================================================
// VOLTOU PARA A PÁGINA
// ============================================================

document.addEventListener(
    "visibilitychange",
    function () {

        if (
            document.visibilityState ===
            "visible"
        ) {

            const video =
                document.getElementById(
                    "camera"
                );


            if (
                video &&
                !video.srcObject
            ) {

                iniciarCamera();

            }

        }

    }
);


// ============================================================
// ENCERRAR CAMERA AO SAIR
// ============================================================

window.addEventListener(
    "beforeunload",
    function () {

        try {

            if (
                controlesCamera &&
                typeof controlesCamera.stop ===
                "function"
            ) {

                controlesCamera.stop();

            }

        } catch (erro) {

            console.warn(
                "Erro encerrando leitor:",
                erro
            );

        }


        const video =
            document.getElementById(
                "camera"
            );


        if (
            video &&
            video.srcObject
        ) {

            const tracks =
                video
                    .srcObject
                    .getTracks();


            tracks.forEach(
                function (track) {

                    track.stop();

                }
            );

        }

    }
);
