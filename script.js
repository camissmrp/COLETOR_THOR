// ======================================================
// COLETOR THOR
// SCRIPT PRINCIPAL
// ======================================================

let configuracao = {};

let sessao = {
    usuario: null,
    nomeUsuario: "",
    inventario: "",
    endereco: "",
    totalEndereco: 0,
    totalColeta: 0
};

let codeReader = null;
let cameraStream = null;


// ======================================================
// ELEMENTOS
// ======================================================

let usuario;
let inventario;
let endereco;
let btnEntrar;
let btnRegistrar;
let codigo;


// ======================================================
// INICIALIZAÇÃO
// ======================================================

window.addEventListener("DOMContentLoaded", function () {

    console.log("THOR - página carregada");


    usuario =
        document.getElementById("usuario");

    inventario =
        document.getElementById("inventario");

    endereco =
        document.getElementById("endereco");

    btnEntrar =
        document.getElementById("btnEntrar");

    btnRegistrar =
        document.getElementById("btnRegistrar");

    codigo =
        document.getElementById("codigo");


    // ==================================================
    // CAMPOS EDITÁVEIS
    // ==================================================

    if (inventario) {
        inventario.disabled = false;
        inventario.readOnly = false;
    }

    if (endereco) {
        endereco.disabled = false;
        endereco.readOnly = false;
    }


    // ==================================================
    // BOTÃO INICIAR
    // ==================================================

    if (btnEntrar) {

        btnEntrar.disabled = false;

        btnEntrar.onclick = function (evento) {

            evento.preventDefault();

            iniciarColeta();

        };

    }


    // ==================================================
    // BOTÃO REGISTRAR
    // ==================================================

    if (btnRegistrar) {

        btnRegistrar.onclick = function (evento) {

            evento.preventDefault();

            registrarCodigo(
                codigo.value
            );

        };

    }


    // ==================================================
    // ENTER
    // ==================================================

    if (codigo) {

        codigo.addEventListener(
            "keydown",
            function (evento) {

                if (evento.key === "Enter") {

                    evento.preventDefault();

                    registrarCodigo(
                        codigo.value
                    );

                }

            }
        );

    }


    // ==================================================
    // CONFIGURAÇÃO
    // ==================================================

    carregarConfiguracao();

});


// ======================================================
// CARREGAR CONFIGURAÇÃO
// ======================================================

async function carregarConfiguracao() {

    try {

        console.log(
            "Carregando configuração..."
        );


        const resposta =
            await fetch(
                API + "?acao=config"
            );


        const dados =
            await resposta.json();


        configuracao = dados;


        // ==================================================
        // USUÁRIOS
        // ==================================================

        usuario.innerHTML = "";


        if (
            dados.Usuarios &&
            dados.Usuarios.length > 0
        ) {

            dados.Usuarios.forEach(
                function (item) {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        item.id;

                    option.text =
                        item.nome;

                    usuario.appendChild(
                        option
                    );

                }
            );


            atualizarConfiguracaoUsuario(
                usuario.value
            );

        }
        else {

            const option =
                document.createElement(
                    "option"
                );

            option.value = "";

            option.text =
                "Nenhum usuário";

            usuario.appendChild(
                option
            );

        }


        // ==================================================
        // TROCA DE USUÁRIO
        // ==================================================

        usuario.onchange =
            function () {

                atualizarConfiguracaoUsuario(
                    usuario.value
                );

            };


        btnEntrar.disabled = false;


        console.log(
            "Configuração carregada."
        );

    }

    catch (erro) {

        console.error(
            "Erro na configuração:",
            erro
        );


        // Mesmo com erro,
        // deixa o botão funcionar.

        btnEntrar.disabled = false;

    }

}


// ======================================================
// CONFIGURAÇÃO DO USUÁRIO
// ======================================================

function atualizarConfiguracaoUsuario(
    usuarioId
) {

    inventario.disabled = false;
    inventario.readOnly = false;

    endereco.disabled = false;
    endereco.readOnly = false;


    if (
        !configuracao.Configuracoes
    ) {

        return;

    }


    const config =
        configuracao.Configuracoes.find(
            function (item) {

                return (
                    String(item.usuario) ===
                    String(usuarioId)
                );

            }
        );


    if (!config) {

        return;

    }


    if (
        config.inventario !== undefined
    ) {

        inventario.value =
            config.inventario || "";

    }


    if (
        config.enderecoAtual !== undefined
    ) {

        endereco.value =
            config.enderecoAtual || "";

    }

}


// ======================================================
// INICIAR COLETA
// ======================================================

function iniciarColeta() {

    console.log(
        "INICIAR COLETA clicado."
    );


    // ==================================================
    // VALIDA USUÁRIO
    // ==================================================

    if (
        !usuario ||
        !usuario.value
    ) {

        alert(
            "Selecione um usuário."
        );

        return;

    }


    // ==================================================
    // INVENTÁRIO
    // ==================================================

    const valorInventario =
        inventario.value
            .trim()
            .toUpperCase();


    if (
        valorInventario === ""
    ) {

        alert(
            "Informe o inventário."
        );

        inventario.focus();

        return;

    }


    // ==================================================
    // ENDEREÇO
    // ==================================================

    const valorEndereco =
        endereco.value
            .trim()
            .toUpperCase();


    if (
        valorEndereco === ""
    ) {

        alert(
            "Informe o endereço."
        );

        endereco.focus();

        return;

    }


    // ==================================================
    // SALVA SESSÃO
    // ==================================================

    sessao.usuario =
        usuario.value;


    sessao.nomeUsuario =
        usuario.options[
            usuario.selectedIndex
        ].text;


    sessao.inventario =
        valorInventario;


    sessao.endereco =
        valorEndereco;


    sessao.totalEndereco = 0;

    sessao.totalColeta = 0;


    console.log(
        "Sessão:",
        sessao
    );


    // ==================================================
    // ATUALIZA LABELS
    // ==================================================

    document.getElementById(
        "lblUsuario"
    ).innerText =
        sessao.nomeUsuario;


    document.getElementById(
        "lblInventario"
    ).innerText =
        sessao.inventario;


    document.getElementById(
        "lblEndereco"
    ).innerText =
        sessao.endereco;


    // ==================================================
    // ZERA CONTADORES
    // ==================================================

    document.getElementById(
        "contadorEndereco"
    ).innerText = "0";


    document.getElementById(
        "contadorTotal"
    ).innerText = "0";


    document.getElementById(
        "ultimaLeitura"
    ).innerText = "-";


    // ==================================================
    // ESCONDE LOGIN
    // ==================================================

    const login =
        document.getElementById(
            "login"
        );


    login.classList.add(
        "hidden"
    );


    login.style.display =
        "none";


    // ==================================================
    // MOSTRA COLETA
    // ==================================================

    const coleta =
        document.getElementById(
            "coleta"
        );


    coleta.classList.remove(
        "hidden"
    );


    coleta.style.display =
        "flex";


    console.log(
        "Tela de coleta exibida."
    );


    // ==================================================
    // CÂMERA
    // ==================================================

    /*
     * IMPORTANTE:
     * A câmera NÃO bloqueia a abertura
     * da tela de coleta.
     */

    setTimeout(
        function () {

            iniciarCamera();

        },
        300
    );


    // ==================================================
    // FOCO NO CAMPO
    // ==================================================

    setTimeout(
        function () {

            if (codigo) {

                codigo.focus();

            }

        },
        500
    );

}


// ======================================================
// INICIAR CÂMERA
// ======================================================

async function iniciarCamera() {

    console.log(
        "Iniciando câmera..."
    );


    const video =
        document.getElementById(
            "camera"
        );


    const area =
        document.getElementById(
            "cameraArea"
        );


    const mensagem =
        document.getElementById(
            "cameraMessage"
        );


    if (!video) {

        console.warn(
            "Vídeo da câmera não encontrado."
        );

        return;

    }


    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        if (mensagem) {

            mensagem.innerText =
                "Câmera indisponível. Digite o código.";

        }

        return;

    }


    try {

        if (mensagem) {

            mensagem.innerText =
                "Abrindo câmera...";

        }


        // ==================================================
        // PEDE CÂMERA TRASEIRA
        // ==================================================

        cameraStream =
            await navigator.mediaDevices.getUserMedia(
                {
                    video: {
                        facingMode: {
                            ideal: "environment"
                        }
                    },

                    audio: false
                }
            );


        video.srcObject =
            cameraStream;


        video.setAttribute(
            "playsinline",
            ""
        );


        video.setAttribute(
            "autoplay",
            ""
        );


        video.muted = true;


        await video.play();


        if (mensagem) {

            mensagem.innerText =
                "Aponte a câmera para o código de barras";

        }


        console.log(
            "Câmera aberta."
        );


        // ==================================================
        // INICIA ZXING
        // ==================================================

        iniciarLeitorZXing();

    }

    catch (erro) {

        console.error(
            "Não foi possível abrir a câmera:",
            erro
        );


        if (mensagem) {

            mensagem.innerText =
                "Câmera indisponível. Digite o código.";

        }

    }

}


// ======================================================
// LEITOR ZXING
// ======================================================

function iniciarLeitorZXing() {

    if (
        typeof ZXingBrowser ===
        "undefined"
    ) {

        console.warn(
            "ZXing não carregado."
        );

        return;

    }


    const video =
        document.getElementById(
            "camera"
        );


    try {

        codeReader =
            new ZXingBrowser.BrowserMultiFormatReader();


        codeReader.decodeFromVideoElement(
            video,
            function (
                resultado,
                erro
            ) {

                if (!resultado) {

                    return;

                }


                const texto =
                    resultado.getText();


                if (
                    !texto
                ) {

                    return;

                }


                console.log(
                    "Código detectado:",
                    texto
                );


                registrarCodigo(
                    texto
                );

            }
        );

    }

    catch (erro) {

        console.error(
            "Erro ZXing:",
            erro
        );

    }

}


// ======================================================
// REGISTRAR CÓDIGO
// ======================================================

async function registrarCodigo(
    codigoRecebido
) {

    let codigoLido =
        String(
            codigoRecebido || ""
        )
        .trim()
        .toUpperCase();


    if (
        codigoLido === ""
    ) {

        return;

    }


    codigo.value = "";


    // ==================================================
    // LETRA = ENDEREÇO
    // ==================================================

    if (
        /^[A-Z]/.test(
            codigoLido
        )
    ) {

        await alterarEndereco(
            codigoLido
        );

        codigo.focus();

        return;

    }


    // ==================================================
    // NÚMERO = PRODUTO
    // ==================================================

    if (
        /^[0-9]/.test(
            codigoLido
        )
    ) {

        await registrarProduto(
            codigoLido
        );

        codigo.focus();

        return;

    }


    // ==================================================
    // INVÁLIDO
    // ==================================================

    mostrarUltimaLeitura(
        codigoLido +
        " - INVÁLIDO"
    );


    codigo.focus();

}


// ======================================================
// ALTERAR ENDEREÇO
// ======================================================

async function alterarEndereco(
    novoEndereco
) {

    sessao.endereco =
        novoEndereco
            .trim()
            .toUpperCase();


    document.getElementById(
        "lblEndereco"
    ).innerText =
        sessao.endereco;


    sessao.totalEndereco = 0;


    document.getElementById(
        "contadorEndereco"
    ).innerText = "0";


    mostrarUltimaLeitura(
        "ENDEREÇO: " +
        sessao.endereco
    );


    // ==================================================
    // SALVA ENDEREÇO
    // ==================================================

    try {

        await fetch(
            API,
            {
                method: "POST",

                mode: "no-cors",

                headers: {
                    "Content-Type":
                        "text/plain"
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
                            sessao.endereco

                    })

            }
        );

    }

    catch (erro) {

        console.error(
            "Erro ao salvar endereço:",
            erro
        );

    }

}


// ======================================================
// REGISTRAR PRODUTO
// ======================================================

async function registrarProduto(
    codigoProduto
) {

    try {

        // ==================================================
        // VERIFICA DUPLICIDADE
        // ==================================================

        const resposta =
            await fetch(

                API +
                "?acao=verificar" +
                "&inventario=" +
                encodeURIComponent(
                    sessao.inventario
                ) +
                "&codigo=" +
                encodeURIComponent(
                    codigoProduto
                )

            );


        const verifica =
            await resposta.json();


        if (
            verifica &&
            verifica.existe
        ) {

            mostrarUltimaLeitura(
                "PRODUTO JÁ COLETADO"
            );

            return;

        }


        // ==================================================
        // GRAVA
        // ==================================================

        await fetch(
            API,
            {

                method: "POST",

                mode: "no-cors",

                headers: {
                    "Content-Type":
                        "text/plain"
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
                            codigoProduto

                    })

            }
        );


        // ==================================================
        // CONTADORES
        // ==================================================

        sessao.totalEndereco++;

        sessao.totalColeta++;


        document.getElementById(
            "contadorEndereco"
        ).innerText =
            sessao.totalEndereco;


        document.getElementById(
            "contadorTotal"
        ).innerText =
            sessao.totalColeta;


        mostrarUltimaLeitura(
            codigoProduto
        );


        console.log(
            "Produto gravado:",
            codigoProduto
        );

    }

    catch (erro) {

        console.error(
            "Erro ao registrar:",
            erro
        );


        mostrarUltimaLeitura(
            "ERRO AO REGISTRAR"
        );

    }

}


// ======================================================
// ÚLTIMA LEITURA
// ======================================================

function mostrarUltimaLeitura(
    texto
) {

    const elemento =
        document.getElementById(
            "ultimaLeitura"
        );


    if (elemento) {

        elemento.innerText =
            texto;

    }

}


// ======================================================
// PARAR CÂMERA
// ======================================================

function pararCamera() {

    if (codeReader) {

        try {

            codeReader.reset();

        }

        catch (erro) {

            console.warn(
                erro
            );

        }

        codeReader = null;

    }


    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(
                function (track) {

                    track.stop();

                }
            );


        cameraStream = null;

    }

}


// ======================================================
// AO SAIR
// ======================================================

window.addEventListener(
    "beforeunload",
    function () {

        pararCamera();

    }
);
