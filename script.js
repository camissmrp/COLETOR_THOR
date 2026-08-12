// ======================================================
// COLETOR THOR
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
// ELEMENTOS
// ======================================================

let campoUsuario;
let campoInventario;
let campoEndereco;
let btnEntrar;
let btnRegistrar;
let campoCodigo;

let streamCamera = null;

// ======================================================
// INICIALIZAÇÃO
// ======================================================

window.addEventListener("DOMContentLoaded", function () {

    console.log("COLETOR THOR - iniciando...");

    campoUsuario = document.getElementById("usuario");
    campoInventario = document.getElementById("inventario");
    campoEndereco = document.getElementById("endereco");

    btnEntrar = document.getElementById("btnEntrar");
    btnRegistrar = document.getElementById("btnRegistrar");

    campoCodigo = document.getElementById("codigo");

    // ==================================================
    // VERIFICA ELEMENTOS
    // ==================================================

    if (!campoUsuario) {
        console.error("Elemento #usuario não encontrado.");
    }

    if (!campoInventario) {
        console.error("Elemento #inventario não encontrado.");
    }

    if (!campoEndereco) {
        console.error("Elemento #endereco não encontrado.");
    }

    if (!btnEntrar) {
        console.error("Elemento #btnEntrar não encontrado.");
    }

    // ==================================================
    // CAMPOS EDITÁVEIS
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
    // BOTÃO INICIAR
    // ==================================================

    if (btnEntrar) {

        btnEntrar.disabled = false;

        /*
         * IMPORTANTE:
         * impede que o botão envie o formulário
         * e recarregue a página no iPhone.
         */

        btnEntrar.addEventListener("click", function (evento) {

            evento.preventDefault();
            evento.stopPropagation();

            console.log("Botão INICIAR COLETA clicado.");

            iniciarColeta();

            return false;
        });

    }

    // ==================================================
    // SE EXISTIR FORMULÁRIO
    // ==================================================

    const formulario = btnEntrar
        ? btnEntrar.closest("form")
        : null;

    if (formulario) {

        formulario.addEventListener("submit", function (evento) {

            evento.preventDefault();
            evento.stopPropagation();

            console.log("Submit bloqueado.");

            iniciarColeta();

            return false;
        });

    }

    // ==================================================
    // BOTÃO REGISTRAR
    // ==================================================

    if (btnRegistrar) {

        btnRegistrar.addEventListener("click", function (evento) {

            evento.preventDefault();
            evento.stopPropagation();

            if (campoCodigo) {
                registrarCodigo(campoCodigo.value);
            }

            return false;
        });

    }

    // ==================================================
    // ENTER NO CÓDIGO
    // ==================================================

    if (campoCodigo) {

        campoCodigo.addEventListener("keydown", function (evento) {

            if (evento.key === "Enter") {

                evento.preventDefault();

                registrarCodigo(campoCodigo.value);
            }

        });

    }

    // ==================================================
    // CARREGA CONFIGURAÇÃO
    // ==================================================

    carregarConfiguracao();

});


// ======================================================
// CARREGAR CONFIGURAÇÃO
// ======================================================

async function carregarConfiguracao() {

    try {

        const resposta = await fetch(
            API + "?acao=config"
        );

        if (!resposta.ok) {
            throw new Error(
                "Erro HTTP " + resposta.status
            );
        }

        const dados = await resposta.json();

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
                document.createElement("option");

            opcao.value = "";
            opcao.text = "Nenhum usuário cadastrado";

            campoUsuario.appendChild(opcao);

        }
        else {

            dados.Usuarios.forEach(function (usuario) {

                const opcao =
                    document.createElement("option");

                opcao.value = usuario.id;
                opcao.text = usuario.nome;

                campoUsuario.appendChild(opcao);

            });

        }

        // ==================================================
        // PRIMEIRO USUÁRIO
        // ==================================================

        if (
            dados.Usuarios &&
            dados.Usuarios.length > 0
        ) {

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

        alert(
            "Erro ao carregar a configuração do coletor."
        );

    }

}


// ======================================================
// CONFIGURAÇÃO DO USUÁRIO
// ======================================================

function atualizarConfiguracaoUsuario(usuarioId) {

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
    // SEM CONFIGURAÇÃO
    // ==================================================

    if (!configuracao.Configuracoes) {

        if (campoInventario) {
            campoInventario.value = "";
        }

        if (campoEndereco) {
            campoEndereco.value = "";
        }

        return;
    }

    // ==================================================
    // PROCURA CONFIGURAÇÃO
    // ==================================================

    const configUsuario =
        configuracao.Configuracoes.find(
            function (config) {

                return (
                    String(config.usuario) ===
                    String(usuarioId)
                );

            }
        );

    // ==================================================
    // NÃO ENCONTROU
    // ==================================================

    if (!configUsuario) {

        if (campoInventario) {
            campoInventario.value = "";
        }

        if (campoEndereco) {
            campoEndereco.value = "";
        }

        return;
    }

    // ==================================================
    // PREENCHE INVENTÁRIO
    // ==================================================

    if (campoInventario) {

        campoInventario.value =
            configUsuario.inventario || "";

    }

    // ==================================================
    // PREENCHE ENDEREÇO
    // ==================================================

    if (campoEndereco) {

        campoEndereco.value =
            configUsuario.enderecoAtual || "";

    }

}


// ======================================================
// INICIAR COLETA
// ======================================================

function iniciarColeta() {

    console.log("iniciarColeta() executada.");

    // ==================================================
    // USUÁRIO
    // ==================================================

    if (
        !campoUsuario ||
        !campoUsuario.value
    ) {

        alert("Selecione um usuário.");

        return false;
    }

    // ==================================================
    // INVENTÁRIO
    // ==================================================

    sessao.inventario =
        campoInventario
            ? campoInventario.value
                .trim()
                .toUpperCase()
            : "";

    if (sessao.inventario === "") {

        alert("Informe o inventário.");

        if (campoInventario) {
            campoInventario.focus();
        }

        return false;
    }

    // ==================================================
    // ENDEREÇO
    // ==================================================

    sessao.endereco =
        campoEndereco
            ? campoEndereco.value
                .trim()
                .toUpperCase()
            : "";

    if (sessao.endereco === "") {

        alert("Informe o endereço.");

        if (campoEndereco) {
            campoEndereco.focus();
        }

        return false;
    }

    // ==================================================
    // USUÁRIO
    // ==================================================

    sessao.usuario =
        campoUsuario.value;

    const opcaoSelecionada =
        campoUsuario.options[
            campoUsuario.selectedIndex
        ];

    sessao.nomeUsuario =
        opcaoSelecionada
            ? opcaoSelecionada.text
            : "";

    // ==================================================
    // ATUALIZA CAMPOS
    // ==================================================

    if (campoInventario) {
        campoInventario.value =
            sessao.inventario;
    }

    if (campoEndereco) {
        campoEndereco.value =
            sessao.endereco;
    }

    // ==================================================
    // LABELS
    // ==================================================

    const lblUsuario =
        document.getElementById("lblUsuario");

    const lblInventario =
        document.getElementById("lblInventario");

    const lblEndereco =
        document.getElementById("lblEndereco");

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
    // CONTADORES
    // ==================================================

    sessao.totalEndereco = 0;
    sessao.totalColeta = 0;

    const contadorEndereco =
        document.getElementById(
            "contadorEndereco"
        );

    const contadorTotal =
        document.getElementById(
            "contadorTotal"
        );

    const ultimaLeitura =
        document.getElementById(
            "ultimaLeitura"
        );

    if (contadorEndereco) {
        contadorEndereco.innerText = "0";
    }

    if (contadorTotal) {
        contadorTotal.innerText = "0";
    }

    if (ultimaLeitura) {
        ultimaLeitura.innerText = "-";
    }

    // ==================================================
    // TROCA DE TELA
    // ==================================================

    const telaLogin =
        document.getElementById("login");

    const telaColeta =
        document.getElementById("coleta");

    if (telaLogin) {
        telaLogin.style.display = "none";
    }

    if (telaColeta) {
        telaColeta.style.display = "flex";
    }

    // ==================================================
    // ABRE CÂMERA
    // ==================================================

    iniciarCamera();

    // ==================================================
    // FOCO NO CÓDIGO
    // ==================================================

    setTimeout(function () {

        if (campoCodigo) {
            campoCodigo.focus();
        }

    }, 700);

    console.log(
        "Sessão iniciada:",
        sessao
    );

    return false;
}


// ======================================================
// REGISTRAR CÓDIGO
// ======================================================

async function registrarCodigo(codigoRecebido) {

    let codigo =
        String(codigoRecebido || "")
            .trim()
            .toUpperCase();

    if (codigo === "") {
        return;
    }

    // ==================================================
    // LIMPA CAMPO
    // ==================================================

    if (campoCodigo) {
        campoCodigo.value = "";
    }

    // ==================================================
    // CÓDIGO COMEÇANDO COM LETRA = ENDEREÇO
    // ==================================================

    if (/^[A-Z]/.test(codigo)) {

        await alterarEndereco(codigo);

        if (campoCodigo) {
            campoCodigo.focus();
        }

        return;
    }

    // ==================================================
    // CÓDIGO COMEÇANDO COM NÚMERO = PRODUTO
    // ==================================================

    if (/^[0-9]/.test(codigo)) {

        await registrarProduto(codigo);

        if (campoCodigo) {
            campoCodigo.focus();
        }

        return;
    }

    // ==================================================
    // CÓDIGO INVÁLIDO
    // ==================================================

    mostrarUltimaLeitura(
        codigo + " - INVÁLIDO"
    );

    if (campoCodigo) {
        campoCodigo.focus();
    }

}


// ======================================================
// ALTERAR ENDEREÇO
// ======================================================

async function alterarEndereco(novoEndereco) {

    novoEndereco =
        String(novoEndereco)
            .trim()
            .toUpperCase();

    // ==================================================
    // ATUALIZA SESSÃO
    // ==================================================

    sessao.endereco =
        novoEndereco;

    // ==================================================
    // ATUALIZA TELA
    // ==================================================

    const lblEndereco =
        document.getElementById("lblEndereco");

    if (lblEndereco) {
        lblEndereco.innerText =
            novoEndereco;
    }

    // ==================================================
    // ZERA CONTADOR
    // ==================================================

    sessao.totalEndereco = 0;

    const contadorEndereco =
        document.getElementById(
            "contadorEndereco"
        );

    if (contadorEndereco) {
        contadorEndereco.innerText = "0";
    }

    // ==================================================
    // ATUALIZA TB_CONFIG
    // ==================================================

    try {

        await fetch(
            API,
            {
                method: "POST",
                mode: "no-cors",

                headers: {
                    "Content-Type": "text/plain"
                },

                body: JSON.stringify({

                    acao: "novoEndereco",

                    usuario:
                        sessao.usuario,

                    inventario:
                        sessao.inventario,

                    endereco:
                        novoEndereco

                })

            }
        );

        // ==================================================
        // ATUALIZA CONFIGURAÇÃO LOCAL
        // ==================================================

        if (configuracao.Configuracoes) {

            const configUsuario =
                configuracao.Configuracoes.find(
                    function (config) {

                        return (
                            String(config.usuario) ===
                            String(sessao.usuario)
                        );

                    }
                );

            if (configUsuario) {

                configUsuario.inventario =
                    sessao.inventario;

                configUsuario.enderecoAtual =
                    novoEndereco;

            }

        }

        mostrarUltimaLeitura(
            "Endereço alterado: " +
            novoEndereco
        );

    }
    catch (erro) {

        console.error(
            "Erro ao atualizar endereço:",
            erro
        );

        mostrarUltimaLeitura(
            "Erro ao atualizar endereço"
        );

    }

}


// ======================================================
// REGISTRAR PRODUTO
// ======================================================

async function registrarProduto(codigo) {

    // ==================================================
    // VERIFICA DUPLICIDADE
    // ==================================================

    try {

        const resposta =
            await fetch(

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
                )

            );

        const verifica =
            await resposta.json();

        // ==================================================
        // DUPLICADO
        // ==================================================

        if (verifica.existe) {

            mostrarUltimaLeitura(
                codigo +
                " - JÁ COLETADO"
            );

            return;
        }

    }
    catch (erro) {

        console.error(
            "Erro ao verificar duplicidade:",
            erro
        );

        mostrarUltimaLeitura(
            codigo +
            " - ERRO NA VERIFICAÇÃO"
        );

        return;
    }

    // ==================================================
    // GRAVA COLETA
    // ==================================================

    try {

        await fetch(
            API,
            {
                method: "POST",
                mode: "no-cors",

                headers: {
                    "Content-Type": "text/plain"
                },

                body: JSON.stringify({

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

        // ==================================================
        // CONTADORES
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

        console.log(
            "Produto registrado:",
            {
                usuario:
                    sessao.usuario,

                inventario:
                    sessao.inventario,

                endereco:
                    sessao.endereco,

                codigo:
                    codigo
            }
        );

    }
    catch (erro) {

        console.error(
            "Erro ao gravar coleta:",
            erro
        );

        mostrarUltimaLeitura(
            codigo +
            " - ERRO AO GRAVAR"
        );

    }

}


// ======================================================
// ÚLTIMA LEITURA
// ======================================================

function mostrarUltimaLeitura(texto) {

    const elemento =
        document.getElementById(
            "ultimaLeitura"
        );

    if (elemento) {
        elemento.innerText = texto;
    }

}


// ======================================================
// CÂMERA
// ======================================================

async function iniciarCamera() {

    const cameraArea =
        document.getElementById(
            "cameraArea"
        );

    const video =
        document.getElementById(
            "camera"
        );

    if (!cameraArea || !video) {

        console.warn(
            "Área da câmera não encontrada."
        );

        return;
    }

    // ==================================================
    // VERIFICA SUPORTE
    // ==================================================

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        cameraArea.style.display = "none";

        mostrarUltimaLeitura(
            "Câmera indisponível - digite o código"
        );

        return;
    }

    try {

        // ==================================================
        // SE JÁ EXISTIR CÂMERA, PARA PRIMEIRO
        // ==================================================

        pararCamera();

        // ==================================================
        // ABRE CÂMERA TRASEIRA
        // ==================================================

        streamCamera =
            await navigator.mediaDevices.getUserMedia(
                {
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
                }
            );

        // ==================================================
        // COLOCA STREAM NO VÍDEO
        // ==================================================

        video.srcObject =
            streamCamera;

        video.setAttribute(
            "playsinline",
            ""
        );

        video.setAttribute(
            "autoplay",
            ""
        );

        video.muted = true;

        cameraArea.style.display =
            "block";

        await video.play();

        console.log(
            "Câmera iniciada."
        );

    }
    catch (erro) {

        console.error(
            "Erro ao abrir câmera:",
            erro
        );

        cameraArea.style.display =
            "none";

        mostrarUltimaLeitura(
            "Câmera indisponível - digite o código"
        );

    }

}


// ======================================================
// PARAR CÂMERA
// ======================================================

function pararCamera() {

    if (streamCamera) {

        streamCamera
            .getTracks()
            .forEach(
                function (track) {

                    track.stop();

                }
            );

        streamCamera = null;
    }

}
