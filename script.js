// =====================================================
// COLETOR THOR
// =====================================================

window.onload = carregarConfiguracao;


// =====================================================
// VARIÁVEIS
// =====================================================

let configuracao = {};

let scanner = null;

let processandoLeitura = false;

let produtosLidos = new Set();


let sessao = {

    usuario: null,

    nomeUsuario: "",

    inventario: "",

    endereco: "",

    totalEndereco: 0,

    totalColeta: 0

};


// =====================================================
// CARREGAR CONFIGURAÇÃO
// =====================================================

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


        carregarUsuarios();


    } catch (erro) {

        console.error(
            "Erro ao carregar configuração:",
            erro
        );


        alert(
            "Erro ao carregar a configuração do coletor."
        );

    }

}


// =====================================================
// CARREGAR USUÁRIOS
// =====================================================

function carregarUsuarios() {

    const select =
        document.getElementById(
            "usuario"
        );


    select.innerHTML = "";


    if (
        !configuracao.Usuarios ||
        configuracao.Usuarios.length === 0
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.value = "";

        option.textContent =
            "Nenhum usuário";


        select.appendChild(
            option
        );


        return;

    }


    configuracao.Usuarios.forEach(
        usuario => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                usuario.id;


            option.textContent =
                usuario.nome;


            select.appendChild(
                option
            );

        }
    );

}


// =====================================================
// BOTÃO INICIAR COLETA
// =====================================================

document
    .getElementById("btnEntrar")
    .addEventListener(
        "click",
        iniciarColeta
    );


// =====================================================
// INICIAR COLETA
// =====================================================

function iniciarColeta() {

    const selectUsuario =
        document.getElementById(
            "usuario"
        );


    const inventario =
        document
            .getElementById(
                "inventario"
            )
            .value
            .trim()
            .toUpperCase();


    const endereco =
        document
            .getElementById(
                "endereco"
            )
            .value
            .trim()
            .toUpperCase();


    // -------------------------------------------------
    // VALIDAR USUÁRIO
    // -------------------------------------------------

    if (!selectUsuario.value) {

        alert(
            "Selecione o usuário."
        );

        return;

    }


    // -------------------------------------------------
    // VALIDAR INVENTÁRIO
    // -------------------------------------------------

    if (!inventario) {

        alert(
            "Digite o inventário."
        );


        document
            .getElementById(
                "inventario"
            )
            .focus();


        return;

    }


    // -------------------------------------------------
    // VALIDAR ENDEREÇO
    // -------------------------------------------------

    if (!endereco) {

        alert(
            "Digite o endereço."
        );


        document
            .getElementById(
                "endereco"
            )
            .focus();


        return;

    }


    // -------------------------------------------------
    // LOCALIZAR USUÁRIO
    // -------------------------------------------------

    const usuarioSelecionado =
        configuracao.Usuarios.find(
            usuario =>
                String(usuario.id) ===
                String(selectUsuario.value)
        );


    // -------------------------------------------------
    // SALVAR SESSÃO
    // -------------------------------------------------

    sessao.usuario =
        selectUsuario.value;


    sessao.nomeUsuario =
        usuarioSelecionado
            ? usuarioSelecionado.nome
            : "";


    sessao.inventario =
        inventario;


    sessao.endereco =
        endereco;


    sessao.totalEndereco =
        0;


    sessao.totalColeta =
        0;


    produtosLidos.clear();


    // -------------------------------------------------
    // ATUALIZAR TELA
    // -------------------------------------------------

    document
        .getElementById(
            "lblUsuario"
        )
        .textContent =
        sessao.nomeUsuario;


    document
        .getElementById(
            "lblInventario"
        )
        .textContent =
        sessao.inventario;


    document
        .getElementById(
            "lblEndereco"
        )
        .textContent =
        sessao.endereco;


    document
        .getElementById(
            "contadorEndereco"
        )
        .textContent =
        "0";


    document
        .getElementById(
            "contadorTotal"
        )
        .textContent =
        "0";


    document
        .getElementById(
            "ultimaLeitura"
        )
        .textContent =
        "-";


    // -------------------------------------------------
    // TROCAR DE TELA
    // -------------------------------------------------

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
        "block";


    // -------------------------------------------------
    // INICIAR CÂMERA
    // -------------------------------------------------

    iniciarCamera();

}


// =====================================================
// INICIAR CÂMERA
// =====================================================

async function iniciarCamera() {

    try {

        // Se já existir câmera aberta,
        // encerra antes de abrir novamente.

        if (scanner) {

            try {

                await scanner.stop();

            } catch (e) {}

            try {

                scanner.clear();

            } catch (e) {}

        }


        scanner =
            new Html5Qrcode(
                "reader"
            );


        const configuracaoScanner = {

            fps: 15,

            qrbox: function (
                largura,
                altura
            ) {

                // Área horizontal para
                // códigos de barras.

                const larguraCaixa =
                    Math.floor(
                        largura * 0.85
                    );


                const alturaCaixa =
                    Math.floor(
                        Math.min(
                            140,
                            altura * 0.35
                        )
                    );


                return {

                    width:
                        larguraCaixa,

                    height:
                        alturaCaixa

                };

            },

            aspectRatio: 1.7777778,

            experimentalFeatures: {

                useBarCodeDetectorIfSupported:
                    false

            }

        };


        // =================================================
        // PRIMEIRA TENTATIVA
        // CÂMERA TRASEIRA
        // =================================================

        try {

            await scanner.start(

                {
                    facingMode: "environment"
                },

                configuracaoScanner,

                codigo => {

                    processarCodigo(
                        codigo
                    );

                },

                erro => {

                    // Erros normais de
                    // tentativa de leitura
                    // são ignorados.

                }

            );


            console.log(
                "Câmera traseira iniciada."
            );


            return;


        } catch (erroCamera) {

            console.warn(
                "Falha ao abrir câmera traseira:",
                erroCamera
            );

        }


        // =================================================
        // SEGUNDA TENTATIVA
        // LOCALIZAR CÂMERAS
        // =================================================

        const cameras =
            await Html5Qrcode.getCameras();


        if (
            !cameras ||
            cameras.length === 0
        ) {

            throw new Error(
                "Nenhuma câmera encontrada."
            );

        }


        let cameraId =
            cameras[0].id;


        const cameraTraseira =
            cameras.find(
                camera =>
                    /back|rear|traseira|environment/i
                        .test(
                            camera.label
                        )
            );


        if (cameraTraseira) {

            cameraId =
                cameraTraseira.id;

        }


        await scanner.start(

            cameraId,

            configuracaoScanner,

            codigo => {

                processarCodigo(
                    codigo
                );

            },

            erro => {}

        );


        console.log(
            "Câmera iniciada pelo ID."
        );


    } catch (erro) {

        console.error(
            "Erro ao iniciar câmera:",
            erro
        );


        const reader =
            document.getElementById(
                "reader"
            );


        reader.innerHTML = `

            <div style="
                padding:30px;
                text-align:center;
                color:white;
                background:#222;
                border-radius:8px;
            ">

                <strong>
                    Não foi possível iniciar a câmera.
                </strong>

                <br><br>

                Use o campo
                <strong>
                    "Ou digite o código"
                </strong>
                abaixo.

            </div>

        `;

    }

}


// =====================================================
// PROCESSAR CÓDIGO
// =====================================================

function processarCodigo(
    codigo
) {

    // Evitar várias chamadas
    // simultâneas do scanner.

    if (
        processandoLeitura
    ) {

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


    processarCodigoLido(
        codigo
    );


    // Pequeno intervalo para
    // evitar que o mesmo código
    // seja capturado dezenas de vezes
    // pelo vídeo.

    setTimeout(
        () => {

            processandoLeitura =
                false;

        },
        350
    );

}


// =====================================================
// PROCESSAR CÓDIGO MANUAL
// =====================================================

function processarCodigoManual() {

    const campo =
        document.getElementById(
            "codigoManual"
        );


    const codigo =
        campo.value
            .trim()
            .toUpperCase();


    if (!codigo) {

        campo.focus();

        return;

    }


    if (
        processandoLeitura
    ) {

        return;

    }


    processandoLeitura =
        true;


    processarCodigoLido(
        codigo
    );


    campo.value =
        "";


    setTimeout(
        () => {

            processandoLeitura =
                false;


            campo.focus();

        },
        200
    );

}


// =====================================================
// BOTÃO REGISTRAR MANUAL
// =====================================================

document
    .getElementById(
        "btnRegistrarManual"
    )
    .addEventListener(
        "click",
        processarCodigoManual
    );


// =====================================================
// ENTER NO CAMPO MANUAL
// =====================================================

document
    .getElementById(
        "codigoManual"
    )
    .addEventListener(
        "keydown",
        function(event) {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                processarCodigoManual();

            }

        }
    );


// =====================================================
// PROCESSAR CÓDIGO LIDO
// =====================================================

function processarCodigoLido(
    codigo
) {

    document
        .getElementById(
            "ultimaLeitura"
        )
        .textContent =
        codigo;


    // =================================================
    // REGRA DO COLETOR
    //
    // LETRA = ENDEREÇO
    //
    // NÚMERO = PRODUTO
    // =================================================


    const primeiroCaractere =
        codigo.charAt(0);


    const ehEndereco =
        /^[A-Z]/.test(
            primeiroCaractere
        );


    const ehProduto =
        /^[0-9]/.test(
            primeiroCaractere
        );


    // =================================================
    // ENDEREÇO
    // =================================================

    if (ehEndereco) {

        alterarEndereco(
            codigo
        );

        return;

    }


    // =================================================
    // PRODUTO
    // =================================================

    if (ehProduto) {

        registrarProduto(
            codigo
        );

        return;

    }


    // =================================================
    // CÓDIGO INVÁLIDO
    // =================================================

    document
        .getElementById(
            "ultimaLeitura"
        )
        .textContent =
        codigo + " - INVÁLIDO";

}


// =====================================================
// ALTERAR ENDEREÇO
// =====================================================

function alterarEndereco(
    novoEndereco
) {

    novoEndereco =
        String(novoEndereco)
            .trim()
            .toUpperCase();


    sessao.endereco =
        novoEndereco;


    // Zerar contador do endereço

    sessao.totalEndereco =
        0;


    // Limpar lista de produtos
    // daquele endereço

    produtosLidos.clear();


    document
        .getElementById(
            "lblEndereco"
        )
        .textContent =
        novoEndereco;


    document
        .getElementById(
            "contadorEndereco"
        )
        .textContent =
        "0";


    document
        .getElementById(
            "ultimaLeitura"
        )
        .textContent =
        novoEndereco;


    // NÃO grava endereço na planilha.
    //
    // O endereço será gravado junto
    // com cada produto coletado.

}


// =====================================================
// REGISTRAR PRODUTO
// =====================================================

function registrarProduto(
    codigo
) {

    // =================================================
    // VERIFICAR DUPLICIDADE
    // =================================================

    if (
        produtosLidos.has(
            codigo
        )
    ) {

        document
            .getElementById(
                "ultimaLeitura"
            )
            .textContent =
            codigo +
            " - JÁ COLETADO";


        return;

    }


    // =================================================
    // MARCAR COMO LIDO
    // =================================================

    produtosLidos.add(
        codigo
    );


    // =================================================
    // ATUALIZAR CONTADORES
    // =================================================

    sessao.totalEndereco++;

    sessao.totalColeta++;


    document
        .getElementById(
            "contadorEndereco"
        )
        .textContent =
        sessao.totalEndereco;


    document
        .getElementById(
            "contadorTotal"
        )
        .textContent =
        sessao.totalColeta;


    // =================================================
    // REGISTRAR NO GOOGLE SHEETS
    // =================================================

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

        acao:
            "coleta",

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


    // =================================================
    // ENVIO EM SEGUNDO PLANO
    // =================================================

    fetch(

        API,

        {

            method:
                "POST",

            mode:
                "no-cors",

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
    .then(
        () => {

            console.log(
                "Coleta enviada."
            );

        }
    )
    .catch(
        erro => {

            console.error(
                "Erro ao registrar coleta:",
                erro
            );

        }
    );

}


// =====================================================
// FOCAR CAMPO MANUAL
// =====================================================

document
    .getElementById(
        "codigoManual"
    )
    .addEventListener(
        "focus",
        function() {

            this.select();

        }
    );


// =====================================================
// FINALIZAR CÂMERA AO SAIR
// =====================================================

window.addEventListener(
    "beforeunload",
    async function() {

        if (scanner) {

            try {

                await scanner.stop();

            } catch (e) {}

        }

    }
);
