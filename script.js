// ======================================================
// COLETOR THOR
// SCRIPT COMPLETO
// ======================================================


// ======================================================
// VARIÁVEIS
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


// ======================================================
// VARIÁVEIS DA CÂMERA
// ======================================================

let codeReader = null;
let cameraStream = null;
let cameraAtiva = false;


// ======================================================
// ELEMENTOS
// ======================================================

let campoUsuario;
let campoInventario;
let campoEndereco;

let btnEntrar;
let btnRegistrar;

let campoCodigo;

let telaLogin;
let telaColeta;

let camera;
let cameraMessage;


// ======================================================
// INICIALIZAÇÃO
// ======================================================

window.addEventListener("DOMContentLoaded", function () {

    campoUsuario =
        document.getElementById("usuario");

    campoInventario =
        document.getElementById("inventario");

    campoEndereco =
        document.getElementById("endereco");

    btnEntrar =
        document.getElementById("btnEntrar");

    btnRegistrar =
        document.getElementById("btnRegistrar");

    campoCodigo =
        document.getElementById("codigo");

    telaLogin =
        document.getElementById("login");

    telaColeta =
        document.getElementById("coleta");

    camera =
        document.getElementById("camera");

    cameraMessage =
        document.getElementById("cameraMessage");


    // ==================================================
    // GARANTE CAMPOS EDITÁVEIS
    // ==================================================

    if (campoInventario) {
        campoInventario.readOnly = false;
        campoInventario.disabled = false;
    }

    if (campoEndereco) {
        campoEndereco.readOnly = false;
        campoEndereco.disabled = false;
    }


    // ==================================================
    // BOTÃO INICIAR COLETA
    // ==================================================

    if (btnEntrar) {

        btnEntrar.disabled = false;

        btnEntrar.addEventListener(
            "click",
            iniciarColeta
        );

    }


    // ==================================================
    // BOTÃO REGISTRAR
    // ==================================================

    if (btnRegistrar) {

        btnRegistrar.addEventListener(
            "click",
            function () {

                registrarCodigo(
                    campoCodigo.value
                );

            }
        );

    }


    // ==================================================
    // ENTER NO CÓDIGO
    // ==================================================

    if (campoCodigo) {

        campoCodigo.addEventListener(
            "keydown",
            function (evento) {

                if (evento.key === "Enter") {

                    evento.preventDefault();

                    registrarCodigo(
                        campoCodigo.value
                    );

                }

            }
        );

    }


    // ==================================================
    // CARREGAR CONFIGURAÇÃO
    // ==================================================

    carregarConfiguracao();

});


// ======================================================
// CARREGAR CONFIGURAÇÃO
// ======================================================

async function carregarConfiguracao() {

    try {

        const resposta =
            await fetch(
                API + "?acao=config"
            );


        if (!resposta.ok) {

            throw new Error(
                "Erro HTTP " +
                resposta.status
            );

        }


        const dados =
            await resposta.json();


        configuracao = dados;


        // ==================================================
        // USUÁRIOS
        // ==================================================

        if (!campoUsuario) {
            return;
        }


        campoUsuario.innerHTML = "";


        if (
            !dados.Usuarios ||
            dados.Usuarios.length === 0
        ) {

            const opcao =
                document.createElement(
                    "option"
                );

            opcao.value = "";

            opcao.text =
                "Nenhum usuário cadastrado";

            campoUsuario.appendChild(
                opcao
            );

        }

        else {

            dados.Usuarios.forEach(
                function (usuario) {

                    const opcao =
                        document.createElement(
                            "option"
                        );

                    opcao.value =
                        usuario.id;

                    opcao.text =
                        usuario.nome;

                    campoUsuario.appendChild(
                        opcao
                    );

                }
            );

        }


        // ==================================================
        // PRIMEIRO USUÁRIO
        // ==================================================

        if (
            dados.Usuarios &&
            dados.Usuarios.length > 0
        ) {

            campoUsuario.value =
                dados.Usuarios[0].id;

            atualizarConfiguracaoUsuario(
                dados.Usuarios[0].id
            );

        }


        // ==================================================
        // TROCA DE USUÁRIO
        // ==================================================

        campoUsuario.addEventListener(
            "change",
            function () {

                atualizarConfiguracaoUsuario(
                    this.value
                );

            }
        );


        // ==================================================
        // HABILITA BOTÃO
        // ==================================================

        if (btnEntrar) {

            btnEntrar.disabled = false;

        }


        console.log(
            "Configuração carregada:",
            dados
        );

    }

    catch (erro) {

        console.error(
            "Erro ao carregar configuração:",
            erro
        );


        if (btnEntrar) {

            btnEntrar.disabled = false;

        }


        const status =
            document.getElementById(
                "loginStatus"
            );


        if (status) {

            status.innerText =
                "Erro ao carregar configuração.";

        }

    }

}


// ======================================================
// CONFIGURAÇÃO DO USUÁRIO
// ======================================================

function atualizarConfiguracaoUsuario(
    usuarioId
) {

    if (!campoInventario || !campoEndereco) {
        return;
    }


    // ==================================================
    // CAMPOS SEMPRE EDITÁVEIS
    // ==================================================

    campoInventario.readOnly = false;
    campoInventario.disabled = false;

    campoEndereco.readOnly = false;
    campoEndereco.disabled = false;


    // ==================================================
    // SEM CONFIGURAÇÕES
    // ==================================================

    if (
        !configuracao.Configuracoes
    ) {

        campoInventario.value = "";
        campoEndereco.value = "";

        return;

    }


    // ==================================================
    // PROCURA CONFIGURAÇÃO
    // ==================================================

    const configUsuario =
        configuracao.Configuracoes.find(
            function (config) {

                return (
                    String(
                        config.usuario
                    ) ===
                    String(
                        usuarioId
                    )
                );

            }
        );


    // ==================================================
    // NÃO ENCONTROU
    // ==================================================

    if (!configUsuario) {

        campoInventario.value = "";
        campoEndereco.value = "";

        return;

    }


    // ==================================================
    // INVENTÁRIO
    // ==================================================

    campoInventario.value =
        configUsuario.inventario || "";


    // ==================================================
    // ENDEREÇO
    // ==================================================

    campoEndereco.value =
        configUsuario.enderecoAtual || "";

}


// ======================================================
// INICIAR COLETA
// ======================================================

async function iniciarColeta() {

    try {

        console.log(
            "Iniciando coleta..."
        );


        // ==================================================
        // USUÁRIO
        // ==================================================

        if (
            !campoUsuario ||
            !campoUsuario.value
        ) {

            alert(
                "Selecione um usuário."
            );

            return;

        }


        // ==================================================
        // INVENTÁRIO
        // ==================================================

        sessao.inventario =
            campoInventario.value
                .trim()
                .toUpperCase();


        if (
            sessao.inventario === ""
        ) {

            alert(
                "Informe o inventário."
            );

            campoInventario.focus();

            return;

        }


        // ==================================================
        // ENDEREÇO
        // ==================================================

        sessao.endereco =
            campoEndereco.value
                .trim()
                .toUpperCase();


        if (
            sessao.endereco === ""
        ) {

            alert(
                "Informe o endereço."
            );

            campoEndereco.focus();

            return;

        }


        // ==================================================
        // USUÁRIO
        // ==================================================

        sessao.usuario =
            campoUsuario.value;


        if (
            campoUsuario.selectedIndex >= 0
        ) {

            sessao.nomeUsuario =
                campoUsuario
                    .options[
                        campoUsuario.selectedIndex
                    ]
                    .text;

        }


        // ==================================================
        // CONTADORES
        // ==================================================

        sessao.totalEndereco = 0;
        sessao.totalColeta = 0;


        // ==================================================
        // ATUALIZA INFORMAÇÕES DA TELA
        // ==================================================

        const lblUsuario =
            document.getElementById(
                "lblUsuario"
            );

        const lblInventario =
            document.getElementById(
                "lblInventario"
            );

        const lblEndereco =
            document.getElementById(
                "lblEndereco"
            );


        if (lblUsuario) {

            lblUsuario.innerText =
                sessao.nomeUsuario;

        }


        if (lblInventario) {

            lblInventario.innerText =
                sessao.inventario;

        }


        if (lblEndereco) {

            lblEndereco.innerText =
                sessao.endereco;

        }


        // ==================================================
        // ZERA CONTADORES
        // ==================================================

        const contadorEndereco =
            document.getElementById(
                "contadorEndereco"
            );

        const contadorTotal =
            document.getElementById(
                "contadorTotal"
            );


        if (contadorEndereco) {

            contadorEndereco.innerText =
                "0";

        }


        if (contadorTotal) {

            contadorTotal.innerText =
                "0";

        }


        // ==================================================
        // TROCA DE TELA
        // ==================================================

        if (telaLogin) {

            telaLogin.classList.add(
                "hidden"
            );

            telaLogin.style.display =
                "none";

        }


        if (telaColeta) {

            telaColeta.classList.remove(
                "hidden"
            );

            telaColeta.style.display =
                "block";

        }


        // ==================================================
        // LIMPA CÓDIGO
        // ==================================================

        if (campoCodigo) {

            campoCodigo.value = "";

        }


        // ==================================================
        // INICIA CÂMERA
        // ==================================================

        await iniciarCamera();


        // ==================================================
        // FOCO NO CAMPO
        // ==================================================

        if (campoCodigo) {

            setTimeout(
                function () {

                    campoCodigo.focus();

                },
                300
            );

        }


        console.log(
            "Sessão iniciada:",
            sessao
        );

    }

    catch (erro) {

        console.error(
            "Erro ao iniciar coleta:",
            erro
        );


        // ==================================================
        // SE DER ERRO, NÃO DEIXA A TELA BRANCA
        // ==================================================

        if (telaLogin) {

            telaLogin.style.display =
                "block";

            telaLogin.classList.remove(
                "hidden"
            );

        }


        if (telaColeta) {

            telaColeta.style.display =
                "none";

        }


        alert(
            "Não foi possível iniciar a coleta.\n\n" +
            erro.message
        );

    }

}


// ======================================================
// INICIAR CÂMERA
// ======================================================

async function iniciarCamera() {

    if (!camera) {

        console.warn(
            "Elemento da câmera não encontrado."
        );

        return;

    }


    if (
        typeof ZXingBrowser ===
        "undefined"
    ) {

        console.warn(
            "Biblioteca ZXing não carregada."
        );


        mostrarMensagemCamera(
            "Leitura manual disponível."
        );

        return;

    }


    try {

        mostrarMensagemCamera(
            "Solicitando acesso à câmera..."
        );


        // ==================================================
        // PARA CÂMERA ANTERIOR
        // ==================================================

        pararCamera();


        // ==================================================
        // VERIFICA HTTPS
        // ==================================================

        if (
            location.protocol !== "https:" &&
            location.hostname !== "localhost"
        ) {

            throw new Error(
                "A câmera precisa de uma conexão HTTPS."
            );

        }


        // ==================================================
        // CRIA LEITOR ZXING
        // ==================================================

        codeReader =
            new ZXingBrowser.BrowserMultiFormatReader();


        // ==================================================
        // LISTA CÂMERAS
        // ==================================================

        const dispositivos =
            await ZXingBrowser.BrowserCodeReader
                .listVideoInputDevices();


        if (
            !dispositivos ||
            dispositivos.length === 0
        ) {

            throw new Error(
                "Nenhuma câmera encontrada."
            );

        }


        // ==================================================
        // ESCOLHE CÂMERA TRASEIRA
        // ==================================================

        let cameraSelecionada =
            dispositivos[0];


        const cameraTraseira =
            dispositivos.find(
                function (dispositivo) {

                    const nome =
                        (
                            dispositivo.label ||
                            ""
                        ).toLowerCase();


                    return (
                        nome.includes("back") ||
                        nome.includes("traseira") ||
                        nome.includes("rear") ||
                        nome.includes("environment")
                    );

                }
            );


        if (cameraTraseira) {

            cameraSelecionada =
                cameraTraseira;

        }


        // ==================================================
        // INICIA LEITURA
        // ==================================================

        mostrarMensagemCamera(
            "Câmera ativa. Aponte para o código."
        );


        cameraAtiva = true;


        await codeReader.decodeFromVideoDevice(
            cameraSelecionada.deviceId,
            camera,
            function (resultado, erro) {

                if (resultado) {

                    const codigo =
                        resultado.getText();

                    console.log(
                        "Código lido:",
                        codigo
                    );


                    registrarCodigo(
                        codigo
                    );

                }

            }
        );


        // ==================================================
        // TENTA PEGAR STREAM
        // ==================================================

        if (camera.srcObject) {

            cameraStream =
                camera.srcObject;

        }

    }

    catch (erro) {

        console.error(
            "Erro ao iniciar câmera:",
            erro
        );


        cameraAtiva = false;


        mostrarMensagemCamera(
            "Câmera indisponível. Use a digitação manual."
        );

    }

}


// ======================================================
// PARAR CÂMERA
// ======================================================

function pararCamera() {

    cameraAtiva = false;


    if (codeReader) {

        try {

            codeReader.reset();

        }

        catch (erro) {

            console.warn(
                "Erro ao resetar câmera:",
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


    if (
        camera &&
        camera.srcObject
    ) {

        const tracks =
            camera.srcObject.getTracks();


        tracks.forEach(
            function (track) {

                track.stop();

            }
        );


        camera.srcObject = null;

    }

}


// ======================================================
// MENSAGEM DA CÂMERA
// ======================================================

function mostrarMensagemCamera(
    mensagem
) {

    if (cameraMessage) {

        cameraMessage.innerText =
            mensagem;

    }

}


// ======================================================
// REGISTRAR CÓDIGO
// ======================================================

async function registrarCodigo(
    codigoRecebido
) {

    try {

        let codigo =
            String(
                codigoRecebido || ""
            )
            .trim()
            .toUpperCase();


        // ==================================================
        // IGNORA VAZIO
        // ==================================================

        if (codigo === "") {

            return;

        }


        console.log(
            "Processando código:",
            codigo
        );


        // ==================================================
        // LIMPA CAMPO
        // ==================================================

        if (campoCodigo) {

            campoCodigo.value = "";

        }


        // ==================================================
        // TROCA DE ENDEREÇO
        // ==================================================

        if (
            /^[A-Z]/.test(codigo)
        ) {

            await alterarEndereco(
                codigo
            );

            return;

        }


        // ==================================================
        // VERIFICA PRODUTO
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
                    codigo
                )
            );


        if (!resposta.ok) {

            throw new Error(
                "Erro ao verificar o código."
            );

        }


        const verifica =
            await resposta.json();


        // ==================================================
        // PRODUTO REPETIDO
        // ==================================================

        if (
            verifica &&
            verifica.existe
        ) {

            mostrarUltimaLeitura(
                "PRODUTO JÁ COLETADO"
            );


            if (campoCodigo) {

                campoCodigo.focus();

            }


            return;

        }


        // ==================================================
        // GRAVA COLETA
        // ==================================================

        const dadosColeta = {

            usuario:
                sessao.usuario,

            nomeUsuario:
                sessao.nomeUsuario,

            inventario:
                sessao.inventario,

            endereco:
                sessao.endereco,

            codigo:
                codigo

        };


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
                    JSON.stringify(
                        dadosColeta
                    )

            }
        );


        // ==================================================
        // ATUALIZA CONTADORES
        // ==================================================

        sessao.totalEndereco++;
        sessao.totalColeta++;


        const contadorEndereco =
            document.getElementById(
                "contadorEndereco"
            );

        const contadorTotal =
            document.getElementById(
                "contadorTotal"
            );


        if (contadorEndereco) {

            contadorEndereco.innerText =
                sessao.totalEndereco;

        }


        if (contadorTotal) {

            contadorTotal.innerText =
                sessao.totalColeta;

        }


        // ==================================================
        // ÚLTIMA LEITURA
        // ==================================================

        mostrarUltimaLeitura(
            codigo
        );


        // ==================================================
        // FOCO
        // ==================================================

        if (campoCodigo) {

            campoCodigo.focus();

        }


        console.log(
            "Coleta registrada:",
            dadosColeta
        );

    }

    catch (erro) {

        console.error(
            "Erro ao registrar código:",
            erro
        );


        mostrarUltimaLeitura(
            "ERRO AO REGISTRAR"
        );


        if (campoCodigo) {

            campoCodigo.value = "";
            campoCodigo.focus();

        }

    }

}


// ======================================================
// ALTERAR ENDEREÇO
// ======================================================

async function alterarEndereco(
    novoEndereco
) {

    try {

        novoEndereco =
            novoEndereco
                .trim()
                .toUpperCase();


        if (
            novoEndereco === ""
        ) {

            return;

        }


        // ==================================================
        // ATUALIZA SESSÃO
        // ==================================================

        sessao.endereco =
            novoEndereco;


        // ==================================================
        // ATUALIZA TELA
        // ==================================================

        const lblEndereco =
            document.getElementById(
                "lblEndereco"
            );


        if (lblEndereco) {

            lblEndereco.innerText =
                novoEndereco;

        }


        // ==================================================
        // ZERA CONTADOR DO ENDEREÇO
        // ==================================================

        sessao.totalEndereco = 0;


        const contadorEndereco =
            document.getElementById(
                "contadorEndereco"
            );


        if (contadorEndereco) {

            contadorEndereco.innerText =
                "0";

        }


        // ==================================================
        // SALVA NOVO ENDEREÇO
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

                        acao:
                            "novoEndereco",

                        endereco:
                            novoEndereco

                    })

            }
        );


        // ==================================================
        // MENSAGEM
        // ==================================================

        mostrarUltimaLeitura(
            "ENDEREÇO ALTERADO"
        );


        // ==================================================
        // LIMPA CAMPO
        // ==================================================

        if (campoCodigo) {

            campoCodigo.value = "";
            campoCodigo.focus();

        }


        console.log(
            "Novo endereço:",
            novoEndereco
        );

    }

    catch (erro) {

        console.error(
            "Erro ao alterar endereço:",
            erro
        );


        mostrarUltimaLeitura(
            "ERRO AO ALTERAR ENDEREÇO"
        );

    }

}


// ======================================================
// ÚLTIMA LEITURA
// ======================================================

function mostrarUltimaLeitura(
    texto
) {

    const ultimaLeitura =
        document.getElementById(
            "ultimaLeitura"
        );


    if (ultimaLeitura) {

        ultimaLeitura.innerText =
            texto;

    }

}


// ======================================================
// AO SAIR DA PÁGINA
// ======================================================

window.addEventListener(
    "beforeunload",
    function () {

        pararCamera();

    }
);


// ======================================================
// QUANDO A PÁGINA VOLTAR A FICAR VISÍVEL
// ======================================================

document.addEventListener(
    "visibilitychange",
    function () {

        if (
            document.visibilityState ===
            "visible" &&
            telaColeta &&
            telaColeta.style.display !== "none"
        ) {

            if (!cameraAtiva) {

                iniciarCamera();

            }

        }

    }
);
