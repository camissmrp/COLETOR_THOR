const FILA_KEY="THOR_COLETAS_PENDENTES";
const FILA_PROCESSANDO_KEY="THOR_SINCRONIZANDO";

let configuracao={};
let cameraStream=null;
let codeReader=null;
let cameraAtiva=false;
let scannerBloqueado=false;
let processandoCodigo=false;
let nativeDetector=null;
let nativeScanTimer=null;
let nativeScanBusy=false;
let scanCanvas=null;
let scanCtx=null;
let scannerLoopAtivo=false;
let ultimoCodigoLido="";
let ultimoCodigoTempo=0;
let audioContext=null;

let honeywellBuffer="";
let honeywellTimer=null;
let honeywellUltimaTecla=0;

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
 totalPendente:0,
 modoEndereco:false,
 equipamento:"CELULAR"
};


/* =====================================================
   INICIALIZAÇÃO
===================================================== */

document.addEventListener("DOMContentLoaded",()=>{

 document.getElementById("btnEntrar")?.addEventListener(
  "click",
  iniciarColeta
 );

 document.getElementById("btnRegistrar")?.addEventListener(
  "click",
  processarCodigoDigitado
 );

 document.getElementById("btnAlterarEndereco")?.addEventListener(
  "click",
  ativarModoEndereco
 );

 document.getElementById("equipamento")?.addEventListener(
  "change",
  atualizarEquipamento
 );

 document.getElementById("usuario")?.addEventListener(
  "change",
  e=>atualizarConfiguracaoUsuario(e.target.value)
 );

 document.getElementById("tipoProduto")?.addEventListener(
  "change",
  atualizarTipoProduto
 );

 const codigo=document.getElementById("codigo");

 if(codigo){

  codigo.addEventListener("keydown",e=>{

   if(
    sessao.equipamento==="HONEYWELL"&&
    (e.key==="Enter"||e.key==="NumpadEnter")
   ){

    e.preventDefault();
    e.stopPropagation();

    const valor=
     normalizarCodigo(codigo.value);

    if(valor)
     processarCodigoHoneywell(valor);
   }
  });
 }

 document.addEventListener(
  "keydown",
  capturarTeclasHoneywell,
  true
 );

 window.addEventListener(
  "online",
  sincronizarFila
 );

 atualizarEquipamento();
 mostrarTelaLogin();
 carregarConfiguracao();
 atualizarStatusFila();
});


/* =====================================================
   ÁUDIO
===================================================== */

async function prepararAudio(){

 try{

  const AC=
   window.AudioContext||
   window.webkitAudioContext;

  if(!AC)return;

  if(!audioContext)
   audioContext=new AC();

  if(audioContext.state==="suspended")
   await audioContext.resume();

 }catch(e){}
}


function emitirBip(){

 try{

  const AC=
   window.AudioContext||
   window.webkitAudioContext;

  if(!AC)return;

  if(!audioContext)
   audioContext=new AC();

  if(audioContext.state==="suspended")
   audioContext.resume();

  const agora=
   audioContext.currentTime;

  const osc=
   audioContext.createOscillator();

  const ganho=
   audioContext.createGain();

  osc.type="sine";
  osc.frequency.setValueAtTime(
   1800,
   agora
  );

  ganho.gain.setValueAtTime(
   .0001,
   agora
  );

  ganho.gain.exponentialRampToValueAtTime(
   .3,
   agora+.01
  );

  ganho.gain.exponentialRampToValueAtTime(
   .0001,
   agora+.15
  );

  osc.connect(ganho);
  ganho.connect(audioContext.destination);

  osc.start(agora);
  osc.stop(agora+.15);

 }catch(e){}
}


/* =====================================================
   TELAS
===================================================== */

function mostrarTelaLogin(){

 document.getElementById("login")?.classList.remove("hidden");
 document.getElementById("coleta")?.classList.add("hidden");

 pararCamera();
}


function mostrarTelaColeta(){

 document.getElementById("login")?.classList.add("hidden");
 document.getElementById("coleta")?.classList.remove("hidden");
}


function mostrarLoginStatus(msg,tipo=""){

 const el=
  document.getElementById("loginStatus");

 if(!el)return;

 el.textContent=msg||"";
 el.className="status"+(tipo?" "+tipo:"");
}


function mostrarCollectionStatus(msg,tipo=""){

 const el=
  document.getElementById("collectionStatus");

 if(!el)return;

 el.textContent=msg||"";
 el.className="status"+(tipo?" "+tipo:"");
}


function mostrarCameraStatus(msg){

 const el=
  document.getElementById("cameraMessage");

 if(el)
  el.textContent=msg;
}


/* =====================================================
   CONFIGURAÇÃO
===================================================== */

async function carregarConfiguracao(){

 try{

  mostrarLoginStatus(
   "Carregando configuração..."
  );

  const resposta=
   await fetch(
    API+"?acao=config&ts="+Date.now(),
    {
     cache:"no-store"
    }
   );

  if(!resposta.ok)
   throw new Error(
    "HTTP "+resposta.status
   );

  configuracao=
   await resposta.json();

  const select=
   document.getElementById("usuario");

  if(!select)
   throw new Error(
    "Campo usuário não encontrado."
   );

  select.innerHTML="";

  const usuarios=
   Array.isArray(configuracao.Usuarios)
    ?configuracao.Usuarios
    :[];

  if(!usuarios.length){

   const op=
    document.createElement("option");

   op.value="";
   op.textContent=
    "Nenhum usuário disponível";

   select.appendChild(op);

   document.getElementById(
    "btnEntrar"
   ).disabled=true;

   mostrarLoginStatus(
    "Nenhum usuário ativo foi encontrado.",
    "error"
   );

   return;
  }

  usuarios.forEach(usuario=>{

   const op=
    document.createElement("option");

   op.value=usuario.id;
   op.textContent=usuario.nome;

   select.appendChild(op);
  });

  carregarTiposProduto();

  atualizarConfiguracaoUsuario(
   usuarios[0].id
  );

  document.getElementById(
   "btnEntrar"
  ).disabled=false;

  mostrarLoginStatus("");

 }catch(e){

  console.error(e);

  mostrarLoginStatus(
   "Não foi possível carregar a configuração.",
   "error"
  );

  document.getElementById(
   "btnEntrar"
  ).disabled=true;
 }
}


function carregarTiposProduto(){

 const select=
  document.getElementById("tipoProduto");

 if(!select)return;

 select.innerHTML="";

 const tipos=
  Array.isArray(configuracao.TiposProduto)
   ?configuracao.TiposProduto
   :[];

 tipos.forEach(item=>{

  const op=
   document.createElement("option");

  op.value=
   item.tipoProduto;

  op.textContent=
   item.tipoProduto;

  op.dataset.regra=
   item.regraColeta||"";

  op.dataset.tipoColeta=
   item.tipoColeta||"UNITARIA";

  select.appendChild(op);
 });

 if(tipos.length)
  select.selectedIndex=0;

 atualizarTipoProduto();
}


function atualizarTipoProduto(){

 const select=
  document.getElementById("tipoProduto");

 if(!select)return;

 const op=
  select.options[
   select.selectedIndex
  ];

 if(!op)return;

 sessao.tipoProduto=
  normalizarCodigo(
   op.value
  );

 sessao.regraColeta=
  normalizarCodigo(
   op.dataset.regra||""
  );

 sessao.tipoColeta=
  normalizarCodigo(
   op.dataset.tipoColeta||"UNITARIA"
  );

 const botao=
  document.getElementById(
   "btnAlterarEndereco"
  );

 if(botao){

  botao.style.display=
   sessao.tipoProduto==="BLOCOS"
    ?"block"
    :"none";
 }
}


function atualizarConfiguracaoUsuario(
 usuarioId
){

 const inventario=
  document.getElementById("inventario");

 const endereco=
  document.getElementById("endereco");

 let item=null;

 if(
  Array.isArray(
   configuracao.Configuracoes
  )
 ){

  item=
   configuracao.Configuracoes.find(
    x=>
     String(x.usuario).trim()===
     String(usuarioId).trim()
   );
 }

 if(inventario)
  inventario.value=
   item?.inventario||"";

 if(endereco)
  endereco.value=
   item?.enderecoAtual||"";
}


/* =====================================================
   EQUIPAMENTO
===================================================== */

function atualizarEquipamento(){

 const select=
  document.getElementById("equipamento");

 if(!select)return;

 sessao.equipamento=
  normalizarCodigo(
   select.value||"CELULAR"
  );

 const camera=
  document.getElementById("cameraArea");

 const campo=
  document.getElementById("codigo");

 const label=
  document.querySelector(
   'label[for="codigo"]'
  );

 const botao=
  document.getElementById("btnRegistrar");

 if(
  sessao.equipamento==="HONEYWELL"
 ){

  if(camera)
   camera.style.display="none";

  if(campo){

   campo.placeholder=
    "LEIA O CÓDIGO NO COLETOR";

   campo.setAttribute(
    "inputmode",
    "text"
   );

   campo.autocomplete="off";
   campo.autocorrect="off";
   campo.autocapitalize="characters";
   campo.spellcheck=false;
  }

  if(label)
   label.textContent=
    "Leitura pelo coletor:";

  if(botao)
   botao.style.display="none";

 }else{

  if(camera)
   camera.style.display="";

  if(campo){

   campo.placeholder=
    "DIGITE OU COLE O CÓDIGO";

   campo.setAttribute(
    "inputmode",
    "text"
   );
  }

  if(label)
   label.textContent=
    "Ou digite o código:";

  if(botao)
   botao.style.display="";
 }
}


/* =====================================================
   INICIAR SESSÃO
===================================================== */

async function iniciarColeta(){

 await prepararAudio();

 const usuario=
  document.getElementById("usuario");

 const inventario=
  document.getElementById("inventario");

 const endereco=
  document.getElementById("endereco");

 const tipoProduto=
  document.getElementById("tipoProduto");

 const equipamento=
  document.getElementById("equipamento");

 const usuarioOp=
  usuario.options[
   usuario.selectedIndex
  ];

 sessao.usuario=
  normalizarCodigo(
   usuario.value
  );

 sessao.nomeUsuario=
  usuarioOp
   ?usuarioOp.textContent.trim()
   :"";

 sessao.inventario=
  String(
   inventario.value||""
  ).trim();

 sessao.endereco=
  normalizarCodigo(
   endereco.value
  );

 sessao.tipoProduto=
  normalizarCodigo(
   tipoProduto.value
  );

 sessao.equipamento=
  normalizarCodigo(
   equipamento?.value
  );

 const tipoOp=
  tipoProduto.options[
   tipoProduto.selectedIndex
  ];

 sessao.regraColeta=
  normalizarCodigo(
   tipoOp?.dataset.regra||""
  );

 sessao.tipoColeta=
  normalizarCodigo(
   tipoOp?.dataset.tipoColeta||
   "UNITARIA"
  );

 if(!sessao.usuario){

  mostrarLoginStatus(
   "Selecione um usuário.",
   "error"
  );

  return;
 }

 if(!sessao.inventario){

  mostrarLoginStatus(
   "Informe o inventário.",
   "error"
  );

  inventario.focus();

  return;
 }

 if(!sessao.tipoProduto){

  mostrarLoginStatus(
   "Selecione o tipo de produto.",
   "error"
  );

  return;
 }

 if(!sessao.equipamento){

  mostrarLoginStatus(
   "Selecione o equipamento.",
   "error"
  );

  return;
 }

 if(!sessao.endereco){

  mostrarLoginStatus(
   "Informe o endereço.",
   "error"
  );

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

 atualizarLabels();

 mostrarTelaColeta();

 atualizarEquipamento();

 prepararModoColeta();

 atualizarStatusFila();

 setTimeout(
  focarCampoCodigo,
  300
 );
}


function atualizarLabels(){

 document.getElementById(
  "lblUsuario"
 ).textContent=
  sessao.nomeUsuario;

 document.getElementById(
  "lblInventario"
 ).textContent=
  sessao.inventario;

 document.getElementById(
  "lblTipoProduto"
 ).textContent=
  sessao.tipoProduto;

 document.getElementById(
  "lblEndereco"
 ).textContent=
  sessao.endereco;

 document.getElementById(
  "contadorEndereco"
 ).textContent=
  sessao.totalEndereco;

 document.getElementById(
  "contadorTotal"
 ).textContent=
  sessao.totalColeta;
}


function prepararModoColeta(){

 atualizarEquipamento();

 if(
  sessao.equipamento==="HONEYWELL"
 ){

  pararCamera();

  iniciarLeitorHoneywell();

  setTimeout(
   focarCampoCodigo,
   200
  );

 }else{

  iniciarCamera();
 }
}


/* =====================================================
   FOCO
===================================================== */

function focarCampoCodigo(){

 if(
  sessao.equipamento!=="HONEYWELL"
 )
  return;

 const campo=
  document.getElementById("codigo");

 if(!campo)return;

 const modal=
  document.getElementById(
   "modalQuantidadeLote"
  );

 if(
  modal&&
  modal.style.display==="flex"
 )
  return;

 try{

  campo.focus();

  const n=
   campo.value.length;

  campo.setSelectionRange(
   n,
   n
  );

 }catch(e){}
}


/* =====================================================
   CÂMERA
===================================================== */

async function iniciarCamera(){

 if(cameraAtiva)return;

 const video=
  document.getElementById("camera");

 if(!video)return;

 if(
  !navigator.mediaDevices?.getUserMedia
 ){

  mostrarCameraStatus(
   "Câmera não disponível."
  );

  return;
 }

 mostrarCameraStatus(
  "Abrindo câmera..."
 );

 try{

  cameraStream=
   await navigator.mediaDevices.getUserMedia({

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

  const track=
   cameraStream.getVideoTracks()[0];

  if(track){

   try{

    const cap=
     track.getCapabilities
      ?track.getCapabilities()
      :{};

    if(
     cap.width?.max&&
     cap.height?.max
    ){

     await track.applyConstraints({

      width:{
       exact:cap.width.max
      },

      height:{
       exact:cap.height.max
      }
     });
    }

    if(
     Array.isArray(cap.focusMode)&&
     cap.focusMode.includes(
      "continuous"
     )
    ){

     await track.applyConstraints({
      advanced:[
       {
        focusMode:"continuous"
       }
      ]
     });
    }

   }catch(e){}
  }

  video.srcObject=
   cameraStream;

  video.autoplay=true;
  video.muted=true;
  video.playsInline=true;

  await video.play();

  cameraAtiva=true;

  mostrarCameraStatus(
   "Aponte a câmera para o código de barras"
  );

  iniciarLeitorZXing(video);

 }catch(e){

  console.error(e);

  cameraAtiva=false;

  mostrarCameraStatus(
   "Não foi possível abrir a câmera."
  );

 }finally{

  setTimeout(
   focarCampoCodigo,
   300
  );
 }
}


/* =====================================================
   LEITOR CÂMERA
===================================================== */

function iniciarLeitorZXing(video){

 if(
  scannerBloqueado||
  !video
 )
  return;

 pararLeitorZXing();

 scannerLoopAtivo=true;

 if(
  "BarcodeDetector" in window
 ){

  iniciarLeitorNativo(video);

 }else{

  iniciarLeitorZXingCanvas(video);
 }
}


async function iniciarLeitorNativo(video){

 try{

  let formatos=[];

  if(
   typeof BarcodeDetector.getSupportedFormats===
   "function"
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

   formatos=
    desejados.filter(
     x=>suportados.includes(x)
    );
  }

  nativeDetector=
   formatos.length
    ?new BarcodeDetector({
      formats:formatos
     })
    :new BarcodeDetector();

  loopNativo(video);

 }catch(e){

  nativeDetector=null;

  iniciarLeitorZXingCanvas(
   video
  );
 }
}


async function loopNativo(video){

 if(
  !scannerLoopAtivo||
  scannerBloqueado||
  !cameraAtiva
 )
  return;

 if(!nativeScanBusy){

  nativeScanBusy=true;

  try{

   const resultados=
    await nativeDetector.detect(
     video
    );

   if(
    resultados?.length&&
    !processandoCodigo
   ){

    const codigo=
     normalizarCodigo(
      resultados[0].rawValue||
      resultados[0].displayValue||
      ""
     );

    if(codigo)
     receberCodigoDaCamera(
      codigo
     );
   }

  }catch(e){

  }finally{

   nativeScanBusy=false;
  }
 }

 nativeScanTimer=
  setTimeout(
   ()=>loopNativo(video),
   35
  );
}


function iniciarLeitorZXingCanvas(video){

 if(
  typeof ZXingBrowser==="undefined"
 )
  return;

 try{

  codeReader=
   new ZXingBrowser.BrowserMultiFormatReader();

  scanCanvas=
   scanCanvas||
   document.createElement("canvas");

  scanCtx=
   scanCanvas.getContext(
    "2d",
    {
     willReadFrequently:true
    }
   );

  loopCanvas(video);

 }catch(e){}
}


function loopCanvas(video){

 if(
  !scannerLoopAtivo||
  scannerBloqueado||
  !cameraAtiva
 )
  return;

 try{

  if(
   video.readyState<
   HTMLMediaElement.HAVE_CURRENT_DATA
  ){

   nativeScanTimer=
    setTimeout(
     ()=>loopCanvas(video),
     80
    );

   return;
  }

  const largura=
   video.videoWidth;

  const altura=
   video.videoHeight;

  if(!largura||!altura){

   nativeScanTimer=
    setTimeout(
     ()=>loopCanvas(video),
     80
    );

   return;
  }

  const escala=
   Math.min(
    1280/largura,
    720/altura,
    1
   );

  const w=
   Math.max(
    640,
    Math.round(
     largura*escala
    )
   );

  const h=
   Math.max(
    360,
    Math.round(
     altura*escala
    )
   );

  scanCanvas.width=w;
  scanCanvas.height=h;

  scanCtx.drawImage(
   video,
   0,
   0,
   w,
   h
  );

  const resultado=
   codeReader.decodeFromCanvas(
    scanCanvas
   );

  if(resultado){

   const codigo=
    normalizarCodigo(
     resultado.getText
      ?resultado.getText()
      :resultado.text||""
    );

   if(codigo)
    receberCodigoDaCamera(
     codigo
    );
  }

 }catch(e){}

 nativeScanTimer=
  setTimeout(
   ()=>loopCanvas(video),
   45
  );
}


function receberCodigoDaCamera(codigo){

 if(
  scannerBloqueado||
  processandoCodigo
 )
  return;

 codigo=
  normalizarCodigo(codigo);

 if(!codigo)return;

 const agora=Date.now();

 if(
  codigo===ultimoCodigoLido&&
  agora-ultimoCodigoTempo<500
 )
  return;

 ultimoCodigoLido=codigo;
 ultimoCodigoTempo=agora;

 const campo=
  document.getElementById("codigo");

 if(campo)
  campo.value="";

 emitirBip();

 processarCodigo(codigo);
}


function pararLeitorZXing(){

 scannerLoopAtivo=false;

 if(nativeScanTimer){

  clearTimeout(
   nativeScanTimer
  );

  nativeScanTimer=null;
 }

 nativeScanBusy=false;
 nativeDetector=null;

 try{

  if(
   codeReader&&
   codeReader.reset
  )
   codeReader.reset();

 }catch(e){}

 codeReader=null;
}


/* =====================================================
   HONEYWELL
===================================================== */

function iniciarLeitorHoneywell(){

 const campo=
  document.getElementById("codigo");

 if(!campo)return;

 campo.type="text";
 campo.inputMode="text";
 campo.autocomplete="off";
 campo.autocorrect="off";
 campo.autocapitalize="characters";
 campo.spellcheck=false;

 limparBufferHoneywell();

 setTimeout(
  focarCampoCodigo,
  100
 );
}


function capturarTeclasHoneywell(e){

 if(
  sessao.equipamento!=="HONEYWELL"
 )
  return;

 const coleta=
  document.getElementById("coleta");

 if(
  !coleta||
  coleta.classList.contains("hidden")
 )
  return;

 const modal=
  document.getElementById(
   "modalQuantidadeLote"
  );

 if(
  modal&&
  modal.style.display==="flex"
 )
  return;

 const agora=Date.now();
 const tecla=String(e.key||"");

 if(
  honeywellUltimaTecla&&
  agora-honeywellUltimaTecla>500
 ){

  honeywellBuffer="";
 }

 honeywellUltimaTecla=agora;

 if(
  tecla==="Enter"||
  tecla==="NumpadEnter"
 ){

  const codigo=
   normalizarCodigo(
    honeywellBuffer
   );

  if(codigo.length>=2){

   e.preventDefault();
   e.stopPropagation();

   if(e.stopImmediatePropagation)
    e.stopImmediatePropagation();

   processarCodigoHoneywell(
    codigo
   );

   return;
  }

  const campo=
   document.getElementById("codigo");

  const valor=
   normalizarCodigo(
    campo?.value||""
   );

  if(valor.length>=2){

   e.preventDefault();
   e.stopPropagation();

   processarCodigoHoneywell(
    valor
   );

   return;
  }

  limparBufferHoneywell();

  return;
 }

 if(
  tecla==="Tab"
 ){

  const codigo=
   normalizarCodigo(
    honeywellBuffer
   );

  if(codigo.length>=2){

   e.preventDefault();
   e.stopPropagation();

   processarCodigoHoneywell(
    codigo
   );
  }

  return;
 }

 if(
  tecla.length!==1||
  e.ctrlKey||
  e.altKey||
  e.metaKey
 )
  return;

 honeywellBuffer+=tecla;

 if(honeywellTimer)
  clearTimeout(
   honeywellTimer
  );

 /*
  * Somente limpa o buffer por inatividade.
  * Não registra automaticamente.
  *
  * O ENTER do Honeywell é o encerramento
  * da leitura.
  */
 honeywellTimer=
  setTimeout(()=>{

   honeywellBuffer="";
   honeywellUltimaTecla=0;

  },700);
}


function processarCodigoHoneywell(codigo){

 if(
  sessao.equipamento!=="HONEYWELL"||
  scannerBloqueado||
  processandoCodigo
 )
  return;

 codigo=
  normalizarCodigo(codigo);

 if(!codigo)return;

 const agora=Date.now();

 if(
  codigo===ultimoCodigoLido&&
  agora-ultimoCodigoTempo<500
 ){

  limparBufferHoneywell();

  return;
 }

 ultimoCodigoLido=codigo;
 ultimoCodigoTempo=agora;

 limparBufferHoneywell();

 const campo=
  document.getElementById("codigo");

 if(campo)
  campo.value=codigo;

 emitirBip();

 processarCodigo(codigo);

 setTimeout(
  focarCampoCodigo,
  150
 );
}


function limparBufferHoneywell(){

 if(honeywellTimer){

  clearTimeout(
   honeywellTimer
  );

  honeywellTimer=null;
 }

 honeywellBuffer="";
 honeywellUltimaTecla=0;
}


/* =====================================================
   CÓDIGO MANUAL
===================================================== */

function processarCodigoDigitado(){

 if(
  scannerBloqueado||
  processandoCodigo
 )
  return;

 const campo=
  document.getElementById("codigo");

 if(!campo)return;

 const codigo=
  normalizarCodigo(
   campo.value
  );

 if(!codigo)return;

 campo.value="";

 processarCodigo(codigo);
}


function normalizarCodigo(valor){

 return String(valor||"")
  .replace(
   /[\r\n\t]/g,
   ""
  )
  .trim()
  .toUpperCase();
}


/* =====================================================
   PROCESSAMENTO
===================================================== */

function processarCodigo(codigo){

 if(
  !codigo||
  scannerBloqueado||
  processandoCodigo
 )
  return;

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

  processandoCodigo=false;

  limparCampoCodigo();

  return;
 }

 if(
  sessao.regraColeta==="NUMERO_PRODUTO"
 ){

  if(
   /^[A-Z]/.test(codigo)
  ){

   processarNovoEndereco(
    codigo
   );

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

 if(
  sessao.tipoColeta==="LOTE"
 ){

  scannerBloqueado=true;

  pararLeitorZXing();

  limparCampoCodigo();

  solicitarQuantidadeLote(
   codigo
  );

  return;
 }

 registrarProduto(
  codigo,
  1
 );

 processandoCodigo=false;

 limparCampoCodigo();

}


/* =====================================================
   MODAL LOTE
===================================================== */

function solicitarQuantidadeLote(codigo){

 const modal=
  document.getElementById(
   "modalQuantidadeLote"
  );

 const campo=
  document.getElementById(
   "quantidadeLote"
  );

 const codigoCapturado=
  document.getElementById(
   "codigoLoteCapturado"
  );

 const erro=
  document.getElementById(
   "erroQuantidadeLote"
  );

 if(
  !modal||
  !campo||
  !codigoCapturado||
  !erro
 ){

  scannerBloqueado=false;
  processandoCodigo=false;

  mostrarCollectionStatus(
   "Erro na tela de quantidade.",
   "error"
  );

  return;
 }

 modal.dataset.codigo=codigo;

 codigoCapturado.textContent=codigo;

 campo.value="";
 erro.textContent="";

 modal.style.display="flex";

 const cancelar=
  document.getElementById(
   "cancelarQuantidadeLote"
  );

 const confirmar=
  document.getElementById(
   "confirmarQuantidadeLote"
  );

 if(cancelar)
  cancelar.onclick=
   cancelarQuantidadeLote;

 if(confirmar)
  confirmar.onclick=
   confirmarQuantidadeLote;

 campo.onkeydown=e=>{

  if(e.key==="Enter"){

   e.preventDefault();

   confirmarQuantidadeLote();
  }
 };

 setTimeout(
  ()=>campo.focus(),
  100
 );
}


function cancelarQuantidadeLote(){

 fecharModalQuantidade();

 scannerBloqueado=false;
 processandoCodigo=false;

 ultimoCodigoLido="";
 ultimoCodigoTempo=0;

 limparCampoCodigo();

 mostrarCollectionStatus(
  "Coleta cancelada.",
  "error"
 );

 if(
  sessao.equipamento==="HONEYWELL"
 )
  setTimeout(
   focarCampoCodigo,
   100
  );
 else
  reiniciarScanner();
}


function confirmarQuantidadeLote(){

 const modal=
  document.getElementById(
   "modalQuantidadeLote"
  );

 const campo=
  document.getElementById(
   "quantidadeLote"
  );

 const erro=
  document.getElementById(
   "erroQuantidadeLote"
  );

 if(!modal||!campo||!erro)
  return;

 const codigo=
  normalizarCodigo(
   modal.dataset.codigo
  );

 const quantidade=
  Number(
   String(
    campo.value||""
   ).trim()
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

 fecharModalQuantidade();

 registrarProduto(
  codigo,
  quantidade
 );

 scannerBloqueado=false;
 processandoCodigo=false;

 ultimoCodigoLido="";
 ultimoCodigoTempo=0;

 limparCampoCodigo();

 if(
  sessao.equipamento==="HONEYWELL"
 ){

  setTimeout(
   focarCampoCodigo,
   150
  );

 }else{

  reiniciarScanner();
 }
}


function fecharModalQuantidade(){

 const modal=
  document.getElementById(
   "modalQuantidadeLote"
  );

 if(modal){

  modal.style.display="none";
  modal.dataset.codigo="";
 }

 const campo=
  document.getElementById(
   "quantidadeLote"
  );

 const erro=
  document.getElementById(
   "erroQuantidadeLote"
  );

 if(campo)
  campo.value="";

 if(erro)
  erro.textContent="";
}


/* =====================================================
   FILA LOCAL
===================================================== */

function obterFila(){

 try{

  const dados=
   localStorage.getItem(
    FILA_KEY
   );

  if(!dados)
   return [];

  const fila=
   JSON.parse(dados);

  return Array.isArray(fila)
   ?fila
   :[];

 }catch(e){

  console.error(
   "Erro lendo fila:",
   e
  );

  return [];
 }
}


function salvarFila(fila){

 try{

  localStorage.setItem(
   FILA_KEY,
   JSON.stringify(fila)
  );

  return true;

 }catch(e){

  console.error(
   "Erro salvando fila:",
   e
  );

  mostrarCollectionStatus(
   "ERRO: não foi possível salvar a coleta no aparelho.",
   "error"
  );

  return false;
 }
}


function gerarIdColeta(){

 return "COL-"+Date.now()+"-"+

  Math.random()
   .toString(36)
   .substring(2,10)
   .toUpperCase();
}


function adicionarNaFila(
 codigo,
 quantidade
){

 const item={

  idColetaApp:
   gerarIdColeta(),

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
   quantidade,

  criadoEm:
   new Date().toISOString(),

  tentativas:0
 };

 const fila=
  obterFila();

 fila.push(item);

 if(!salvarFila(fila))
  return null;

 atualizarStatusFila();

 sincronizarFila();

 return item;
}


function removerDaFila(id){

 const fila=
  obterFila();

 const nova=
  fila.filter(
   item=>
    item.idColetaApp!==id
  );

 salvarFila(nova);

 atualizarStatusFila();
}


function atualizarStatusFila(){

 const fila=
  obterFila();

 sessao.totalPendente=
  fila.length;

 const status=
  document.getElementById(
   "collectionStatus"
  );

 if(
  sessao.equipamento==="HONEYWELL"||
  !cameraAtiva
 ){

  if(
   fila.length>0
  ){

   if(status){

    status.textContent=
     "Pendentes de sincronização: "+
     fila.length;

    status.className=
     "status warning";
   }

  }
 }
}


/* =====================================================
   SINCRONIZAÇÃO
===================================================== */

let sincronizando=false;


async function sincronizarFila(){

 if(sincronizando)
  return;

 if(!navigator.onLine)
  return;

 const fila=
  obterFila();

 if(!fila.length){

  atualizarStatusFila();

  return;
 }

 sincronizando=true;

 mostrarCollectionStatus(
  "Sincronizando "+
  fila.length+
  " coleta(s)...",
  "warning"
 );

 try{

  /*
   * Trabalhamos sempre com a primeira da fila.
   * Só passamos para a próxima depois de
   * receber uma resposta positiva da API.
   */
  while(navigator.onLine){

   const atual=
    obterFila();

   if(!atual.length)
    break;

   const item=
    atual[0];

   item.tentativas=
    Number(
     item.tentativas||0
    )+1;

   salvarFila(atual);

   try{

    const resposta=
     await enviarColetaAPI(
      item
     );

    if(
     resposta &&
     (
      resposta.sucesso===true||
      resposta.status==="OK"
     )
    ){

     removerDaFila(
      item.idColetaApp
     );

     continue;
    }

    /*
     * Se a API respondeu erro, não removemos.
     */
    throw new Error(
     resposta?.erro||
     "API não confirmou a gravação."
    );

   }catch(erro){

    console.error(
     "Falha sincronização:",
     erro
    );

    /*
     * Mantém a coleta na fila.
     * Não perde.
     */
    mostrarCollectionStatus(
     "Sincronização interrompida. "+
     "Coletas permanecem salvas no aparelho.",
     "error"
    );

    break;
   }
  }

 }finally{

  sincronizando=false;

  const restante=
   obterFila();

  if(restante.length){

   mostrarCollectionStatus(
    restante.length+
    " coleta(s) aguardando sincronização.",
    "warning"
   );

  }else{

   mostrarCollectionStatus(
    "Todas as coletas foram sincronizadas.",
    "success"
   );
  }

  atualizarStatusFila();
 }
}


async function enviarColetaAPI(item){

 const resposta=
  await fetch(
   API,
   {
    method:"POST",

    headers:{
     "Content-Type":
      "text/plain;charset=utf-8"
    },

    body:JSON.stringify({

     idColetaApp:
      item.idColetaApp,

     usuario:
      item.usuario,

     nomeUsuario:
      item.nomeUsuario,

     inventario:
      item.inventario,

     endereco:
      item.endereco,

     codigo:
      item.codigo,

     tipoLeitura:
      item.tipoLeitura,

     tipoProduto:
      item.tipoProduto,

     quantidade:
      item.quantidade
    })
   }
  );

 if(!resposta.ok)
  throw new Error(
   "HTTP "+resposta.status
  );

 const texto=
  await resposta.text();

 if(!texto)
  throw new Error(
   "API retornou resposta vazia."
  );

 try{

  return JSON.parse(
   texto
  );

 }catch(e){

  throw new Error(
   "Resposta inválida da API: "+
   texto
  );
 }
}


/* =====================================================
   REGISTRO LOCAL
===================================================== */

function registrarProduto(
 codigo,
 quantidade=1
){

 const item=
  adicionarNaFila(
   codigo,
   quantidade
  );

 if(!item){

  mostrarCollectionStatus(
   "ERRO: a coleta NÃO foi salva.",
   "error"
  );

  return;
 }

 const ultima=
  document.getElementById(
   "ultimaLeitura"
  );

 if(ultima)
  ultima.textContent=
   codigo;

 sessao.totalEndereco+=
  quantidade;

 sessao.totalColeta+=
  quantidade;

 document.getElementById(
  "contadorEndereco"
 ).textContent=
  sessao.totalEndereco;

 document.getElementById(
  "contadorTotal"
 ).textContent=
  sessao.totalColeta;

 if(navigator.onLine){

  mostrarCollectionStatus(
   "Coleta salva. Sincronizando...",
   "success"
  );

 }else{

  mostrarCollectionStatus(
   "Coleta salva no aparelho. "+
   "Sem internet; será sincronizada depois.",
   "warning"
  );
 }

 limparCampoCodigo();

 if(
  sessao.equipamento==="HONEYWELL"
 ){

  setTimeout(
   focarCampoCodigo,
   100
  );
 }
}


/* =====================================================
   ENDEREÇO
===================================================== */

function ativarModoEndereco(){

 if(
  sessao.tipoProduto!=="BLOCOS"
 )
  return;

 sessao.modoEndereco=true;

 const botao=
  document.getElementById(
   "btnAlterarEndereco"
  );

 if(botao){

  botao.textContent=
   "LENDO NOVO ENDEREÇO";

  botao.disabled=true;
 }

 mostrarCollectionStatus(
  "Leia o código do novo endereço.",
  "success"
 );

 limparCampoCodigo();

 setTimeout(
  focarCampoCodigo,
  100
 );
}


function processarNovoEndereco(
 novoEndereco
){

 novoEndereco=
  normalizarCodigo(
   novoEndereco
  );

 if(!novoEndereco)
  return;

 sessao.endereco=
  novoEndereco;

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

 const botao=
  document.getElementById(
   "btnAlterarEndereco"
  );

 if(botao){

  botao.textContent=
   "ALTERAR ENDEREÇO";

  botao.disabled=false;
 }

 mostrarCollectionStatus(
  "Endereço alterado.",
  "success"
 );

 limparCampoCodigo();

 /*
  * O endereço também é enviado para a API.
  * Se falhar, não interfere na fila de produtos.
  */
 fetch(
  API,
  {
   method:"POST",

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
 .catch(e=>{
  console.warn(
   "Endereço não sincronizado:",
   e
  );
 });

 setTimeout(
  focarCampoCodigo,
  100
 );
}


/* =====================================================
   LIMPEZA
===================================================== */

function limparCampoCodigo(){

 const campo=
  document.getElementById("codigo");

 if(campo)
  campo.value="";

 limparBufferHoneywell();
}


/* =====================================================
   REINICIAR CÂMERA
===================================================== */

function reiniciarScanner(){

 if(
  sessao.equipamento==="HONEYWELL"
 )
  return;

 if(
  !cameraAtiva||
  scannerBloqueado
 )
  return;

 const video=
  document.getElementById("camera");

 if(!video)return;

 pararLeitorZXing();

 iniciarLeitorZXing(video);
}


/* =====================================================
   PARAR CÂMERA
===================================================== */

function pararCamera(){

 pararLeitorZXing();

 if(cameraStream){

  cameraStream
   .getTracks()
   .forEach(track=>{

    try{
     track.stop();
    }catch(e){}
   });
 }

 cameraStream=null;
 cameraAtiva=false;

 const video=
  document.getElementById("camera");

 if(video){

  try{
   video.pause();
  }catch(e){}

  video.srcObject=null;
 }
}


/* =====================================================
   INICIALIZAÇÃO DA FILA
===================================================== */

function iniciarSincronizacaoAutomatica(){

 sincronizarFila();

 setInterval(
  ()=>{
   if(
    navigator.onLine
   )
    sincronizarFila();
  },
  5000
 );
}


iniciarSincronizacaoAutomatica();


window.addEventListener(
 "online",
 ()=>{
  mostrarCollectionStatus(
   "Internet recuperada. Sincronizando...",
   "success"
  );

  sincronizarFila();
 }
);


window.addEventListener(
 "pagehide",
 ()=>{
  pararCamera();
 }
);


window.addEventListener(
 "beforeunload",
 ()=>{
  pararCamera();
 }
);
