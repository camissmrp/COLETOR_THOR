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
let nativeDetector=null;
let nativeScanTimer=null;
let nativeScanBusy=false;
let scanCanvas=null;
let scanCtx=null;
let scannerLoopAtivo=false;

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

let honeywellBuffer="";
let honeywellTimer=null;

document.addEventListener("DOMContentLoaded",()=>{
 document.getElementById("btnEntrar")?.addEventListener("click",iniciarColeta);
 document.getElementById("btnRegistrar")?.addEventListener("click",processarCodigoDigitado);
 document.getElementById("btnAlterarEndereco")?.addEventListener("click",ativarModoEndereco);

 const campo=document.getElementById("codigo");

 campo?.addEventListener("keydown",e=>{
  if(e.key==="Enter"){
   e.preventDefault();
   processarCodigoHoneywell();
  }
 });

 campo?.addEventListener("input",capturarEntradaHoneywell);

 iniciarLeitorHoneywell();

 document.getElementById("usuario")?.addEventListener("change",e=>{
  atualizarConfiguracaoUsuario(e.target.value);
 });

 document.getElementById("tipoProduto")?.addEventListener("change",atualizarTipoProduto);

 mostrarTelaLogin();
 carregarConfiguracao();
});

async function prepararAudio(){
 try{
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return;
  if(!audioContext)audioContext=new AC();
  if(audioContext.state==="suspended")await audioContext.resume();
 }catch(erro){console.warn("Áudio:",erro);}
}

function emitirBip(){
 try{
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return;
  if(!audioContext)audioContext=new AC();
  if(audioContext.state==="suspended")audioContext.resume();

  const agora=audioContext.currentTime;
  const oscilador=audioContext.createOscillator();
  const ganho=audioContext.createGain();

  oscilador.type="sine";
  oscilador.frequency.setValueAtTime(1800,agora);
  ganho.gain.setValueAtTime(.0001,agora);
  ganho.gain.exponentialRampToValueAtTime(.30,agora+.01);
  ganho.gain.exponentialRampToValueAtTime(.0001,agora+.15);

  oscilador.connect(ganho);
  ganho.connect(audioContext.destination);
  oscilador.start(agora);
  oscilador.stop(agora+.15);
 }catch(erro){console.warn("Bip:",erro);}
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

  if(!resposta.ok)throw new Error("HTTP "+resposta.status);

  configuracao=await resposta.json();

  const selectUsuario=document.getElementById("usuario");
  if(!selectUsuario)throw new Error("Campo usuario não encontrado.");

  selectUsuario.innerHTML="";

  const usuarios=Array.isArray(configuracao.Usuarios)
   ?configuracao.Usuarios:[];

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
  ?configuracao.TiposProduto:[];

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
  .trim().toUpperCase();

 sessao.regraColeta=String(opcao.dataset.regra||"")
  .trim().toUpperCase();

 sessao.tipoColeta=String(
  opcao.dataset.tipoColeta||"UNITARIA"
 ).trim().toUpperCase();

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
  configUsuario=configuracao.Configuracoes.find(item=>
   String(item.usuario).trim()===String(usuarioId).trim()
  );
 }

 if(inventario)
  inventario.value=configUsuario?.inventario||"";

 if(endereco)
  endereco.value=configUsuario?.enderecoAtual||"";
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
  ?opcaoUsuario.textContent.trim():"";

 sessao.inventario=String(inventario.value||"").trim();

 sessao.endereco=String(endereco.value||"")
  .trim().toUpperCase();

 sessao.tipoProduto=String(tipoProduto.value||"")
  .trim().toUpperCase();

 const opcaoTipo=tipoProduto.options[
  tipoProduto.selectedIndex
 ];

 sessao.regraColeta=String(
  opcaoTipo?.dataset.regra||""
 ).trim().toUpperCase();

 sessao.tipoColeta=String(
  opcaoTipo?.dataset.tipoColeta||"UNITARIA"
 ).trim().toUpperCase();

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
 limparBufferHoneywell();

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

 focarCampoCodigo();

 setTimeout(()=>{
  focarCampoCodigo();
 },500);

 await iniciarCamera();

 setTimeout(()=>{
  focarCampoCodigo();
 },1500);
}

function focarCampoCodigo(){
 const campo=document.getElementById("codigo");

 if(!campo)return;

 const coleta=document.getElementById("coleta");

 if(
  !coleta||
  coleta.classList.contains("hidden")
 )return;

 const modal=document.getElementById("modalQuantidadeLote");

 if(
  modal&&
  modal.style.display==="flex"
 )return;

 try{
  campo.focus();

  const tamanho=campo.value.length;

  campo.setSelectionRange(
   tamanho,
   tamanho
  );
 }catch(erro){
  try{
   campo.focus();
  }catch(e){}
 }
}

async function iniciarCamera(){
 if(cameraAtiva)return;

 const video=document.getElementById("camera");
 if(!video)return;

 if(!navigator.mediaDevices?.getUserMedia){
  mostrarCameraStatus("Câmera não disponível neste navegador.");
  return;
 }

 mostrarCameraStatus("Abrindo câmera...");

 try{
  cameraStream=await navigator.mediaDevices.getUserMedia({
   audio:false,
   video:{
    facingMode:{ideal:"environment"},
    width:{ideal:9999},
    height:{ideal:9999},
    frameRate:{ideal:30,max:30}
   }
  });

  const track=cameraStream.getVideoTracks()[0];

  if(track){
   try{
    const capabilities=track.getCapabilities
     ?track.getCapabilities():{};

    if(
     capabilities.width?.max&&
     capabilities.height?.max
    ){
     await track.applyConstraints({
      width:{exact:capabilities.width.max},
      height:{exact:capabilities.height.max}
     });

     console.log(
      "Resolução máxima:",
      capabilities.width.max+" x "+capabilities.height.max
     );
    }

    if(
     Array.isArray(capabilities.focusMode)&&
     capabilities.focusMode.includes("continuous")
    ){
     await track.applyConstraints({
      advanced:[{focusMode:"continuous"}]
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

 }finally{
  setTimeout(()=>{
   focarCampoCodigo();
  },300);
 }
}

function iniciarLeitorZXing(video){
 if(scannerBloqueado||!video)return;

 pararLeitorZXing();
 scannerLoopAtivo=true;

 if("BarcodeDetector" in window){
  iniciarLeitorNativo(video);
 }else{
  iniciarLeitorZXingCanvas(video);
 }
}

async function iniciarLeitorNativo(video){
 try{
  let formatos=[];

  if(
   typeof BarcodeDetector.getSupportedFormats==="function"
  ){
   const suportados=
    await BarcodeDetector.getSupportedFormats();

   const desejados=[
    "code_128",
    "code_39",
    "code_93",
    "codabar",
    "ean_13",
    "ean_8",
    "upc_a",
    "upc_e",
    "itf",
    "qr_code",
    "data_matrix",
    "pdf417",
    "aztec"
   ];

   formatos=desejados.filter(
    formato=>suportados.includes(formato)
   );
  }

  nativeDetector=formatos.length
   ?new BarcodeDetector({formats:formatos})
   :new BarcodeDetector();

  mostrarCameraStatus(
   "Aponte a câmera para o código de barras"
  );

  iniciarLoopLeituraNativa(video);

 }catch(erro){
  console.warn(
   "BarcodeDetector indisponível. Usando ZXing:",
   erro
  );

  nativeDetector=null;
  iniciarLeitorZXingCanvas(video);
 }
}

async function executarLeituraNativa(video){
 if(
  !scannerLoopAtivo||
  scannerBloqueado||
  !cameraAtiva||
  !nativeDetector||
  nativeScanBusy
 )return;

 nativeScanBusy=true;

 try{
  const resultados=
   await nativeDetector.detect(video);

  if(
   resultados?.length&&
   !scannerBloqueado&&
   !processandoCodigo
  ){
   const item=resultados[0];

   const codigo=normalizarCodigo(
    item.rawValue||
    item.displayValue||
    ""
   );

   if(codigo)
    receberCodigoDaCamera(codigo);
  }

 }catch(erro){
  console.warn("Leitura nativa:",erro);

 }finally{
  nativeScanBusy=false;
 }
}

function iniciarLoopLeituraNativa(video){
 if(
  !scannerLoopAtivo||
  scannerBloqueado||
  !cameraAtiva
 )return;

 executarLeituraNativa(video).finally(()=>{
  if(
   scannerLoopAtivo&&
   !scannerBloqueado&&
   cameraAtiva
  ){
   nativeScanTimer=setTimeout(
    ()=>{
     iniciarLoopLeituraNativa(video);
    },
    35
   );
  }
 });
}

function iniciarLeitorZXingCanvas(video){
 if(typeof ZXingBrowser==="undefined"){
  mostrarCameraStatus("Leitor não carregado.");
  console.error("ZXingBrowser não encontrado.");
  return;
 }

 try{
  codeReader=
   new ZXingBrowser.BrowserMultiFormatReader();

  if(!scanCanvas)
   scanCanvas=document.createElement("canvas");

  scanCanvas.width=1280;
  scanCanvas.height=720;

  scanCtx=scanCanvas.getContext(
   "2d",
   {willReadFrequently:true}
  );

  if(!scanCtx)
   throw new Error("Canvas não disponível.");

  mostrarCameraStatus(
   "Aponte a câmera para o código de barras"
  );

  loopZXingCanvas(video);

 }catch(erro){
  console.error("Erro criando leitor:",erro);
  mostrarCameraStatus("Erro ao iniciar leitor.");
 }
}

function loopZXingCanvas(video){
 if(
  !scannerLoopAtivo||
  scannerBloqueado||
  !cameraAtiva
 )return;

 if(
  video.readyState<
  HTMLMediaElement.HAVE_CURRENT_DATA
 ){
  nativeScanTimer=setTimeout(
   ()=>loopZXingCanvas(video),
   80
  );
  return;
 }

 try{
  const largura=video.videoWidth;
  const altura=video.videoHeight;

  if(!largura||!altura){
   nativeScanTimer=setTimeout(
    ()=>loopZXingCanvas(video),
    80
   );
   return;
  }

  const escala=Math.min(
   1280/largura,
   720/altura,
   1
  );

  const w=Math.max(
   640,
   Math.round(largura*escala)
  );

  const h=Math.max(
   360,
   Math.round(altura*escala)
  );

  if(
   scanCanvas.width!==w||
   scanCanvas.height!==h
  ){
   scanCanvas.width=w;
   scanCanvas.height=h;
  }

  scanCtx.drawImage(
   video,
   0,
   0,
   w,
   h
  );

  const resultado=
   codeReader.decodeFromCanvas(scanCanvas);

  if(resultado){
   const codigo=normalizarCodigo(
    resultado.getText
     ?resultado.getText()
     :resultado.text||""
   );

   if(codigo)
    receberCodigoDaCamera(codigo);
  }

 }catch(erro){}

 nativeScanTimer=setTimeout(
  ()=>loopZXingCanvas(video),
  45
 );
}

function pararLeitorZXing(){
 scannerLoopAtivo=false;

 if(nativeScanTimer){
  clearTimeout(nativeScanTimer);
  nativeScanTimer=null;
 }

 nativeScanBusy=false;
 nativeDetector=null;

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
 )return;

 const agora=Date.now();

 codigo=normalizarCodigo(codigo);
 if(!codigo)return;

 if(
  codigo===ultimoCodigoLido&&
  agora-ultimoCodigoTempo<250
 )return;

 ultimoCodigoLido=codigo;
 ultimoCodigoTempo=agora;

 const campo=document.getElementById("codigo");

 if(campo)
  campo.value="";

 processarCodigo(codigo);

 setTimeout(()=>{
  focarCampoCodigo();
 },100);
}


// =====================================================
// HONEYWELL - KEYBOARD WEDGE
// =====================================================

function iniciarLeitorHoneywell(){
 const campo=document.getElementById("codigo");

 if(!campo)return;

 /*
  * NÃO usar inputmode="none".
  * O Honeywell precisa conseguir enviar
  * os dados pelo Keyboard Wedge.
  */

 campo.type="text";

 campo.setAttribute(
  "autocomplete",
  "off"
 );

 campo.setAttribute(
  "autocorrect",
  "off"
 );

 campo.setAttribute(
  "autocapitalize",
  "characters"
 );

 campo.setAttribute(
  "spellcheck",
  "false"
 );
}

function capturarEntradaHoneywell(e){
 const coleta=document.getElementById("coleta");

 if(
  !coleta||
  coleta.classList.contains("hidden")
 )return;

 if(
  scannerBloqueado||
  processandoCodigo
 )return;

 const campo=e.target;
 const valor=String(campo.value||"");

 if(!valor)return;

 honeywellBuffer=valor;

 if(honeywellTimer)
  clearTimeout(honeywellTimer);

 honeywellTimer=setTimeout(()=>{
  processarCodigoHoneywell();
 },180);
}

function processarCodigoHoneywell(){
 if(
  scannerBloqueado||
  processandoCodigo
 )return;

 const campo=document.getElementById("codigo");

 if(!campo)return;

 const codigo=normalizarCodigo(
  campo.value||
  honeywellBuffer||
  ""
 );

 if(!codigo)return;

 if(codigo.length<2)return;

 honeywellBuffer="";

 if(honeywellTimer){
  clearTimeout(honeywellTimer);
  honeywellTimer=null;
 }

 campo.value="";

 processarCodigo(codigo);

 setTimeout(()=>{
  focarCampoCodigo();
 },100);
}

function limparBufferHoneywell(){
 honeywellBuffer="";

 if(honeywellTimer){
  clearTimeout(honeywellTimer);
  honeywellTimer=null;
 }
}

function processarCodigoDigitado(){
 if(
  scannerBloqueado||
  processandoCodigo
 )return;

 const campo=document.getElementById("codigo");

 if(!campo)return;

 const codigo=normalizarCodigo(
  campo.value
 );

 if(!codigo)return;

 processarCodigo(codigo);
}

function normalizarCodigo(valor){
 return String(valor||"")
  .replace(/[\r\n\t]/g,"")
  .trim()
  .toUpperCase();
}


// =====================================================
// PROCESSAMENTO
// =====================================================

function processarCodigo(codigo){
 if(
  !codigo||
  scannerBloqueado||
  processandoCodigo
 )return;

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

 if(sessao.modoEndereco){
  processarNovoEndereco(codigo);
  emitirBip();
  processandoCodigo=false;
  limparCampoCodigo();
  return;
 }

 if(
  sessao.regraColeta==="NUMERO_PRODUTO"
 ){
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

 emitirBip();

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

 setTimeout(()=>{
  focarCampoCodigo();
 },100);
}


// =====================================================
// MODAL DE QUANTIDADE
// =====================================================

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

 const btnCancelar=document.getElementById(
  "cancelarQuantidadeLote"
 );

 const btnConfirmar=document.getElementById(
  "confirmarQuantidadeLote"
 );

 if(
  !modal||
  !campo||
  !codigoCapturado||
  !erro
 ){
  console.error(
   "Modal de lote não encontrado."
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

 if(btnCancelar){
  btnCancelar.onclick=e=>{
   e.preventDefault();
   e.stopPropagation();
   cancelarQuantidadeLote();
  };
 }

 if(btnConfirmar){
  btnConfirmar.onclick=e=>{
   e.preventDefault();
   e.stopPropagation();
   confirmarQuantidadeLote();
  };
 }

 campo.onkeydown=e=>{
  if(e.key==="Enter"){
   e.preventDefault();
   e.stopPropagation();
   confirmarQuantidadeLote();
  }
 };

 setTimeout(()=>{
  campo.focus();
 },150);
}

function cancelarQuantidadeLote(){
 const modal=document.getElementById(
  "modalQuantidadeLote"
 );

 if(modal){
  modal.style.display="none";
  modal.dataset.codigo="";
 }

 const campo=document.getElementById(
  "quantidadeLote"
 );

 if(campo)
  campo.value="";

 const erro=document.getElementById(
  "erroQuantidadeLote"
 );

 if(erro)
  erro.textContent="";

 processandoCodigo=false;
 scannerBloqueado=false;

 ultimoCodigoLido="";
 ultimoCodigoTempo=0;

 limparCampoCodigo();

 mostrarCollectionStatus(
  "Coleta cancelada.",
  "error"
 );

 mostrarCameraStatus(
  "Aponte a câmera para o código de barras"
 );

 reiniciarScanner();

 setTimeout(()=>{
  focarCampoCodigo();
 },150);
}

function confirmarQuantidadeLote(){
 const modal=document.getElementById(
  "modalQuantidadeLote"
 );

 const campo=document.getElementById(
  "quantidadeLote"
 );

 const erro=document.getElementById(
  "erroQuantidadeLote"
 );

 if(
  !modal||
  !campo||
  !erro
 ){
  console.error(
   "Campos da coleta em lote não encontrados."
  );
  return;
 }

 const codigo=normalizarCodigo(
  modal.dataset.codigo||""
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

 modal.style.display="none";
 modal.dataset.codigo="";

 campo.value="";
 erro.textContent="";

 registrarProduto(
  codigo,
  quantidade
 );

 processandoCodigo=false;
 scannerBloqueado=false;

 ultimoCodigoLido="";
 ultimoCodigoTempo=0;

 limparCampoCodigo();

 mostrarCameraStatus(
  "Aponte a câmera para o código de barras"
 );

 reiniciarScanner();

 setTimeout(()=>{
  focarCampoCodigo();
 },150);
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


// =====================================================
// REINICIAR CÂMERA
// =====================================================

function reiniciarScanner(){
 if(
  !cameraAtiva||
  scannerBloqueado
 )return;

 const video=document.getElementById("camera");

 if(!video)return;

 pararLeitorZXing();
 iniciarLeitorZXing(video);

 setTimeout(()=>{
  focarCampoCodigo();
 },100);
}


// =====================================================
// REGISTRAR PRODUTO
// =====================================================

function registrarProduto(
 codigo,
 quantidade=1
){
 const ultima=document.getElementById(
  "ultimaLeitura"
 );

 if(ultima)
  ultima.textContent=codigo;

 const mensagem=
  sessao.tipoColeta==="LOTE"
   ?"Lote enviado: "+quantidade+" peças."
   :"Coleta enviada.";

 mostrarCollectionStatus(
  mensagem,
  "success"
 );

 sessao.totalEndereco+=quantidade;
 sessao.totalColeta+=quantidade;

 const contadorEndereco=document.getElementById(
  "contadorEndereco"
 );

 const contadorTotal=document.getElementById(
  "contadorTotal"
 );

 if(contadorEndereco)
  contadorEndereco.textContent=
   sessao.totalEndereco;

 if(contadorTotal)
  contadorTotal.textContent=
   sessao.totalColeta;

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
    usuario:sessao.usuario,
    nomeUsuario:sessao.nomeUsuario,
    inventario:sessao.inventario,
    endereco:sessao.endereco,
    codigo:codigo,
    tipoLeitura:"PRODUTO",
    tipoProduto:sessao.tipoProduto,
    quantidade:quantidade
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

 setTimeout(()=>{
  focarCampoCodigo();
 },100);
}

function limparCampoCodigo(){
 const campo=document.getElementById("codigo");

 if(campo){
  campo.value="";
  honeywellBuffer="";
 }
}


// =====================================================
// MODO ENDEREÇO
// =====================================================

function ativarModoEndereco(){
 if(sessao.tipoProduto!=="BLOCOS")
  return;

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

 setTimeout(()=>{
  focarCampoCodigo();
 },100);
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
  botao.textContent="LENDO NOVO ENDEREÇO";
  botao.disabled=true;
 }else{
  botao.textContent="ALTERAR ENDEREÇO";
  botao.disabled=false;
 }
}


// =====================================================
// NOVO ENDEREÇO
// =====================================================

function processarNovoEndereco(novoEndereco){
 novoEndereco=normalizarCodigo(novoEndereco);

 if(!novoEndereco)return;

 sessao.endereco=novoEndereco;
 sessao.totalEndereco=0;
 sessao.modoEndereco=false;

 document.getElementById(
  "lblEndereco"
 ).textContent=novoEndereco;

 document.getElementById(
  "contadorEndereco"
 ).textContent="0";

 document.getElementById(
  "ultimaLeitura"
 ).textContent=novoEndereco;

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
    acao:"novoEndereco",
    usuario:sessao.usuario,
    inventario:sessao.inventario,
    endereco:novoEndereco
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

 setTimeout(()=>{
  focarCampoCodigo();
 },100);
}


// =====================================================
// PARAR CÂMERA
// =====================================================

function pararCamera(){
 scannerBloqueado=true;
 processandoCodigo=false;

 limparBufferHoneywell();
 pararLeitorZXing();

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

 const video=document.getElementById("camera");

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
