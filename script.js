/* =========================================================
   COLETOR THOR - SCRIPT COMPLETO
   ========================================================= */

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

    mostrarTelaLogin();

    document
        .getElementById("btnEntrar")
        .addEventListener("click", iniciarColeta);

    document
        .getElementById("btnRegistrar")
        .addEventListener("click", processarCodigoDigitado);

    document
        .getElementById("codigo")
        .addEventListener("keydown", e => {
            if (e.key === "Enter") {
                e.preventDefault();
                processarCodigoDigitado();
            }
        });

    document
        .getElementById("usuario")
        .addEventListener("change", e => {
            atualizarConfiguracaoUsuario(e.target.value);
        });

    carregarConfiguracao();
});


/* =========================================================
   ÁUDIO
   ========================================================= */

async function prepararAudio() {

    try {

        const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContextClass) return false;

        if (!audioContext) {
            audioContext = new AudioContextClass();
        }

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
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContextClass) return;

        if (!audioContext) {
            audioContext = new AudioContextClass();
        }

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        if (audioContext.state !== "running") return;

        const agora = audioContext.currentTime;

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

        console.warn("Erro no bip:", erro);
    }
}


/* =========================================================
   TELAS
   ========================================================= */

function mostrarTelaLogin() {

    document
        .getElementById("login")
        .classList.remove("hidden");

    document
        .getElementById("coleta")
        .classList.add("hidden");

    pararCamera();
}


function mostrarTelaColeta() {

    document
        .getElementById("login")
        .classList.add("hidden");

    document
        .getElementById("coleta")
        .classList.remove("hidden");
}


/* =========================================================
   STATUS
   ========================================================= */

function mostrarLoginStatus(msg, tipo = "") {

    const el =
        document.getElementById("loginStatus");

    if (!el) return;

    el.textContent = msg || "";
    el.className =
        "status" + (tipo ? " " + tipo : "");
}


function mostrarCollectionStatus(msg, tipo = "") {

    const el =
        document.getElementById("collectionStatus");

    if (!el) return;

    el.textContent = msg || "";
    el.className =
        "status" + (tipo ? " " + tipo : "");
}


function mostrarCameraStatus(msg) {

    const el =
        document.getElementById("cameraMessage");

    if (el) {
        el.textContent = msg;
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

        const dados =
            await resposta.json();

        configuracao = dados || {};

        const select =
            document.getElementById("usuario");

        select.innerHTML = "";

        const usuarios =
            Array.isArray(dados.Usuarios)
                ? dados.Usuarios
                : [];

        if (!usuarios.length) {

            const option =
                document.createElement("option");

            option.value = "";
            option.textContent =
                "Nenhum usuário disponível";

            select.appendChild(option);

            document
                .getElementById("btnEntrar")
                .disabled = true;

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

        document
            .getElementById("btnEntrar")
            .disabled = false;

        mostrarLoginStatus("");

    } catch (erro) {

        console.error(
            "Erro ao carregar configuração:",
            erro
        );

        mostrarLoginStatus(
            "Não foi possível carregar a configuração.",
            "error"
        );

        document
            .getElementById("btnEntrar")
            .disabled = true;
    }
}


function atualizarConfiguracaoUsuario(usuarioId) {

    const campoInventario =
        document.getElementById("inventario");

    const campoEndereco =
        document.getElementById("endereco");

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

    campoInventario.value =
        configUsuario?.inventario || "";

    campoEndereco.value =
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
        String(usuario.value || "").trim();

    sessao.nomeUsuario =
        opcao
            ? opcao.textContent.trim()
            : "";

    sessao.inventario =
        String(inventario.value || "").trim();

    sessao.endereco =
        String(endereco.value || "")
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
    ).textContent = sessao.nomeUsuario;

    document.getElementById(
        "lblInventario"
    ).textContent = sessao.inventario;

    document.getElementById(
        "lblEndereco"
    ).textContent = sessao.endereco;

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
   CÂMERA
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

        mostrarCameraStatus(
            "Aponte a câmera para o código de barras"
        );

        iniciarLeitorZXing(video);

    } catch (erro) {

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

        } else {

            mostrarCameraStatus(
                "Não foi possível abrir a câmera."
            );
        }

        mostrarCollectionStatus(
            "Use o campo abaixo para digitar o código.",
            "error"
        );
    }
}


/* =========================================================
   ZXING
   ========================================================= */

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
                (resultado, erro) => {

                    if (!resultado) return;

                    const codigo =
                        resultado.getText
                            ? resultado.getText()
                            : String(
                                resultado.text || ""
                            );

                    if (codigo) {
                        receberCodigoDaCamera(
                            codigo
                        );
                    }
                }
            )
            .then(controles => {

                scannerControls =
                    controles;
            })
            .catch(erro => {

                console.error(
                    "Erro no ZXing:",
                    erro
                );

                mostrarCameraStatus(
                    "Leitor não iniciou. Use a digitação manual."
                );
            });

    } catch (erro) {

        console.error(
            "Erro criando leitor:",
            erro
        );
    }
}


/* =========================================================
   CÓDIGO DA CÂMERA
   ========================================================= */

function receberCodigoDaCamera(codigo) {

    const agora = Date.now();

    const valor =
        normalizarCodigo(codigo);

    if (!valor) return;

    /*
       O mesmo código aparece em vários frames.
       Bloqueia apenas a repetição imediata.
    */

    if (
        valor === ultimoCodigoLido &&
        agora - ultimoCodigoTempo < 1000
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


/* =========================================================
   DIGITAÇÃO MANUAL
   ========================================================= */

function processarCodigoDigitado() {

    const input =
        document.getElementById("codigo");

    const codigo =
        normalizarCodigo(input.value);

    if (!codigo) return;

    processarCodigo(codigo);
}


/* =========================================================
   NORMALIZAR
   ========================================================= */

function normalizarCodigo(valor) {

    return String(valor || "")
        .replace(/[\r\n\t]/g, "")
        .trim()
        .toUpperCase();
}


/* =========================================================
   PROCESSAR CÓDIGO
   ========================================================= */

async function processarCodigo(codigoRecebido) {

    if (processandoCodigo) return;

    const codigo =
        normalizarCodigo(codigoRecebido);

    if (!codigo) return;

    if (
        !sessao.usuario ||
        !sessao.inventario ||
        !sessao.endereco
    ) {

        mostrarCollectionStatus(
            "Sessão inválida. Inicie a coleta novamente.",
            "error"
        );

        return;
    }

    processandoCodigo = true;

    document.getElementById(
        "codigo"
    ).value = "";

    /*
       REGRA:
       LETRA = ENDEREÇO
       NÚMERO = PRODUTO
    */

    if (/^[A-Za-z]/.test(codigo)) {

        await processarNovoEndereco(codigo);

        emitirBip();

        processandoCodigo = false;

        return;
    }

    if (!/^\d/.test(codigo)) {

        document.getElementById(
            "ultimaLeitura"
        ).textContent =
            codigo + " - INVÁLIDO";

        mostrarCollectionStatus(
            "Código inválido.",
            "error"
        );

        processandoCodigo = false;

        return;
    }

    await registrarProduto(codigo);

    processandoCodigo = false;
}


/* =========================================================
   VERIFICAR DUPLICIDADE
   ========================================================= */

async function verificarDuplicidade(codigo) {

    const url =
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
        Date.now();

    const resposta =
        await fetch(
            url,
            {
                method: "GET",
                cache: "no-store"
            }
        );

    if (!resposta.ok) {
        throw new Error(
            "Erro ao verificar código."
        );
    }

    return await resposta.json();
}


/* =========================================================
   REGISTRAR PRODUTO
   ========================================================= */

async function registrarProduto(codigo) {

    const ultima =
        document.getElementById(
            "ultimaLeitura"
        );

    try {

        /*
           ====================================================
           1 - VERIFICA ANTES DE GRAVAR
           ====================================================
        */

        const verificacao =
            await verificarDuplicidade(
                codigo
            );

        if (
            verificacao &&
            verificacao.existe === true
        ) {

            ultima.textContent =
                codigo;

            mostrarCollectionStatus(
                "PRODUTO JÁ COLETADO NESTE ENDEREÇO.",
                "error"
            );

            /*
               Não aumenta contador.
               Não grava novamente.
            */

            return;
        }


        /*
           ====================================================
           2 - ENVIA PARA O APPS SCRIPT
           ====================================================
        */

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
           ====================================================
           3 - CONFIRMA NA SHEET
           ====================================================
        */

        let confirmado = false;

        /*
           Dá pequenas tentativas porque o Apps Script
           pode levar alguns milissegundos para gravar.
        */

        for (
            let tentativa = 0;
            tentativa < 4;
            tentativa++
        ) {

            await esperar(500);

            const confirmacao =
                await verificarDuplicidade(
                    codigo
                );

            if (
                confirmacao &&
                confirmacao.existe === true
            ) {

                confirmado = true;
                break;
            }
        }


        /*
           ====================================================
           4 - SÓ AGORA CONSIDERA REGISTRADO
           ====================================================
        */

        if (!confirmado) {

            ultima.textContent =
                codigo + " - NÃO CONFIRMADO";

            mostrarCollectionStatus(
                "A coleta não foi confirmada na planilha. Tente novamente.",
                "error"
            );

            return;
        }


        /*
           ====================================================
           5 - BIP
           ====================================================
        */

        emitirBip();


        /*
           ====================================================
           6 - CONTADORES
           ====================================================
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
           ====================================================
           7 - ÚLTIMA LEITURA
           ====================================================
        */

        ultima.textContent =
            codigo;

        mostrarCollectionStatus(
            "Coleta registrada.",
            "success"
        );

    } catch (erro) {

        console.error(
            "Erro ao registrar coleta:",
            erro
        );

        ultima.textContent =
            codigo + " - ERRO";

        mostrarCollectionStatus(
            "Erro ao registrar. Tente novamente.",
            "error"
        );
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

    sessao.endereco =
        novoEndereco;

    sessao.totalEndereco = 0;

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
            "Erro ao atualizar endereço:",
            erro
        );
    }
}


/* =========================================================
   ESPERA
   ========================================================= */

function esperar(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
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
                } catch (erro) {
                    console.warn(erro);
                }
            });
    }

    cameraStream = null;
    cameraAtiva = false;

    const video =
        document.getElementById(
            "camera"
        );

    if (video) {

        video.pause();
        video.srcObject = null;
    }
}


/* =========================================================
   SEGURANÇA
   ========================================================= */

window.addEventListener(
    "pagehide",
    pararCamera
);

window.addEventListener(
    "beforeunload",
    pararCamera
);
