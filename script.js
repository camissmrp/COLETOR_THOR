let configuracao = {};
let cameraStream = null;
let scannerControls = null;
let codeReader = null;
let cameraAtiva = false;

let processandoCodigo = false;
let scannerBloqueado = false;

let ultimoCodigoLido = "";
let ultimoCodigoTempo = 0;

let audioContext = null;


/* =========================================================
   SESSÃO
========================================================= */

const sessao = {
    usuario: "",
    nomeUsuario: "",
    inventario: "",
    endereco: "",

    tipoProduto: "",
    regraColeta: "",
    tipoColeta: "UNITARIA",

    totalEndereco: 0,
    totalColeta: 0,

    modoEndereco: false
};


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        document
            .getElementById("btnEntrar")
            ?.addEventListener(
                "click",
                iniciarColeta
            );


        document
            .getElementById("btnRegistrar")
            ?.addEventListener(
                "click",
                processarCodigoDigitado
            );


        document
            .getElementById("btnAlterarEndereco")
            ?.addEventListener(
                "click",
                ativarModoEndereco
            );


        document
            .getElementById("codigo")
            ?.addEventListener(
                "keydown",
                e => {

                    if (e.key === "Enter") {

                        e.preventDefault();

                        processarCodigoDigitado();
                    }
                }
            );


        document
            .getElementById("usuario")
            ?.addEventListener(
                "change",
                e => {

                    atualizarConfiguracaoUsuario(
                        e.target.value
                    );
                }
            );


        document
            .getElementById("tipoProduto")
            ?.addEventListener(
                "change",
                atualizarTipoProduto
            );


        mostrarTelaLogin();

        carregarConfiguracao();
    }
);


/* =========================================================
   ÁUDIO
========================================================= */

async function prepararAudio() {

    try {

        const AC =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AC) return;

        if (!audioContext) {

            audioContext =
                new AC();
        }

        if (
            audioContext.state ===
            "suspended"
        ) {

            await audioContext.resume();
        }

    } catch (erro) {

        console.warn(
            "Áudio:",
            erro
        );
    }
}


function emitirBip() {

    try {

        const AC =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AC) return;

        if (!audioContext) {

            audioContext =
                new AC();
        }

        if (
            audioContext.state ===
            "suspended"
        ) {

            audioContext.resume();
        }

        const agora =
            audioContext.currentTime;


        const oscilador =
            audioContext.createOscillator();


        const ganho =
            audioContext.createGain();


        oscilador.type =
            "sine";


        oscilador.frequency.setValueAtTime(
            1800,
            agora
        );


        ganho.gain.setValueAtTime(
            0.0001,
            agora
        );


        ganho.gain.exponentialRampToValueAtTime(
            0.30,
            agora + 0.01
        );


        ganho.gain.exponentialRampToValueAtTime(
            0.0001,
            agora + 0.15
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
            agora + 0.15
        );

    } catch (erro) {

        console.warn(
            "Bip:",
            erro
        );
    }
}


/* =========================================================
   TELAS
========================================================= */

function mostrarTelaLogin() {

    document
        .getElementById("login")
        ?.classList.remove(
            "hidden"
        );


    document
        .getElementById("coleta")
        ?.classList.add(
            "hidden"
        );


    pararCamera();
}


function mostrarTelaColeta() {

    document
        .getElementById("login")
        ?.classList.add(
            "hidden"
        );


    document
        .getElementById("coleta")
        ?.classList.remove(
            "hidden"
        );
}


/* =========================================================
   STATUS
========================================================= */

function mostrarLoginStatus(
    mensagem,
    tipo = ""
) {

    const el =
        document.getElementById(
            "loginStatus"
        );


    if (!el) return;


    el.textContent =
        mensagem || "";


    el.className =
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

    const el =
        document.getElementById(
            "collectionStatus"
        );


    if (!el) return;


    el.textContent =
        mensagem || "";


    el.className =
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

    const el =
        document.getElementById(
            "cameraMessage"
        );


    if (el) {

        el.textContent =
            mensagem;
    }
}


/* =========================================================
   CONFIGURAÇÃO
========================================================= */

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
                    cache:
                        "no-store"
                }
            );


        if (!resposta.ok) {

            throw new Error(
                "HTTP " +
                resposta.status
            );
        }


        configuracao =
            await resposta.json();


        const selectUsuario =
            document.getElementById(
                "usuario"
            );


        if (!selectUsuario) {

            throw new Error(
                "Campo usuario não encontrado."
            );
        }


        selectUsuario.innerHTML =
            "";


        const usuarios =
            Array.isArray(
                configuracao.Usuarios
            )
                ? configuracao.Usuarios
                : [];


        if (!usuarios.length) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                "";


            option.textContent =
                "Nenhum usuário disponível";


            selectUsuario.appendChild(
                option
            );


            document.getElementById(
                "btnEntrar"
            ).disabled = true;


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


                selectUsuario.appendChild(
                    option
                );
            }
        );


        carregarTiposProduto();


        atualizarConfiguracaoUsuario(
            usuarios[0].id
        );


        document.getElementById(
            "btnEntrar"
        ).disabled = false;


        mostrarLoginStatus("");

    } catch (erro) {

        console.error(
            "Erro configuração:",
            erro
        );


        mostrarLoginStatus(
            "Não foi possível carregar a configuração.",
            "error"
        );


        document.getElementById(
            "btnEntrar"
        ).disabled = true;
    }
}


/* =========================================================
   TIPOS DE PRODUTO
========================================================= */

function carregarTiposProduto() {

    const select =
        document.getElementById(
            "tipoProduto"
        );


    /*
     * Se o campo ainda não existir
     * no HTML, não quebra o aplicativo.
     */

    if (!select)
        return;


    select.innerHTML =
        "";


    const tipos =
        Array.isArray(
            configuracao.TiposProduto
        )
            ? configuracao.TiposProduto
            : [];


    if (!tipos.length) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            "";


        option.textContent =
            "Nenhum tipo disponível";


        select.appendChild(
            option
        );


        return;
    }


    tipos.forEach(
        item => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                item.tipoProduto;


            option.textContent =
                item.tipoProduto;


            option.dataset.regra =
                item.regraColeta || "";


            option.dataset.tipoColeta =
                item.tipoColeta ||
                "UNITARIA";


            select.appendChild(
                option
            );
        }
    );


    select.selectedIndex =
        0;


    atualizarTipoProduto();
}


/* =========================================================
   TIPO DE PRODUTO SELECIONADO
========================================================= */

function atualizarTipoProduto() {

    const select =
        document.getElementById(
            "tipoProduto"
        );


    if (!select)
        return;


    const opcao =
        select.options[
            select.selectedIndex
        ];


    if (!opcao)
        return;


    sessao.tipoProduto =
        String(
            opcao.value || ""
        )
        .trim()
        .toUpperCase();


    sessao.regraColeta =
        String(
            opcao.dataset.regra || ""
        )
        .trim()
        .toUpperCase();


    sessao.tipoColeta =
        String(
            opcao.dataset.tipoColeta ||
            "UNITARIA"
        )
        .trim()
        .toUpperCase();


    console.log(
        "TIPO PRODUTO:",
        sessao.tipoProduto
    );


    console.log(
        "REGRA:",
        sessao.regraColeta
    );


    console.log(
        "TIPO COLETA:",
        sessao.tipoColeta
    );


    atualizarBotaoEndereco();
}


/* =========================================================
   USUÁRIO
========================================================= */

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


    let configUsuario =
        null;


    if (
        Array.isArray(
            configuracao.Configuracoes
        )
    ) {

        configUsuario =
            configuracao.Configuracoes.find(
                item =>
                    String(
                        item.usuario
                    ).trim() ===
                    String(
                        usuarioId
                    ).trim()
            );
    }


    if (inventario) {

        inventario.value =
            configUsuario?.inventario ||
            "";
    }


    if (endereco) {

        endereco.value =
            configUsuario?.enderecoAtual ||
            "";
    }
}


/* =========================================================
   INICIAR COLETA
========================================================= */

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


    const tipoProduto =
        document.getElementById(
            "tipoProduto"
        );


    await prepararAudio();


    const opcaoUsuario =
        usuario.options[
            usuario.selectedIndex
        ];


    sessao.usuario =
        String(
            usuario.value || ""
        ).trim();


    sessao.nomeUsuario =
        opcaoUsuario
            ? opcaoUsuario.textContent.trim()
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


    if (tipoProduto) {

        const opcaoTipo =
            tipoProduto.options[
                tipoProduto.selectedIndex
            ];


        sessao.tipoProduto =
            String(
                tipoProduto.value || ""
            )
            .trim()
            .toUpperCase();


        sessao.regraColeta =
            String(
                opcaoTipo?.dataset.regra ||
                ""
            )
            .trim()
            .toUpperCase();


        sessao.tipoColeta =
            String(
                opcaoTipo?.dataset.tipoColeta ||
                "UNITARIA"
            )
            .trim()
            .toUpperCase();

    } else {

        /*
         * Compatibilidade caso o HTML
         * ainda não tenha tipoProduto.
         */

        sessao.tipoProduto =
            "CHAPAS";


        sessao.regraColeta =
            "";


        sessao.tipoColeta =
            "UNITARIA";
    }


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


    if (
        tipoProduto &&
        !sessao.tipoProduto
    ) {

        mostrarLoginStatus(
            "Selecione o tipo de produto.",
            "error"
        );

        tipoProduto.focus();

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


    sessao.totalEndereco =
        0;


    sessao.totalColeta =
        0;


    sessao.modoEndereco =
        false;


    processandoCodigo =
        false;


    scannerBloqueado =
        false;


    ultimoCodigoLido =
        "";


    ultimoCodigoTempo =
        0;


    document.getElementById(
        "lblUsuario"
    ).textContent =
        sessao.nomeUsuario;


    document.getElementById(
        "lblInventario"
    ).textContent =
        sessao.inventario;


    const lblTipoProduto =
        document.getElementById(
            "lblTipoProduto"
        );


    if (lblTipoProduto) {

        lblTipoProduto.textContent =
            sessao.tipoProduto;
    }


    document.getElementById(
        "lblEndereco"
    ).textContent =
        sessao.endereco;


    document.getElementById(
        "contadorEndereco"
    ).textContent =
        "0";


    document.getElementById(
        "contadorTotal"
    ).textContent =
        "0";


    document.getElementById(
        "ultimaLeitura"
    ).textContent =
        "-";


    mostrarCollectionStatus(
        ""
    );


    atualizarBotaoEndereco();


    mostrarTelaColeta();


    await iniciarCamera();
}


/* =========================================================
   CÂMERA
   RESOLUÇÃO MÁXIMA DO APARELHO
   + TRASEIRA
   + FOCO CONTÍNUO
========================================================= */

async function iniciarCamera() {

    if (cameraAtiva)
        return;


    const video =
        document.getElementById(
            "camera"
        );


    if (!video)
        return;


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


    try {

        /*
         * Primeiro abre a câmera traseira.
         *
         * Não fixamos 1280x720.
         * Não fixamos 1920x1080.
         *
         * A resolução máxima será obtida
         * através das capacidades reais
         * do aparelho.
         */

        cameraStream =
            await navigator.mediaDevices
                .getUserMedia({

                    audio: false,

                    video: {

                        facingMode: {
                            ideal:
                                "environment"
                        },

                        width: {
                            ideal:
                                9999
                        },

                        height: {
                            ideal:
                                9999
                        },

                        frameRate: {
                            ideal:
                                30,

                            max:
                                30
                        }
                    }
                });


        const track =
            cameraStream
                .getVideoTracks()[0];


        if (track) {

            const capabilities =
                typeof track.getCapabilities ===
                "function"
                    ? track.getCapabilities()
                    : {};


            console.log(
                "CAPACIDADES DA CÂMERA:",
                capabilities
            );


            /*
             * =================================================
             * RESOLUÇÃO MÁXIMA
             * =================================================
             */

            if (
                capabilities.width &&
                capabilities.height &&
                capabilities.width.max &&
                capabilities.height.max
            ) {

                try {

                    await track.applyConstraints({

                        width: {
                            exact:
                                capabilities.width.max
                        },

                        height: {
                            exact:
                                capabilities.height.max
                        }
                    });


                    console.log(
                        "RESOLUÇÃO MÁXIMA SOLICITADA:",
                        capabilities.width.max +
                        " x " +
                        capabilities.height.max
                    );

                } catch (erroResolucao) {

                    console.warn(
                        "Não foi possível aplicar a resolução máxima:",
                        erroResolucao
                    );
                }
            }


            /*
             * =================================================
             * FOCO CONTÍNUO
             * =================================================
             */

            if (
                capabilities.focusMode &&
                Array.isArray(
                    capabilities.focusMode
                ) &&
                capabilities.focusMode.includes(
                    "continuous"
                )
            ) {

                try {

                    await track.applyConstraints({

                        advanced: [

                            {
                                focusMode:
                                    "continuous"
                            }

                        ]
                    });


                    console.log(
                        "FOCO CONTÍNUO ATIVADO."
                    );

                } catch (erroFoco) {

                    console.warn(
                        "Foco contínuo não disponível:",
                        erroFoco
                    );
                }
            }


            /*
             * MOSTRA A CONFIGURAÇÃO REAL.
             */

            const settings =
                typeof track.getSettings ===
                "function"
                    ? track.getSettings()
                    : {};


            console.log(
                "CONFIGURAÇÃO FINAL DA CÂMERA:",
                settings
            );


            console.log(
                "RESOLUÇÃO FINAL:",
                settings.width +
                " x " +
                settings.height
            );
        }


        video.srcObject =
            cameraStream;


        video.autoplay =
            true;


        video.muted =
            true;


        video.playsInline =
            true;


        video.setAttribute(
            "playsinline",
            "true"
        );


        video.setAttribute(
            "webkit-playsinline",
            "true"
        );


        await video.play();


        cameraAtiva =
            true;


        console.log(
            "RESOLUÇÃO REAL DO VÍDEO:",
            video.videoWidth +
            " x " +
            video.videoHeight
        );


        mostrarCameraStatus(
            "Aponte a câmera para o código de barras"
        );


        /*
         * IMPORTANTE:
         *
         * Mantemos o mesmo leitor.
         */

        iniciarLeitorZXing(
            video
        );


    } catch (erro) {

        console.error(
            "Erro câmera:",
            erro
        );


        cameraAtiva =
            false;


        mostrarCameraStatus(
            "Não foi possível abrir a câmera."
        );


        mostrarCollectionStatus(
            "Use a digitação manual.",
            "error"
        );
    }
}


/* =========================================================
   ZXING
   MESMO LEITOR MULTIFORMATO
========================================================= */

function iniciarLeitorZXing(
    video
) {

    if (
        typeof ZXingBrowser ===
        "undefined"
    ) {

        mostrarCameraStatus(
            "Leitor não carregado."
        );


        console.error(
            "ZXingBrowser não encontrado."
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

                    /*
                     * Enquanto estiver
                     * informando quantidade,
                     * ignora qualquer leitura.
                     */

                    if (
                        scannerBloqueado ||
                        processandoCodigo
                    ) {

                        return;
                    }


                    if (!resultado)
                        return;


                    let codigo =
                        "";


                    try {

                        codigo =
                            resultado.getText
                                ? resultado.getText()
                                : resultado.text ||
                                  "";

                    } catch (e) {

                        console.warn(
                            "Erro obtendo código:",
                            e
                        );

                        return;
                    }


                    codigo =
                        normalizarCodigo(
                            codigo
                        );


                    if (!codigo)
                        return;


                    receberCodigoDaCamera(
                        codigo
                    );
                }
            )
            .then(
                controles => {

                    /*
                     * Se durante a inicialização
                     * o lote foi bloqueado,
                     * não deixa o leitor continuar.
                     */

                    if (
                        scannerBloqueado
                    ) {

                        try {

                            controles.stop();

                        } catch (e) {}

                        return;
                    }


                    scannerControls =
                        controles;


                    console.log(
                        "Scanner iniciado."
                    );
                }
            )
            .catch(
                erro => {

                    console.error(
                        "Erro ZXing:",
                        erro
                    );


                    mostrarCameraStatus(
                        "Erro no leitor de código."
                    );
                }
            );


    } catch (erro) {

        console.error(
            "Erro criando leitor:",
            erro
        );


        mostrarCameraStatus(
            "Erro ao iniciar leitor."
        );
    }
}


/* =========================================================
   RECEBER CÓDIGO DA CÂMERA
========================================================= */

function receberCodigoDaCamera(
    codigo
) {

    if (
        scannerBloqueado ||
        processandoCodigo
    ) {

        return;
    }


    const agora =
        Date.now();


    codigo =
        normalizarCodigo(
            codigo
        );


    if (!codigo)
        return;


    /*
     * SOMENTE proteção contra o mesmo
     * frame ser capturado várias vezes.
     *
     * NÃO é duplicidade de coleta.
     */

    if (
        codigo ===
        ultimoCodigoLido &&
        agora -
        ultimoCodigoTempo <
        800
    ) {

        return;
    }


    ultimoCodigoLido =
        codigo;


    ultimoCodigoTempo =
        agora;


    /*
     * IMPORTANTE:
     *
     * Código vindo da câmera NÃO
     * será colocado no campo manual.
     */

    const campo =
        document.getElementById(
            "codigo"
        );


    if (campo) {

        campo.value =
            "";
    }


    processarCodigo(
        codigo
    );
}


/* =========================================================
   DIGITAÇÃO MANUAL
========================================================= */

function processarCodigoDigitado() {

    if (
        scannerBloqueado ||
        processandoCodigo
    ) {

        return;
    }


    const campo =
        document.getElementById(
            "codigo"
        );


    if (!campo)
        return;


    const codigo =
        normalizarCodigo(
            campo.value
        );


    if (!codigo)
        return;


    processarCodigo(
        codigo
    );
}


/* =========================================================
   NORMALIZAR
========================================================= */

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


/* =========================================================
   PROCESSAR CÓDIGO
========================================================= */

function processarCodigo(
    codigo
) {

    if (
        !codigo ||
        scannerBloqueado ||
        processandoCodigo
    ) {

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


    processandoCodigo =
        true;


    /* =====================================================
       ALTERAÇÃO DE ENDEREÇO
    ===================================================== */

    if (
        sessao.modoEndereco
    ) {

        emitirBip();


        processarNovoEndereco(
            codigo
        );


        processandoCodigo =
            false;


        limparCampoCodigo();


        return;
    }


    /* =====================================================
       CHAPAS / RECORTADOS
    ===================================================== */

    if (
        sessao.tipoProduto ===
        "CHAPAS" ||

        sessao.tipoProduto ===
        "RECORTADOS"
    ) {

        /*
         * LETRA = ENDEREÇO
         */

        if (
            /^[A-Za-z]/.test(
                codigo
            )
        ) {

            emitirBip();


            processarNovoEndereco(
                codigo
            );


            processandoCodigo =
                false;


            limparCampoCodigo();


            return;
        }


        /*
         * NÚMERO = PRODUTO
         */

        if (
            !/^\d/.test(
                codigo
            )
        ) {

            const ultima =
                document.getElementById(
                    "ultimaLeitura"
                );


            if (ultima) {

                ultima.textContent =
                    codigo +
                    " - INVÁLIDO";
            }


            mostrarCollectionStatus(
                "Código inválido.",
                "error"
            );


            processandoCodigo =
                false;


            limparCampoCodigo();


            return;
        }
    }


    /* =====================================================
       BLOCOS
       
       Qualquer código = PRODUTO.
       
       O endereço é alterado através
       do botão "Alterar Endereço".
    ===================================================== */


    /*
     * BIP
     */

    emitirBip();


    /* =====================================================
       COLETA EM LOTE
    ===================================================== */

    if (
        sessao.tipoColeta ===
        "LOTE"
    ) {

        /*
         * BLOQUEIA IMEDIATAMENTE.
         */

        scannerBloqueado =
            true;


        /*
         * PARA SOMENTE O ZXING.
         *
         * A câmera permanece ligada.
         */

        pararLeitorZXing();


        /*
         * Garante campo vazio.
         */

        limparCampoCodigo();


        /*
         * Pergunta quantidade.
         */

        solicitarQuantidadeLote(
            codigo
        );


        return;
    }


    /* =====================================================
       UNITÁRIA
    ===================================================== */

    registrarProduto(
        codigo,
        1
    );


    processandoCodigo =
        false;


    limparCampoCodigo();
}


/* =========================================================
   PARAR SOMENTE O LEITOR
   A CÂMERA CONTINUA LIGADA
========================================================= */

function pararLeitorZXing() {

    try {

        if (
            scannerControls &&
            typeof scannerControls.stop ===
            "function"
        ) {

            scannerControls.stop();
        }

    } catch (erro) {

        console.warn(
            "Erro parando scanner:",
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

    } catch (erro) {

        console.warn(
            "Erro resetando ZXing:",
            erro
        );
    }


    codeReader =
        null;
}


/* =========================================================
   REINICIAR LEITOR
========================================================= */

function reiniciarLeitorZXing() {

    if (
        scannerBloqueado ||
        !cameraAtiva
    ) {

        return;
    }


    const video =
        document.getElementById(
            "camera"
        );


    if (!video)
        return;


    pararLeitorZXing();


    /*
     * Pequeno intervalo apenas para garantir
     * que o leitor anterior terminou.
     */

    setTimeout(
        () => {

            if (
                !scannerBloqueado &&
                cameraAtiva
            ) {

                iniciarLeitorZXing(
                    video
                );
            }

        },
        100
    );
}


/* =========================================================
   COLETA EM LOTE
========================================================= */

function solicitarQuantidadeLote(
    codigo
) {

    /*
     * Neste momento:
     *
     * scannerBloqueado = true
     * ZXing = parado
     * câmera = ligada
     */

    const resposta =
        window.prompt(
            "COLETA EM LOTE\n\n" +
            "Código: " +
            codigo +
            "\n\n" +
            "Informe a quantidade de peças:"
        );


    /* =====================================================
       CANCELAR
    ===================================================== */

    if (
        resposta ===
        null
    ) {

        mostrarCollectionStatus(
            "Coleta cancelada.",
            "error"
        );


        liberarScannerLote();


        return;
    }


    const quantidade =
        Number(
            String(
                resposta
            )
            .replace(
                ",",
                "."
            )
            .trim()
        );


    if (
        !Number.isFinite(
            quantidade
        ) ||
        quantidade <= 0
    ) {

        mostrarCollectionStatus(
            "Quantidade inválida.",
            "error"
        );


        liberarScannerLote();


        return;
    }


    /*
     * LOTE trabalha somente com
     * quantidade inteira.
     */

    if (
        !Number.isInteger(
            quantidade
        )
    ) {

        mostrarCollectionStatus(
            "Informe uma quantidade inteira.",
            "error"
        );


        liberarScannerLote();


        return;
    }


    /*
     * REGISTRA A QUANTIDADE
     */

    registrarProduto(
        codigo,
        quantidade
    );


    /*
     * LIBERA E VOLTA A LER
     */

    liberarScannerLote();
}


/* =========================================================
   LIBERAR SCANNER DO LOTE
========================================================= */

function liberarScannerLote() {

    processandoCodigo =
        false;


    scannerBloqueado =
        false;


    ultimoCodigoLido =
        "";


    ultimoCodigoTempo =
        0;


    limparCampoCodigo();


    reiniciarLeitorZXing();
}


/* =========================================================
   REGISTRAR PRODUTO
========================================================= */

function registrarProduto(
    codigo,
    quantidade = 1
) {

    const ultimaLeitura =
        document.getElementById(
            "ultimaLeitura"
        );


    if (ultimaLeitura) {

        ultimaLeitura.textContent =
            codigo;
    }


    const mensagem =
        quantidade > 1

            ? "Lote enviado: " +
              quantidade +
              " peças."

            : "Coleta enviada.";


    mostrarCollectionStatus(
        mensagem,
        "success"
    );


    /*
     * CONTADORES
     */

    sessao.totalEndereco +=
        quantidade;


    sessao.totalColeta +=
        quantidade;


    const contadorEndereco =
        document.getElementById(
            "contadorEndereco"
        );


    const contadorTotal =
        document.getElementById(
            "contadorTotal"
        );


    if (contadorEndereco) {

        contadorEndereco.textContent =
            sessao.totalEndereco;
    }


    if (contadorTotal) {

        contadorTotal.textContent =
            sessao.totalColeta;
    }


    /*
     * ENVIO PARA A SHEET
     */

    fetch(
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
                        "PRODUTO",

                    tipoProduto:
                        sessao.tipoProduto,

                    quantidade:
                        quantidade
                })
        }
    )
    .then(
        () => {

            console.log(
                "Coleta enviada:",
                {
                    codigo:
                        codigo,

                    quantidade:
                        quantidade,

                    tipoProduto:
                        sessao.tipoProduto,

                    tipoColeta:
                        sessao.tipoColeta
                }
            );
        }
    )
    .catch(
        erro => {

            console.error(
                "Erro enviando:",
                erro
            );
        }
    );
}


/* =========================================================
   LIMPAR CAMPO
========================================================= */

function limparCampoCodigo() {

    const campo =
        document.getElementById(
            "codigo"
        );


    if (campo) {

        campo.value =
            "";
    }
}


/* =========================================================
   ALTERAR ENDEREÇO
========================================================= */

function ativarModoEndereco() {

    if (
        sessao.tipoProduto !==
        "BLOCOS"
    ) {

        return;
    }


    sessao.modoEndereco =
        true;


    atualizarBotaoEndereco();


    mostrarCollectionStatus(
        "Leia o código do novo endereço.",
        "success"
    );


    mostrarCameraStatus(
        "LEIA O CÓDIGO DO NOVO ENDEREÇO"
    );


    limparCampoCodigo();
}


/* =========================================================
   BOTÃO ALTERAR ENDEREÇO
========================================================= */

function atualizarBotaoEndereco() {

    const botao =
        document.getElementById(
            "btnAlterarEndereco"
        );


    if (!botao)
        return;


    if (
        sessao.tipoProduto !==
        "BLOCOS"
    ) {

        botao.style.display =
            "none";

        return;
    }


    botao.style.display =
        "block";


    if (
        sessao.modoEndereco
    ) {

        botao.textContent =
            "LENDO NOVO ENDEREÇO";


        botao.disabled =
            true;

    } else {

        botao.textContent =
            "ALTERAR ENDEREÇO";


        botao.disabled =
            false;
    }
}


/* =========================================================
   NOVO ENDEREÇO
========================================================= */

function processarNovoEndereco(
    novoEndereco
) {

    novoEndereco =
        normalizarCodigo(
            novoEndereco
        );


    if (!novoEndereco)
        return;


    sessao.endereco =
        novoEndereco;


    sessao.totalEndereco =
        0;


    sessao.modoEndereco =
        false;


    const lblEndereco =
        document.getElementById(
            "lblEndereco"
        );


    if (lblEndereco) {

        lblEndereco.textContent =
            novoEndereco;
    }


    const contadorEndereco =
        document.getElementById(
            "contadorEndereco"
        );


    if (contadorEndereco) {

        contadorEndereco.textContent =
            "0";
    }


    const ultima =
        document.getElementById(
            "ultimaLeitura"
        );


    if (ultima) {

        ultima.textContent =
            novoEndereco;
    }


    mostrarCollectionStatus(
        "Endereço alterado.",
        "success"
    );


    mostrarCameraStatus(
        "Aponte a câmera para o código de barras"
    );


    atualizarBotaoEndereco();


    /*
     * SALVA NOVO ENDEREÇO
     */

    fetch(
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
                        "novoEndereco",

                    usuario:
                        sessao.usuario,

                    inventario:
                        sessao.inventario,

                    endereco:
                        novoEndereco
                })
        }
    )
    .catch(
        erro => {

            console.error(
                "Erro endereço:",
                erro
            );
        }
    );
}


/* =========================================================
   PARAR CÂMERA COMPLETA
========================================================= */

function pararCamera() {

    scannerBloqueado =
        true;


    processandoCodigo =
        false;


    try {

        if (
            scannerControls &&
            typeof scannerControls.stop ===
            "function"
        ) {

            scannerControls.stop();
        }

    } catch (erro) {

        console.warn(
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

    } catch (erro) {

        console.warn(
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

                    } catch (erro) {}
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

        try {

            video.pause();

        } catch (e) {}


        video.srcObject =
            null;
    }


    scannerBloqueado =
        false;
}


/* =========================================================
   EVENTOS
========================================================= */

window.addEventListener(
    "pagehide",
    pararCamera
);


window.addEventListener(
    "beforeunload",
    pararCamera
);
