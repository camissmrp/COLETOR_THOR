let configuracao = {};
let cameraStream = null;
let scannerControls = null;
let codeReader = null;
let cameraAtiva = false;

let ultimoCodigoLido = "";
let ultimoCodigoTempo = 0;

let audioContext = null;

/* CONTROLE DO SCANNER */
let scannerBloqueado = false;
let processandoCodigo = false;
let scannerToken = 0;


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
                evento => {

                    if (
                        evento.key ===
                        "Enter"
                    ) {

                        evento.preventDefault();

                        processarCodigoDigitado();
                    }
                }
            );


        document
            .getElementById("usuario")
            ?.addEventListener(
                "change",
                evento => {

                    atualizarConfiguracaoUsuario(
                        evento.target.value
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

        if (!AC)
            return;


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

        if (!AC)
            return;


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


    if (!el)
        return;


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


    if (!el)
        return;


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
                item.regraColeta ||
                "";


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
   ATUALIZAR TIPO DE PRODUTO
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
            opcao.dataset.regra ||
            ""
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
        "Tipo:",
        sessao.tipoProduto,
        "Regra:",
        sessao.regraColeta,
        "Coleta:",
        sessao.tipoColeta
    );


    const botao =
        document.getElementById(
            "btnAlterarEndereco"
        );


    if (!botao)
        return;


    if (
        sessao.tipoProduto ===
        "BLOCOS"
    ) {

        botao.style.display =
            "block";

    } else {

        botao.style.display =
            "none";

        sessao.modoEndereco =
            false;
    }
}


/* =========================================================
   CONFIGURAÇÃO DO USUÁRIO
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


    sessao.tipoProduto =
        String(
            tipoProduto.value || ""
        )
        .trim()
        .toUpperCase();


    const opcaoTipo =
        tipoProduto.options[
            tipoProduto.selectedIndex
        ];


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


    /* VALIDAÇÕES */

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


    if (!sessao.tipoProduto) {

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


    /* RESET */

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


    scannerToken++;


    /* INFORMAÇÕES */

    document.getElementById(
        "lblUsuario"
    ).textContent =
        sessao.nomeUsuario;


    document.getElementById(
        "lblInventario"
    ).textContent =
        sessao.inventario;


    const lblTipo =
        document.getElementById(
            "lblTipoProduto"
        );


    if (lblTipo) {

        lblTipo.textContent =
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
   1920x1080 + TRASEIRA + FOCO CONTÍNUO
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
                                1920
                        },

                        height: {
                            ideal:
                                1080
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


        /* FOCO CONTÍNUO */

        if (track) {

            try {

                const capabilities =
                    track.getCapabilities
                        ? track.getCapabilities()
                        : {};


                if (
                    capabilities.focusMode &&
                    Array.isArray(
                        capabilities.focusMode
                    ) &&
                    capabilities.focusMode.includes(
                        "continuous"
                    )
                ) {

                    await track.applyConstraints({

                        advanced: [
                            {
                                focusMode:
                                    "continuous"
                            }
                        ]
                    });
                }

            } catch (erro) {

                console.warn(
                    "Foco contínuo:",
                    erro
                );
            }
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
            "Resolução real:",
            video.videoWidth +
            " x " +
            video.videoHeight
        );


        mostrarCameraStatus(
            "Aponte a câmera para o código de barras"
        );


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
   INICIAR ZXING
========================================================= */

function iniciarLeitorZXing(
    video
) {

    if (
        scannerBloqueado ||
        processandoCodigo
    ) {
        return;
    }


    if (
        typeof ZXingBrowser ===
        "undefined"
    ) {

        mostrarCameraStatus(
            "Leitor não carregado."
        );

        return;
    }


    /*
     * Cada novo scanner recebe um token.
     */

    const meuToken =
        ++scannerToken;


    try {

        /*
         * Garante que não haja
         * outro leitor ativo.
         */

        pararSomenteLeitor();


        /*
         * pararSomenteLeitor() incrementa o token.
         * Portanto criamos novamente o token
         * que será válido para este leitor.
         */

        const tokenAtual =
            scannerToken;


        codeReader =
            new ZXingBrowser
                .BrowserMultiFormatReader();


        const leitor =
            codeReader;


        leitor.decodeFromVideoElement(
            video,

            (resultado, erro) => {

                /*
                 * =================================================
                 * DESCARTAR LEITURAS ANTIGAS
                 * =================================================
                 */

                if (
                    scannerBloqueado ||
                    processandoCodigo
                ) {
                    return;
                }


                if (
                    tokenAtual !==
                    scannerToken
                ) {
                    return;
                }


                if (
                    leitor !==
                    codeReader
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
                            : String(
                                resultado.text ||
                                ""
                            );

                } catch (erro) {

                    return;
                }


                codigo =
                    normalizarCodigo(
                        codigo
                    );


                if (!codigo)
                    return;


                receberCodigoDaCamera(
                    codigo,
                    tokenAtual
                );
            }
        )
        .then(
            controles => {

                /*
                 * Se esse leitor já ficou
                 * inválido enquanto inicializava,
                 * paramos ele imediatamente.
                 */

                if (
                    tokenAtual !==
                    scannerToken ||
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

                if (
                    tokenAtual ===
                    scannerToken
                ) {

                    console.error(
                        "Erro ZXing:",
                        erro
                    );
                }
            }
        );

    } catch (erro) {

        console.error(
            "Erro criando leitor:",
            erro
        );
    }
}


/* =========================================================
   PARAR SOMENTE O ZXING
========================================================= */

function pararSomenteLeitor() {

    /*
     * Invalida imediatamente
     * qualquer callback anterior.
     */

    scannerToken++;


    if (scannerControls) {

        try {

            if (
                typeof scannerControls.stop ===
                "function"
            ) {

                scannerControls.stop();
            }

        } catch (erro) {

            console.warn(
                "Erro parando controles:",
                erro
            );
        }
    }


    scannerControls =
        null;


    if (codeReader) {

        try {

            if (
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
    }


    codeReader =
        null;
}


/* =========================================================
   RECEBER CÓDIGO DA CÂMERA
========================================================= */

function receberCodigoDaCamera(
    codigo,
    token
) {

    /*
     * Se estiver em lote,
     * nenhuma leitura adicional entra.
     */

    if (
        scannerBloqueado ||
        processandoCodigo
    ) {
        return;
    }


    /*
     * Descarta callback antigo.
     */

    if (
        token !==
        scannerToken
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
     * Ignora somente repetição
     * imediata do mesmo frame.
     *
     * NÃO é duplicidade da coleta.
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
     * Não colocamos mais o código
     * no campo manual quando veio
     * da câmera.
     *
     * Isso elimina exatamente o
     * comportamento que você mostrou.
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
        processandoCodigo ||
        scannerBloqueado
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

async function processarCodigo(
    codigo
) {

    if (
        processandoCodigo ||
        scannerBloqueado
    ) {
        return;
    }


    codigo =
        normalizarCodigo(
            codigo
        );


    if (!codigo)
        return;


    if (
        !sessao.usuario ||
        !sessao.inventario ||
        !sessao.endereco ||
        !sessao.tipoProduto
    ) {

        mostrarCollectionStatus(
            "Sessão inválida.",
            "error"
        );

        return;
    }


    /*
     * TRAVA IMEDIATA.
     */

    processandoCodigo =
        true;


    try {

        /* =====================================================
           ALTERAÇÃO DE ENDEREÇO
        ===================================================== */

        if (
            sessao.modoEndereco
        ) {

            emitirBip();


            await processarNovoEndereco(
                codigo
            );


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


                await processarNovoEndereco(
                    codigo
                );


                return;
            }


            /*
             * PRODUTO = NÚMERO
             */

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
                    codigo +
                    " - INVÁLIDO";


                mostrarCollectionStatus(
                    "Código inválido.",
                    "error"
                );


                return;
            }
        }


        /* =====================================================
           BLOCOS
        ===================================================== */

        if (
            sessao.tipoProduto ===
            "BLOCOS"
        ) {

            /*
             * Qualquer código é produto.
             */
        }


        /* =====================================================
           BIP
        ===================================================== */

        emitirBip();


        /* =====================================================
           COLETA EM LOTE
        ===================================================== */

        if (
            sessao.tipoColeta ===
            "LOTE"
        ) {

            /*
             * =================================================
             * CORREÇÃO PRINCIPAL
             * =================================================
             *
             * Antes de abrir a quantidade:
             *
             * 1. bloqueia scanner;
             * 2. invalida callback antigo;
             * 3. para ZXing;
             * 4. limpa campo;
             * 5. abre quantidade.
             */

            scannerBloqueado =
                true;


            scannerToken++;


            pararSomenteLeitor();


            const campo =
                document.getElementById(
                    "codigo"
                );


            if (campo) {

                campo.value =
                    "";
            }


            /*
             * Agora o ZXing está
             * completamente fora do fluxo.
             */

            await solicitarQuantidadeLote(
                codigo
            );


            /*
             * Só libera depois
             * que a janela fechou.
             */

            scannerBloqueado =
                false;


            processandoCodigo =
                false;


            ultimoCodigoLido =
                "";


            ultimoCodigoTempo =
                0;


            /*
             * Reinicia somente um leitor.
             */

            if (cameraAtiva) {

                iniciarLeitorZXing(
                    document.getElementById(
                        "camera"
                    )
                );
            }


            return;
        }


        /* =====================================================
           UNITÁRIA
        ===================================================== */

        await registrarProduto(
            codigo,
            1
        );

    } catch (erro) {

        console.error(
            "Erro processando código:",
            erro
        );

    } finally {

        /*
         * Para lote, a liberação
         * acontece acima.
         */

        if (
            sessao.tipoColeta !==
            "LOTE"
        ) {

            processandoCodigo =
                false;
        }


        limparCampoCodigo();
    }
}


/* =========================================================
   COLETA EM LOTE
========================================================= */

async function solicitarQuantidadeLote(
    codigo
) {

    /*
     * IMPORTANTE:
     *
     * Não existe setTimeout aqui.
     *
     * O scanner já foi parado antes
     * desta função ser chamada.
     */

    const resposta =
        window.prompt(

            "COLETA EM LOTE\n\n" +

            "Código: " +
            codigo +

            "\n\n" +

            "Informe a quantidade de peças:"
        );


    /* CANCELAR */

    if (
        resposta ===
        null
    ) {

        mostrarCollectionStatus(
            "Coleta cancelada.",
            "error"
        );


        limparCampoCodigo();


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


        limparCampoCodigo();


        return;
    }


    const quantidadeInteira =
        Math.floor(
            quantidade
        );


    if (
        quantidadeInteira <= 0
    ) {

        mostrarCollectionStatus(
            "Quantidade inválida.",
            "error"
        );


        limparCampoCodigo();


        return;
    }


    /*
     * REGISTRA O LOTE
     */

    await registrarProduto(
        codigo,
        quantidadeInteira
    );


    limparCampoCodigo();
}


/* =========================================================
   REGISTRAR PRODUTO
========================================================= */

async function registrarProduto(
    codigo,
    quantidade = 1
) {

    const ultima =
        document.getElementById(
            "ultimaLeitura"
        );


    if (ultima) {

        ultima.textContent =
            codigo;
    }


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


    const mensagem =
        sessao.tipoColeta ===
        "LOTE"

            ? "Lote registrado: " +
              quantidade +
              " peças."

            : "Coleta registrada.";


    mostrarCollectionStatus(
        mensagem,
        "success"
    );


    /*
     * ENVIO PARA APPS SCRIPT
     */

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
        );


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


    } catch (erro) {

        console.error(
            "Erro enviando:",
            erro
        );


        mostrarCollectionStatus(
            "Erro ao enviar coleta.",
            "error"
        );
    }


    limparCampoCodigo();
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
   MODO ALTERAR ENDEREÇO
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
   BOTÃO ENDEREÇO
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
   PROCESSAR NOVO ENDEREÇO
========================================================= */

async function processarNovoEndereco(
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


    document.getElementById(
        "lblEndereco"
    ).textContent =
        novoEndereco;


    document.getElementById(
        "contadorEndereco"
    ).textContent =
        "0";


    document.getElementById(
        "ultimaLeitura"
    ).textContent =
        novoEndereco;


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


    } catch (erro) {

        console.error(
            "Erro endereço:",
            erro
        );
    }


    limparCampoCodigo();
}


/* =========================================================
   PARAR CÂMERA
========================================================= */

function pararCamera() {

    /*
     * Invalida todos os callbacks
     * existentes.
     */

    scannerToken++;


    scannerBloqueado =
        true;


    pararSomenteLeitor();


    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(
                track => {

                    try {

                        track.stop();

                    } catch (e) {}
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
   EVENTOS DA PÁGINA
========================================================= */

window.addEventListener(
    "pagehide",
    pararCamera
);


window.addEventListener(
    "beforeunload",
    pararCamera
);
