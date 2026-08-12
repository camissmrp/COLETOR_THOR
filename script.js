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
    usuario: null,
    nomeUsuario: "",
    inventario: "",
    endereco: "",
    totalEndereco: 0,
    totalColeta: 0
};


/* =========================
   INICIALIZAÇÃO
========================= */

document.addEventListener("DOMContentLoaded", () => {

    mostrarTelaLogin();

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
            atualizarConfiguracaoUsuario(e.target.value);
        });

    carregarConfiguracao();
});


/* =========================
   ÁUDIO
========================= */

async function prepararAudio() {

    try {

        const AC =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AC) return false;

        if (!audioContext)
            audioContext = new AC();

        await audioContext.resume();

        return true;

    } catch (e) {

        console.warn("Erro preparando áudio:", e);
        return false;
    }
}


function emitirBip() {

    try {

        if (!audioContext) return;

        if (audioContext.state === "suspended")
            audioContext.resume();

        const tempo = audioContext.currentTime;

        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.type = "sine";

        osc.frequency.setValueAtTime(
            1800,
            tempo
        );

        gain.gain.setValueAtTime(
            0.0001,
            tempo
        );

        gain.gain.exponentialRampToValueAtTime(
            0.30,
            tempo + 0.01
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            tempo + 0.15
        );

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.start(tempo);
        osc.stop(tempo + 0.15);

    } catch (e) {

        console.warn("Erro no bip:", e);
    }
}


/* =========================
   TELAS
========================= */

function mostrarTelaLogin() {

    document
        .getElementById("login")
        ?.classList.remove("hidden");

    document
        .getElementById("coleta")
        ?.classList.add("hidden");

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
        ?.classList.add("hidden");

    document
        .getElementById("coleta")
        ?.classList.remove("hidden");
}


function mostrarLoginStatus(mensagem, tipo = "") {

    const el =
        document.getElementById("loginStatus");

    if (!el) return;

    el.textContent = mensagem || "";

    el.className =
        "status" +
        (tipo ? ` ${tipo}` : "");
}


function mostrarCollectionStatus(mensagem, tipo = "") {

    const el =
        document.getElementById("collectionStatus");

    if (!el) return;

    el.textContent = mensagem || "";

    el.className =
        "status" +
        (tipo ? ` ${tipo}` : "");
}


function mostrarCameraStatus(mensagem) {

    const el =
        document.getElementById("cameraMessage");

    if (el)
        el.textContent = mensagem;
}


/* =========================
   CONFIGURAÇÃO
========================= */

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

        if (!resposta.ok)
            throw new Error(
                "HTTP " + resposta.status
            );

        configuracao =
            await resposta.json();

        const select =
            document.getElementById("usuario");

        const inventario =
            document.getElementById("inventario");

        const endereco =
            document.getElementById("endereco");

        select.innerHTML = "";

        const usuarios =
            Array.isArray(configuracao.Usuarios)
                ? configuracao.Usuarios
                : [];

        if (!usuarios.length) {

            const option =
                document.createElement("option");

            option.value = "";
            option.textContent =
                "Nenhum usuário disponível";

            select.appendChild(option);

            inventario.value = "";
            endereco.value = "";

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
            "Erro carregando configuração:",
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


function atualizarConfiguracaoUsuario(usuarioId) {

    const inventario =
        document.getElementById("inventario");

    const endereco =
        document.getElementById("endereco");

    let configUsuario = null;

    if (Array.isArray(configuracao.Configuracoes)) {

        configUsuario =
            configuracao.Configuracoes.find(
                config =>
                    String(config.usuario).trim() ===
                    String(usuarioId).trim()
            );
    }

    inventario.value =
        configUsuario?.inventario || "";

    endereco.value =
        configUsuario?.enderecoAtual || "";
}


/* =========================
   INICIAR COLETA
========================= */

async function iniciarColeta() {

    const btn =
        document.getElementById("btnEntrar");

    const usuario =
        document.getElementById("usuario");

    const inventario =
        document.getElementById("inventario");

    const endereco =
        document.getElementById("endereco");

    await prepararAudio();

    const option =
        usuario.options[
            usuario.selectedIndex
        ];

    sessao.usuario =
        String(
            usuario.value || ""
        ).trim();

    sessao.nomeUsuario =
        option
            ? option.textContent.trim()
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


/* =========================
   CÓDIGO
========================= */

function normalizarCodigo(valor) {

    return String(valor || "")
        .replace(/[\r\n\t]/g, "")
        .trim()
        .toUpperCase();
}


function receberCodigoDaCamera(codigo) {

    const agora = Date.now();

    const valor =
        normalizarCodigo(codigo);

    if (!valor) return;

    if (
        valor === ultimoCodigoLido &&
        agora - ultimoCodigoTempo < 900
    ) {
        return;
    }

    ultimoCodigoLido = valor;
    ultimoCodigoTempo = agora;

    document.getElementById(
        "codigo"
    ).value = valor;

    processarCodigo(valor);
}


function processarCodigoDigitado() {

    const input =
        document.getElementById("codigo");

    const codigo =
        normalizarCodigo(input.value);

    if (codigo)
        processarCodigo(codigo);
}


async function processarCodigo(codigoRecebido) {

    if (processandoCodigo)
        return;

    const codigo =
        normalizarCodigo(codigoRecebido);

    if (!codigo) return;

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

    document.getElementById(
        "codigo"
    ).value = "";

    try {

        /*
         * ENDEREÇO
         */

        if (/^[A-Za-z]/.test(codigo)) {

            await processarNovoEndereco(
                codigo
            );

            emitirBip();

            return;
        }


        /*
         * PRODUTO
         */

        if (!/^\d/.test(codigo)) {

            document.getElementById(
                "ultimaLeitura"
            ).textContent =
                codigo + " - INVÁLIDO";

            mostrarCollectionStatus(
                "Código inválido.",
                "error"
            );

            return;
        }

        await registrarProduto(codigo);

    } finally {

        processandoCodigo = false;

        focarCampoCodigo();
    }
}


/* =========================
   REGISTRAR PRODUTO
========================= */

async function registrarProduto(codigo) {

    const ultima =
        document.getElementById(
            "ultimaLeitura"
        );

    try {

        mostrarCollectionStatus(
            "Registrando..."
        );

        const url =
            API +
            "?acao=registrar" +

            "&usuario=" +
            encodeURIComponent(
                sessao.usuario
            ) +

            "&nomeUsuario=" +
            encodeURIComponent(
                sessao.nomeUsuario
            ) +

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

            "&tipoLeitura=PRODUTO" +

            "&ts=" +
            Date.now();

        const resposta =
            await fetch(
                url,
                {
                    cache: "no-store"
                }
            );

        if (!resposta.ok)
            throw new Error(
                "HTTP " +
                resposta.status
            );

        const resultado =
            await resposta.json();


        /*
         * DUPLICADO
         */

        if (
            resultado.duplicado === true
        ) {

            ultima.textContent =
                codigo;

            mostrarCollectionStatus(
                "PRODUTO JÁ COLETADO NESTE ENDEREÇO.",
                "error"
            );

            return;
        }


        /*
         * ERRO NO SERVIDOR
         */

        if (
            resultado.sucesso !== true
        ) {

            throw new Error(
                resultado.erro ||
                "Erro desconhecido no servidor."
            );
        }


        /*
         * SUCESSO
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

        ultima.textContent =
            codigo;

        mostrarCollectionStatus(
            "Coleta registrada.",
            "success"
        );

        emitirBip();

    } catch (erro) {

        console.error(
            "Erro enviando coleta:",
            erro
        );

        ultima.textContent =
            codigo + " - ERRO";

        mostrarCollectionStatus(
            "ERRO AO REGISTRAR: " +
            erro.message,
            "error"
        );
    }
}


/* =========================
   NOVO ENDEREÇO
========================= */

async function processarNovoEndereco(
    novoEndereco
) {

    novoEndereco =
        normalizarCodigo(novoEndereco);

    sessao.endereco =
        novoEndereco;

    sessao.totalEndereco = 0;

    document.getElementById(
        "lblEndereco"
    ).textContent =
        novoEndereco;

    document.getElementById(
        "contadorEndereco"
    ).textContent = "0";

    document.getElementById(
        "ultimaLeitura"
    ).textContent =
        novoEndereco;

    try {

        const url =
            API +
            "?acao=novoEndereco" +

            "&usuario=" +
            encodeURIComponent(
                sessao.usuario
            ) +

            "&inventario=" +
            encodeURIComponent(
                sessao.inventario
            ) +

            "&endereco=" +
            encodeURIComponent(
                novoEndereco
            ) +

            "&ts=" +
            Date.now();

        const resposta =
            await fetch(
                url,
                {
                    cache: "no-store"
                }
            );

        const resultado =
            await resposta.json();

        if (
            resultado.sucesso !== true
        ) {

            throw new Error(
                resultado.erro ||
                "Erro ao alterar endereço."
            );
        }

        mostrarCollectionStatus(
            "Endereço alterado.",
            "success"
        );

    } catch (erro) {

        console.error(
            "Erro endereço:",
            erro
        );

        mostrarCollectionStatus(
            "Erro ao alterar endereço.",
            "error"
        );
    }
}


/* =========================
   CÂMERA
========================= */

async function iniciarCamera() {

    if (cameraAtiva)
        return;

    const video =
        document.getElementById("camera");

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
            await navigator.mediaDevices
                .getUserMedia({

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

        await new Promise(resolve => {

            if (
                video.readyState >= 2 &&
                video.videoWidth > 0
            ) {

                resolve();
                return;
            }

            const finalizar = () => {

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
        });

        await video.play().catch(() => {});

        cameraAtiva = true;

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

        if (
            erro.name ===
            "NotAllowedError"
        ) {

            mostrarCameraStatus(
                "Acesso à câmera bloqueado. Permita a câmera no navegador."
            );

        } else if (
            erro.name ===
            "NotFoundError"
        ) {

            mostrarCameraStatus(
                "Câmera traseira não encontrada."
            );

        } else {

            mostrarCameraStatus(
                "Não foi possível abrir a câmera."
            );
        }
    }
}


function iniciarLeitorZXing(video) {

    if (!window.ZXingBrowser) {

        mostrarCameraStatus(
            "Leitor não carregado. Use a digitação manual."
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
                resultado => {

                    if (!resultado)
                        return;

                    const codigo =
                        resultado.getText
                            ? resultado.getText()
                            : String(
                                resultado.text ||
                                ""
                            );

                    if (codigo)
                        receberCodigoDaCamera(
                            codigo
                        );
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
                        "Erro ZXing:",
                        erro
                    );

                    mostrarCameraStatus(
                        "Leitor não iniciou. Use a digitação manual."
                    );
                }
            );

    } catch (erro) {

        console.error(
            "Erro criando ZXing:",
            erro
        );
    }
}


/* =========================
   AUXILIARES
========================= */

function focarCampoCodigo() {

    const input =
        document.getElementById("codigo");

    if (input) {

        input.value = "";

        setTimeout(() => {
            input.focus();
        }, 100);
    }
}


function pararCamera() {

    try {

        if (
            scannerControls &&
            typeof scannerControls.stop ===
                "function"
        ) {
            scannerControls.stop();
        }

    } catch (e) {}

    scannerControls = null;

    try {

        if (
            codeReader &&
            typeof codeReader.reset ===
                "function"
        ) {
            codeReader.reset();
        }

    } catch (e) {}

    codeReader = null;

    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(track => {

                try {
                    track.stop();
                } catch (e) {}
            });
    }

    cameraStream = null;
    cameraAtiva = false;

    const video =
        document.getElementById("camera");

    if (video) {

        video.pause();
        video.srcObject = null;
    }
}


window.addEventListener(
    "pagehide",
    pararCamera
);

window.addEventListener(
    "beforeunload",
    pararCamera
);
