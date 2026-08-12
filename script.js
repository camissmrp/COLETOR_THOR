// ======================================================
// COLETOR THOR
// SCRIPT PRINCIPAL
// ======================================================

let configuracao = {};

let sessao = {
    usuario: null,
    nomeUsuario: "",
    inventario: "",
    endereco: "",
    totalEndereco: 0,
    totalColeta: 0
};

let codeReader = null;
let cameraStream = null;

// ======================================================
// CONTROLE DE DUPLICIDADE
// ======================================================

let codigosColetados = new Set();
let codigosProcessando = new Set();

// ======================================================
// ELEMENTOS
// ======================================================

let usuario;
let inventario;
let endereco;
let btnEntrar;
let btnRegistrar;
let codigo;

// ======================================================
// INICIALIZAÇÃO
// ======================================================

window.addEventListener("DOMContentLoaded", function () {

    console.log("THOR - página carregada");

    usuario = document.getElementById("usuario");
    inventario = document.getElementById("inventario");
    endereco = document.getElementById("endereco");
    btnEntrar = document.getElementById("btnEntrar");
    btnRegistrar = document.getElementById("btnRegistrar");
    codigo = document.getElementById("codigo");

    // ==================================================
    // CAMPOS
    // ==================================================

    if (inventario) {
        inventario.disabled = false;
        inventario.readOnly = false;
    }

    if (endereco) {
        endereco.disabled = false;
        endereco.readOnly = false;
    }

    // ==================================================
    // BOTÃO INICIAR
    // ==================================================

    if (btnEntrar) {

        btnEntrar.disabled = false;

        btnEntrar.onclick = function (evento) {

            evento.preventDefault();

            iniciarColeta();

        };

    }

    // ==================================================
    // BOTÃO REGISTRAR
    // ==================================================

    if (btnRegistrar) {

        btnRegistrar.onclick = function (evento) {

            evento.preventDefault();

            registrarCodigo(
                codigo ? codigo.value : ""
            );

        };

    }

    // ==================================================
    // ENTER
    // ==================================================

    if (codigo) {

        codigo.addEventListener(
            "keydown",
            function (evento) {

                if (evento.key === "Enter") {

                    evento.preventDefault();

                    registrarCodigo(
                        codigo.value
                    );

                }

            }
        );

    }

    // ==================================================
    // CONFIGURAÇÃO
    // ==================================================

    carregarConfiguracao();

});


// ======================================================
// CARREGAR CONFIGURAÇÃO
// ======================================================

async function carregarConfiguracao() {

    try {

        console.log(
            "Carregando configuração..."
        );

        const resposta =
            await fetch(
                API +
                "?acao=config&_=" +
                Date.now()
            );

        if (!resposta.ok) {

            throw new Error(
                "Erro HTTP " +
                resposta.status
            );

        }

        const dados =
            await resposta.json();

        configuracao =
            dados;

        // ==================================================
        // USUÁRIOS
        // ==================================================

        if (usuario) {

            usuario.innerHTML = "";

            if (
                dados.Usuarios &&
                dados.Usuarios.length > 0
            ) {

                dados.Usuarios.forEach(
                    function (item) {

                        const option =
                            document.createElement(
                                "option"
                            );

                        option.value =
                            item.id;

                        option.text =
                            item.nome;

                        usuario.appendChild(
                            option
                        );

                    }
                );

                atualizarConfiguracaoUsuario(
                    usuario.value
                );

            } else {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value = "";

                option.text =
                    "Nenhum usuário";

                usuario.appendChild(
                    option
                );

            }

            usuario.onchange =
                function () {

                    atualizarConfiguracaoUsuario(
                        usuario.value
                    );

                };

        }

        if (btnEntrar) {

            btnEntrar.disabled =
                false;

        }

        console.log(
            "Configuração carregada."
        );

    }

    catch (erro) {

        console.error(
            "Erro na configuração:",
            erro
        );

        if (btnEntrar) {

            btnEntrar.disabled =
                false;

        }

    }

}


// ======================================================
// CONFIGURAÇÃO DO USUÁRIO
// ======================================================

function atualizarConfiguracaoUsuario(
    usuarioId
) {

    if (inventario) {

        inventario.disabled = false;
        inventario.readOnly = false;

    }

    if (endereco) {

        endereco.disabled = false;
        endereco.readOnly = false;

    }

    if (!configuracao.Configuracoes) {

        return;

    }

    const config =
        configuracao.Configuracoes.find(
            function (item) {

                return (
                    String(item.usuario) ===
                    String(usuarioId)
                );

            }
        );

    if (!config) {

        return;

    }

    if (
        config.inventario !== undefined
    ) {

        inventario.value =
            config.inventario || "";

    }

    if (
        config.enderecoAtual !== undefined
    ) {

        endereco.value =
            config.enderecoAtual || "";

    }

}


// ======================================================
// INICIAR COLETA
// ======================================================

function iniciarColeta() {

    console.log(
        "INICIAR COLETA clicado."
    );

    // ==================================================
    // VALIDA USUÁRIO
    // ==================================================

    if (
        !usuario ||
        !usuario.value
    ) {

        alert(
            "Selecione um usuário."
        );

        return;

    }

    // ==================================================
    // INVENTÁRIO
    // ==================================================

    const valorInventario =
        inventario.value
            .trim()
            .toUpperCase();

    if (
        valorInventario === ""
    ) {

        alert(
            "Informe o inventário."
        );

        inventario.focus();

        return;

    }

    // ==================================================
    // ENDEREÇO
    // ==================================================

    const valorEndereco =
        endereco.value
            .trim()
            .toUpperCase();

    if (
        valorEndereco === ""
    ) {

        alert(
            "Informe o endereço."
        );

        endereco.focus();

        return;

    }

    // ==================================================
    // NOVA SESSÃO
    // ==================================================

    sessao.usuario =
        usuario.value;

    sessao.nomeUsuario =
        usuario.options[
            usuario.selectedIndex
        ].text;

    sessao.inventario =
        valorInventario;

    sessao.endereco =
        valorEndereco;

    sessao.totalEndereco =
        0;

    sessao.totalColeta =
        0;

    // ==================================================
    // LIMPA CONTROLE DE DUPLICIDADE
    // ==================================================

    codigosColetados.clear();

    codigosProcessando.clear();

    console.log(
        "Controle de duplicidade zerado."
    );

    // ==================================================
    // LABELS
    // ==================================================

    const lblUsuario =
        document.getElementById(
            "lblUsuario"
        );

    const lblInventario =
        document.getElementById(
            "lblInventario"
        );

    const lblEndereco =
        document.getElementById(
            "lblEndereco"
        );

    if (lblUsuario) {

        lblUsuario.innerText =
            sessao.nomeUsuario;

    }

    if (lblInventario) {

        lblInventario.innerText =
            sessao.inventario;

    }

    if (lblEndereco) {

        lblEndereco.innerText =
            sessao.endereco;

    }

    // ==================================================
    // CONTADORES
    // ==================================================

    const contadorEndereco =
        document.getElementById(
            "contadorEndereco"
        );

    const contadorTotal =
        document.getElementById(
            "contadorTotal"
        );

    const ultimaLeitura =
        document.getElementById(
            "ultimaLeitura"
        );

    if (contadorEndereco) {

        contadorEndereco.innerText =
            "0";

    }

    if (contadorTotal) {

        contadorTotal.innerText =
            "0";

    }

    if (ultimaLeitura) {

        ultimaLeitura.innerText =
            "-";

    }

    // ==================================================
    // ESCONDE LOGIN
    // ==================================================

    const login =
        document.getElementById(
            "login"
        );

    if (login) {

        login.classList.add(
            "hidden"
        );

        login.style.display =
            "none";

    }

    // ==================================================
    // MOSTRA COLETA
    // ==================================================

    const coleta =
        document.getElementById(
            "coleta"
        );

    if (!coleta) {

        console.error(
            "Tela de coleta não encontrada."
        );

        return;

    }

    coleta.classList.remove(
        "hidden"
    );

    coleta.style.display =
        "flex";

    // ==================================================
    // CÂMERA
    // ==================================================

    setTimeout(
        function () {

            iniciarCamera();

        },
        300
    );

    // ==================================================
    // FOCO
    // ==================================================

    setTimeout(
        function () {

            if (codigo) {

                codigo.focus();

            }

        },
        500
    );

}


// ======================================================
// INICIAR CÂMERA
// ======================================================

async function iniciarCamera() {

    console.log(
        "Iniciando câmera..."
    );

    const video =
        document.getElementById(
            "camera"
        );

    const mensagem =
        document.getElementById(
            "cameraMessage"
        );

    if (!video) {

        console.warn(
            "Vídeo não encontrado."
        );

        return;

    }

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        if (mensagem) {

            mensagem.innerText =
                "Câmera indisponível. Digite o código.";

        }

        return;

    }

    try {

        if (mensagem) {

            mensagem.innerText =
                "Abrindo câmera...";

        }

        cameraStream =
            await navigator.mediaDevices.getUserMedia(
                {
                    video: {
                        facingMode: {
                            ideal: "environment"
                        }
                    },
                    audio: false
                }
            );

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

        if (mensagem) {

            mensagem.innerText =
                "Aponte a câmera para o código de barras";

        }

        console.log(
            "Câmera aberta."
        );

        iniciarLeitorZXing();

    }

    catch (erro) {

        console.error(
            "Erro ao abrir câmera:",
            erro
        );

        if (mensagem) {

            mensagem.innerText =
                "Câmera indisponível. Digite o código.";

        }

    }

}


// ======================================================
// LEITOR ZXING
// ======================================================

function iniciarLeitorZXing() {

    if (
        typeof ZXingBrowser ===
        "undefined"
    ) {

        console.warn(
            "ZXing não carregado."
        );

        return;

    }

    const video =
        document.getElementById(
            "camera"
        );

    if (!video) {

        return;

    }

    try {

        codeReader =
            new ZXingBrowser.BrowserMultiFormatReader();

        codeReader.decodeFromVideoElement(
            video,
            function (
                resultado,
                erro
            ) {

                if (!resultado) {

                    return;

                }

                let texto = "";

                try {

                    texto =
                        resultado.getText();

                }

                catch (e) {

                    texto =
                        resultado.text || "";

                }

                if (!texto) {

                    return;

                }

                console.log(
                    "Código detectado:",
                    texto
                );

                registrarCodigo(
                    texto
                );

            }
        );

    }

    catch (erro) {

        console.error(
            "Erro ZXing:",
            erro
        );

    }

}


// ======================================================
// REGISTRAR CÓDIGO
// ======================================================

async function registrarCodigo(
    codigoRecebido
) {

    let codigoLido =
        String(
            codigoRecebido || ""
        )
        .trim()
        .toUpperCase();

    if (
        codigoLido === ""
    ) {

        return;

    }

    if (codigo) {

        codigo.value =
            "";

    }

    // ==================================================
    // ENDEREÇO
    // ==================================================

    if (
        /^[A-Z]/.test(
            codigoLido
        )
    ) {

        await alterarEndereco(
            codigoLido
        );

        if (codigo) {

            codigo.focus();

        }

        return;

    }

    // ==================================================
    // PRODUTO
    // ==================================================

    if (
        /^[0-9]/.test(
            codigoLido
        )
    ) {

        await registrarProduto(
            codigoLido
        );

        if (codigo) {

            codigo.focus();

        }

        return;

    }

    // ==================================================
    // INVÁLIDO
    // ==================================================

    mostrarUltimaLeitura(
        codigoLido +
        " - INVÁLIDO"
    );

    if (codigo) {

        codigo.focus();

    }

}


// ======================================================
// ALTERAR ENDEREÇO
// ======================================================

async function alterarEndereco(
    novoEndereco
) {

    sessao.endereco =
        novoEndereco
            .trim()
            .toUpperCase();

    const lblEndereco =
        document.getElementById(
            "lblEndereco"
        );

    if (lblEndereco) {

        lblEndereco.innerText =
            sessao.endereco;

    }

    sessao.totalEndereco =
        0;

    const contadorEndereco =
        document.getElementById(
            "contadorEndereco"
        );

    if (contadorEndereco) {

        contadorEndereco.innerText =
            "0";

    }

    mostrarUltimaLeitura(
        "ENDEREÇO: " +
        sessao.endereco
    );

    try {

        await fetch(
            API,
            {
                method:
                    "POST",

                mode:
                    "no-cors",

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

                        nomeUsuario:
                            sessao.nomeUsuario,

                        inventario:
                            sessao.inventario,

                        endereco:
                            sessao.endereco

                    })

            }
        );

    }

    catch (erro) {

        console.error(
            "Erro ao salvar endereço:",
            erro
        );

    }

}


// ======================================================
// REGISTRAR PRODUTO
// ======================================================

async function registrarProduto(
    codigoProduto
) {

    // ==================================================
    // EVITA LEITURA DUPLICADA IMEDIATA
    // ==================================================

    if (
        codigosColetados.has(
            codigoProduto
        )
    ) {

        console.log(
            "REPETIDO:",
            codigoProduto
        );

        mostrarUltimaLeitura(
            codigoProduto +
            " - REPETIDO - NÃO REGISTRADO"
        );

        return;

    }


    // ==================================================
    // EVITA DUPLICIDADE ENQUANTO ESTÁ PROCESSANDO
    // ==================================================

    if (
        codigosProcessando.has(
            codigoProduto
        )
    ) {

        console.log(
            "REPETIDO DURANTE PROCESSAMENTO:",
            codigoProduto
        );

        mostrarUltimaLeitura(
            codigoProduto +
            " - REPETIDO - NÃO REGISTRADO"
        );

        return;

    }


    // ==================================================
    // MARCA COMO PROCESSANDO
    // ==================================================

    codigosProcessando.add(
        codigoProduto
    );


    try {

        console.log(
            "Verificando código:",
            codigoProduto
        );

        // ==================================================
        // VERIFICA NA PLANILHA
        // ==================================================

        try {

            const resposta =
                await fetch(

                    API +
                    "?acao=verificar" +
                    "&inventario=" +
                    encodeURIComponent(
                        sessao.inventario
                    ) +
                    "&codigo=" +
                    encodeURIComponent(
                        codigoProduto
                    ) +
                    "&_=" +
                    Date.now()

                );

            if (resposta.ok) {

                const verifica =
                    await resposta.json();

                console.log(
                    "Resultado da verificação:",
                    verifica
                );

                if (
                    verifica &&
                    verifica.existe
                ) {

                    // Marca para impedir
                    // novas tentativas.

                    codigosColetados.add(
                        codigoProduto
                    );

                    codigosProcessando.delete(
                        codigoProduto
                    );

                    mostrarUltimaLeitura(
                        codigoProduto +
                        " - REPETIDO - NÃO REGISTRADO"
                    );

                    return;

                }

            }

        }

        catch (erroVerificacao) {

            /*
             * Se a consulta de duplicidade
             * falhar, ainda permitimos
             * a gravação.
             */

            console.warn(
                "Falha na verificação:",
                erroVerificacao
            );

        }


        // ==================================================
        // DADOS
        // ==================================================

        const dados = {

            acao:
                "coleta",

            usuario:
                sessao.usuario,

            nomeUsuario:
                sessao.nomeUsuario,

            inventario:
                sessao.inventario,

            endereco:
                sessao.endereco,

            codigo:
                codigoProduto,

            codigoBarras:
                codigoProduto,

            tipoLeitura:
                "PRODUTO"

        };


        console.log(
            "Enviando coleta:",
            dados
        );


        // ==================================================
        // URL
        // ==================================================

        const parametros =
            new URLSearchParams({

                acao:
                    "coleta",

                usuario:
                    sessao.usuario,

                nomeUsuario:
                    sessao.nomeUsuario,

                inventario:
                    sessao.inventario,

                endereco:
                    sessao.endereco,

                codigo:
                    codigoProduto,

                codigoBarras:
                    codigoProduto,

                tipoLeitura:
                    "PRODUTO"

            });


        const url =
            API +
            "?" +
            parametros.toString();


        // ==================================================
        // GRAVA NA SHEET
        // ==================================================

        await fetch(
            url,
            {

                method:
                    "POST",

                mode:
                    "no-cors",

                headers: {

                    "Content-Type":
                        "text/plain;charset=utf-8"

                },

                body:
                    JSON.stringify(
                        dados
                    )

            }
        );


        // ==================================================
        // MARCA COMO COLETADO
        // ==================================================

        codigosProcessando.delete(
            codigoProduto
        );

        codigosColetados.add(
            codigoProduto
        );


        // ==================================================
        // CONTADORES
        // ==================================================

        sessao.totalEndereco++;

        sessao.totalColeta++;


        const contadorEndereco =
            document.getElementById(
                "contadorEndereco"
            );

        const contadorTotal =
            document.getElementById(
                "contadorTotal"
            );


        if (contadorEndereco) {

            contadorEndereco.innerText =
                sessao.totalEndereco;

        }


        if (contadorTotal) {

            contadorTotal.innerText =
                sessao.totalColeta;

        }


        // ==================================================
        // ÚLTIMA LEITURA
        // ==================================================

        mostrarUltimaLeitura(
            codigoProduto
        );


        console.log(
            "COLETA REGISTRADA:",
            codigoProduto
        );

    }

    catch (erro) {

        console.error(
            "ERRO AO REGISTRAR:",
            erro
        );


        // Se deu erro,
        // permite tentar novamente.

        codigosProcessando.delete(
            codigoProduto
        );


        mostrarUltimaLeitura(
            codigoProduto +
            " - ERRO AO REGISTRAR"
        );

    }

}


// ======================================================
// ÚLTIMA LEITURA
// ======================================================

function mostrarUltimaLeitura(
    texto
) {

    const elemento =
        document.getElementById(
            "ultimaLeitura"
        );

    if (elemento) {

        elemento.innerText =
            texto;

    }

}


// ======================================================
// PARAR CÂMERA
// ======================================================

function pararCamera() {

    if (codeReader) {

        try {

            codeReader.reset();

        }

        catch (erro) {

            console.warn(
                "Erro ao parar ZXing:",
                erro
            );

        }

        codeReader =
            null;

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

}


// ======================================================
// AO SAIR
// ======================================================

window.addEventListener(
    "beforeunload",
    function () {

        pararCamera();

    }
);
