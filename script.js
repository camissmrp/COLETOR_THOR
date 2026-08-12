// =====================================================
// COLETOR THOR
// SCRIPT PRINCIPAL
// =====================================================

let configuracao = {};

let sessao = {
    usuario: null,
    nomeUsuario: "",
    inventario: "",
    endereco: "",
    totalEndereco: 0,
    totalColeta: 0
};

let leitor = null;
let processandoLeitura = false;
let produtosLidos = new Set();


// =====================================================
// INICIALIZAÇÃO
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

    console.log("COLETOR THOR iniciado");

    prepararTelaInicial();

    carregarConfiguracao();

});


// =====================================================
// PREPARAR TELA INICIAL
// =====================================================

function prepararTelaInicial() {

    const btn = document.getElementById("btnEntrar");

    const inventario = document.getElementById("inventario");

    const endereco = document.getElementById("endereco");


    if (!btn) {
        console.error("Botão btnEntrar não encontrado.");
        return;
    }


    btn.disabled = false;


    btn.addEventListener("click", function () {

        iniciarColeta();

    });


    if (inventario) {

        inventario.addEventListener("input", verificarFormulario);

    }


    if (endereco) {

        endereco.addEventListener("input", verificarFormulario);

    }


    verificarFormulario();

}


// =====================================================
// VERIFICAR FORMULÁRIO
// =====================================================

function verificarFormulario() {

    const usuario =
        document.getElementById("usuario");

    const inventario =
        document.getElementById("inventario");

    const endereco =
        document.getElementById("endereco");

    const btn =
        document.getElementById("btnEntrar");


    if (!btn) {
        return;
    }


    const usuarioValido =
        usuario &&
        usuario.value &&
        usuario.value !== "";


    const inventarioValido =
        inventario &&
        inventario.value.trim() !== "";


    const enderecoValido =
        endereco &&
        endereco.value.trim() !== "";


    /*
     * Não bloqueamos o botão enquanto a API
     * estiver carregando.
     *
     * Isso evita que a tela fique travada.
     */

    btn.disabled =
        !usuarioValido ||
        !inventarioValido ||
        !enderecoValido;

}


// =====================================================
// CARREGAR CONFIGURAÇÃO
// =====================================================

async function carregarConfiguracao() {

    const select =
        document.getElementById("usuario");


    if (!select) {
        console.error("Campo usuario não encontrado.");
        return;
    }


    select.innerHTML = "";


    const carregando =
        document.createElement("option");

    carregando.value = "";

    carregando.textContent =
        "Carregando usuários...";

    select.appendChild(carregando);


    try {

        console.log("Consultando API...");

        console.log("API:", API);


        const controlador =
            new AbortController();


        const timeout =
            setTimeout(function () {

                controlador.abort();

            }, 15000);


        const resposta =
            await fetch(
                API + "?acao=config&_=" + Date.now(),
                {
                    method: "GET",
                    cache: "no-store",
                    signal: controlador.signal
                }
            );


        clearTimeout(timeout);


        console.log(
            "Resposta API:",
            resposta.status
        );


        if (!resposta.ok) {

            throw new Error(
                "Erro HTTP " +
                resposta.status
            );

        }


        const texto =
            await resposta.text();


        console.log(
            "Resposta recebida:",
            texto
        );


        let dados;


        try {

            dados =
                JSON.parse(texto);

        } catch (erroJSON) {

            console.error(
                "Resposta não é JSON:",
                texto
            );

            throw new Error(
                "A API não retornou JSON válido."
            );

        }


        configuracao = dados;


        carregarUsuarios();


    } catch (erro) {

        console.error(
            "ERRO AO CARREGAR CONFIGURAÇÃO:",
            erro
        );


        select.innerHTML = "";


        const option =
            document.createElement("option");


        option.value = "";


        if (erro.name === "AbortError") {

            option.textContent =
                "Erro: API demorou para responder";

        } else {

            option.textContent =
                "Erro ao carregar usuários";

        }


        select.appendChild(option);


        mostrarStatusLogin(
            "Não foi possível carregar os usuários. " +
            "Verifique a conexão com a API.",
            true
        );

    }


    verificarFormulario();

}


// =====================================================
// CARREGAR USUÁRIOS
// =====================================================

function carregarUsuarios() {

    const select =
        document.getElementById("usuario");


    if (!select) {
        return;
    }


    select.innerHTML = "";


    const usuarios =
        configuracao.Usuarios;


    console.log(
        "Usuários recebidos:",
        usuarios
    );


    if (
        !Array.isArray(usuarios) ||
        usuarios.length === 0
    ) {

        const option =
            document.createElement("option");


        option.value = "";


        option.textContent =
            "Nenhum usuário encontrado";


        select.appendChild(option);


        verificarFormulario();


        return;
    }


    usuarios.forEach(function (usuario) {

        const option =
            document.createElement("option");


        option.value =
            usuario.id;


        option.textContent =
            usuario.nome;


        select.appendChild(option);

    });


    /*
     * Seleciona o primeiro usuário
     */

    if (usuarios.length > 0) {

        select.value =
            usuarios[0].id;

    }


    verificarFormulario();

}


// =====================================================
// INICIAR COLETA
// =====================================================

function iniciarColeta() {

    console.log("Iniciando coleta...");


    const selectUsuario =
        document.getElementById("usuario");


    const campoInventario =
        document.getElementById("inventario");


    const campoEndereco =
        document.getElementById("endereco");


    if (!selectUsuario) {

        alert(
            "Campo Usuário não encontrado."
        );

        return;

    }


    const inventario =
        campoInventario.value
            .trim()
            .toUpperCase();


    const endereco =
        campoEndereco.value
            .trim()
            .toUpperCase();


    if (!selectUsuario.value) {

        alert(
            "Selecione o usuário."
        );

        return;

    }


    if (!inventario) {

        alert(
            "Digite o inventário."
        );

        campoInventario.focus();

        return;

    }


    if (!endereco) {

        alert(
            "Digite o endereço."
        );

        campoEndereco.focus();

        return;

    }


    let usuarioSelecionado = null;


    if (
        configuracao &&
        Array.isArray(configuracao.Usuarios)
    ) {

        usuarioSelecionado =
            configuracao.Usuarios.find(
                function (u) {

                    return String(u.id) ===
                        String(selectUsuario.value);

                }
            );

    }


    sessao.usuario =
        selectUsuario.value;


    sessao.nomeUsuario =
        usuarioSelecionado
            ? usuarioSelecionado.nome
            : selectUsuario.options[
                selectUsuario.selectedIndex
            ].textContent;


    sessao.inventario =
        inventario;


    sessao.endereco =
        endereco;


    sessao.totalEndereco = 0;

    sessao.totalColeta = 0;

    produtosLidos.clear();


    /*
     * Atualizar informações
     */

    const lblUsuario =
        document.getElementById("lblUsuario");


    const lblInventario =
        document.getElementById("lblInventario");


    const lblEndereco =
        document.getElementById("lblEndereco");


    if (lblUsuario) {

        lblUsuario.textContent =
            sessao.nomeUsuario;

    }


    if (lblInventario) {

        lblInventario.textContent =
            sessao.inventario;

    }


    if (lblEndereco) {

        lblEndereco.textContent =
            sessao.endereco;

    }


    document.getElementById(
        "contadorEndereco"
    ).textContent = "0";


    document.getElementById(
        "contadorTotal"
    ).textContent = "0";


    document.getElementById(
        "ultimaLeitura"
    ).textContent = "-";


    /*
     * TROCAR TELA
     */

    const login =
        document.getElementById("login");


    const coleta =
        document.getElementById("coleta");


    if (!login || !coleta) {

        alert(
            "Erro: telas do coletor não encontradas."
        );

        return;

    }


    login.style.display =
        "none";


    coleta.style.display =
        "block";


    coleta.classList.remove(
        "hidden"
    );


    console.log(
        "Tela de coleta aberta."
    );


    /*
     * Iniciar câmera depois que a tela
     * estiver visível.
     */

    setTimeout(function () {

        iniciarCamera();

    }, 300);

}


// =====================================================
// INICIAR CÂMERA
// =====================================================

async function iniciarCamera() {

    const camera =
        document.getElementById("camera");


    const mensagem =
        document.getElementById(
            "cameraMessage"
        );


    /*
     * Se não existir câmera, não trava
     * a tela de coleta.
     */

    if (!camera) {

        console.error(
            "Elemento #camera não encontrado."
        );

        return;

    }


    try {

        if (mensagem) {

            mensagem.textContent =
                "Solicitando acesso à câmera...";

        }


        /*
         * Verificar suporte
         */

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            throw new Error(
                "Este navegador não suporta câmera."
            );

        }


        /*
         * Solicitar câmera traseira
         */

        const stream =
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


        camera.srcObject =
            stream;


        await camera.play();


        if (mensagem) {

            mensagem.style.display =
                "none";

        }


        console.log(
            "Câmera iniciada."
        );


        /*
         * Iniciar leitura ZXing
         */

        iniciarLeitorZXing();


    } catch (erro) {

        console.error(
            "Erro câmera:",
            erro
        );


        if (mensagem) {

            mensagem.style.display =
                "block";


            mensagem.textContent =
                "Não foi possível acessar a câmera. " +
                "Use a digitação manual abaixo.";

        }

    }

}


// =====================================================
// LEITOR ZXING
// =====================================================

function iniciarLeitorZXing() {

    /*
     * Verificar se a biblioteca carregou
     */

    if (
        typeof ZXingBrowser ===
        "undefined"
    ) {

        console.error(
            "Biblioteca ZXing não carregada."
        );

        return;

    }


    const video =
        document.getElementById(
            "camera"
        );


    if (!video) {

        return;

    }


    try {

        leitor =
            new ZXingBrowser.BrowserMultiFormatReader();


        console.log(
            "Leitor ZXing iniciado."
        );


        leitor.decodeFromVideoElement(
            video,
            function (
                resultado,
                erro
            ) {

                if (resultado) {

                    processarCodigo(
                        resultado.text
                    );

                }

            }
        );


    } catch (erro) {

        console.error(
            "Erro ao iniciar ZXing:",
            erro
        );

    }

}


// =====================================================
// PROCESSAR CÓDIGO
// =====================================================

function processarCodigo(codigo) {

    if (processandoLeitura) {

        return;

    }


    codigo =
        String(codigo)
            .trim()
            .toUpperCase();


    if (!codigo) {

        return;

    }


    processandoLeitura =
        true;


    const ultima =
        document.getElementById(
            "ultimaLeitura"
        );


    if (ultima) {

        ultima.textContent =
            codigo;

    }


    /*
     * Código começando com letra:
     * endereço
     */

    if (
        /^[A-Z]/.test(codigo)
    ) {

        alterarEndereco(
            codigo
        );


        liberarLeitura();


        return;

    }


    /*
     * Código começando com número:
     * produto
     */

    if (
        /^[0-9]/.test(codigo)
    ) {

        registrarProduto(
            codigo
        );


        return;

    }


    liberarLeitura();

}


// =====================================================
// ALTERAR ENDEREÇO
// =====================================================

function alterarEndereco(
    novoEndereco
) {

    sessao.endereco =
        novoEndereco;


    const lbl =
        document.getElementById(
            "lblEndereco"
        );


    if (lbl) {

        lbl.textContent =
            novoEndereco;

    }


    sessao.totalEndereco =
        0;


    const contador =
        document.getElementById(
            "contadorEndereco"
        );


    if (contador) {

        contador.textContent =
            "0";

    }


    produtosLidos.clear();

}


// =====================================================
// REGISTRAR PRODUTO
// =====================================================

function registrarProduto(
    codigo
) {

    /*
     * Evitar duplicidade
     */

    if (
        produtosLidos.has(codigo)
    ) {

        const ultima =
            document.getElementById(
                "ultimaLeitura"
            );


        if (ultima) {

            ultima.textContent =
                codigo +
                " - JÁ COLETADO";

        }


        liberarLeitura();


        return;

    }


    produtosLidos.add(
        codigo
    );


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

        contadorEndereco.textContent =
            sessao.totalEndereco;

    }


    if (contadorTotal) {

        contadorTotal.textContent =
            sessao.totalColeta;

    }


    /*
     * Enviar para API
     */

    registrarNoServidor(
        codigo
    );

}


// =====================================================
// REGISTRAR NO SERVIDOR
// =====================================================

function registrarNoServidor(
    codigo
) {

    const dados = {

        acao: "coleta",

        inventario:
            sessao.inventario,

        endereco:
            sessao.endereco,

        usuario:
            sessao.usuario,

        codigoBarras:
            codigo,

        tipoLeitura:
            "PRODUTO",

        nomeUsuario:
            sessao.nomeUsuario

    };


    console.log(
        "Enviando coleta:",
        dados
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
                JSON.stringify(
                    dados
                )

        }
    )
    .then(function () {

        console.log(
            "Coleta enviada."
        );

    })
    .catch(function (erro) {

        console.error(
            "Erro ao enviar coleta:",
            erro
        );

    });


    liberarLeitura();

}


// =====================================================
// LIBERAR PRÓXIMA LEITURA
// =====================================================

function liberarLeitura() {

    setTimeout(function () {

        processandoLeitura =
            false;

    }, 500);

}


// =====================================================
// DIGITAÇÃO MANUAL
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const codigo =
            document.getElementById(
                "codigo"
            );


        const btn =
            document.getElementById(
                "btnRegistrar"
            );


        if (btn) {

            btn.addEventListener(
                "click",
                registrarCodigoManual
            );

        }


        if (codigo) {

            codigo.addEventListener(
                "keydown",
                function (evento) {

                    if (
                        evento.key ===
                        "Enter"
                    ) {

                        evento.preventDefault();

                        registrarCodigoManual();

                    }

                }
            );

        }

    }
);


// =====================================================
// REGISTRAR CÓDIGO DIGITADO
// =====================================================

function registrarCodigoManual() {

    const campo =
        document.getElementById(
            "codigo"
        );


    if (!campo) {

        return;

    }


    const codigo =
        campo.value
            .trim()
            .toUpperCase();


    if (!codigo) {

        campo.focus();

        return;

    }


    processarCodigo(
        codigo
    );


    campo.value = "";


    setTimeout(
        function () {

            campo.focus();

        },
        100
    );

}


// =====================================================
// STATUS LOGIN
// =====================================================

function mostrarStatusLogin(
    mensagem,
    erro
) {

    const status =
        document.getElementById(
            "loginStatus"
        );


    if (!status) {

        return;

    }


    status.textContent =
        mensagem;


    status.style.display =
        "block";


    if (erro) {

        status.style.color =
            "#b00020";

    } else {

        status.style.color =
            "#333";

    }

}


// =====================================================
// PARAR CÂMERA
// =====================================================

function pararCamera() {

    const camera =
        document.getElementById(
            "camera"
        );


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


        camera.srcObject =
            null;

    }


    if (leitor) {

        try {

            leitor.reset();

        } catch (erro) {

            console.log(
                "ZXing já estava parado."
            );

        }

    }

}


// =====================================================
// AO SAIR DA PÁGINA
// =====================================================

window.addEventListener(
    "beforeunload",
    function () {

        pararCamera();

    }
);
