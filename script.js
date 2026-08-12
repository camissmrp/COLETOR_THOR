/* ============================================================
   COLETOR THOR
   ============================================================ */


let configuracao = {};

let cameraStream = null;

let scannerControls = null;

let codeReader = null;

let cameraAtiva = false;

let processandoCodigo = false;

let ultimoCodigoLido = "";

let ultimoCodigoTempo = 0;


const sessao = {

    usuario: null,

    nomeUsuario: "",

    inventario: "",

    endereco: "",

    totalEndereco: 0,

    totalColeta: 0

};



/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        mostrarTelaLogin();

        document
            .getElementById("btnEntrar")
            .addEventListener(
                "click",
                iniciarColeta
            );


        document
            .getElementById("btnRegistrar")
            .addEventListener(
                "click",
                processarCodigoDigitado
            );


        document
            .getElementById("codigo")
            .addEventListener(
                "keydown",
                function (event) {

                    if (event.key === "Enter") {

                        event.preventDefault();

                        processarCodigoDigitado();

                    }

                }
            );


        document
            .getElementById("usuario")
            .addEventListener(
                "change",
                function () {

                    atualizarConfiguracaoUsuario(
                        this.value
                    );

                }
            );


        carregarConfiguracao();

    }
);



/* ============================================================
   TELA LOGIN
   ============================================================ */

function mostrarTelaLogin() {

    document
        .getElementById("login")
        .classList
        .remove("hidden");


    document
        .getElementById("coleta")
        .classList
        .add("hidden");


    pararCamera();


    sessao.usuario = null;

    sessao.nomeUsuario = "";

    sessao.inventario = "";

    sessao.endereco = "";

    sessao.totalEndereco = 0;

    sessao.totalColeta = 0;

}



function mostrarTelaColeta() {

    document
        .getElementById("login")
        .classList
        .add("hidden");


    document
        .getElementById("coleta")
        .classList
        .remove("hidden");

}



/* ============================================================
   STATUS
   ============================================================ */

function mostrarLoginStatus(
    mensagem,
    tipo = ""
) {

    const elemento =
        document.getElementById(
            "loginStatus"
        );


    elemento.textContent =
        mensagem || "";


    elemento.className =
        "status" +
        (
            tipo
                ? " " + tipo
                : ""
        );

}



function mostrarCollectionStatus(
    mensagem,
    tipo = ""
) {

    const elemento =
        document.getElementById(
            "collectionStatus"
        );


    elemento.textContent =
        mensagem || "";


    elemento.className =
        "status" +
        (
            tipo
                ? " " + tipo
                : ""
        );

}



function mostrarCameraStatus(
    mensagem
) {

    const elemento =
        document.getElementById(
            "cameraMessage"
        );


    if (elemento) {

        elemento.textContent =
            mensagem;

    }

}



/* ============================================================
   CARREGAR CONFIGURAÇÃO
   ============================================================ */

async function carregarConfiguracao() {

    try {

        mostrarLoginStatus(
            "Carregando configuração..."
        );


        const resposta =
            await fetch(
                API +
                "?acao=config&ts=" +
                Date.now(),
                {
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


        configuracao =
            dados || {};


        const select =
            document.getElementById(
                "usuario"
            );


        select.innerHTML = "";


        const usuarios =
            Array.isArray(
                dados.Usuarios
            )
                ? dados.Usuarios
                : [];


        if (
            usuarios.length === 0
        ) {

            const option =
                document.createElement(
                    "option"
                );


            option.value = "";

            option.textContent =
                "Nenhum usuário disponível";


            select.appendChild(
                option
            );


            document
                .getElementById(
                    "btnEntrar"
                )
                .disabled = true;


            mostrarLoginStatus(
                "Nenhum usuário ativo foi encontrado.",
                "error"
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


        atualizarConfiguracaoUsuario(
            usuarios[0].id
        );


        document
            .getElementById(
                "btnEntrar"
            )
            .disabled = false;


        mostrarLoginStatus("");

    }
    catch (erro) {

        console.error(
            "Erro ao carregar configuração:",
            erro
        );


        mostrarLoginStatus(
            "Não foi possível carregar a configuração.",
            "error"
        );


        document
            .getElementById(
                "btnEntrar"
            )
            .disabled = true;

    }

}



/* ============================================================
   CONFIGURAÇÃO DO USUÁRIO
   ============================================================ */

function atualizarConfiguracaoUsuario(
    usuarioId
) {

    const inventario =
        document.getElementById(
            "inventario"
        );


    const endereco =
        document.getElementById(
            "endereco"
        );


    let configUsuario = null;


    if (
        Array.isArray(
            configuracao.Configuracoes
        )
    ) {

        configUsuario =
            configuracao.Configuracoes.find(
                function (config) {

                    return (
                        String(
                            config.usuario
                        ).trim()
                        ===
                        String(
                            usuarioId
                        ).trim()
                    );

                }
            );

    }


    if (
        configUsuario
    ) {

        inventario.value =
            configUsuario.inventario ||
            "";


        endereco.value =
            configUsuario.enderecoAtual ||
            "";


        return;

    }


    inventario.value = "";

    endereco.value = "";

}



/* ============================================================
   INICIAR COLETA
   ============================================================ */

async function iniciarColeta() {

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


    const botao =
        document.getElementById(
            "btnEntrar"
        );


    const usuarioSelecionado =
        usuario.options[
            usuario.selectedIndex
        ];


    sessao.usuario =
        String(
            usuario.value || ""
        ).trim();


    sessao.nomeUsuario =
        usuarioSelecionado
            ? usuarioSelecionado.textContent.trim()
            : "";


    sessao.inventario =
        String(
            inventario.value || ""
        ).trim();


    sessao.endereco =
        String(
            endereco.value || ""
        )
        .trim()
        .toUpperCase();



    /* ========================================================
       VALIDAÇÃO
       ======================================================== */

    if (!sessao.usuario) {

        mostrarLoginStatus(
            "Selecione um usuário.",
            "error"
        );

        return;

    }


    if (!sessao.inventario) {

        mostrarLoginStatus(
            "Informe o inventário.",
            "error"
        );

        return;

    }


    if (!sessao.endereco) {

        mostrarLoginStatus(
            "Informe o endereço.",
            "error"
        );

        return;

    }


    botao.disabled = true;


    sessao.totalEndereco = 0;

    sessao.totalColeta = 0;


    document
        .getElementById(
            "lblUsuario"
        )
        .textContent =
        sessao.nomeUsuario;


    document
        .getElementById(
            "lblInventario"
        )
        .textContent =
        sessao.inventario;


    document
        .getElementById(
            "lblEndereco"
        )
        .textContent =
        sessao.endereco;


    document
        .getElementById(
            "contadorEndereco"
        )
        .textContent = "0";


    document
        .getElementById(
            "contadorTotal"
        )
        .textContent = "0";


    document
        .getElementById(
            "ultimaLeitura"
        )
        .textContent = "-";


    mostrarCollectionStatus("");

    mostrarTelaColeta();


    /*
     * A câmera somente é solicitada
     * depois do clique do usuário.
     */

    await iniciarCamera();

}



/* ============================================================
   ABRIR CÂMERA
   ============================================================ */

async function iniciarCamera() {

    if (cameraAtiva) {

        return;

    }


    const video =
        document.getElementById(
            "camera"
        );


    if (!video) {

        return;

    }


    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        mostrarCameraStatus(
            "Câmera não disponível neste navegador."
        );

        return;

    }


    mostrarCameraStatus(
        "Abrindo câmera..."
    );


    video.autoplay = true;

    video.muted = true;

    video.playsInline = true;

    video.setAttribute(
        "playsinline",
        "true"
    );

    video.setAttribute(
        "webkit-playsinline",
        "true"
    );


    try {

        cameraStream =
            await navigator.mediaDevices.getUserMedia({

                audio: false,

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

                }

            });


        video.srcObject =
            cameraStream;


        await video.play();


        cameraAtiva = true;


        mostrarCameraStatus(
            "Aponte a câmera para o código de barras"
        );


        iniciarLeitorZXing(
            video
        );

    }
    catch (erro) {

        console.error(
            "Erro ao abrir câmera:",
            erro
        );


        cameraAtiva = false;


        if (
            erro.name ===
            "NotAllowedError"
        ) {

            mostrarCameraStatus(
                "Acesso à câmera bloqueado. Permita a câmera no navegador."
            );

        }
        else {

            mostrarCameraStatus(
                "Não foi possível abrir a câmera."
            );

        }


        mostrarCollectionStatus(
            "Use o campo abaixo para digitar o código manualmente.",
            "error"
        );

    }

}



/* ============================================================
   LEITOR ZXING
   ============================================================ */

function iniciarLeitorZXing(
    video
) {

    if (
        !window.ZXingBrowser
    ) {

        mostrarCameraStatus(
            "Leitor de câmera não carregado."
        );

        return;

    }


    try {

        codeReader =
            new ZXingBrowser.BrowserMultiFormatReader();


        codeReader
            .decodeFromVideoElement(
                video,
                function (
                    resultado,
                    erro
                ) {

                    if (!resultado) {

                        return;

                    }


                    let codigo = "";


                    if (
                        typeof resultado.getText ===
                        "function"
                    ) {

                        codigo =
                            resultado.getText();

                    }
                    else {

                        codigo =
                            resultado.text ||
                            "";

                    }


                    if (codigo) {

                        receberCodigoDaCamera(
                            codigo
                        );

                    }

                }
            )
            .then(
                function (controls) {

                    scannerControls =
                        controls;

                }
            )
            .catch(
                function (erro) {

                    console.error(
                        "Erro no ZXing:",
                        erro
                    );

                    mostrarCameraStatus(
                        "Leitor não iniciou. Use a digitação manual."
                    );

                }
            );

    }
    catch (erro) {

        console.error(
            "Erro criando ZXing:",
            erro
        );

    }

}



/* ============================================================
   CÓDIGO LIDO PELA CÂMERA
   ============================================================ */

function receberCodigoDaCamera(
    codigo
) {

    const agora =
        Date.now();


    const valor =
        normalizarCodigo(
            codigo
        );


    if (!valor) {

        return;

    }


    /*
     * Evita ler o mesmo código
     * várias vezes seguidas.
     */

    if (
        valor === ultimoCodigoLido &&
        agora - ultimoCodigoTempo < 1000
    ) {

        return;

    }


    ultimoCodigoLido =
        valor;


    ultimoCodigoTempo =
        agora;


    processarCodigo(
        valor
    );

}



/* ============================================================
   DIGITAÇÃO MANUAL
   ============================================================ */

function processarCodigoDigitado() {

    const campo =
        document.getElementById(
            "codigo"
        );


    const codigo =
        normalizarCodigo(
            campo.value
        );


    if (!codigo) {

        return;

    }


    processarCodigo(
        codigo
    );

}



/* ============================================================
   PROCESSAR CÓDIGO
   ============================================================ */

async function processarCodigo(
    codigo
) {

    if (
        processandoCodigo
    ) {

        return;

    }


    codigo =
        normalizarCodigo(
            codigo
        );


    if (!codigo) {

        return;

    }


    if (
        !sessao.usuario ||
        !sessao.inventario ||
        !sessao.endereco
    ) {

        mostrarCollectionStatus(
            "Sessão inválida.",
            "error"
        );

        return;

    }


    processandoCodigo = true;


    document
        .getElementById(
            "codigo"
        )
        .value = "";


    /*
     * REGRA:
     *
     * LETRA = ENDEREÇO
     *
     * NÚMERO = PRODUTO
     */


    if (
        /^[A-Za-z]/.test(
            codigo
        )
    ) {

        await processarNovoEndereco(
            codigo
        );


        processandoCodigo =
            false;


        return;

    }


    if (
        !/^\d/.test(
            codigo
        )
    ) {

        document
            .getElementById(
                "ultimaLeitura"
            )
            .textContent =
            codigo + " - INVÁLIDO";


        mostrarCollectionStatus(
            "Código inválido.",
            "error"
        );


        processandoCodigo =
            false;


        return;

    }


    await registrarProduto(
        codigo
    );


    processandoCodigo =
        false;

}



/* ============================================================
   NORMALIZAR CÓDIGO
   ============================================================ */

function normalizarCodigo(
    valor
) {

    return String(
        valor || ""
    )
        .replace(
            /[\r\n\t]/g,
            ""
        )
        .trim()
        .toUpperCase();

}



/* ============================================================
   NOVO ENDEREÇO
   ============================================================ */

async function processarNovoEndereco(
    novoEndereco
) {

    novoEndereco =
        normalizarCodigo(
            novoEndereco
        );


    sessao.endereco =
        novoEndereco;


    sessao.totalEndereco =
        0;


    document
        .getElementById(
            "lblEndereco"
        )
        .textContent =
        novoEndereco;


    document
        .getElementById(
            "contadorEndereco"
        )
        .textContent =
        "0";


    document
        .getElementById(
            "ultimaLeitura"
        )
        .textContent =
        novoEndereco;


    mostrarCollectionStatus(
        "Endereço alterado.",
        "success"
    );


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

                body: JSON.stringify({

                    acao:
                        "novoEndereco",

                    usuario:
                        sessao.usuario,

                    inventario:
                        sessao.inventario,

                    endereco:
                        novoEndereco

                })

            }
        );


        /*
         * Atualiza também a configuração
         * local do usuário.
         */

        if (
            Array.isArray(
                configuracao.Configuracoes
            )
        ) {

            const configUsuario =
                configuracao.Configuracoes.find(
                    function (config) {

                        return (
                            String(
                                config.usuario
                            ).trim()
                            ===
                            String(
                                sessao.usuario
                            ).trim()
                        );

                    }
                );


            if (configUsuario) {

                configUsuario.inventario =
                    sessao.inventario;


                configUsuario.enderecoAtual =
                    novoEndereco;

            }

        }

    }
    catch (erro) {

        console.error(
            "Erro ao atualizar endereço:",
            erro
        );


        mostrarCollectionStatus(
            "Erro ao atualizar endereço.",
            "error"
        );

    }

}



/* ============================================================
   REGISTRAR PRODUTO
   ============================================================ */

async function registrarProduto(
    codigo
) {

    const ultima =
        document.getElementById(
            "ultimaLeitura"
        );


    try {

        /*
         * PRIMEIRO:
         * verifica se já existe.
         */

        const respostaVerificacao =
            await fetch(

                API +
                "?acao=verificar" +
                "&inventario=" +
                encodeURIComponent(
                    sessao.inventario
                ) +
                "&endereco=" +
                encodeURIComponent(
                    sessao.endereco
                ) +
                "&codigo=" +
                encodeURIComponent(
                    codigo
                ) +
                "&ts=" +
                Date.now(),

                {
                    cache: "no-store"
                }

            );


        const verificacao =
            await respostaVerificacao.json();


        /*
         * PRODUTO REPETIDO
         */

        if (
            verificacao.existe
        ) {

            ultima.textContent =
                "PRODUTO JÁ COLETADO";


            mostrarCollectionStatus(
                "Este produto já foi coletado neste endereço.",
                "error"
            );


            return;

        }



        /*
         * SEGUNDO:
         * grava a coleta.
         */

        await fetch(
            API,
            {

                method: "POST",

                mode: "no-cors",

                headers: {
                    "Content-Type":
                        "text/plain"
                },

                body: JSON.stringify({

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

                })

            }
        );


        /*
         * ATUALIZA CONTADORES
         */

        sessao.totalEndereco++;

        sessao.totalColeta++;


        document
            .getElementById(
                "contadorEndereco"
            )
            .textContent =
            sessao.totalEndereco;


        document
            .getElementById(
                "contadorTotal"
            )
            .textContent =
            sessao.totalColeta;


        ultima.textContent =
            codigo;


        mostrarCollectionStatus(
            "Coleta registrada.",
            "success"
        );


        console.log(
            "Coleta enviada:",
            codigo
        );

    }
    catch (erro) {

        console.error(
            "Erro ao registrar produto:",
            erro
        );


        ultima.textContent =
            codigo + " - ERRO";


        mostrarCollectionStatus(
            "Erro ao registrar a coleta. Tente novamente.",
            "error"
        );

    }

}



/* ============================================================
   PARAR CÂMERA
   ============================================================ */

function pararCamera() {

    try {

        if (
            scannerControls &&
            typeof scannerControls.stop ===
            "function"
        ) {

            scannerControls.stop();

        }

    }
    catch (erro) {

        console.warn(
            "Erro ao parar ZXing:",
            erro
        );

    }


    scannerControls =
        null;


    try {

        if (
            codeReader &&
            typeof codeReader.reset ===
            "function"
        ) {

            codeReader.reset();

        }

    }
    catch (erro) {

        console.warn(
            "Erro resetando ZXing:",
            erro
        );

    }


    codeReader =
        null;


    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(
                function (track) {

                    try {

                        track.stop();

                    }
                    catch (erro) {

                        console.warn(
                            "Erro parando câmera:",
                            erro
                        );

                    }

                }
            );

    }


    cameraStream =
        null;


    cameraAtiva =
        false;


    const video =
        document.getElementById(
            "camera"
        );


    if (video) {

        video.pause();

        video.srcObject =
            null;

    }

}



/* ============================================================
   SEGURANÇA
   ============================================================ */

window.addEventListener(
    "pagehide",
    function () {

        pararCamera();

    }
);


window.addEventListener(
    "beforeunload",
    function () {

        pararCamera();

    }
);
