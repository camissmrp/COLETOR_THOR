let configuracao = {};
let cameraStream = null;
let scannerControls = null;
let codeReader = null;
let cameraAtiva = false;

let ultimoCodigoLido = "";
let ultimoCodigoTempo = 0;

let audioContext = null;
let processandoCodigo = false;

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

document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("btnEntrar")
        ?.addEventListener("click", iniciarColeta);

    document.getElementById("btnRegistrar")
        ?.addEventListener("click", processarCodigoDigitado);

    document.getElementById("btnAlterarEndereco")
        ?.addEventListener("click", ativarModoEndereco);

    document.getElementById("codigo")
        ?.addEventListener("keydown", e => {

            if (e.key === "Enter") {
                e.preventDefault();
                processarCodigoDigitado();
            }

        });

    document.getElementById("usuario")
        ?.addEventListener("change", e => {
            atualizarConfiguracaoUsuario(e.target.value);
        });

    document.getElementById("tipoProduto")
        ?.addEventListener("change", atualizarTipoProduto);

    mostrarTelaLogin();
    carregarConfiguracao();
});


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
            audioContext = new AC();
        }

        if (audioContext.state === "suspended") {
            await audioContext.resume();
        }

    } catch (erro) {
        console.warn("Áudio:", erro);
    }
}


function emitirBip() {

    try {

        const AC =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AC) return;

        if (!audioContext) {
            audioContext = new AC();
        }

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        const agora =
            audioContext.currentTime;

        const oscilador =
            audioContext.createOscillator();

        const ganho =
            audioContext.createGain();

        oscilador.type = "sine";

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

        oscilador.connect(ganho);
        ganho.connect(audioContext.destination);

        oscilador.start(agora);
        oscilador.stop(agora + 0.15);

    } catch (erro) {
        console.warn("Bip:", erro);
    }
}


/* =========================================================
   TELAS
========================================================= */

function mostrarTelaLogin() {

    document.getElementById("login")
        ?.classList.remove("hidden");

    document.getElementById("coleta")
        ?.classList.add("hidden");

    pararCamera();
}


function mostrarTelaColeta() {

    document.getElementById("login")
        ?.classList.add("hidden");

    document.getElementById("coleta")
        ?.classList.remove("hidden");
}


/* =========================================================
   STATUS
========================================================= */

function mostrarLoginStatus(mensagem, tipo = "") {

    const el =
        document.getElementById("loginStatus");

    if (!el) return;

    el.textContent = mensagem || "";

    el.className =
        "status" +
        (tipo ? " " + tipo : "");
}


function mostrarCollectionStatus(mensagem, tipo = "") {

    const el =
        document.getElementById("collectionStatus");

    if (!el) return;

    el.textContent = mensagem || "";

    el.className =
        "status" +
        (tipo ? " " + tipo : "");
}


function mostrarCameraStatus(mensagem) {

    const el =
        document.getElementById("cameraMessage");

    if (el) {
        el.textContent = mensagem;
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
                    cache: "no-store"
                }
            );

        if (!resposta.ok) {
            throw new Error(
                "HTTP " + resposta.status
            );
        }

        configuracao =
            await resposta.json();


        /* USUÁRIOS */

        const selectUsuario =
            document.getElementById("usuario");

        if (!selectUsuario) {
            throw new Error(
                "Campo usuario não encontrado."
            );
        }

        selectUsuario.innerHTML = "";

        const usuarios =
            Array.isArray(
                configuracao.Usuarios
            )
                ? configuracao.Usuarios
                : [];

        if (!usuarios.length) {

            const option =
                document.createElement("option");

            option.value = "";
            option.textContent =
                "Nenhum usuário disponível";

            selectUsuario.appendChild(option);

            document.getElementById(
                "btnEntrar"
            ).disabled = true;

            mostrarLoginStatus(
                "Nenhum usuário ativo foi encontrado.",
                "error"
            );

            return;
        }


        usuarios.forEach(usuario => {

            const option =
                document.createElement("option");

            option.value =
                usuario.id;

            option.textContent =
                usuario.nome;

            selectUsuario.appendChild(option);

        });


        /* TIPOS DE PRODUTO */

        carregarTiposProduto();


        /* USUÁRIO INICIAL */

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

    if (!select) return;

    select.innerHTML = "";

    const tipos =
        Array.isArray(
            configuracao.TiposProduto
        )
            ? configuracao.TiposProduto
            : [];

    if (!tipos.length) {

        const option =
            document.createElement("option");

        option.value = "";
        option.textContent =
            "Nenhum tipo disponível";

        select.appendChild(option);

        return;
    }


    tipos.forEach(item => {

        const option =
            document.createElement("option");

        option.value =
            item.tipoProduto;

        option.textContent =
            item.tipoProduto;

        option.dataset.regra =
            item.regraColeta || "";

        option.dataset.tipoColeta =
            item.tipoColeta || "UNITARIA";

        select.appendChild(option);

    });


    select.selectedIndex = 0;

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

    if (!select) return;

    const opcao =
        select.options[
            select.selectedIndex
        ];

    if (!opcao) return;


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


    const botao =
        document.getElementById(
            "btnAlterarEndereco"
        );

    if (botao) {

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

    let configUsuario = null;

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
            configUsuario?.inventario || "";
    }


    if (endereco) {

        endereco.value =
            configUsuario?.enderecoAtual || "";
    }
}


/* =========================================================
   INICIAR COLETA
========================================================= */

async function iniciarColeta() {

    const usuario =
        document.getElementById("usuario");

    const inventario =
        document.getElementById("inventario");

    const endereco =
        document.getElementById("endereco");

    const tipoProduto =
        document.getElementById("tipoProduto");


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
            opcaoTipo?.dataset.regra || ""
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


    sessao.totalEndereco = 0;
    sessao.totalColeta = 0;
    sessao.modoEndereco = false;

    ultimoCodigoLido = "";
    ultimoCodigoTempo = 0;

    processandoCodigo = false;


    document.getElementById(
        "lblUsuario"
    ).textContent =
        sessao.nomeUsuario;


    document.getElementById(
        "lblInventario"
    ).textContent =
        sessao.inventario;


    document.getElementById(
        "lblTipoProduto"
    ).textContent =
        sessao.tipoProduto;


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


    mostrarCollectionStatus("");

    atualizarBotaoEndereco();

    mostrarTelaColeta();

    await iniciarCamera();
}


/* =========================================================
   CÂMERA
   RESOLUÇÃO MÁXIMA + TRASEIRA + FOCO CONTÍNUO
========================================================= */

async function iniciarCamera() {

    if (cameraAtiva) return;

    const video =
        document.getElementById("camera");

    if (!video) return;


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
                            ideal: "environment"
                        },

                        width: {
                            ideal: 1920
                        },

                        height: {
                            ideal: 1080
                        },

                        frameRate: {
                            ideal: 30,
                            max: 30
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
                "Capacidades:",
                capabilities
            );


            console.log(
                "Configuração:",
                track.getSettings()
            );


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

                } catch (erro) {

                    console.warn(
                        "Foco contínuo:",
                        erro
                    );
                }
            }
        }


        video.srcObject =
            cameraStream;

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


        await video.play();

        cameraAtiva = true;


        console.log(
            "Resolução:",
            video.videoWidth +
            " x " +
            video.videoHeight
        );


        mostrarCameraStatus(
            "Aponte a câmera para o código de barras"
        );


        iniciarLeitorZXing(video);

    } catch (erro) {

        console.error(
            "Erro câmera:",
            erro
        );

        cameraAtiva = false;

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
========================================================= */

function iniciarLeitorZXing(video) {

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
                     * CORREÇÃO IMPORTANTE:
                     * enquanto houver processamento de lote,
                     * ignoramos completamente qualquer leitura
                     * que ainda esteja pendente no ZXing.
                     */

                    if (processandoCodigo) {
                        return;
                    }


                    if (!resultado) {
                        return;
                    }


                    let codigo = "";


                    try {

                        codigo =
                            resultado.getText
                                ? resultado.getText()
                                : resultado.text || "";

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


                    if (!codigo) {
                        return;
                    }


                    receberCodigoDaCamera(
                        codigo
                    );
                }
            )
            .then(controles => {

                scannerControls =
                    controles;

                console.log(
                    "Scanner iniciado."
                );

            })
            .catch(erro => {

                console.error(
                    "Erro ZXing:",
                    erro
                );

                mostrarCameraStatus(
                    "Erro no leitor de código."
                );
            });


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
   PAUSAR ZXING
========================================================= */

function pausarLeitorZXing() {

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
            "Erro pausando scanner:",
            erro
        );
    }


    scannerControls = null;


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


    codeReader = null;
}


/* =========================================================
   REINICIAR ZXING
========================================================= */

function continuarLeitorZXing() {

    if (!cameraAtiva) return;

    const video =
        document.getElementById("camera");

    if (!video) return;


    /*
     * Pequeno intervalo apenas para garantir
     * que o leitor anterior terminou.
     */

    setTimeout(() => {

        if (!cameraAtiva) return;

        if (processandoCodigo) return;

        iniciarLeitorZXing(video);

    }, 150);
}


/* =========================================================
   RECEBER CÓDIGO DA CÂMERA
========================================================= */

function receberCodigoDaCamera(codigo) {

    /*
     * Se estiver processando um lote,
     * ignora qualquer nova leitura.
     */

    if (processandoCodigo) {
        return;
    }


    const agora =
        Date.now();


    codigo =
        normalizarCodigo(
            codigo
        );


    if (!codigo) {
        return;
    }


    /*
     * Evita somente leituras repetidas
     * do mesmo frame.
     *
     * NÃO é verificação de duplicidade.
     */

    if (
        codigo === ultimoCodigoLido &&
        agora - ultimoCodigoTempo < 800
    ) {

        return;
    }


    ultimoCodigoLido =
        codigo;

    ultimoCodigoTempo =
        agora;


    const campo =
        document.getElementById(
            "codigo"
        );


    if (campo) {
        campo.value =
            codigo;
    }


    processarCodigo(
        codigo
    );
}


/* =========================================================
   DIGITAÇÃO MANUAL
========================================================= */

function processarCodigoDigitado() {

    if (processandoCodigo) {
        return;
    }


    const campo =
        document.getElementById(
            "codigo"
        );


    if (!campo) {
        return;
    }


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


/* =========================================================
   NORMALIZAR
========================================================= */

function normalizarCodigo(valor) {

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

async function processarCodigo(codigo) {

    /*
     * TRAVA PRINCIPAL
     */

    if (processandoCodigo) {
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
     * A partir daqui nenhuma outra leitura
     * será processada até terminar.
     */

    processandoCodigo = true;


    /* =====================================================
       MODO ALTERAR ENDEREÇO
    ===================================================== */

    if (sessao.modoEndereco) {

        emitirBip();

        processarNovoEndereco(
            codigo
        );

        processandoCodigo = false;

        focarCampoCodigo();

        return;
    }


    /* =====================================================
       CHAPAS / RECORTADOS
       Número = produto
       Letra = endereço
    ===================================================== */

    if (
        sessao.tipoProduto ===
        "CHAPAS" ||

        sessao.tipoProduto ===
        "RECORTADOS"
    ) {

        if (
            /^[A-Za-z]/.test(codigo)
        ) {

            emitirBip();

            processarNovoEndereco(
                codigo
            );

            processandoCodigo = false;

            focarCampoCodigo();

            return;
        }


        if (
            !/^\d/.test(codigo)
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

            processandoCodigo = false;

            focarCampoCodigo();

            return;
        }
    }


    /* =====================================================
       BLOCOS
       Qualquer código = produto
       Endereço manual
    ===================================================== */

    if (
        sessao.tipoProduto ===
        "BLOCOS"
    ) {

        /* Qualquer código é aceito */
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
         * AQUI ESTÁ A CORREÇÃO.
         *
         * Primeiro paramos completamente o ZXing.
         */

        pausarLeitorZXing();


        /*
         * Agora abrimos a quantidade.
         *
         * Nenhuma leitura da câmera poderá
         * abrir outra janela enquanto isso.
         */

        await solicitarQuantidadeLote(
            codigo
        );


        /*
         * Libera o processamento.
         */

        processandoCodigo = false;


        /*
         * Reinicia o leitor somente depois
         * que a janela de quantidade fechou
         * e o registro terminou.
         */

        continuarLeitorZXing();


        focarCampoCodigo();

        return;
    }


    /* =====================================================
       COLETA UNITÁRIA
    ===================================================== */

    await registrarProduto(
        codigo,
        1
    );


    processandoCodigo = false;

    focarCampoCodigo();
}


/* =========================================================
   SOLICITAR QUANTIDADE DO LOTE
========================================================= */

async function solicitarQuantidadeLote(
    codigo
) {

    /*
     * IMPORTANTE:
     *
     * O ZXing já foi parado antes desta função.
     *
     * Não usamos mais setTimeout.
     */


    const resposta =
        window.prompt(
            "COLETA EM LOTE\n\n" +
            "Código: " +
            codigo +
            "\n\n" +
            "Informe a quantidade de peças:"
        );


    /* CANCELADO */

    if (resposta === null) {

        mostrarCollectionStatus(
            "Coleta cancelada.",
            "error"
        );

        limparCampoCodigo();

        return;
    }


    /* QUANTIDADE */

    const quantidade =
        Number(
            String(resposta)
                .replace(",", ".")
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

    document.getElementById(
        "ultimaLeitura"
    ).textContent =
        codigo;


    const mensagem =
        sessao.tipoColeta === "LOTE"
            ? "Lote enviado: " +
              quantidade +
              " peças."
            : "Coleta enviada.";


    mostrarCollectionStatus(
        mensagem,
        "success"
    );


    /* CONTADORES */

    sessao.totalEndereco +=
        quantidade;

    sessao.totalColeta +=
        quantidade;


    document.getElementById(
        "contadorEndereco"
    ).textContent =
        sessao.totalEndereco;


    document.getElementById(
        "contadorTotal"
    ).textContent =
        sessao.totalColeta;


    /*
     * ENVIO PARA APPS SCRIPT
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
            codigo,
            "Tipo:",
            sessao.tipoProduto,
            "Coleta:",
            sessao.tipoColeta,
            "Quantidade:",
            quantidade
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
        campo.value = "";
    }
}


function focarCampoCodigo() {

    const campo =
        document.getElementById(
            "codigo"
        );

    if (campo) {

        setTimeout(() => {
            campo.focus();
        }, 50);

    }
}


/* =========================================================
   ATIVAR MODO ALTERAR ENDEREÇO
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


    const campo =
        document.getElementById(
            "codigo"
        );


    if (campo) {

        campo.value = "";

        campo.focus();
    }
}


/* =========================================================
   ATUALIZAR BOTÃO DE ENDEREÇO
========================================================= */

function atualizarBotaoEndereco() {

    const botao =
        document.getElementById(
            "btnAlterarEndereco"
        );

    if (!botao) return;


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

async function processarNovoEndereco(
    novoEndereco
) {

    novoEndereco =
        normalizarCodigo(
            novoEndereco
        );


    if (!novoEndereco) {
        return;
    }


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

    try {

        if (
            scannerControls &&
            typeof scannerControls.stop ===
            "function"
        ) {

            scannerControls.stop();
        }

    } catch (erro) {

        console.warn(erro);
    }


    scannerControls = null;


    try {

        if (
            codeReader &&
            typeof codeReader.reset ===
            "function"
        ) {

            codeReader.reset();
        }

    } catch (erro) {

        console.warn(erro);
    }


    codeReader = null;


    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(track => {

                try {
                    track.stop();
                } catch (erro) {}

            });
    }


    cameraStream = null;

    cameraAtiva = false;

    processandoCodigo = false;


    const video =
        document.getElementById(
            "camera"
        );


    if (video) {

        try {
            video.pause();
        } catch (e) {}

        video.srcObject = null;
    }
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
