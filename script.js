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
    const codigo = document.getElementById("codigo");
    const usuario = document.getElementById("usuario");

    btnEntrar?.addEventListener("click", iniciarColeta);
    btnRegistrar?.addEventListener("click", processarCodigoDigitado);

    codigo?.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            processarCodigoDigitado();
        }
    });

    usuario?.addEventListener("change", () => {
        atualizarConfiguracaoUsuario(usuario.value);
    });

    carregarConfiguracao();
});


/* =========================
   ÁUDIO
========================= */

async function prepararAudio() {
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;

        if (!audioContext) audioContext = new AC();

        if (audioContext.state === "suspended") {
            await audioContext.resume();
        }

        const t = audioContext.currentTime;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, t);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.start(t);
        osc.stop(t + 0.06);

        return audioContext.state === "running";
    } catch (e) {
        console.warn("Erro no áudio:", e);
        return false;
    }
}

function emitirBip() {
    try {
        if (!audioContext) return;

        if (audioContext.state !== "running") {
            audioContext.resume();
            return;
        }

        const t = audioContext.currentTime;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(1800, t);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.30, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.start(t);
        osc.stop(t + 0.15);
    } catch (e) {
        console.warn("Erro no bip:", e);
    }
}


/* =========================
   TELAS / STATUS
========================= */

function mostrarTelaLogin() {
    document.getElementById("login")?.classList.remove("hidden");
    document.getElementById("coleta")?.classList.add("hidden");

    pararCamera();

    sessao.usuario = null;
    sessao.nomeUsuario = "";
    sessao.inventario = "";
    sessao.endereco = "";
    sessao.totalEndereco = 0;
    sessao.totalColeta = 0;
}

function mostrarTelaColeta() {
    document.getElementById("login")?.classList.add("hidden");
    document.getElementById("coleta")?.classList.remove("hidden");
}

function mostrarLoginStatus(msg, tipo = "") {
    const el = document.getElementById("loginStatus");
    if (!el) return;

    el.textContent = msg || "";
    el.className = "status" + (tipo ? ` ${tipo}` : "");
}

function mostrarCollectionStatus(msg, tipo = "") {
    const el = document.getElementById("collectionStatus");
    if (!el) return;

    el.textContent = msg || "";
    el.className = "status" + (tipo ? ` ${tipo}` : "");
}

function mostrarCameraStatus(msg) {
    const el = document.getElementById("cameraMessage");
    if (el) el.textContent = msg;
}


/* =========================
   CONFIGURAÇÃO
========================= */

async function carregarConfiguracao() {
    try {
        mostrarLoginStatus("Carregando configuração...");

        const resposta = await fetch(
            API + "?acao=config&ts=" + Date.now(),
            { cache: "no-store" }
        );

        if (!resposta.ok) {
            throw new Error("HTTP " + resposta.status);
        }

        configuracao = await resposta.json();

        const select = document.getElementById("usuario");
        const inventario = document.getElementById("inventario");
        const endereco = document.getElementById("endereco");

        select.innerHTML = "";

        const usuarios = Array.isArray(configuracao.Usuarios)
            ? configuracao.Usuarios
            : [];

        if (!usuarios.length) {
            const op = document.createElement("option");
            op.value = "";
            op.textContent = "Nenhum usuário disponível";
            select.appendChild(op);

            inventario.value = "";
            endereco.value = "";

            document.getElementById("btnEntrar").disabled = true;

            mostrarLoginStatus(
                "Nenhum usuário ativo foi encontrado.",
                "error"
            );

            return;
        }

        usuarios.forEach(u => {
            const op = document.createElement("option");
            op.value = u.id;
            op.textContent = u.nome;
            select.appendChild(op);
        });

        atualizarConfiguracaoUsuario(usuarios[0].id);

        document.getElementById("btnEntrar").disabled = false;
        mostrarLoginStatus("");

    } catch (e) {
        console.error("Erro configuração:", e);

        mostrarLoginStatus(
            "Não foi possível carregar a configuração.",
            "error"
        );

        document.getElementById("btnEntrar").disabled = true;
    }
}

function atualizarConfiguracaoUsuario(id) {
    const inventario = document.getElementById("inventario");
    const endereco = document.getElementById("endereco");

    let config = null;

    if (Array.isArray(configuracao.Configuracoes)) {
        config = configuracao.Configuracoes.find(x =>
            String(x.usuario).trim() === String(id).trim()
        );
    }

    if (!config && configuracao.Inventario !== undefined) {
        inventario.value = configuracao.Inventario || "";
        endereco.value = configuracao.EnderecoAtual || "";
        return;
    }

    inventario.value = config?.inventario || "";
    endereco.value = config?.enderecoAtual || "";
}


/* =========================
   INICIAR COLETA
========================= */

async function iniciarColeta() {
    const btn = document.getElementById("btnEntrar");
    const usuario = document.getElementById("usuario");
    const inventario = document.getElementById("inventario");
    const endereco = document.getElementById("endereco");

    await prepararAudio();

    const op = usuario.options[usuario.selectedIndex];

    sessao.usuario = String(usuario.value || "").trim();
    sessao.nomeUsuario = op ? op.textContent.trim() : "";
    sessao.inventario = String(inventario.value || "").trim();
    sessao.endereco = String(endereco.value || "").trim().toUpperCase();

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


/* =========================
   CÂMERA
========================= */

async function iniciarCamera() {
    if (cameraAtiva) return;

    const video = document.getElementById("camera");
    if (!video) return;

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {
        mostrarCameraStatus("Câmera não disponível neste navegador.");
        return;
    }

    mostrarCameraStatus("Abrindo câmera...");

    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });

        video.srcObject = cameraStream;

        await new Promise(resolve => {
            if (video.readyState >= 2 && video.videoWidth > 0) {
                resolve();
                return;
            }

            const done = () => {
                video.removeEventListener("loadedmetadata", done);
                resolve();
            };

            video.addEventListener("loadedmetadata", done);
        });

        await video.play().catch(() => {});

        cameraAtiva = true;

        mostrarCameraStatus(
            "Aponte a câmera para o código de barras"
        );

        iniciarLeitorZXing(video);

    } catch (e) {
        console.error("Erro câmera:", e);

        cameraAtiva = false;

        if (e.name === "NotAllowedError") {
            mostrarCameraStatus(
                "Acesso à câmera bloqueado. Permita a câmera no navegador."
            );
        } else if (e.name === "NotFoundError") {
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
        mostrarCameraStatus(
            "Leitor de câmera não carregado. Use a digitação manual."
        );
        return;
    }

    try {
        codeReader =
            new ZXingBrowser.BrowserMultiFormatReader();

        codeReader.decodeFromVideoElement(
            video,
            resultado => {
                if (!resultado) return;

                const codigo =
                    resultado.getText
                        ? resultado.getText()
                        : String(resultado.text || "");

                if (codigo) receberCodigoDaCamera(codigo);
            }
        )
        .then(controls => {
            scannerControls = controls;
        })
        .catch(e => {
            console.error("Erro ZXing:", e);
            mostrarCameraStatus(
                "Leitor não iniciou. Use a digitação manual."
            );
        });

    } catch (e) {
        console.error("Erro criando ZXing:", e);

        mostrarCameraStatus(
            "Leitor não disponível. Use a digitação manual."
        );
    }
}


/* =========================
   LEITURA
========================= */

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

    if (codigo) processarCodigo(codigo);
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

    document.getElementById("codigo").value = "";

    try {
        if (/^[A-Za-z]/.test(codigo)) {
            await processarNovoEndereco(codigo);
            emitirBip();
            return;
        }

        if (!/^\d/.test(codigo)) {
            document.getElementById("ultimaLeitura").textContent =
                codigo + " - INVÁLIDO";

            mostrarCollectionStatus(
                "Código inválido. Endereço começa com letra e produto com número.",
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

function normalizarCodigo(valor) {
    return String(valor || "")
        .replace(/[\r\n\t]/g, "")
        .trim()
        .toUpperCase();
}


/* =========================
   NOVO ENDEREÇO
========================= */

async function processarNovoEndereco(endereco) {
    endereco = normalizarCodigo(endereco);

    sessao.endereco = endereco;
    sessao.totalEndereco = 0;

    document.getElementById("lblEndereco").textContent = endereco;
    document.getElementById("contadorEndereco").textContent = "0";
    document.getElementById("ultimaLeitura").textContent = endereco;

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
                endereco
            })
        });

        if (Array.isArray(configuracao.Configuracoes)) {
            const config =
                configuracao.Configuracoes.find(x =>
                    String(x.usuario).trim() ===
                    String(sessao.usuario).trim()
                );

            if (config) {
                config.inventario = sessao.inventario;
                config.enderecoAtual = endereco;
            }
        }

    } catch (e) {
        console.error("Erro endereço:", e);

        mostrarCollectionStatus(
            "Endereço alterado na tela, mas não foi possível atualizar a configuração.",
            "error"
        );
    }
}


/* =========================
   REGISTRO + DUPLICIDADE
========================= */

async function registrarProduto(codigo) {
    const ultima =
        document.getElementById("ultimaLeitura");

    /*
     * PRIMEIRO:
     * verifica se já existe.
     */

    let verificacao;

    try {
        const url =
            API +
            "?acao=verificar" +
            "&inventario=" +
            encodeURIComponent(sessao.inventario) +
            "&endereco=" +
            encodeURIComponent(sessao.endereco) +
            "&codigo=" +
            encodeURIComponent(codigo) +
            "&ts=" +
            Date.now();

        const resposta = await fetch(url, {
            method: "GET",
            cache: "no-store"
        });

        if (!resposta.ok) {
            throw new Error(
                "Erro HTTP " + resposta.status
            );
        }

        const texto = await resposta.text();

        if (!texto) {
            throw new Error(
                "Resposta vazia na verificação."
            );
        }

        try {
            verificacao = JSON.parse(texto);
        } catch (e) {
            console.error(
                "Resposta da verificação:",
                texto
            );

            throw new Error(
                "Resposta inválida do servidor."
            );
        }

    } catch (e) {
        console.error(
            "Erro verificando duplicidade:",
            e
        );

        ultima.textContent =
            codigo + " - ERRO";

        mostrarCollectionStatus(
            "Não foi possível verificar se o código já foi coletado.",
            "error"
        );

        return;
    }

    /*
     * ACEITA:
     * existe: true
     * exists: true
     */

    const repetido =
        verificacao?.existe === true ||
        verificacao?.exists === true ||
        String(verificacao?.existe).toLowerCase() === "true" ||
        String(verificacao?.exists).toLowerCase() === "true";

    if (repetido) {
        ultima.textContent =
            codigo + " - JÁ COLETADO";

        mostrarCollectionStatus(
            "PRODUTO JÁ COLETADO NESTE ENDEREÇO.",
            "error"
        );

        return;
    }

    /*
     * NÃO REPETIDO:
     * grava na Sheet.
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
                codigo,
                tipoLeitura: "PRODUTO"
            })
        });

        /*
         * Como a chamada POST usa no-cors,
         * não conseguimos ler a resposta.
         *
         * O Apps Script recebe o registro.
         */

        sessao.totalEndereco++;
        sessao.totalColeta++;

        document.getElementById("contadorEndereco").textContent =
            sessao.totalEndereco;

        document.getElementById("contadorTotal").textContent =
            sessao.totalColeta;

        ultima.textContent = codigo;

        mostrarCollectionStatus(
            "Coleta registrada.",
            "success"
        );

        emitirBip();

    } catch (e) {
        console.error(
            "Erro gravando coleta:",
            e
        );

        ultima.textContent =
            codigo + " - ERRO";

        mostrarCollectionStatus(
            "Não foi possível registrar a coleta.",
            "error"
        );
    }
}


/* =========================
   AUXILIARES
========================= */

function focarCampoCodigo() {
    const input = document.getElementById("codigo");
    if (input) input.value = "";
}

function pararCamera() {
    try {
        if (
            scannerControls &&
            typeof scannerControls.stop === "function"
        ) {
            scannerControls.stop();
        }
    } catch (e) {}

    scannerControls = null;

    try {
        if (
            codeReader &&
            typeof codeReader.reset === "function"
        ) {
            codeReader.reset();
        }
    } catch (e) {}

    codeReader = null;

    if (cameraStream) {
        cameraStream.getTracks().forEach(track => {
            try {
                track.stop();
            } catch (e) {}
        });
    }

    cameraStream = null;
    cameraAtiva = false;

    const video = document.getElementById("camera");

    if (video) {
        video.pause();
        video.srcObject = null;
    }
}

window.addEventListener("pagehide", pararCamera);
window.addEventListener("beforeunload", pararCamera);
