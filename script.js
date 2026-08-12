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


/* ============================================================
   ÁUDIO / BIP
   ============================================================ */

let audioContext = null;


/* ============================================================
   SESSÃO
   ============================================================ */

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

document.addEventListener("DOMContentLoaded", () => {

    mostrarTelaLogin();

    const btnEntrar =
        document.getElementById("btnEntrar");

    const btnRegistrar =
        document.getElementById("btnRegistrar");

    const txtCodigo =
        document.getElementById("codigo");

    const selectUsuario =
        document.getElementById("usuario");


    /* ========================================================
       BOTÃO INICIAR COLETA
       ======================================================== */

    btnEntrar.addEventListener(
        "click",
        iniciarColeta
    );


    /* ========================================================
       BOTÃO REGISTRAR
       ======================================================== */

    btnRegistrar.addEventListener(
        "click",
        () => {

            processarCodigoDigitado();

        }
    );


    /* ========================================================
       ENTER NO CAMPO DO CÓDIGO
       ======================================================== */

    txtCodigo.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Enter") {

                event.preventDefault();

                processarCodigoDigitado();

            }

        }
    );


    /* ========================================================
       TROCA DE USUÁRIO
       ======================================================== */

    selectUsuario.addEventListener(
        "change",
        () => {

            atualizarConfiguracaoUsuario(
                selectUsuario.value
            );

        }
    );


    /* ========================================================
       CARREGA CONFIGURAÇÃO
       ======================================================== */

    carregarConfiguracao();

});


/* ============================================================
   PREPARAR ÁUDIO
   ============================================================ */

/*
 * IMPORTANTE:
 *
 * Esta função é chamada diretamente pelo clique no botão
 * "INICIAR COLETA".
 *
 * Isso é necessário principalmente no iPhone/Safari,
 * que bloqueia áudio iniciado fora de uma interação
 * do usuário.
 */

async function prepararAudio() {

    try {

        const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContextClass) {

            console.warn(
                "AudioContext não é suportado neste navegador."
            );

            return false;

        }


        /* ====================================================
           CRIA O CONTEXTO DE ÁUDIO
           ==================================================== */

        if (!audioContext) {

            audioContext =
                new AudioContextClass();

        }


        /* ====================================================
           LIBERA O AUDIOCONTEXT
           ==================================================== */

        if (
            audioContext.state === "suspended"
        ) {

            await audioContext.resume();

        }


        /* ====================================================
           TESTE REAL DE ÁUDIO
           
           Este pequeno som acontece dentro do clique do
           usuário e ajuda a liberar o áudio no Safari/iOS.
           ==================================================== */

        const agora =
            audioContext.currentTime;

        const oscilador =
            audioContext.createOscillator();

        const ganho =
            audioContext.createGain();


        oscilador.type =
            "sine";


        oscilador.frequency.setValueAtTime(
            1200,
            agora
        );


        ganho.gain.setValueAtTime(
            0.0001,
            agora
        );


        ganho.gain.exponentialRampToValueAtTime(
            0.15,
            agora + 0.01
        );


        ganho.gain.exponentialRampToValueAtTime(
            0.0001,
            agora + 0.08
        );


        oscilador.connect(
            ganho
        );


        ganho.connect(
            audioContext.destination
        );


        oscilador.start(
            agora
        );


        oscilador.stop(
            agora + 0.08
        );


        /* ====================================================
           GARANTE QUE O CONTEXTO FICOU ATIVO
           ==================================================== */

        if (
            audioContext.state === "suspended"
        ) {

            await audioContext.resume();

        }


        console.log(
            "AudioContext:",
            audioContext.state
        );


        return (
            audioContext.state === "running"
        );

    }
    catch (erro) {

        console.warn(
            "Não foi possível preparar o áudio:",
            erro
        );

        return false;

    }

}


/* ============================================================
   EMITIR BIP
   ============================================================ */

function emitirBip() {

    try {

        const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;


        if (!AudioContextClass) {

            console.warn(
                "AudioContext não é suportado neste navegador."
            );

            return;

        }


        /* ====================================================
           GARANTE QUE EXISTE UM CONTEXTO
           ==================================================== */

        if (!audioContext) {

            audioContext =
                new AudioContextClass();

        }


        /*
         * Se o contexto estiver suspenso, tenta liberar.
         *
         * Normalmente ele já estará "running", pois foi
         * liberado pelo botão INICIAR COLETA.
         */

        if (
            audioContext.state === "suspended"
        ) {

            audioContext.resume()
                .catch(
                    erro => {

                        console.warn(
                            "Não foi possível reativar o áudio:",
                            erro
                        );

                    }
                );

        }


        if (
            audioContext.state !== "running"
        ) {

            console.warn(
                "Áudio não está disponível. Estado:",
                audioContext.state
            );

            return;

        }


        /* ====================================================
           MOMENTO ATUAL DO ÁUDIO
           ==================================================== */

        const agora =
            audioContext.currentTime;


        /* ====================================================
           OSCILADOR
           ==================================================== */

        const oscilador =
            audioContext.createOscillator();


        /* ====================================================
           CONTROLE DE VOLUME
           ==================================================== */

        const ganho =
            audioContext.createGain();


        /* ====================================================
           CONFIGURAÇÃO DO BIP
           ==================================================== */

        oscilador.type =
            "sine";


        /*
         * Frequência do bip.
         *
         * 1800 Hz é um som agudo e perceptível.
         */

        oscilador.frequency.setValueAtTime(
            1800,
            agora
        );


        /*
         * Começa praticamente no zero.
         */

        ganho.gain.setValueAtTime(
            0.0001,
            agora
        );


        /*
         * Ataque rápido.
         */

        ganho.gain.exponentialRampToValueAtTime(
            0.30,
            agora + 0.01
        );


        /*
         * Decaimento.
         *
         * Bip de aproximadamente 150 ms.
         */

        ganho.gain.exponentialRampToValueAtTime(
            0.0001,
            agora + 0.15
        );


        /* ====================================================
           CONEXÕES
           ==================================================== */

        oscilador.connect(
            ganho
        );


        ganho.connect(
            audioContext.destination
        );


        /* ====================================================
           EXECUTA O BIP
           ==================================================== */

        oscilador.start(
            agora
        );


        oscilador.stop(
            agora + 0.15
        );


        console.log(
            "BIP emitido."
        );

    }
    catch (erro) {

        console.warn(
            "Erro ao emitir bip:",
            erro
        );

    }

}


/* ============================================================
   TELA INICIAL
   ============================================================ */

function mostrarTelaLogin() {

    const login =
        document.getElementById("login");

    const coleta =
        document.getElementById("coleta");


    login.classList.remove("hidden");

    coleta.classList.add("hidden");


    pararCamera();


    sessao.usuario = null;

    sessao.nomeUsuario = "";

    sessao.inventario = "";

    sessao.endereco = "";

    sessao.totalEndereco = 0;

    sessao.totalColeta = 0;

}


/* ============================================================
   TELA DE COLETA
   ============================================================ */

function mostrarTelaColeta() {

    document
        .getElementById("login")
        .classList.add("hidden");


    document
        .getElementById("coleta")
        .classList.remove("hidden");

}


/* ============================================================
   STATUS LOGIN
   ============================================================ */

function mostrarLoginStatus(
    mensagem,
    tipo = ""
) {

    const el =
        document.getElementById(
            "loginStatus"
        );


    el.textContent =
        mensagem || "";


    el.className =
        "status" +
        (
            tipo
                ? ` ${tipo}`
                : ""
        );

}


/* ============================================================
   STATUS COLETA
   ============================================================ */

function mostrarCollectionStatus(
    mensagem,
    tipo = ""
) {

    const el =
        document.getElementById(
            "collectionStatus"
        );


    el.textContent =
        mensagem || "";


    el.className =
        "status" +
        (
            tipo
                ? ` ${tipo}`
                : ""
        );

}


/* ============================================================
   STATUS CÂMERA
   ============================================================ */

function mostrarCameraStatus(
    mensagem
) {

    const el =
        document.getElementById(
            "cameraMessage"
        );


    if (el) {

        el.textContent =
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


        const campoInventario =
            document.getElementById(
                "inventario"
            );


        const campoEndereco =
            document.getElementById(
                "endereco"
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


            campoInventario.value =
                "";


            campoEndereco.value =
                "";


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
            usuario => {

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

    const campoInventario =
        document.getElementById(
            "inventario"
        );


    const campoEndereco =
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
                config =>
                    String(
                        config.usuario
                    ).trim() ===
                    String(
                        usuarioId
                    ).trim()
            );

    }


    /*
     * Compatibilidade com versões anteriores.
     */

    if (
        !configUsuario &&
        configuracao.Inventario !== undefined
    ) {

        campoInventario.value =
            configuracao.Inventario ||
            "";


        campoEndereco.value =
            configuracao.EnderecoAtual ||
            "";


        return;

    }


    campoInventario.value =
        configUsuario?.inventario ||
        "";


    campoEndereco.value =
        configUsuario?.enderecoAtual ||
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


    /*
     * IMPORTANTE:
     *
     * O áudio é inicializado imediatamente dentro
     * do clique do usuário.
     */

    await prepararAudio();


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


        inventario.focus();


        return;

    }


    if (!sessao.endereco) {

        mostrarLoginStatus(
            "Informe o endereço.",
            "error"
        );


        endereco.focus();


        return;

    }


    btn.disabled = true;


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
        .textContent =
        "0";


    document
        .getElementById(
            "contadorTotal"
        )
        .textContent =
        "0";


    document
        .getElementById(
            "ultimaLeitura"
        )
        .textContent =
        "-";


    mostrarCollectionStatus("");


    mostrarTelaColeta();


    /*
     * A câmera é iniciada depois do clique.
     */

    await iniciarCamera();

}


/* ============================================================
   CÂMERA
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

        /*
         * Abre a câmera traseira.
         */

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


        await new Promise(
            resolve => {

                if (
                    video.readyState >= 2 &&
                    video.videoWidth > 0
                ) {

                    resolve();

                    return;

                }


                const finalizar =
                    () => {

                        video.removeEventListener(
                            "loadedmetadata",
                            finalizar
                        );


                        resolve();

                    };


                video.addEventListener(
                    "loadedmetadata",
                    finalizar
                );

            }
        );


        try {

            await video.play();

        }
        catch (erroPlay) {

            console.warn(
                "video.play():",
                erroPlay
            );

        }


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
        else if (
            erro.name ===
            "NotFoundError"
        ) {

            mostrarCameraStatus(
                "Câmera traseira não encontrada."
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
   ZXING - LEITURA CONTÍNUA
   ============================================================ */

function iniciarLeitorZXing(
    video
) {

    if (!window.ZXingBrowser) {

        console.error(
            "ZXing não carregado."
        );


        mostrarCameraStatus(
            "Leitor de câmera não carregado. Use a digitação manual."
        );


        return;

    }


    try {

        codeReader =
            new ZXingBrowser
                .BrowserMultiFormatReader();


        codeReader
            .decodeFromVideoElement(
                video,
                (resultado, erro) => {

                    if (resultado) {

                        const codigo =
                            resultado.getText
                                ? resultado.getText()
                                : String(
                                    resultado.text ||
                                    ""
                                );


                        if (codigo) {

                            receberCodigoDaCamera(
                                codigo
                            );

                        }

                    }

                }
            )
            .then(
                controls => {

                    scannerControls =
                        controls;

                }
            )
            .catch(
                erro => {

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
            "Erro criando leitor ZXing:",
            erro
        );


        mostrarCameraStatus(
            "Leitor não disponível. Use a digitação manual."
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
     * O mesmo código aparece em vários frames.
     *
     * Ignora apenas repetições imediatas da câmera.
     */

    if (
        valor === ultimoCodigoLido &&
        agora - ultimoCodigoTempo < 900
    ) {

        return;

    }


    ultimoCodigoLido =
        valor;


    ultimoCodigoTempo =
        agora;


    document
        .getElementById(
            "codigo"
        )
        .value =
        valor;


    processarCodigo(
        valor
    );

}


/* ============================================================
   DIGITAÇÃO MANUAL
   ============================================================ */

function processarCodigoDigitado() {

    const input =
        document.getElementById(
            "codigo"
        );


    const codigo =
        normalizarCodigo(
            input.value
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
    codigoRecebido
) {

    if (processandoCodigo) {

        return;

    }


    const codigo =
        normalizarCodigo(
            codigoRecebido
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
            "Sessão inválida. Volte e inicie a coleta novamente.",
            "error"
        );


        return;

    }


    processandoCodigo = true;


    const input =
        document.getElementById(
            "codigo"
        );


    const ultima =
        document.getElementById(
            "ultimaLeitura"
        );


    input.value = "";


    /*
     * REGRA:
     *
     * LETRA = ENDEREÇO
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


        /*
         * Bip imediato ao alterar endereço.
         */

        emitirBip();


        processandoCodigo =
            false;


        focarCampoCodigo();


        return;

    }


    if (
        !/^\d/.test(
            codigo
        )
    ) {

        ultima.textContent =
            codigo +
            " - INVÁLIDO";


        mostrarCollectionStatus(
            "Código inválido. Endereço começa com letra e produto com número.",
            "error"
        );


        processandoCodigo =
            false;


        focarCampoCodigo();


        return;

    }


    await registrarProduto(
        codigo
    );


    processandoCodigo =
        false;


    focarCampoCodigo();

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


    /*
     * Atualiza TB_CONFIG.
     */

    try {

        await fetch(
            API,
            {

                method: "POST",

                mode: "no-cors",

                headers: {

                    "Content-Type":
                        "text/plain;charset=utf-8"

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

                    })

            }
        );


        if (
            Array.isArray(
                configuracao.Configuracoes
            )
        ) {

            const configUsuario =
                configuracao.Configuracoes.find(
                    config =>
                        String(
                            config.usuario
                        ).trim() ===
                        String(
                            sessao.usuario
                        ).trim()
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
            "Endereço alterado na tela, mas não foi possível atualizar a configuração.",
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


    /*
     * ========================================================
     * BIP IMEDIATO
     * ========================================================
     *
     * O bip acontece ANTES do fetch.
     *
     * Isso evita que o som dependa do tempo de resposta
     * do Apps Script.
     */

    emitirBip();


    /*
     * ========================================================
     * ENVIO PARA O APPS SCRIPT
     * ========================================================
     */

    try {

        const resposta =
            await fetch(
                API,
                {

                    method: "POST",

                    mode: "no-cors",

                    headers: {

                        "Content-Type":
                            "text/plain;charset=utf-8"

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

                        })

                }
            );


        /*
         * ====================================================
         * COLETA REGISTRADA
         * ====================================================
         */

        /*
         * Atualiza contadores.
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
            {

                usuario:
                    sessao.usuario,

                inventario:
                    sessao.inventario,

                endereco:
                    sessao.endereco,

                codigo:
                    codigo,

                resposta:
                    resposta.type

            }
        );

    }
    catch (erro) {

        console.error(
            "Erro ao gravar coleta:",
            erro
        );


        ultima.textContent =
            codigo +
            " - ERRO";


        mostrarCollectionStatus(
            "Não foi possível enviar a coleta. Tente novamente.",
            "error"
        );

    }

}


/* ============================================================
   FOCO NO CAMPO MANUAL
   ============================================================ */

function focarCampoCodigo() {

    const input =
        document.getElementById(
            "codigo"
        );


    if (!input) {

        return;

    }


    /*
     * Não abre automaticamente o teclado no iPhone.
     */

    input.value = "";

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
            "Erro parando ZXing:",
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
                track => {

                    try {

                        track.stop();

                    }
                    catch (erro) {

                        console.warn(
                            "Erro parando track:",
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
   SEGURANÇA CONTRA SAÍDA DA PÁGINA
   ============================================================ */

window.addEventListener(
    "pagehide",
    () => {

        pararCamera();

    }
);


window.addEventListener(
    "beforeunload",
    () => {

        pararCamera();

    }
);
