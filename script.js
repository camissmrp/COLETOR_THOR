window.onload = carregarConfiguracao;

let configuracao = {};

let sessao = {
    usuario: null,
    nomeUsuario: "",
    inventario: "",
    endereco: "",
    totalEndereco: 0,
    totalColeta: 0
};

let scanner = null;
let processandoLeitura = false;
let produtosLidos = new Set();


// =====================================================
// CARREGAR CONFIGURAÇÃO
// =====================================================

async function carregarConfiguracao() {

    try {

        const resposta = await fetch(API + "?acao=config");

        if (!resposta.ok) {
            throw new Error("Erro HTTP " + resposta.status);
        }

        const dados = await resposta.json();

        configuracao = dados;

        carregarUsuarios();

    } catch (erro) {

        console.error(erro);

        alert("Erro ao carregar a configuração do coletor.");

    }
}


// =====================================================
// CARREGAR USUÁRIOS
// =====================================================

function carregarUsuarios() {

    const select = document.getElementById("usuario");

    select.innerHTML = "";

    if (
        !configuracao.Usuarios ||
        configuracao.Usuarios.length === 0
    ) {

        const option = document.createElement("option");

        option.textContent = "Nenhum usuário";

        select.appendChild(option);

        return;
    }


    configuracao.Usuarios.forEach(usuario => {

        const option = document.createElement("option");

        option.value = usuario.id;

        option.textContent = usuario.nome;

        select.appendChild(option);

    });

}


// =====================================================
// INICIAR COLETA
// =====================================================

document
    .getElementById("btnEntrar")
    .addEventListener("click", iniciarColeta);


function iniciarColeta() {

    const selectUsuario =
        document.getElementById("usuario");

    const inventario =
        document.getElementById("inventario")
            .value
            .trim()
            .toUpperCase();

    const endereco =
        document.getElementById("endereco")
            .value
            .trim()
            .toUpperCase();


    if (!selectUsuario.value) {

        alert("Selecione o usuário.");

        return;
    }


    if (!inventario) {

        alert("Digite o inventário.");

        document
            .getElementById("inventario")
            .focus();

        return;
    }


    if (!endereco) {

        alert("Digite o endereço.");

        document
            .getElementById("endereco")
            .focus();

        return;
    }


    const usuarioSelecionado =
        configuracao.Usuarios.find(
            u => String(u.id) === String(selectUsuario.value)
        );


    sessao.usuario = selectUsuario.value;

    sessao.nomeUsuario =
        usuarioSelecionado
            ? usuarioSelecionado.nome
            : "";

    sessao.inventario = inventario;

    sessao.endereco = endereco;

    sessao.totalEndereco = 0;

    sessao.totalColeta = 0;

    produtosLidos.clear();


    document.getElementById("lblUsuario").textContent =
        sessao.nomeUsuario;

    document.getElementById("lblInventario").textContent =
        sessao.inventario;

    document.getElementById("lblEndereco").textContent =
        sessao.endereco;

    document.getElementById("contadorEndereco").textContent =
        "0";

    document.getElementById("contadorTotal").textContent =
        "0";

    document.getElementById("ultimaLeitura").textContent =
        "-";


    document.getElementById("login").style.display =
        "none";

    document.getElementById("coleta").style.display =
        "flex";


    iniciarCamera();
}


// =====================================================
// INICIAR CÂMERA
// =====================================================

async function iniciarCamera() {

    try {

        if (scanner) {

            try {
                await scanner.stop();
            } catch (e) {}

            scanner.clear();

        }


        scanner = new Html5Qrcode("reader");


        const cameras =
            await Html5Qrcode.getCameras();


        if (!cameras || cameras.length === 0) {

            alert("Nenhuma câmera encontrada.");

            return;
        }


        // Preferir câmera traseira
        let cameraId = cameras[0].id;

        const cameraTraseira =
            cameras.find(camera =>
                /back|rear|traseira|environment/i
                    .test(camera.label)
            );


        if (cameraTraseira) {

            cameraId =
                cameraTraseira.id;

        }


        scanner.start(

            cameraId,

            {
                fps: 15,

                qrbox: {
                    width: 280,
                    height: 140
                },

                aspectRatio: 1.777778

            },

            codigo => {

                processarCodigo(codigo);

            },

            erro => {

                // Não fazer nada.
                // Erros normais de leitura são ignorados.

            }

        ).catch(erro => {

            console.error(
                "Erro ao iniciar câmera:",
                erro
            );

            alert(
                "Não foi possível iniciar a câmera.\n\n" +
                "Verifique se o navegador possui permissão para usar a câmera."
            );

        });


    } catch (erro) {

        console.error(erro);

        alert(
            "Não foi possível acessar a câmera."
        );

    }

}


// =====================================================
// PROCESSAR CÓDIGO LIDO
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


    processandoLeitura = true;


    document
        .getElementById("ultimaLeitura")
        .textContent = codigo;


    // =================================================
    // REGRA:
    //
    // COMEÇA COM LETRA = ENDEREÇO
    //
    // COMEÇA COM NÚMERO = PRODUTO
    // =================================================


    const primeiroCaractere =
        codigo.charAt(0);


    const ehEndereco =
        /^[A-Z]/.test(primeiroCaractere);


    const ehProduto =
        /^[0-9]/.test(primeiroCaractere);


    if (ehEndereco) {

        alterarEndereco(codigo);

        liberarLeitura();

        return;
    }


    if (ehProduto) {

        registrarProduto(codigo);

        return;
    }


    liberarLeitura();

}


// =====================================================
// ALTERAR ENDEREÇO
// =====================================================

function alterarEndereco(novoEndereco) {

    sessao.endereco =
        novoEndereco;


    document
        .getElementById("lblEndereco")
        .textContent =
        novoEndereco;


    sessao.totalEndereco = 0;


    document
        .getElementById("contadorEndereco")
        .textContent =
        "0";


    produtosLidos.clear();

}


// =====================================================
// REGISTRAR PRODUTO
// =====================================================

function registrarProduto(codigo) {

    // Bloqueia produto duplicado
    if (produtosLidos.has(codigo)) {

        document
            .getElementById("ultimaLeitura")
            .textContent =
            codigo + " - JÁ COLETADO";

        liberarLeitura();

        return;
    }


    produtosLidos.add(codigo);


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


    // Registrar no servidor
    registrarNoServidor(codigo);

}


// =====================================================
// REGISTRAR NO GOOGLE SHEETS
// =====================================================

function registrarNoServidor(codigo) {

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


    // Usa no-cors para não bloquear
    // a leitura por causa do CORS.
    //
    // O aplicativo atualiza a tela imediatamente.
    // O envio acontece em segundo plano.

    fetch(API, {

        method: "POST",

        mode: "no-cors",

        headers: {
            "Content-Type":
                "text/plain;charset=utf-8"
        },

        body:
            JSON.stringify(dados)

    }).catch(erro => {

        console.error(
            "Erro ao registrar coleta:",
            erro
        );

    });


    // Liberar imediatamente para a próxima leitura
    liberarLeitura();

}


// =====================================================
// LIBERAR PARA PRÓXIMA LEITURA
// =====================================================

function liberarLeitura() {

    setTimeout(() => {

        processandoLeitura = false;

    }, 250);

}


// =====================================================
// AO SAIR DA PÁGINA
// =====================================================

window.addEventListener(
    "beforeunload",
    () => {

        if (scanner) {

            try {
                scanner.stop();
            } catch (e) {}

        }

    }
);
