// ============================================================
// COLETOR THOR
// LEITOR DE CÓDIGO DE BARRAS - ZXING
// ============================================================

let leitor = null;
let cameraAtiva = false;
let processando = false;

let ultimoCodigoDetectado = "";
let quantidadeLeituras = 0;
let tempoUltimaLeitura = 0;

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

window.addEventListener("load", async () => {

    try {

        await carregarConfiguracao();

        iniciarCamera();

        configurarCampoManual();

    } catch (erro) {

        console.error("Erro ao iniciar aplicação:", erro);

        mostrarStatus(
            "Erro ao iniciar o coletor.",
            "erro"
        );

    }

});


// ============================================================
// CARREGAR CONFIGURAÇÃO
// ============================================================

async function carregarConfiguracao() {

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
                "Erro HTTP " + resposta.status
            );

        }

        const dados = await resposta.json();

        console.log("Configuração:", dados);


        // ----------------------------------------------------
        // USUÁRIO
        // ----------------------------------------------------

        sessao.usuario =
            dados.usuario ??
            dados.Usuario ??
            null;


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
        // CONTADORES
        // ----------------------------------------------------

        sessao.totalEndereco =
            Number(
                dados.totalEndereco ??
                dados.TotalEndereco ??
                0
            );


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

        mostrarStatus(
            "Não foi possível carregar a configuração.",
            "erro"
        );

    }

}


// ============================================================
// ATUALIZAR TELA
// ============================================================

function atualizarTela() {

    document.getElementById("usuario").textContent =
        sessao.nomeUsuario || "-";


    document.getElementById("inventario").textContent =
        sessao.inventario || "-";


    document.getElementById("endereco").textContent =
        sessao.endereco || "-";


    document.getElementById("contadorEndereco").textContent =
        sessao.totalEndereco;


    document.getElementById("contadorTotal").textContent =
        sessao.totalColeta;

}


// ============================================================
// CAMERA
// ============================================================

async function iniciarCamera() {

    if (cameraAtiva) {
        return;
    }


    const video =
        document.getElementById("camera");


    if (!video) {
        return;
    }


    try {

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            throw new Error(
                "Este navegador não suporta câmera."
            );

        }


        // ----------------------------------------------------
        // PEDE CÂMERA TRASEIRA
        // ----------------------------------------------------

        const stream =
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
                    },

                    frameRate: {
                        ideal: 30
                    }

                },

                audio: false

            });


        video.srcObject = stream;

        await video.play();


        cameraAtiva = true;


        console.log(
            "Câmera iniciada."
        );


        iniciarZXing();


    } catch (erro) {

        console.error(
            "Erro ao acessar câmera:",
            erro
        );


        mostrarStatus(
            "Não foi possível acessar a câmera. Verifique a permissão.",
            "erro"
        );

    }

}


// ============================================================
// ZXING
// ============================================================

function iniciarZXing() {

    try {

        if (typeof ZXingBrowser === "undefined") {
            throw new Error("ZXingBrowser não carregado.");
        }

        if (typeof ZXing === "undefined") {
            throw new Error("ZXing Library não carregada.");
        }

        const video = document.getElementById("camera");

        // ====================================================
        // CONFIGURAÇÃO DO LEITOR
        // SOMENTE CODE 128
        // ====================================================

        const hints = new Map();

        hints.set(
            ZXing.DecodeHintType.POSSIBLE_FORMATS,
            [
                ZXing.BarcodeFormat.CODE_128
            ]
        );

        hints.set(
            ZXing.DecodeHintType.TRY_HARDER,
            true
        );

        // ====================================================
        // LEITOR
        // ====================================================

        leitor =
            new ZXingBrowser.BrowserMultiFormatReader(
                hints,
                150
            );

        console.log(
            "ZXing iniciado - CODE 128"
        );

        // ====================================================
        // LEITURA CONTÍNUA
        // ====================================================

        leitor.decodeFromVideoElement(
            video,
            (resultado, erro) => {

                if (!resultado) {
                    return;
                }

                const codigo =
                    resultado.getText()
                        .trim()
                        .replace(/\s+/g, "");

                if (!codigo) {
                    return;
                }

                console.log(
                    "CODE 128 detectado:",
                    codigo
                );

                processarLeituraCamera(
                    resultado
                );

            }
        );

    } catch (erro) {

        console.error(
            "Erro iniciando ZXing:",
            erro
        );

        mostrarStatus(
            "Erro ao iniciar leitor de código.",
            "erro"
        );

    }

}

// ============================================================
// PROCESSAR LEITURA DA CAMERA
// ============================================================

function processarLeituraCamera(resultado) {

    if (processando) {
        return;
    }


    let codigo = "";


    try {

        codigo =
            resultado.getText();

    } catch (erro) {

        console.error(
            "Erro obtendo código:",
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
        .replace(/\s+/g, "");


    if (!codigo) {
        return;
    }


    console.log(
        "ZXing detectou:",
        codigo
    );


    // ----------------------------------------------------
    // CONFIRMAÇÃO DE LEITURA
    //
    // Exigimos duas leituras iguais consecutivas.
    // Isso evita registrar códigos incompletos ou falsos.
    // ----------------------------------------------------

    if (
        codigo === ultimoCodigoDetectado
    ) {

        quantidadeLeituras++;

    } else {

        ultimoCodigoDetectado = codigo;

        quantidadeLeituras = 1;

    }


    // ----------------------------------------------------
    // DUAS LEITURAS IGUAIS
    // ----------------------------------------------------

    if (quantidadeLeituras < 2) {
        return;
    }


    const agora =
        Date.now();


    // ----------------------------------------------------
    // EVITA REPETIÇÃO IMEDIATA
    // ----------------------------------------------------

    if (
        agora - tempoUltimaLeitura < 800
    ) {

        return;

    }


    tempoUltimaLeitura = agora;

    quantidadeLeituras = 0;


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
        document.getElementById("codigo");


    const botao =
        document.getElementById("btnRegistrar");


    if (!campo || !botao) {
        return;
    }


    // ----------------------------------------------------
    // ENTER
    // ----------------------------------------------------

    campo.addEventListener(
        "keydown",
        function (evento) {

            if (
                evento.key === "Enter"
            ) {

                evento.preventDefault();

                registrarCodigo(
                    campo.value,
                    "MANUAL"
                );

            }

        }
    );


    // ----------------------------------------------------
    // BOTÃO
    // ----------------------------------------------------

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
    origem = "MANUAL"
) {

    if (processando) {
        return;
    }


    let codigo =
        String(
            codigoRecebido ?? ""
        )
        .trim()
        .replace(/\s+/g, "");


    if (!codigo) {

        mostrarStatus(
            "Informe ou leia um código.",
            "erro"
        );

        return;

    }


    // ----------------------------------------------------
    // EVITA DUPLICIDADE NO CLIENTE
    // ----------------------------------------------------

    if (
        codigosColetados.has(codigo)
    ) {

        mostrarUltimaLeitura(
            codigo + " - DUPLICADO"
        );


        mostrarStatus(
            "Código já coletado neste endereço.",
            "erro"
        );


        limparCampo();

        return;

    }


    // ----------------------------------------------------
    // REGRA:
    //
    // COMEÇA COM LETRA = ENDEREÇO
    //
    // COMEÇA COM NÚMERO = PRODUTO
    // ----------------------------------------------------

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
        codigo,
        "Tipo:",
        tipoLeitura
    );


    processando = true;


    try {

        // ====================================================
        // ENDEREÇO
        // ====================================================

        if (tipoLeitura === "ENDERECO") {

            await registrarEndereco(
                codigo
            );


            limparCampo();

            return;

        }


        // ====================================================
        // PRODUTO
        // ====================================================

        await registrarProduto(
            codigo
        );


        limparCampo();


    } catch (erro) {

        console.error(
            "Erro registrando:",
            erro
        );


        mostrarStatus(
            "Erro ao registrar coleta.",
            "erro"
        );

    } finally {

        processando = false;

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
                JSON.parse(texto);

        } catch (e) {

            dados = null;

        }


        if (
            dados &&
            dados.ok === false
        ) {

            throw new Error(
                dados.mensagem ||
                "Erro ao alterar endereço."
            );

        }


        // ----------------------------------------------------
        // ATUALIZA SESSÃO
        // ----------------------------------------------------

        sessao.endereco =
            endereco;


        // ----------------------------------------------------
        // ZERA CONTADOR DO ENDEREÇO
        // ----------------------------------------------------

        sessao.totalEndereco =
            0;


        // ----------------------------------------------------
        // LIMPA DUPLICIDADES DO ENDEREÇO ANTERIOR
        // ----------------------------------------------------

        codigosColetados.clear();


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
            endereco + " - ERRO"
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

    // --------------------------------------------------------
    // VERIFICA ENDEREÇO
    // --------------------------------------------------------

    if (
        !sessao.endereco
    ) {

        mostrarStatus(
            "Leia primeiro um endereço.",
            "erro"
        );

        return;

    }


    // --------------------------------------------------------
    // DUPLICIDADE
    // --------------------------------------------------------

    if (
        codigosColetados.has(codigo)
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
                JSON.parse(texto);

        } catch (e) {

            dados = null;

        }


        // ----------------------------------------------------
        // BACKEND RECUSOU
        // ----------------------------------------------------

        if (
            dados &&
            dados.ok === false
        ) {

            mostrarUltimaLeitura(
                codigo + " - " +
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


        // ----------------------------------------------------
        // REGISTRO CONFIRMADO
        // ----------------------------------------------------

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
            codigo + " - ERRO"
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
        document.getElementById("codigo");


    if (!campo) {
        return;
    }


    campo.value = "";


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
        "status " + tipo;


    setTimeout(
        () => {

            elemento.textContent =
                "";

            elemento.className =
                "status";

        },
        1800
    );

}


// ============================================================
// VISIBILIDADE DA PÁGINA
// ============================================================

document.addEventListener(
    "visibilitychange",
    () => {

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
