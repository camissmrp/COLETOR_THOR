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
// CONTROLE DE LEITURAS
// ======================================================

// Códigos que já foram registrados nesta sessão
let codigosColetados = new Set();

// Códigos que estão sendo processados neste momento
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

    usuario =
        document.getElementById("usuario");

    inventario =
        document.getElementById("inventario");

    endereco =
        document.getElementById("endereco");

    btnEntrar =
        document.getElementById("btnEntrar");

    btnRegistrar =
        document.getElementById("btnRegistrar");

    codigo =
        document.getElementById("codigo");


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
    // ENTER NO CAMPO MANUAL
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
    // CARREGA CONFIGURAÇÃO
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

            }

            else {

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

        inventario.disabled =
            false;

        inventario.readOnly =
            false;

    }


    if (endereco) {

        endereco.disabled =
            false;

        endereco.readOnly =
            false;

    }


    if (
        !configuracao.Configuracoes
    ) {

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
    // SESSÃO
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
    // IMPORTANTE:
    // LIMPA OS CÓDIGOS DA SESSÃO ANTERIOR
    // ==================================================

    codigosColetados.clear();

    codigosProcessando.clear();


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
        700
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
            "Câmera não encontrada."
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

        console.error(
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


                texto =
                    String(texto)
                        .trim()
                        .toUpperCase();


                console.log(
                    "CÓDIGO DETECTADO:",
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
            "Erro no ZXing:",
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


    // ==================================================
    // LIMPA CAMPO
    // ==================================================

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

    codigoProduto =
        String(
            codigoProduto || ""
        )
        .trim()
        .toUpperCase();


    if (
        codigoProduto === ""
    ) {

        return;

    }


    console.log(
        "Processando:",
        codigoProduto
    );


    // ==================================================
    // 1 - JÁ FOI REGISTRADO NESTA SESSÃO?
    // ==================================================

    if (
        codigosColetados.has(
            codigoProduto
        )
    ) {

        console.log(
            "DUPLICADO LOCAL:",
            codigoProduto
        );


        mostrarUltimaLeitura(
            codigoProduto +
            " - JÁ COLETADO - NÃO REGISTRADO"
        );


        mostrarStatus(
            "⚠️ " +
            codigoProduto +
            " JÁ FOI COLETADO"
        );


        return;

    }


    // ==================================================
    // 2 - ESTÁ SENDO PROCESSADO?
    // ==================================================

    if (
        codigosProcessando.has(
            codigoProduto
        )
    ) {

        console.log(
            "LEITURA REPETIDA DURANTE PROCESSAMENTO:",
            codigoProduto
        );


        mostrarUltimaLeitura(
            codigoProduto +
            " - REPETIDO - NÃO REGISTRADO"
        );


        mostrarStatus(
            "⚠️ " +
            codigoProduto +
            " JÁ ESTÁ SENDO PROCESSADO"
        );


        return;

    }


    // ==================================================
    // 3 - BLOQUEIA IMEDIATAMENTE
    // ==================================================

    codigosProcessando.add(
        codigoProduto
    );


    try {

        // ==================================================
        // 4 - CONSULTA A SHEET
        // ==================================================

        console.log(
            "Consultando Sheet:",
            codigoProduto
        );


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


        if (!resposta.ok) {

            throw new Error(
                "Erro HTTP na verificação: " +
                resposta.status
            );

        }


        const verifica =
            await resposta.json();


        console.log(
            "Resposta da verificação:",
            verifica
        );


        // ==================================================
        // 5 - JÁ EXISTE NA SHEET
        // ==================================================

        if (
            verifica &&
            (
                verifica.existe === true ||
                verifica.existe === "true" ||
                verifica.existe === 1 ||
                verifica.existe === "1"
            )
        ) {

            console.log(
                "PRODUTO JÁ EXISTE NA SHEET:",
                codigoProduto
            );


            // IMPORTANTE:
            // Guarda localmente para impedir
            // novas leituras.

            codigosColetados.add(
                codigoProduto
            );


            codigosProcessando.delete(
                codigoProduto
            );


            mostrarUltimaLeitura(
                codigoProduto +
                " - JÁ COLETADO"
            );


            mostrarStatus(
                "⚠️ " +
                codigoProduto +
                " JÁ FOI COLETADO. NÃO REGISTRADO NOVAMENTE."
            );


            return;

        }


        // ==================================================
        // 6 - NÃO EXISTE -> REGISTRA
        // ==================================================

        console.log(
            "Produto novo. Registrando:",
            codigoProduto
        );


        await fetch(
            API,
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
                    JSON.stringify({

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

                    })

            }
        );


        // ==================================================
        // 7 - AGORA SIM MARCA COMO COLETADO
        // ==================================================

        codigosProcessando.delete(
            codigoProduto
        );


        codigosColetados.add(
            codigoProduto
        );


        // ==================================================
        // 8 - CONTADORES
        // ==================================================

        sessao.totalEndereco =
            sessao.totalEndereco + 1;


        sessao.totalColeta =
            sessao.totalColeta + 1;


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
        // 9 - MOSTRA LEITURA
        // ==================================================

        mostrarUltimaLeitura(
            codigoProduto +
            " - REGISTRADO"
        );


        mostrarStatus(
            "✓ " +
            codigoProduto +
            " registrado com sucesso."
        );


        console.log(
            "REGISTRADO:",
            codigoProduto
        );

    }

    catch (erro) {

        console.error(
            "ERRO AO REGISTRAR:",
            erro
        );


        // ==================================================
        // SE DEU ERRO, LIBERA PARA TENTAR NOVAMENTE
        // ==================================================

        codigosProcessando.delete(
            codigoProduto
        );


        mostrarUltimaLeitura(
            codigoProduto +
            " - ERRO AO REGISTRAR"
        );


        mostrarStatus(
            "❌ Erro ao registrar " +
            codigoProduto
        );

    }

}


// ======================================================
// MOSTRAR ÚLTIMA LEITURA
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
// MOSTRAR STATUS
// ======================================================

function mostrarStatus(
    texto
) {

    const status =
        document.getElementById(
            "collectionStatus"
        );


    if (!status) {

        return;

    }


    status.innerText =
        texto;


    status.style.display =
        "block";


    // Mantém a mensagem por alguns segundos

    clearTimeout(
        window.timerStatusColeta
    );


    window.timerStatusColeta =
        setTimeout(
            function () {

                status.innerText = "";

            },
            4000
        );

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
// SAÍDA DA PÁGINA
// ======================================================

window.addEventListener(
    "beforeunload",
    function () {

        pararCamera();

    }
);
