window.onload = carregarConfiguracao;

let configuracao = {};

let sessao = {
    usuario: "",
    nomeUsuario: "",
    inventario: "",
    endereco: "",
    totalEndereco: 0,
    totalColeta: 0
};

const codigosProcessados = new Set();

let cameraStream = null;
let cameraAtiva = false;
let ultimoCodigoCamera = "";
let ultimoTempoCamera = 0;


// ==================================================
// CONFIGURAÇÃO
// ==================================================

async function carregarConfiguracao() {

    try {

        const resposta = await fetch(
            API + "?acao=config&t=" + Date.now()
        );

        const dados = await resposta.json();

        configuracao = dados;

        carregarUsuarios();

    } catch (erro) {

        console.error(erro);

        alert(
            "Erro ao carregar a configuração."
        );

    }
}


// ==================================================
// USUÁRIOS
// ==================================================

function carregarUsuarios() {

    const select =
        document.getElementById("usuario");

    select.innerHTML = "";

    if (
        !configuracao.Usuarios ||
        configuracao.Usuarios.length === 0
    ) {

        select.innerHTML =
            "<option>Nenhum usuário</option>";

        return;
    }

    configuracao.Usuarios.forEach(usuario => {

        const option =
            document.createElement("option");

        option.value = usuario.id;

        option.textContent = usuario.nome;

        option.dataset.nome =
            usuario.nome;

        select.appendChild(option);

    });
}


// ==================================================
// INICIAR COLETA
// ==================================================

document
    .getElementById("btnEntrar")
    .addEventListener(
        "click",
        iniciarColeta
    );


function iniciarColeta() {

    const select =
        document.getElementById("usuario");

    const inventario =
        document
            .getElementById("inventario")
            .value
            .trim();

    const endereco =
        document
            .getElementById("endereco")
            .value
            .trim()
            .toUpperCase();


    if (!select.value) {

        alert("Selecione o usuário.");

        return;
    }


    if (!inventario) {

        alert("Informe o inventário.");

        return;
    }


    if (!endereco) {

        alert("Informe o endereço.");

        return;
    }


    const opcao =
        select.options[
            select.selectedIndex
        ];


    sessao.usuario =
        select.value;

    sessao.nomeUsuario =
        opcao.dataset.nome ||
        opcao.textContent;

    sessao.inventario =
        inventario;

    sessao.endereco =
        endereco;

    sessao.totalEndereco = 0;

    sessao.totalColeta = 0;

    codigosProcessados.clear();


    atualizarTela();


    document
        .getElementById("login")
        .style.display = "none";

    document
        .getElementById("coleta")
        .style.display = "flex";


    atualizarEndereco();


    setTimeout(() => {

        document
            .getElementById("codigo")
            .focus();

    }, 200);


    iniciarCamera();

}


// ==================================================
// ATUALIZAR TELA
// ==================================================

function atualizarTela() {

    document
        .getElementById("lblUsuario")
        .textContent =
        sessao.nomeUsuario;

    document
        .getElementById("lblInventario")
        .textContent =
        sessao.inventario;

    document
        .getElementById("lblEndereco")
        .textContent =
        sessao.endereco;

    document
        .getElementById("contadorEndereco")
        .textContent =
        sessao.totalEndereco;

    document
        .getElementById("contadorTotal")
        .textContent =
        sessao.totalColeta;

}


// ==================================================
// IDENTIFICAR CÓDIGO
// ==================================================

function identificarTipoCodigo(codigo) {

    codigo =
        String(codigo || "").trim();


    if (!codigo) {
        return "";
    }


    // LETRA = ENDEREÇO

    if (/^[A-Za-z]/.test(codigo)) {

        return "ENDERECO";
    }


    // NÚMERO = PRODUTO

    if (/^[0-9]/.test(codigo)) {

        return "PRODUTO";
    }


    return "";
}


// ==================================================
// PROCESSAR LEITURA
// ==================================================

function processarLeitura(codigo) {

    codigo =
        String(codigo || "")
            .trim();


    if (!codigo) {
        return;
    }


    const tipo =
        identificarTipoCodigo(codigo);


    if (tipo === "ENDERECO") {

        processarEndereco(
            codigo.toUpperCase()
        );

        return;
    }


    if (tipo === "PRODUTO") {

        processarProduto(codigo);

        return;
    }

}


// ==================================================
// ENDEREÇO
// ==================================================

function processarEndereco(endereco) {

    endereco =
        endereco
            .trim()
            .toUpperCase();


    if (
        endereco ===
        sessao.endereco
    ) {

        mostrarUltimaLeitura(
            endereco
        );

        return;
    }


    sessao.endereco =
        endereco;

    sessao.totalEndereco = 0;


    document
        .getElementById("lblEndereco")
        .textContent =
        endereco;

    document
        .getElementById("contadorEndereco")
        .textContent =
        "0";

    mostrarUltimaLeitura(
        endereco
    );


    atualizarEndereco();

}


// ==================================================
// PRODUTO
// ==================================================

function processarProduto(codigo) {

    if (
        codigosProcessados.has(codigo)
    ) {

        mostrarDuplicado(codigo);

        return;
    }


    codigosProcessados.add(codigo);


    sessao.totalEndereco++;

    sessao.totalColeta++;


    document
        .getElementById("contadorEndereco")
        .textContent =
        sessao.totalEndereco;

    document
        .getElementById("contadorTotal")
        .textContent =
        sessao.totalColeta;


    mostrarUltimaLeitura(
        codigo
    );


    enviarColeta(codigo);

}


// ==================================================
// ENVIAR COLETA
// ==================================================

async function enviarColeta(codigo) {

    const dados = {

        acao: "coleta",

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

    };


    try {

        const resposta =
            await fetch(API, {

                method: "POST",

                body:
                    JSON.stringify(dados)

            });


        const resultado =
            await resposta.json();


        console.log(
            "COLETA:",
            resultado
        );


        if (
            resultado.duplicado
        ) {

            sessao.totalEndereco--;

            sessao.totalColeta--;

            atualizarTela();

            mostrarDuplicado(codigo);

            return;
        }


        if (
            !resultado.sucesso
        ) {

            sessao.totalEndereco--;

            sessao.totalColeta--;

            codigosProcessados.delete(
                codigo
            );

            atualizarTela();

            console.error(
                resultado
            );

        }

    } catch (erro) {

        console.error(
            "Erro ao registrar:",
            erro
        );

    }

}


// ==================================================
// ATUALIZAR ENDEREÇO
// ==================================================

function atualizarEndereco() {

    const dados = {

        acao: "novoEndereco",

        usuario:
            sessao.usuario,

        inventario:
            sessao.inventario,

        endereco:
            sessao.endereco

    };


    fetch(API, {

        method: "POST",

        body:
            JSON.stringify(dados)

    })
    .catch(erro => {

        console.error(
            "Erro endereço:",
            erro
        );

    });

}


// ==================================================
// CÂMERA
// ==================================================

async function iniciarCamera() {

    const video =
        document.getElementById("camera");

    const mensagem =
        document.getElementById(
            "cameraMensagem"
        );


    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        mensagem.textContent =
            "Câmera não disponível neste navegador.";

        return;
    }


    try {

        cameraStream =
            await navigator.mediaDevices.getUserMedia({

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

                },

                audio: false

            });


        video.srcObject =
            cameraStream;


        await video.play();


        cameraAtiva = true;


        mensagem.textContent =
            "Aponte para o código de barras";


        iniciarLeituraCamera();

    } catch (erro) {

        console.error(
            "Erro câmera:",
            erro
        );


        mensagem.textContent =
            "Não foi possível acessar a câmera.";

    }

}


// ==================================================
// LEITURA CONTÍNUA DA CÂMERA
// ==================================================

async function iniciarLeituraCamera() {

    if (!cameraAtiva) {
        return;
    }


    const video =
        document.getElementById("camera");


    // BarcodeDetector

    if (
        "BarcodeDetector" in window
    ) {

        try {

            const detector =
                new BarcodeDetector({

                    formats: [
                        "code_128",
                        "code_39",
                        "ean_13",
                        "ean_8",
                        "upc_a",
                        "upc_e",
                        "itf",
                        "codabar"
                    ]

                });


            detectarComBarcodeDetector(
                detector,
                video
            );


            return;

        } catch (erro) {

            console.error(
                erro
            );

        }

    }


    document
        .getElementById(
            "cameraMensagem"
        )
        .textContent =
        "Leitura por câmera não suportada neste navegador. Use o leitor ou digite o código.";

}


// ==================================================
// DETECTOR
// ==================================================

async function detectarComBarcodeDetector(
    detector,
    video
) {

    if (!cameraAtiva) {
        return;
    }


    try {

        if (
            video.readyState >= 2
        ) {

            const codigos =
                await detector.detect(
                    video
                );


            if (
                codigos &&
                codigos.length > 0
            ) {

                const codigo =
                    codigos[0].rawValue;


                if (codigo) {

                    processarLeituraCamera(
                        codigo
                    );

                }

            }

        }

    } catch (erro) {

        console.error(
            "Erro detector:",
            erro
        );

    }


    requestAnimationFrame(
        () =>
            detectarComBarcodeDetector(
                detector,
                video
            )
    );

}


// ==================================================
// EVITAR VÁRIAS LEITURAS DA MESMA IMAGEM
// ==================================================

function processarLeituraCamera(
    codigo
) {

    const agora =
        Date.now();


    if (
        codigo === ultimoCodigoCamera &&
        agora - ultimoTempoCamera < 1500
    ) {

        return;
    }


    ultimoCodigoCamera =
        codigo;

    ultimoTempoCamera =
        agora;


    processarLeitura(
        codigo
    );

}


// ==================================================
// CAMPO FÍSICO / MANUAL
// ==================================================

document
    .getElementById("codigo")
    .addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                const codigo =
                    this.value.trim();

                this.value = "";

                processarLeitura(
                    codigo
                );

            }

        }
    );


// ==================================================
// ÚLTIMA LEITURA
// ==================================================

function mostrarUltimaLeitura(
    codigo
) {

    document
        .getElementById(
            "ultimaLeitura"
        )
        .textContent =
        codigo;

}


// ==================================================
// DUPLICADO
// ==================================================

function mostrarDuplicado(
    codigo
) {

    document
        .getElementById(
            "ultimaLeitura"
        )
        .textContent =
        "DUPLICADO: " + codigo;

}


// ==================================================
// PARAR CÂMERA
// ==================================================

function pararCamera() {

    cameraAtiva = false;


    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(track => {

                track.stop();

            });

        cameraStream = null;

    }

}


// ==================================================
// VOLTAR PARA INÍCIO
// ==================================================

function voltarInicio() {

    pararCamera();


    document
        .getElementById("coleta")
        .style.display =
        "none";


    document
        .getElementById("login")
        .style.display =
        "flex";


    document
        .getElementById("inventario")
        .value =
        sessao.inventario;


    document
        .getElementById("endereco")
        .value =
        sessao.endereco;

}