let configuracao={};
let cameraStream=null;
let scannerControls=null;
let codeReader=null;
let cameraAtiva=false;
let ultimoCodigoLido="";
let ultimoCodigoTempo=0;
let audioContext=null;
let scannerBloqueado=false;
let processandoCodigo=false;

const sessao={
    usuario:"",
    nomeUsuario:"",
    inventario:"",
    endereco:"",
    tipoProduto:"",
    regraColeta:"",
    tipoColeta:"UNITARIA",
    totalEndereco:0,
    totalColeta:0,
    modoEndereco:false
};

document.addEventListener("DOMContentLoaded",()=>{
    document.getElementById("btnEntrar")?.addEventListener("click",iniciarColeta);
    document.getElementById("btnRegistrar")?.addEventListener("click",processarCodigoDigitado);
    document.getElementById("btnAlterarEndereco")?.addEventListener("click",ativarModoEndereco);

    document.getElementById("codigo")?.addEventListener("keydown",e=>{
        if(e.key==="Enter"){
            e.preventDefault();
            processarCodigoDigitado();
        }
    });

    document.getElementById("usuario")?.addEventListener("change",e=>{
        atualizarConfiguracaoUsuario(e.target.value);
    });

    document.getElementById("tipoProduto")?.addEventListener("change",atualizarTipoProduto);

    document.getElementById("cancelarQuantidadeLote")?.addEventListener(
        "click",
        cancelarQuantidadeLote
    );

    document.getElementById("confirmarQuantidadeLote")?.addEventListener(
        "click",
        confirmarQuantidadeLote
    );

    document.getElementById("quantidadeLote")?.addEventListener("keydown",e=>{
        if(e.key==="Enter"){
            e.preventDefault();
            confirmarQuantidadeLote();
        }
    });

    mostrarTelaLogin();
    carregarConfiguracao();
});

async function prepararAudio(){
    try{
        const AC=window.AudioContext||window.webkitAudioContext;
        if(!AC)return;

        if(!audioContext)audioContext=new AC();

        if(audioContext.state==="suspended"){
            await audioContext.resume();
        }
    }catch(erro){
        console.warn("Áudio:",erro);
    }
}

function emitirBip(){
    try{
        const AC=window.AudioContext||window.webkitAudioContext;
        if(!AC)return;

        if(!audioContext)audioContext=new AC();

        if(audioContext.state==="suspended"){
            audioContext.resume();
        }

        const agora=audioContext.currentTime;
        const oscilador=audioContext.createOscillator();
        const ganho=audioContext.createGain();

        oscilador.type="sine";
        oscilador.frequency.setValueAtTime(1800,agora);

        ganho.gain.setValueAtTime(0.0001,agora);
        ganho.gain.exponentialRampToValueAtTime(0.30,agora+0.01);
        ganho.gain.exponentialRampToValueAtTime(0.0001,agora+0.15);

        oscilador.connect(ganho);
        ganho.connect(audioContext.destination);

        oscilador.start(agora);
        oscilador.stop(agora+0.15);
    }catch(erro){
        console.warn("Bip:",erro);
    }
}

function mostrarTelaLogin(){
    document.getElementById("login")?.classList.remove("hidden");
    document.getElementById("coleta")?.classList.add("hidden");
    pararCamera();
}

function mostrarTelaColeta(){
    document.getElementById("login")?.classList.add("hidden");
    document.getElementById("coleta")?.classList.remove("hidden");
}

function mostrarLoginStatus(mensagem,tipo=""){
    const el=document.getElementById("loginStatus");
    if(!el)return;

    el.textContent=mensagem||"";
    el.className="status"+(tipo?" "+tipo:"");
}

function mostrarCollectionStatus(mensagem,tipo=""){
    const el=document.getElementById("collectionStatus");
    if(!el)return;

    el.textContent=mensagem||"";
    el.className="status"+(tipo?" "+tipo:"");
}

function mostrarCameraStatus(mensagem){
    const el=document.getElementById("cameraMessage");
    if(el)el.textContent=mensagem;
}

async function carregarConfiguracao(){
    try{
        mostrarLoginStatus("Carregando configuração...");

        const resposta=await fetch(
            API+"?acao=config&ts="+Date.now(),
            {cache:"no-store"}
        );

        if(!resposta.ok){
            throw new Error("HTTP "+resposta.status);
        }

        configuracao=await resposta.json();

        const selectUsuario=document.getElementById("usuario");

        if(!selectUsuario){
            throw new Error("Campo usuario não encontrado.");
        }

        selectUsuario.innerHTML="";

        const usuarios=Array.isArray(configuracao.Usuarios)
            ?configuracao.Usuarios
            :[];

        if(!usuarios.length){
            const option=document.createElement("option");

            option.value="";
            option.textContent="Nenhum usuário disponível";

            selectUsuario.appendChild(option);

            document.getElementById("btnEntrar").disabled=true;

            mostrarLoginStatus(
                "Nenhum usuário ativo foi encontrado.",
                "error"
            );

            return;
        }

        usuarios.forEach(usuario=>{
            const option=document.createElement("option");

            option.value=usuario.id;
            option.textContent=usuario.nome;

            selectUsuario.appendChild(option);
        });

        carregarTiposProduto();

        atualizarConfiguracaoUsuario(usuarios[0].id);

        document.getElementById("btnEntrar").disabled=false;

        mostrarLoginStatus("");

    }catch(erro){
        console.error("Erro configuração:",erro);

        mostrarLoginStatus(
            "Não foi possível carregar a configuração.",
            "error"
        );

        document.getElementById("btnEntrar").disabled=true;
    }
}

function carregarTiposProduto(){
    const select=document.getElementById("tipoProduto");
    if(!select)return;

    select.innerHTML="";

    const tipos=Array.isArray(configuracao.TiposProduto)
        ?configuracao.TiposProduto
        :[];

    if(!tipos.length){
        const option=document.createElement("option");

        option.value="";
        option.textContent="Nenhum tipo disponível";

        select.appendChild(option);
        return;
    }

    tipos.forEach(item=>{
        const option=document.createElement("option");

        option.value=item.tipoProduto;
        option.textContent=item.tipoProduto;

        option.dataset.regra=item.regraColeta||"";
        option.dataset.tipoColeta=item.tipoColeta||"UNITARIA";

        select.appendChild(option);
    });

    select.selectedIndex=0;

    atualizarTipoProduto();
}

function atualizarTipoProduto(){
    const select=document.getElementById("tipoProduto");
    if(!select)return;

    const opcao=select.options[select.selectedIndex];
    if(!opcao)return;

    sessao.tipoProduto=String(opcao.value||"")
        .trim()
        .toUpperCase();

    sessao.regraColeta=String(opcao.dataset.regra||"")
        .trim()
        .toUpperCase();

    sessao.tipoColeta=String(
        opcao.dataset.tipoColeta||"UNITARIA"
    )
        .trim()
        .toUpperCase();

    const botao=document.getElementById("btnAlterarEndereco");
    if(!botao)return;

    if(sessao.tipoProduto==="BLOCOS"){
        botao.style.display="block";
    }else{
        botao.style.display="none";
        sessao.modoEndereco=false;
    }
}

function atualizarConfiguracaoUsuario(usuarioId){
    const inventario=document.getElementById("inventario");
    const endereco=document.getElementById("endereco");

    let configUsuario=null;

    if(Array.isArray(configuracao.Configuracoes)){
        configUsuario=configuracao.Configuracoes.find(
            item=>String(item.usuario).trim()===String(usuarioId).trim()
        );
    }

    if(inventario){
        inventario.value=configUsuario?.inventario||"";
    }

    if(endereco){
        endereco.value=configUsuario?.enderecoAtual||"";
    }
}

async function iniciarColeta(){
    const usuario=document.getElementById("usuario");
    const inventario=document.getElementById("inventario");
    const endereco=document.getElementById("endereco");
    const tipoProduto=document.getElementById("tipoProduto");

    await prepararAudio();

    const opcaoUsuario=usuario.options[usuario.selectedIndex];

    sessao.usuario=String(usuario.value||"").trim();

    sessao.nomeUsuario=opcaoUsuario
        ?opcaoUsuario.textContent.trim()
        :"";

    sessao.inventario=String(inventario.value||"").trim();

    sessao.endereco=String(endereco.value||"")
        .trim()
        .toUpperCase();

    sessao.tipoProduto=String(tipoProduto.value||"")
        .trim()
        .toUpperCase();

    const opcaoTipo=tipoProduto.options[tipoProduto.selectedIndex];

    sessao.regraColeta=String(opcaoTipo?.dataset.regra||"")
        .trim()
        .toUpperCase();

    sessao.tipoColeta=String(
        opcaoTipo?.dataset.tipoColeta||"UNITARIA"
    )
        .trim()
        .toUpperCase();

    if(!sessao.usuario){
        mostrarLoginStatus("Selecione um usuário.","error");
        return;
    }

    if(!sessao.inventario){
        mostrarLoginStatus("Informe o inventário.","error");
        inventario.focus();
        return;
    }

    if(!sessao.tipoProduto){
        mostrarLoginStatus("Selecione o tipo de produto.","error");
        tipoProduto.focus();
        return;
    }

    if(!sessao.endereco){
        mostrarLoginStatus("Informe o endereço.","error");
        endereco.focus();
        return;
    }

    sessao.totalEndereco=0;
    sessao.totalColeta=0;
    sessao.modoEndereco=false;

    ultimoCodigoLido="";
    ultimoCodigoTempo=0;

    scannerBloqueado=false;
    processandoCodigo=false;

    document.getElementById("lblUsuario").textContent=sessao.nomeUsuario;
    document.getElementById("lblInventario").textContent=sessao.inventario;
    document.getElementById("lblTipoProduto").textContent=sessao.tipoProduto;
    document.getElementById("lblEndereco").textContent=sessao.endereco;

    document.getElementById("contadorEndereco").textContent="0";
    document.getElementById("contadorTotal").textContent="0";
    document.getElementById("ultimaLeitura").textContent="-";

    mostrarCollectionStatus("");

    atualizarBotaoEndereco();
    mostrarTelaColeta();

    await iniciarCamera();
}

async function iniciarCamera(){
    if(cameraAtiva)return;

    const video=document.getElementById("camera");

    if(!video)return;

    if(
        !navigator.mediaDevices||
        !navigator.mediaDevices.getUserMedia
    ){
        mostrarCameraStatus(
            "Câmera não disponível neste navegador."
        );

        return;
    }

    mostrarCameraStatus("Abrindo câmera...");

    try{
        cameraStream=await navigator.mediaDevices.getUserMedia({
            audio:false,
            video:{
                facingMode:{
                    ideal:"environment"
                },
                width:{
                    ideal:9999
                },
                height:{
                    ideal:9999
                },
                frameRate:{
                    ideal:30,
                    max:30
                }
            }
        });

        const track=cameraStream.getVideoTracks()[0];

        if(track){
            try{
                const capabilities=track.getCapabilities
                    ?track.getCapabilities()
                    :{};

                if(
                    capabilities.width?.max&&
                    capabilities.height?.max
                ){
                    await track.applyConstraints({
                        width:{
                            exact:capabilities.width.max
                        },
                        height:{
                            exact:capabilities.height.max
                        }
                    });

                    console.log(
                        "Resolução máxima:",
                        capabilities.width.max+
                        " x "+
                        capabilities.height.max
                    );
                }

                if(
                    Array.isArray(capabilities.focusMode)&&
                    capabilities.focusMode.includes("continuous")
                ){
                    await track.applyConstraints({
                        advanced:[
                            {
                                focusMode:"continuous"
                            }
                        ]
                    });

                    console.log("Foco contínuo ativado.");
                }

            }catch(erroCamera){
                console.warn(
                    "Configuração da câmera:",
                    erroCamera
                );
            }
        }

        video.srcObject=cameraStream;
        video.autoplay=true;
        video.muted=true;
        video.playsInline=true;

        video.setAttribute("playsinline","true");
        video.setAttribute("webkit-playsinline","true");

        await video.play();

        cameraAtiva=true;

        console.log(
            "Resolução real:",
            video.videoWidth+" x "+video.videoHeight
        );

        mostrarCameraStatus(
            "Aponte a câmera para o código de barras"
        );

        iniciarLeitorZXing(video);

    }catch(erro){
        console.error("Erro câmera:",erro);

        cameraAtiva=false;

        mostrarCameraStatus(
            "Não foi possível abrir a câmera."
        );

        mostrarCollectionStatus(
            "Use a digitação manual.",
            "error"
        );
    }
}

function iniciarLeitorZXing(video){
    if(scannerBloqueado)return;

    if(typeof ZXingBrowser==="undefined"){
        mostrarCameraStatus("Leitor não carregado.");
        console.error("ZXingBrowser não encontrado.");
        return;
    }

    try{
        if(scannerControls){
            try{
                scannerControls.stop();
            }catch(e){}
        }

        scannerControls=null;

        if(codeReader){
            try{
                codeReader.reset();
            }catch(e){}
        }

        codeReader=
            new ZXingBrowser.BrowserMultiFormatReader();

        codeReader.decodeFromVideoElement(
            video,
            (resultado,erro)=>{

                if(scannerBloqueado)return;
                if(processandoCodigo)return;
                if(!resultado)return;

                let codigo="";

                try{
                    codigo=resultado.getText
                        ?resultado.getText()
                        :resultado.text||"";
                }catch(e){
                    console.warn(
                        "Erro obtendo código:",
                        e
                    );

                    return;
                }

                codigo=normalizarCodigo(codigo);

                if(!codigo)return;

                receberCodigoDaCamera(codigo);
            }
        )
        .then(controles=>{
            if(scannerBloqueado){
                try{
                    controles.stop();
                }catch(e){}

                return;
            }

            scannerControls=controles;

            console.log("Scanner iniciado.");
        })
        .catch(erro=>{
            console.error(
                "Erro ZXing:",
                erro
            );

            mostrarCameraStatus(
                "Erro no leitor de código."
            );
        });

    }catch(erro){
        console.error(
            "Erro criando leitor:",
            erro
        );

        mostrarCameraStatus(
            "Erro ao iniciar leitor."
        );
    }
}

function pararLeitorZXing(){
    try{
        if(
            scannerControls&&
            typeof scannerControls.stop==="function"
        ){
            scannerControls.stop();
        }
    }catch(erro){
        console.warn(
            "Erro parando scanner:",
            erro
        );
    }

    scannerControls=null;

    try{
        if(
            codeReader&&
            typeof codeReader.reset==="function"
        ){
            codeReader.reset();
        }
    }catch(erro){
        console.warn(
            "Erro resetando ZXing:",
            erro
        );
    }

    codeReader=null;
}

function receberCodigoDaCamera(codigo){
    if(
        scannerBloqueado||
        processandoCodigo
    ){
        return;
    }

    const agora=Date.now();

    codigo=normalizarCodigo(codigo);

    if(!codigo)return;

    if(
        codigo===ultimoCodigoLido&&
        agora-ultimoCodigoTempo<800
    ){
        return;
    }

    ultimoCodigoLido=codigo;
    ultimoCodigoTempo=agora;

    const campo=document.getElementById("codigo");

    if(campo){
        campo.value="";
    }

    processarCodigo(codigo);
}

function processarCodigoDigitado(){
    if(
        scannerBloqueado||
        processandoCodigo
    ){
        return;
    }

    const campo=document.getElementById("codigo");

    if(!campo)return;

    const codigo=normalizarCodigo(campo.value);

    if(!codigo)return;

    processarCodigo(codigo);
}

function normalizarCodigo(valor){
    return String(valor||"")
        .replace(/[\r\n\t]/g,"")
        .trim()
        .toUpperCase();
}


/* =====================================================
   PROCESSAMENTO PRINCIPAL
   A REGRA VEM DA TB_TIPOS_PRODUTO
===================================================== */

function processarCodigo(codigo){
    if(
        !codigo||
        scannerBloqueado||
        processandoCodigo
    ){
        return;
    }

    if(
        !sessao.usuario||
        !sessao.inventario||
        !sessao.endereco||
        !sessao.tipoProduto
    ){
        mostrarCollectionStatus(
            "Sessão inválida.",
            "error"
        );

        return;
    }

    processandoCodigo=true;


    /* MODO MANUAL DE ALTERAÇÃO DE ENDEREÇO */

    if(sessao.modoEndereco){
        processarNovoEndereco(codigo);

        emitirBip();

        processandoCodigo=false;
        limparCampoCodigo();

        return;
    }


    /* =================================================
       REGRA DE COLETA
       
       NUMERO_PRODUTO:
       número = produto
       letra = endereço

       MANUAL:
       tudo = produto
    ================================================= */

    if(sessao.regraColeta==="NUMERO_PRODUTO"){

        if(/^[A-Z]/.test(codigo)){

            processarNovoEndereco(codigo);

            emitirBip();

            processandoCodigo=false;
            limparCampoCodigo();

            return;
        }

        if(!/^\d/.test(codigo)){

            document.getElementById(
                "ultimaLeitura"
            ).textContent=
                codigo+" - INVÁLIDO";

            mostrarCollectionStatus(
                "Código inválido.",
                "error"
            );

            processandoCodigo=false;
            limparCampoCodigo();

            return;
        }
    }


    /* =================================================
       CÓDIGO CONFIRMADO COMO PRODUTO
    ================================================= */

    emitirBip();


    /* =================================================
       TIPO DE COLETA
       
       LOTE:
       abre quantidade

       UNITARIA:
       registra 1
    ================================================= */

    if(sessao.tipoColeta==="LOTE"){

        scannerBloqueado=true;

        pararLeitorZXing();

        limparCampoCodigo();

        solicitarQuantidadeLote(codigo);

        return;
    }


    registrarProduto(codigo,1);

    processandoCodigo=false;

    limparCampoCodigo();
}


/* =====================================================
   MODAL DE QUANTIDADE
   O HTML JÁ POSSUI A JANELA
===================================================== */

function solicitarQuantidadeLote(codigo){

    const modal=document.getElementById(
        "modalQuantidadeLote"
    );

    const campo=document.getElementById(
        "quantidadeLote"
    );

    const codigoCapturado=document.getElementById(
        "codigoLoteCapturado"
    );

    const erro=document.getElementById(
        "erroQuantidadeLote"
    );

    if(!modal||!campo||!codigoCapturado||!erro){

        console.error(
            "Elementos da coleta em lote não encontrados."
        );

        scannerBloqueado=false;
        processandoCodigo=false;

        reiniciarScanner();

        return;
    }

    modal.dataset.codigo=codigo;

    codigoCapturado.textContent=codigo;

    campo.value="";
    erro.textContent="";

    modal.style.display="flex";

    setTimeout(()=>{
        campo.focus();
    },100);
}


function cancelarQuantidadeLote(){

    fecharQuantidadeLote();

    mostrarCollectionStatus(
        "Coleta cancelada.",
        "error"
    );

    processandoCodigo=false;
    scannerBloqueado=false;

    ultimoCodigoLido="";
    ultimoCodigoTempo=0;

    limparCampoCodigo();

    reiniciarScanner();
}


function confirmarQuantidadeLote(){

    const modal=document.getElementById(
        "modalQuantidadeLote"
    );

    if(!modal)return;

    const codigo=modal.dataset.codigo||"";

    const campo=document.getElementById(
        "quantidadeLote"
    );

    const erro=document.getElementById(
        "erroQuantidadeLote"
    );

    if(!codigo){
        erro.textContent="Código não encontrado.";
        return;
    }

    const quantidade=Number(
        String(campo.value||"")
            .replace(",",".")
            .trim()
    );

    if(
        !Number.isInteger(quantidade)||
        quantidade<=0
    ){
        erro.textContent=
            "Informe uma quantidade inteira maior que zero.";

        campo.focus();

        return;
    }

    fecharQuantidadeLote();

    registrarProduto(
        codigo,
        quantidade
    );

    processandoCodigo=false;
    scannerBloqueado=false;

    ultimoCodigoLido="";
    ultimoCodigoTempo=0;

    limparCampoCodigo();

    reiniciarScanner();
}


function fecharQuantidadeLote(){

    const modal=document.getElementById(
        "modalQuantidadeLote"
    );

    if(modal){
        modal.style.display="none";
        modal.dataset.codigo="";
    }
}


function reiniciarScanner(){

    if(
        !cameraAtiva||
        scannerBloqueado
    ){
        return;
    }

    const video=document.getElementById(
        "camera"
    );

    if(!video)return;

    pararLeitorZXing();

    iniciarLeitorZXing(video);
}


/* =====================================================
   REGISTRO DO PRODUTO
===================================================== */

function registrarProduto(
    codigo,
    quantidade=1
){

    const ultima=document.getElementById(
        "ultimaLeitura"
    );

    if(ultima){
        ultima.textContent=codigo;
    }

    const mensagem=
        sessao.tipoColeta==="LOTE"
            ?"Lote enviado: "+
             quantidade+
             " peças."
            :"Coleta enviada.";

    mostrarCollectionStatus(
        mensagem,
        "success"
    );

    sessao.totalEndereco+=quantidade;
    sessao.totalColeta+=quantidade;

    const contadorEndereco=
        document.getElementById(
            "contadorEndereco"
        );

    const contadorTotal=
        document.getElementById(
            "contadorTotal"
        );

    if(contadorEndereco){
        contadorEndereco.textContent=
            sessao.totalEndereco;
    }

    if(contadorTotal){
        contadorTotal.textContent=
            sessao.totalColeta;
    }


    fetch(
        API,
        {
            method:"POST",
            mode:"no-cors",

            headers:{
                "Content-Type":
                    "text/plain;charset=utf-8"
            },

            body:JSON.stringify({

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
                    "PRODUTO",

                tipoProduto:
                    sessao.tipoProduto,

                quantidade:
                    quantidade
            })
        }
    )
    .then(()=>{
        console.log(
            "Coleta enviada:",
            codigo,
            "Tipo:",
            sessao.tipoProduto,
            "Regra:",
            sessao.regraColeta,
            "Coleta:",
            sessao.tipoColeta,
            "Quantidade:",
            quantidade
        );
    })
    .catch(erro=>{
        console.error(
            "Erro enviando:",
            erro
        );
    });

    limparCampoCodigo();
}


/* =====================================================
   ENDEREÇO
===================================================== */

function limparCampoCodigo(){

    const campo=document.getElementById(
        "codigo"
    );

    if(campo){
        campo.value="";
    }
}


function ativarModoEndereco(){

    if(sessao.tipoProduto!=="BLOCOS"){
        return;
    }

    sessao.modoEndereco=true;

    atualizarBotaoEndereco();

    mostrarCollectionStatus(
        "Leia o código do novo endereço.",
        "success"
    );

    mostrarCameraStatus(
        "LEIA O CÓDIGO DO NOVO ENDEREÇO"
    );

    limparCampoCodigo();
}


function atualizarBotaoEndereco(){

    const botao=document.getElementById(
        "btnAlterarEndereco"
    );

    if(!botao)return;

    if(sessao.tipoProduto!=="BLOCOS"){
        botao.style.display="none";
        return;
    }

    botao.style.display="block";

    if(sessao.modoEndereco){

        botao.textContent=
            "LENDO NOVO ENDEREÇO";

        botao.disabled=true;

    }else{

        botao.textContent=
            "ALTERAR ENDEREÇO";

        botao.disabled=false;
    }
}


function processarNovoEndereco(
    novoEndereco
){

    novoEndereco=
        normalizarCodigo(
            novoEndereco
        );

    if(!novoEndereco)return;

    sessao.endereco=novoEndereco;
    sessao.totalEndereco=0;
    sessao.modoEndereco=false;

    document.getElementById(
        "lblEndereco"
    ).textContent=
        novoEndereco;

    document.getElementById(
        "contadorEndereco"
    ).textContent=
        "0";

    document.getElementById(
        "ultimaLeitura"
    ).textContent=
        novoEndereco;

    mostrarCollectionStatus(
        "Endereço alterado.",
        "success"
    );

    mostrarCameraStatus(
        "Aponte a câmera para o código de barras"
    );

    atualizarBotaoEndereco();


    fetch(
        API,
        {
            method:"POST",
            mode:"no-cors",

            headers:{
                "Content-Type":
                    "text/plain;charset=utf-8"
            },

            body:JSON.stringify({

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
    )
    .catch(erro=>{
        console.error(
            "Erro endereço:",
            erro
        );
    });

    limparCampoCodigo();
}


/* =====================================================
   CÂMERA
===================================================== */

function pararCamera(){

    scannerBloqueado=true;
    processandoCodigo=false;

    try{
        if(
            scannerControls&&
            typeof scannerControls.stop==="function"
        ){
            scannerControls.stop();
        }
    }catch(erro){
        console.warn(
            "Erro parando scanner:",
            erro
        );
    }

    scannerControls=null;

    try{
        if(
            codeReader&&
            typeof codeReader.reset==="function"
        ){
            codeReader.reset();
        }
    }catch(erro){
        console.warn(
            "Erro resetando ZXing:",
            erro
        );
    }

    codeReader=null;

    if(cameraStream){

        cameraStream
            .getTracks()
            .forEach(track=>{
                try{
                    track.stop();
                }catch(erro){}
            });
    }

    cameraStream=null;
    cameraAtiva=false;

    const video=document.getElementById(
        "camera"
    );

    if(video){

        try{
            video.pause();
        }catch(e){}

        video.srcObject=null;
    }

    scannerBloqueado=false;
}

window.addEventListener(
    "pagehide",
    pararCamera
);

window.addEventListener(
    "beforeunload",
    pararCamera
);
