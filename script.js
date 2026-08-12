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


// ======================================================
// INICIALIZAÇÃO
// ======================================================

window.addEventListener(
    "DOMContentLoaded",
    function () {

        campoUsuario =
            document.getElementById(
                "usuario"
            );

        campoInventario =
            document.getElementById(
                "inventario"
            );

        campoEndereco =
            document.getElementById(
                "endereco"
            );

        btnEntrar =
            document.getElementById(
                "btnEntrar"
            );

        btnRegistrar =
            document.getElementById(
                "btnRegistrar"
            );

        campoCodigo =
            document.getElementById(
                "codigo"
            );


        // ==============================================
        // GARANTE QUE INVENTÁRIO E ENDEREÇO SÃO EDITÁVEIS
        // ==============================================

        campoInventario.readOnly = false;

        campoInventario.disabled = false;

        campoEndereco.readOnly = false;

        campoEndereco.disabled = false;


        // ==============================================
        // BOTÃO INICIAR
        // ==============================================

        btnEntrar.addEventListener(
            "click",
            iniciarColeta
        );


        // ==============================================
        // BOTÃO REGISTRAR
        // ==============================================

        btnRegistrar.addEventListener(
            "click",
            function () {

                registrarCodigo(
                    campoCodigo.value
                );

            }
        );


        // ==============================================
        // ENTER NO CAMPO DO CÓDIGO
        // ==============================================

        campoCodigo.addEventListener(
            "keydown",
            function (evento) {

                if (
                    evento.key === "Enter"
                ) {

                    evento.preventDefault();

                    registrarCodigo(
                        campoCodigo.value
                    );

                }

            }
        );


        // ==============================================
        // CARREGA CONFIGURAÇÃO
        // ==============================================

        carregarConfiguracao();

    }
);


// ======================================================
// CARREGAR CONFIGURAÇÃO
// ======================================================

async function carregarConfiguracao() {

    try {

        const resposta =
            await fetch(
                API + "?acao=config"
            );


        const dados =
            await resposta.json();


        configuracao = dados;


        // ==============================================
        // USUÁRIOS
        // ==============================================

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


        // ==============================================
        // PRIMEIRO USUÁRIO
        // ==============================================

        if (
            dados.Usuarios &&
            dados.Usuarios.length > 0
        ) {

            atualizarConfiguracaoUsuario(
                dados.Usuarios[0].id
            );

        }


        // ==============================================
        // TROCA DE USUÁRIO
        // ==============================================

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

function atualizarConfiguracaoUsuario(
    usuarioId
) {


    // ==============================================
    // GARANTE CAMPOS EDITÁVEIS
    // ==============================================

    campoInventario.readOnly = false;

    campoInventario.disabled = false;

    campoEndereco.readOnly = false;

    campoEndereco.disabled = false;


    // ==============================================
    // PROCURA CONFIGURAÇÃO
    // ==============================================

    if (
        !configuracao.Configuracoes
    ) {

        campoInventario.value = "";

        campoEndereco.value = "";

        return;

    }


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


    // ==============================================
    // NÃO ENCONTROU
    // ==============================================

    if (!configUsuario) {

        campoInventario.value = "";

        campoEndereco.value = "";

        return;

    }


    // ==============================================
    // PREENCHE INVENTÁRIO
    // ==============================================

    campoInventario.value =
        configUsuario.inventario || "";


    // ==============================================
    // PREENCHE ENDEREÇO
    // ==============================================

    campoEndereco.value =
        configUsuario.enderecoAtual || "";


}


// ======================================================
// INICIAR COLETA
// ======================================================

function iniciarColeta() {


    // ==============================================
    // USUÁRIO
    // ==============================================

    if (
        !campoUsuario.value
    ) {

        alert(
            "Selecione um usuário."
        );

        return;

    }


    // ==============================================
    // INVENTÁRIO
    // ==============================================

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


    // ==============================================
    // ENDEREÇO
    // ==============================================

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


    // ==============================================
    // USUÁRIO
    // ==============================================

    sessao.usuario =
        campoUsuario.value;


    sessao.nomeUsuario =
        campoUsuario
            .options[
                campoUsuario.selectedIndex
            ]
            .text;


    // ==============================================
    // ATUALIZA CAMPOS
    // ==============================================

    campoInventario.value =
        sessao.inventario;

    campoEndereco.value =
        sessao.endereco;


    // ==============================================
    // LABELS
    // ==============================================

    document
        .getElementById(
            "lblUsuario"
        )
        .innerText =
        sessao.nomeUsuario;


    document
        .getElementById(
            "lblInventario"
        )
        .innerText =
        sessao.inventario;


    document
        .getElementById(
            "lblEndereco"
        )
        .innerText =
        sessao.endereco;


    // ==============================================
    // CONTADORES
    // ==============================================

    sessao.totalEndereco = 0;

    sessao.totalColeta = 0;


    document
        .getElementById(
            "contadorEndereco"
        )
        .innerText = "0";


    document
        .getElementById(
            "contadorTotal"
        )
        .innerText = "0";


    document
        .getElementById(
            "ultimaLeitura"
        )
        .innerText = "-";


    // ==============================================
    // TROCA DE TELA
    // ==============================================

    document
        .getElementById(
            "login"
        )
        .style.display =
        "none";


    document
        .getElementById(
            "coleta"
        )
        .style.display =
        "flex";


    // ==============================================
    // ABRE CÂMERA
    // ==============================================

    iniciarCamera();


    // ==============================================
    // FOCO NO CÓDIGO
    // ==============================================

    setTimeout(
        function () {

            campoCodigo.focus();

        },
        500
    );


    console.log(
        "Sessão iniciada:",
        sessao
    );

}


// ======================================================
// REGISTRAR CÓDIGO
// ======================================================

async function registrarCodigo(
    codigoRecebido
) {


    let codigo =
        String(
            codigoRecebido || ""
        )
        .trim()
        .toUpperCase();


    if (
        codigo === ""
    ) {

        return;

    }


    // ==============================================
    // LIMPA CAMPO
    // ==============================================

    campoCodigo.value = "";


    // ==============================================
    // CÓDIGO COMEÇANDO COM LETRA = ENDEREÇO
    // ==============================================

    if (
        /^[A-Z]/.test(codigo)
    ) {

        await alterarEndereco(
            codigo
        );


        campoCodigo.focus();


        return;

    }


    // ==============================================
    // CÓDIGO COMEÇANDO COM NÚMERO = PRODUTO
    // ==============================================

    if (
        /^[0-9]/.test(codigo)
    ) {

        await registrarProduto(
            codigo
        );


        campoCodigo.focus();


        return;

    }


    // ==============================================
    // CÓDIGO INVÁLIDO
    // ==============================================

    mostrarUltimaLeitura(
        codigo +
        " - INVÁLIDO"
    );


    campoCodigo.focus();

}


// ======================================================
// ALTERAR ENDEREÇO
// ======================================================

async function alterarEndereco(
    novoEndereco
) {


    novoEndereco =
        String(
            novoEndereco
        )
        .trim()
        .toUpperCase();


    // ==============================================
    // ATUALIZA SESSÃO
    // ==============================================

    sessao.endereco =
        novoEndereco;


    // ==============================================
    // ATUALIZA TELA
    // ==============================================

    document
        .getElementById(
            "lblEndereco"
        )
        .innerText =
        novoEndereco;


    // ==============================================
    // ZERA CONTADOR DO ENDEREÇO
    // ==============================================

    sessao.totalEndereco = 0;


    document
        .getElementById(
            "contadorEndereco"
        )
        .innerText = "0";


    // ==============================================
    // ATUALIZA TB_CONFIG
    // ==============================================

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
                            novoEndereco

                    })

            }
        );


        // ==========================================
        // ATUALIZA CONFIGURAÇÃO LOCAL
        // ==========================================

        if (
            configuracao.Configuracoes
        ) {

            const configUsuario =
                configuracao.Configuracoes.find(
                    function (config) {

                        return (
                            String(
                                config.usuario
                            ) ===
                            String(
                                sessao.usuario
                            )
                        );

                    }
                );


            if (
                configUsuario
            ) {

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

async function registrarProduto(
    codigo
) {


    // ==============================================
    // VERIFICA DUPLICIDADE
    // ==============================================

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


        // ==============================================
        // DUPLICADO
        // ==============================================

        if (
            verifica.existe
        ) {

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


    // ==============================================
    // GRAVA COLETA
    // ==============================================

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


        // ==============================================
        // CONTADORES
        // ==============================================

        sessao.totalEndereco++;

        sessao.totalColeta++;


        document
            .getElementById(
                "contadorEndereco"
            )
            .innerText =
            sessao.totalEndereco;


        document
            .getElementById(
                "contadorTotal"
            )
            .innerText =
            sessao.totalColeta;


        // ==============================================
        // ÚLTIMA LEITURA
        // ==============================================

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

function mostrarUltimaLeitura(
    texto
) {

    document
        .getElementById(
            "ultimaLeitura"
        )
        .innerText =
        texto;

}


// ======================================================
// CÂMERA
// ======================================================

let streamCamera = null;


async function iniciarCamera() {

    const cameraArea =
        document.getElementById(
            "cameraArea"
        );


    const video =
        document.getElementById(
            "camera"
        );


    // ==============================================
    // VERIFICA SUPORTE
    // ==============================================

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        cameraArea.style.display =
            "none";

        return;

    }


    try {

        streamCamera =
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
            streamCamera;


        cameraArea.style.display =
            "block";


        await video.play();


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

    if (
        streamCamera
    ) {

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
