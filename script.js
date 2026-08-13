let configuracao = {};
let cameraStream = null;
let scannerControls = null;
let codeReader = null;
let cameraAtiva = false;
let processandoCodigo = false;
let ultimoCodigoLido = "";
let ultimoCodigoTempo = 0;
let audioContext = null;

const sessao = {
    usuario: "",
    nomeUsuario: "",
    inventario: "",
    endereco: "",
    totalEndereco: 0,
    totalColeta: 0
};


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    document
        .getElementById("btnEntrar")
        ?.addEventListener("click", iniciarColeta);

    document
        .getElementById("btnRegistrar")
        ?.addEventListener("click", processarCodigoDigitado);

    document
        .getElementById("codigo")
        ?.addEventListener("keydown", e => {

            if (e.key === "Enter") {
                e.preventDefault();
                processarCodigoDigitado();
            }

        });

    document
        .getElementById("usuario")
        ?.addEventListener("change", e => {

            atualizarConfiguracaoUsuario(
                e.target.value
            );

        });

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

        if (
            audioContext.state === "suspended"
        ) {
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

        if (
            audioContext.state === "suspended"
        ) {
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
        ganho.connect(
            audioContext.destination
        );

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

    document
        .getElementById("login")
        ?.classList.remove("hidden");

    document
        .getElementById("coleta")
        ?.classList.add("hidden");

    pararCamera();
}


function mostrarTelaColeta() {

    document
        .getElementById("login")
        ?.classList.add("hidden");

    document
        .getElementById("coleta")
        ?.classList.remove("hidden");
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

    el.textContent = mensagem || "";

    el.className =
        "status" +
        (tipo ? " " + tipo : "");
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

    el.textContent = mensagem || "";

    el.className =
        "status" +
        (tipo ? " " + tipo : "");
}


function mostrarCameraStatus(
    mensagem
) {

    const el =
        document.getElementById(
            "cameraMessage"
        );

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
                "HTTP " +
                resposta.status
            );
        }

        configuracao =
            await resposta.json();

        const select =
            document.getElementById(
                "usuario"
            );

        select.innerHTML = "";

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

            option.value = "";
            option.textContent =
                "Nenhum usuário disponível";

            select.appendChild(option);

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
                document.createElement(
                    "option"
                );

            option.value = usuario.id;
            option.textContent = usuario.nome;

            select.appendChild(option);
        });

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
                    String(item.usuario).trim() ===
                    String(usuarioId).trim()
            );
    }

    inventario.value =
        configUsuario?.inventario || "";

    endereco.value =
        configUsuario?.enderecoAtual || "";
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

    await prepararAudio();

    const opcao =
        usuario.options[
            usuario.selectedIndex
        ];

    sessao.usuario =
        String(
            usuario.value || ""
        ).trim();

    sessao.nomeUsuario =
        opcao
            ? opcao.textContent.trim()
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

    sessao.totalEndereco = 0;
    sessao.totalColeta = 0;

    document.getElementById(
        "lblUsuario"
    ).textContent =
        sessao.nomeUsuario;

    document.getElementById(
        "lblInventario"
    ).textContent =
        sessao.inventario;

    document.getElementById(
        "lblEndereco"
    ).textContent =
        sessao.endereco;

    document.getElementById(
        "contadorEndereco"
    ).textContent = "0";

    document.getElementById(
        "contadorTotal"
    ).textContent = "0";

    document.getElementById(
        "ultimaLeitura"
    ).textContent = "-";

    mostrarCollectionStatus("");

    mostrarTelaColeta();

    await iniciarCamera();
}


/* =========================================================
   CÂMERA - RESOLUÇÃO MÁXIMA + FOCO CONTÍNUO
========================================================= */

async function iniciarCamera() {

    if (cameraAtiva) return;

    const video =
        document.getElementById(
            "camera"
        );

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

        /*
         * Primeiro solicitamos a câmera traseira
         * com alta resolução.
         *
         * "ideal" significa:
         * tente chegar a 1920x1080,
         * mas não force essa resolução.
         */

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


        /*
         * CONFIGURAÇÕES REAIS DA CÂMERA
         *
         * Verifica o que o aparelho realmente
         * conseguiu fornecer.
         */

        const track =
            cameraStream.getVideoTracks()[0];

        if (track) {

            const capabilities =
                typeof track.getCapabilities ===
                "function"
                    ? track.getCapabilities()
                    : {};

            const settings =
                typeof track.getSettings ===
                "function"
                    ? track.getSettings()
                    : {};

            console.log(
                "Capacidades da câmera:",
                capabilities
            );

            console.log(
                "Configuração utilizada:",
                settings
            );


            /*
             * FOCO CONTÍNUO
             *
             * Só tenta aplicar se o aparelho
             * realmente oferecer focusMode.
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
                        "Foco contínuo ativado."
                    );

                } catch (erroFoco) {

                    console.warn(
                        "Não foi possível ativar foco contínuo:",
                        erroFoco
                    );
                }
            }


            /*
             * Algumas câmeras permitem alterar
             * zoom. Não vamos aplicar zoom
             * automaticamente, para não perder
             * campo de visão.
             */
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


        /*
         * Mostra no console a resolução
         * efetivamente utilizada.
         */

        try {

            console.log(
                "Resolução real:",
                video.videoWidth +
                " x " +
                video.videoHeight
            );

        } catch (e) {}


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
   LEITOR DE CÓDIGO
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

        /*
         * MANTIDO BrowserMultiFormatReader
         *
         * Continua aceitando os diferentes
         * tipos de código que vocês utilizam.
         */

        codeReader =
            new ZXingBrowser
                .BrowserMultiFormatReader();

        codeReader
            .decodeFromVideoElement(
                video,
                (resultado, erro) => {

                    if (!resultado)
                        return;

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

                    if (!codigo)
                        return;

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
   RECEBER LEITURA
========================================================= */

function receberCodigoDaCamera(
    codigo
) {

    const agora =
        Date.now();

    codigo =
        normalizarCodigo(
            codigo
        );

    if (!codigo)
        return;

    /*
     * Apenas evita várias leituras do
     * MESMO FRAME.
     *
     * Não é verificação de duplicidade.
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
        campo.value = codigo;
    }

    processarCodigo(
        codigo
    );
}


/* =========================================================
   DIGITAÇÃO MANUAL
========================================================= */

function processarCodigoDigitado() {

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

    if (!codigo)
        return;

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


    /*
     * ENDEREÇO
     */

    if (
        /^[A-Za-z]/.test(codigo)
    ) {

        processarNovoEndereco(
            codigo
        );

        emitirBip();

        return;
    }


    /*
     * PRODUTO
     */

    if (
        !/^\d/.test(codigo)
    ) {

        document.getElementById(
            "ultimaLeitura"
        ).textContent =
            codigo +
            " - INVÁLIDO";

        mostrarCollectionStatus(
            "Código inválido.",
            "error"
        );

        return;
    }


    /*
     * LEU:
     * BIP IMEDIATO
     * ENVIO ASSÍNCRONO
     */

    emitirBip();

    registrarProduto(
        codigo
    );
}


/* =========================================================
   REGISTRAR PRODUTO
========================================================= */

function registrarProduto(
    codigo
) {

    document.getElementById(
        "ultimaLeitura"
    ).textContent =
        codigo;

    mostrarCollectionStatus(
        "Coleta enviada.",
        "success"
    );


    /*
     * CONTADORES
     */

    sessao.totalEndereco++;
    sessao.totalColeta++;

    document.getElementById(
        "contadorEndereco"
    ).textContent =
        sessao.totalEndereco;

    document.getElementById(
        "contadorTotal"
    ).textContent =
        sessao.totalColeta;


    /*
     * ENVIO ASSÍNCRONO
     */

    fetch(
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
    )
    .then(() => {

        console.log(
            "Coleta enviada:",
            codigo
        );

    })
    .catch(erro => {

        console.error(
            "Erro enviando:",
            erro
        );
    });
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

    sessao.endereco =
        novoEndereco;

    sessao.totalEndereco =
        0;

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


    fetch(
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
    )
    .catch(erro => {

        console.error(
            "Erro endereço:",
            erro
        );
    });
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
