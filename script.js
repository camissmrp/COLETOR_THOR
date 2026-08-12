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

document.addEventListener("DOMContentLoaded", () => {
    mostrarTelaLogin();

    const btnEntrar = document.getElementById("btnEntrar");
    const btnRegistrar = document.getElementById("btnRegistrar");
    const txtCodigo = document.getElementById("codigo");
    const selectUsuario = document.getElementById("usuario");

    btnEntrar.addEventListener("click", iniciarColeta);

    btnRegistrar.addEventListener("click", () => {
        processarCodigoDigitado();
    });

    txtCodigo.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            processarCodigoDigitado();
        }
    });

    selectUsuario.addEventListener("change", () => {
        atualizarConfiguracaoUsuario(selectUsuario.value);
    });

    carregarConfiguracao();
});

async function prepararAudio() {
    try {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
            console.warn("AudioContext não é suportado.");
            return false;
        }

        if (!audioContext) {
            audioContext = new AudioContextClass();
        }

        if (audioContext.state === "suspended") {
            await audioContext.resume();
        }

        const agora = audioContext.currentTime;
        const oscilador = audioContext.createOscillator();
        const ganho = audioContext.createGain();

        oscilador.type = "sine";
        oscilador.frequency.setValueAtTime(1200, agora);

        ganho.gain.setValueAtTime(0.0001, agora);
        ganho.gain.exponentialRampToValueAtTime(0.15, agora + 0.01);
        ganho.gain.exponentialRampToValueAtTime(0.0001, agora + 0.08);

        oscilador.connect(ganho);
        ganho.connect(audioContext.destination);

        oscilador.start(agora);
        oscilador.stop(agora + 0.08);

        if (audioContext.state === "suspended") {
            await audioContext.resume();
        }

        return audioContext.state === "running";
    } catch (erro) {
        console.warn("Erro ao preparar áudio:", erro);
        return false;
    }
}

function emitirBip() {
    try {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return;

        if (!audioContext) {
            audioContext = new AudioContextClass();
        }

        if (audioContext.state !== "running") {
            audioContext.resume().catch(erro => {
                console.warn("Não foi possível ativar áudio:", erro);
            });
            return;
        }

        const agora = audioContext.currentTime;
        const oscilador = audioContext.createOscillator();
        const ganho = audioContext.createGain();

        oscilador.type = "sine";
        oscilador.frequency.setValueAtTime(1800, agora);

        ganho.gain.setValueAtTime(0.0001, agora);
        ganho.gain.exponentialRampToValueAtTime(0.30, agora + 0.01);
        ganho.gain.exponentialRampToValueAtTime(0.0001, agora + 0.15);

        oscilador.connect(ganho);
        ganho.connect(audioContext.destination);

        oscilador.start(agora);
        oscilador.stop(agora + 0.15);
    } catch (erro) {
        console.warn("Erro ao emitir bip:", erro);
    }
}

function mostrarTelaLogin() {
    document.getElementById("login").classList.remove("hidden");
    document.getElementById("coleta").classList.add("hidden");

    pararCamera();

    sessao.usuario = null;
    sessao.nomeUsuario = "";
    sessao.inventario = "";
    sessao.endereco = "";
    sessao.totalEndereco = 0;
    sessao.totalColeta = 0;
}

function mostrarTelaColeta() {
    document.getElementById("login").classList.add("hidden");
    document.getElementById("coleta").classList.remove("hidden");
}

function mostrarLoginStatus(mensagem, tipo = "") {
    const el = document.getElementById("loginStatus");

    el.textContent = mensagem || "";
    el.className = "status" + (tipo ? ` ${tipo}` : "");
}

function mostrarCollectionStatus(mensagem, tipo = "") {
    const el = document.getElementById("collectionStatus");

    el.textContent = mensagem || "";
    el.className = "status" + (tipo ? ` ${tipo}` : "");
}

function mostrarCameraStatus(mensagem) {
    const el = document.getElementById("cameraMessage");

    if (el) {
        el.textContent = mensagem;
    }
}

async function carregarConfiguracao() {
    try {
        mostrarLoginStatus("Carregando configuração...");

        const resposta = await fetch(
            API + "?acao=config&ts=" + Date.now(),
            { cache: "no-store" }
        );

        if (!resposta.ok) {
            throw new Error("Erro HTTP " + resposta.status);
        }

        const dados = await resposta.json();

        configuracao = dados || {};

        const select = document.getElementById("usuario");
        const campoInventario = document.getElementById("inventario");
        const campoEndereco = document.getElementById("endereco");

        select.innerHTML = "";

        const usuarios = Array.isArray(dados.Usuarios)
            ? dados.Usuarios
            : [];

        if (usuarios.length === 0) {
            const option = document.createElement("option");

            option.value = "";
            option.textContent = "Nenhum usuário disponível";

            select.appendChild(option);

            campoInventario.value = "";
            campoEndereco.value = "";

            document.getElementById("btnEntrar").disabled = true;

            mostrarLoginStatus(
                "Nenhum usuário ativo foi encontrado.",
                "error"
            );

            return;
        }

        usuarios.forEach(usuario => {
            const option = document.createElement("option");

            option.value = usuario.id;
            option.textContent = usuario.nome;

            select.appendChild(option);
        });

        atualizarConfiguracaoUsuario(usuarios[0].id);

        document.getElementById("btnEntrar").disabled = false;

        mostrarLoginStatus("");
    } catch (erro) {
        console.error("Erro ao carregar configuração:", erro);

        mostrarLoginStatus(
            "Não foi possível carregar a configuração.",
            "error"
        );

        document.getElementById("btnEntrar").disabled = true;
    }
}

function atualizarConfiguracaoUsuario(usuarioId) {
    const campoInventario = document.getElementById("inventario");
    const campoEndereco = document.getElementById("endereco");

    let configUsuario = null;

    if (Array.isArray(configuracao.Configuracoes)) {
        configUsuario = configuracao.Configuracoes.find(config =>
            String(config.usuario).trim() ===
            String(usuarioId).trim()
        );
    }

    if (!configUsuario && configuracao.Inventario !== undefined) {
        campoInventario.value = configuracao.Inventario || "";
        campoEndereco.value = configuracao.EnderecoAtual || "";
        return;
    }

    campoInventario.value = configUsuario?.inventario || "";
    campoEndereco.value = configUsuario?.enderecoAtual || "";
}

async function iniciarColeta() {
    const btn = document.getElementById("btnEntrar");
    const usuario = document.getElementById("usuario");
    const inventario = document.getElementById("inventario");
    const endereco = document.getElementById("endereco");

    await prepararAudio();

    const usuarioSelecionado =
        usuario.options[usuario.selectedIndex];

    sessao.usuario = String(usuario.value || "").trim();

    sessao.nomeUsuario = usuarioSelecionado
        ? usuarioSelecionado.textContent.trim()
        : "";

    sessao.inventario =
        String(inventario.value || "").trim();

    sessao.endereco =
        String(endereco.value || "")
            .trim()
            .toUpperCase();

    if (!sessao.usuario) {
        mostrarLoginStatus("Selecione um usuário.", "error");
        return;
    }

    if (!sessao.inventario) {
        mostrarLoginStatus("Informe o inventário.", "error");
        inventario.focus();
        return;
    }

    if (!sessao.endereco) {
        mostrarLoginStatus("Informe o endereço.", "error");
        endereco.focus();
        return;
    }

    btn.disabled = true;

    sessao.totalEndereco = 0;
    sessao.totalColeta = 0;

    document.getElementById("lblUsuario").textContent =
        sessao.nomeUsuario;

    document.getElementById("lblInventario").textContent =
        sessao.inventario;

    document.getElementById("lblEndereco").textContent =
        sessao.endereco;

    document.getElementById("contadorEndereco").textContent = "0";
    document.getElementById("contadorTotal").textContent = "0";
    document.getElementById("ultimaLeitura").textContent = "-";

    mostrarCollectionStatus("");
    mostrarTelaColeta();

    await iniciarCamera();
}

async function iniciarCamera() {
    if (cameraAtiva) return;

    const video = document.getElementById("camera");

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

    mostrarCameraStatus("Abrindo câmera...");

    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");

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

        video.srcObject = cameraStream;

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

        try {
            await video.play();
        } catch (erroPlay) {
            console.warn("video.play():", erroPlay);
        }

        cameraAtiva = true;

        mostrarCameraStatus(
            "Aponte a câmera para o código de barras"
        );

        iniciarLeitorZXing(video);
    } catch (erro) {
        console.error("Erro ao abrir câmera:", erro);

        cameraAtiva = false;

        if (erro.name === "NotAllowedError") {
            mostrarCameraStatus(
                "Acesso à câmera bloqueado. Permita a câmera no navegador."
            );
        } else if (erro.name === "NotFoundError") {
            mostrarCameraStatus(
                "Câmera traseira não encontrada."
            );
        } else {
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

function iniciarLeitorZXing(video) {
    if (!window.ZXingBrowser) {
        console.error("ZXing não carregado.");

        mostrarCameraStatus(
            "Leitor de câmera não carregado. Use a digitação manual."
        );

        return;
    }

    try {
        codeReader =
            new ZXingBrowser.BrowserMultiFormatReader();

        codeReader
            .decodeFromVideoElement(
                video,
                (resultado, erro) => {
                    if (resultado) {
                        const codigo =
                            resultado.getText
                                ? resultado.getText()
                                : String(
                                    resultado.text || ""
                                );

                        if (codigo) {
                            receberCodigoDaCamera(codigo);
                        }
                    }
                }
            )
            .then(controls => {
                scannerControls = controls;
            })
            .catch(erro => {
                console.error("Erro no ZXing:", erro);

                mostrarCameraStatus(
                    "Leitor não iniciou. Use a digitação manual."
                );
            });
    } catch (erro) {
        console.error(
            "Erro criando leitor ZXing:",
            erro
        );

        mostrarCameraStatus(
            "Leitor não disponível. Use a digitação manual."
        );
    }
}

function receberCodigoDaCamera(codigo) {
    const agora = Date.now();

    const valor = normalizarCodigo(codigo);

    if (!valor) return;

    if (
        valor === ultimoCodigoLido &&
        agora - ultimoCodigoTempo < 900
    ) {
        return;
    }

    ultimoCodigoLido = valor;
    ultimoCodigoTempo = agora;

    document.getElementById("codigo").value = valor;

    processarCodigo(valor);
}

function processarCodigoDigitado() {
    const input = document.getElementById("codigo");

    const codigo = normalizarCodigo(input.value);

    if (!codigo) return;

    processarCodigo(codigo);
}

async function processarCodigo(codigoRecebido) {
    if (processandoCodigo) return;

    const codigo = normalizarCodigo(codigoRecebido);

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

    const input = document.getElementById("codigo");
    const ultima = document.getElementById("ultimaLeitura");

    input.value = "";

    if (/^[A-Za-z]/.test(codigo)) {
        await processarNovoEndereco(codigo);

        emitirBip();

        processandoCodigo = false;
        focarCampoCodigo();

        return;
    }

    if (!/^\d/.test(codigo)) {
        ultima.textContent =
            codigo + " - INVÁLIDO";

        mostrarCollectionStatus(
            "Código inválido. Endereço começa com letra e produto com número.",
            "error"
        );

        processandoCodigo = false;
        focarCampoCodigo();

        return;
    }

    await registrarProduto(codigo);

    processandoCodigo = false;
    focarCampoCodigo();
}

function normalizarCodigo(valor) {
    return String(valor || "")
        .replace(/[\r\n\t]/g, "")
        .trim()
        .toUpperCase();
}

async function processarNovoEndereco(novoEndereco) {
    novoEndereco = normalizarCodigo(novoEndereco);

    sessao.endereco = novoEndereco;
    sessao.totalEndereco = 0;

    document.getElementById("lblEndereco").textContent =
        novoEndereco;

    document.getElementById("contadorEndereco").textContent =
        "0";

    document.getElementById("ultimaLeitura").textContent =
        novoEndereco;

    mostrarCollectionStatus(
        "Endereço alterado.",
        "success"
    );

    try {
        await fetch(API, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type":
                    "text/plain;charset=utf-8"
            },
            body: JSON.stringify({
                acao: "novoEndereco",
                usuario: sessao.usuario,
                inventario: sessao.inventario,
                endereco: novoEndereco
            })
        });

        if (Array.isArray(configuracao.Configuracoes)) {
            const configUsuario =
                configuracao.Configuracoes.find(config =>
                    String(config.usuario).trim() ===
                    String(sessao.usuario).trim()
                );

            if (configUsuario) {
                configUsuario.inventario =
                    sessao.inventario;

                configUsuario.enderecoAtual =
                    novoEndereco;
            }
        }
    } catch (erro) {
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

async function registrarProduto(codigo) {
    const ultima =
        document.getElementById("ultimaLeitura");

    /*
     * 1. VERIFICA SE JÁ FOI COLETADO
     */

    try {
        const resposta = await fetch(
            API +
            "?acao=verificar" +
            "&inventario=" +
            encodeURIComponent(sessao.inventario) +
            "&endereco=" +
            encodeURIComponent(sessao.endereco) +
            "&codigo=" +
            encodeURIComponent(codigo),
            {
                cache: "no-store"
            }
        );

        if (!resposta.ok) {
            throw new Error(
                "HTTP " + resposta.status
            );
        }

        const verifica =
            await resposta.json();

        if (verifica.existe) {
            ultima.textContent =
                codigo + " - JÁ COLETADO";

            mostrarCollectionStatus(
                "PRODUTO JÁ COLETADO NESTE ENDEREÇO.",
                "error"
            );

            return;
        }
    } catch (erro) {
        console.error(
            "Erro ao verificar duplicidade:",
            erro
        );

        ultima.textContent =
            codigo + " - ERRO NA VERIFICAÇÃO";

        mostrarCollectionStatus(
            "Erro ao verificar a coleta. Nada foi registrado.",
            "error"
        );

        return;
    }

    /*
     * 2. GRAVA NA SHEET
     */

    try {
        await fetch(API, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type":
                    "text/plain;charset=utf-8"
            },
            body: JSON.stringify({
                usuario: sessao.usuario,
                nomeUsuario: sessao.nomeUsuario,
                inventario: sessao.inventario,
                endereco: sessao.endereco,
                codigo: codigo,
                tipoLeitura: "PRODUTO"
            })
        });

        /*
         * 3. BIP SOMENTE PARA NOVA COLETA
         */

        emitirBip();

        /*
         * 4. CONTADORES
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

        ultima.textContent = codigo;

        mostrarCollectionStatus(
            "Coleta registrada.",
            "success"
        );
    } catch (erro) {
        console.error(
            "Erro ao gravar coleta:",
            erro
        );

        ultima.textContent =
            codigo + " - ERRO";

        mostrarCollectionStatus(
            "Não foi possível enviar a coleta. Tente novamente.",
            "error"
        );
    }
}

function focarCampoCodigo() {
    const input = document.getElementById("codigo");

    if (!input) return;

    input.value = "";
}

function pararCamera() {
    try {
        if (
            scannerControls &&
            typeof scannerControls.stop === "function"
        ) {
            scannerControls.stop();
        }
    } catch (erro) {
        console.warn(
            "Erro parando ZXing:",
            erro
        );
    }

    scannerControls = null;

    try {
        if (
            codeReader &&
            typeof codeReader.reset === "function"
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

    if (cameraStream) {
        cameraStream
            .getTracks()
            .forEach(track => {
                try {
                    track.stop();
                } catch (erro) {
                    console.warn(
                        "Erro parando track:",
                        erro
                    );
                }
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
