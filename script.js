const ss = SpreadsheetApp.getActiveSpreadsheet();


// ==================================================
// GET
// ==================================================

function doGet(e) {

  try {

    const p = e && e.parameter ? e.parameter : {};
    const acao = p.acao || "";

    switch (acao) {

      case "config":
        return getConfig();

      case "verificar":
        return verificarDuplicidade(
          p.inventario,
          p.endereco,
          p.codigo
        );

      case "registrar":
        return registrarColeta({
          usuario: p.usuario,
          nomeUsuario: p.nomeUsuario,
          inventario: p.inventario,
          endereco: p.endereco,
          codigo: p.codigo,
          tipoLeitura: p.tipoLeitura || "PRODUTO"
        });

      case "novoEndereco":
        return alterarEndereco(
          p.usuario,
          p.inventario,
          p.endereco
        );

      default:
        return respostaJSON({
          sucesso: true,
          mensagem: "API OK"
        });
    }

  } catch (erro) {

    return respostaJSON({
      sucesso: false,
      erro: erro.toString()
    });
  }
}


// ==================================================
// POST
// Mantido para compatibilidade
// ==================================================

function doPost(e) {

  try {

    const dados =
      JSON.parse(e.postData.contents);

    if (dados.acao === "novoEndereco") {

      return alterarEndereco(
        dados.usuario,
        dados.inventario,
        dados.endereco
      );
    }

    return registrarColeta(dados);

  } catch (erro) {

    return respostaJSON({
      sucesso: false,
      erro: erro.toString()
    });
  }
}


// ==================================================
// ALTERAR ENDEREÇO
// ==================================================

function alterarEndereco(
  usuario,
  inventario,
  endereco
) {

  const lock =
    LockService.getScriptLock();

  try {

    lock.waitLock(10000);

    const config =
      ss.getSheetByName("TB_CONFIG");

    if (!config)
      throw new Error(
        "Aba TB_CONFIG não encontrada."
      );

    const dados =
      config.getDataRange().getValues();

    if (!dados.length)
      throw new Error(
        "TB_CONFIG está vazia."
      );

    const cab = dados[0];

    const colID =
      cab.indexOf("ID");

    const colUsuario =
      cab.indexOf("Usuario");

    const colInventario =
      cab.indexOf("Inventario");

    const colEndereco =
      cab.indexOf("EnderecoAtual");

    const colData =
      cab.indexOf("DataUltimaAtualizacao");

    if (
      colUsuario === -1 ||
      colInventario === -1 ||
      colEndereco === -1
    ) {

      throw new Error(
        "TB_CONFIG precisa ter: Usuario, Inventario e EnderecoAtual."
      );
    }

    let linhaUsuario = -1;

    for (
      let i = 1;
      i < dados.length;
      i++
    ) {

      if (
        String(
          dados[i][colUsuario]
        ).trim() ===
        String(usuario).trim()
      ) {

        linhaUsuario = i + 1;
        break;
      }
    }


    // CRIA USUÁRIO SE NÃO EXISTIR

    if (linhaUsuario === -1) {

      const novaLinha =
        new Array(cab.length).fill("");

      if (colID !== -1)
        novaLinha[colID] =
          Utilities.getUuid();

      novaLinha[colUsuario] =
        usuario;

      novaLinha[colInventario] =
        inventario;

      novaLinha[colEndereco] =
        endereco;

      if (colData !== -1)
        novaLinha[colData] =
          new Date();

      config.appendRow(
        novaLinha
      );

    } else {

      config
        .getRange(
          linhaUsuario,
          colInventario + 1
        )
        .setValue(inventario);

      config
        .getRange(
          linhaUsuario,
          colEndereco + 1
        )
        .setValue(endereco);

      if (colData !== -1) {

        config
          .getRange(
            linhaUsuario,
            colData + 1
          )
          .setValue(new Date());
      }
    }

    return respostaJSON({
      sucesso: true,
      usuario: usuario,
      inventario: inventario,
      endereco: endereco
    });

  } catch (erro) {

    return respostaJSON({
      sucesso: false,
      erro: erro.toString()
    });

  } finally {

    try {
      lock.releaseLock();
    } catch (e) {}
  }
}


// ==================================================
// REGISTRAR COLETA
// ==================================================

function registrarColeta(dados) {

  const lock =
    LockService.getScriptLock();

  try {

    lock.waitLock(10000);

    const coleta =
      ss.getSheetByName("TB_COLETA");

    if (!coleta)
      throw new Error(
        "Aba TB_COLETA não encontrada."
      );


    // ----------------------------------------------
    // VALIDAÇÃO
    // ----------------------------------------------

    const usuario =
      String(
        dados.usuario || ""
      ).trim();

    const inventario =
      String(
        dados.inventario || ""
      ).trim();

    const endereco =
      String(
        dados.endereco || ""
      ).trim()
      .toUpperCase();

    const codigo =
      String(
        dados.codigo || ""
      ).trim()
      .toUpperCase();

    const nomeUsuario =
      String(
        dados.nomeUsuario || ""
      ).trim();

    const tipoLeitura =
      String(
        dados.tipoLeitura ||
        "PRODUTO"
      ).trim();


    if (!usuario)
      return respostaJSON({
        sucesso: false,
        erro: "USUÁRIO NÃO INFORMADO"
      });

    if (!inventario)
      return respostaJSON({
        sucesso: false,
        erro: "INVENTÁRIO NÃO INFORMADO"
      });

    if (!endereco)
      return respostaJSON({
        sucesso: false,
        erro: "ENDEREÇO NÃO INFORMADO"
      });

    if (!codigo)
      return respostaJSON({
        sucesso: false,
        erro: "CÓDIGO NÃO INFORMADO"
      });


    // ----------------------------------------------
    // VERIFICA DUPLICIDADE
    // ----------------------------------------------

    const linhas =
      coleta.getDataRange().getValues();

    for (
      let i = 1;
      i < linhas.length;
      i++
    ) {

      const inventarioExistente =
        String(
          linhas[i][1] || ""
        ).trim();

      const enderecoExistente =
        String(
          linhas[i][2] || ""
        ).trim()
        .toUpperCase();

      const codigoExistente =
        String(
          linhas[i][5] || ""
        ).trim()
        .toUpperCase();


      if (
        inventarioExistente ===
          inventario &&

        enderecoExistente ===
          endereco &&

        codigoExistente ===
          codigo
      ) {

        return respostaJSON({

          sucesso: false,

          duplicado: true,

          mensagem:
            "PRODUTO JÁ COLETADO NESTE ENDEREÇO",

          codigo: codigo,

          inventario: inventario,

          endereco: endereco
        });
      }
    }


    // ----------------------------------------------
    // GRAVA NA TB_COLETA
    // ----------------------------------------------

    coleta.appendRow([

      Utilities.getUuid(),

      inventario,

      endereco,

      new Date(),

      usuario,

      codigo,

      tipoLeitura,

      nomeUsuario

    ]);


    // ----------------------------------------------
    // ATUALIZA ÚLTIMA LEITURA
    // ----------------------------------------------

    atualizarUltimaLeitura(
      usuario,
      inventario,
      codigo
    );


    // ----------------------------------------------
    // RETORNO
    // ----------------------------------------------

    SpreadsheetApp.flush();

    return respostaJSON({

      sucesso: true,

      duplicado: false,

      mensagem:
        "COLETA REGISTRADA",

      usuario: usuario,

      nomeUsuario: nomeUsuario,

      inventario: inventario,

      endereco: endereco,

      codigo: codigo
    });


  } catch (erro) {

    return respostaJSON({

      sucesso: false,

      duplicado: false,

      erro: erro.toString()
    });

  } finally {

    try {
      lock.releaseLock();
    } catch (e) {}
  }
}


// ==================================================
// VERIFICAR DUPLICIDADE
// ==================================================

function verificarDuplicidade(
  inventario,
  endereco,
  codigo
) {

  try {

    const coleta =
      ss.getSheetByName("TB_COLETA");

    if (!coleta)
      throw new Error(
        "Aba TB_COLETA não encontrada."
      );

    const inv =
      String(
        inventario || ""
      ).trim();

    const end =
      String(
        endereco || ""
      ).trim()
      .toUpperCase();

    const cod =
      String(
        codigo || ""
      ).trim()
      .toUpperCase();

    const linhas =
      coleta.getDataRange().getValues();

    for (
      let i = 1;
      i < linhas.length;
      i++
    ) {

      if (

        String(
          linhas[i][1] || ""
        ).trim() === inv &&

        String(
          linhas[i][2] || ""
        ).trim()
        .toUpperCase() === end &&

        String(
          linhas[i][5] || ""
        ).trim()
        .toUpperCase() === cod

      ) {

        return respostaJSON({
          existe: true,
          duplicado: true
        });
      }
    }

    return respostaJSON({
      existe: false,
      duplicado: false
    });

  } catch (erro) {

    return respostaJSON({
      existe: false,
      erro: erro.toString()
    });
  }
}


// ==================================================
// ATUALIZAR ÚLTIMA LEITURA
// ==================================================

function atualizarUltimaLeitura(
  usuario,
  inventario,
  codigo
) {

  const config =
    ss.getSheetByName("TB_CONFIG");

  if (!config) return;

  const dados =
    config.getDataRange().getValues();

  if (!dados.length) return;

  const cab =
    dados[0];

  const colUsuario =
    cab.indexOf("Usuario");

  const colInventario =
    cab.indexOf("Inventario");

  const colUltima =
    cab.indexOf("UltimaLeitura");

  const colData =
    cab.indexOf("DataUltimaAtualizacao");

  if (
    colUsuario === -1 ||
    colInventario === -1
  ) return;


  for (
    let i = 1;
    i < dados.length;
    i++
  ) {

    if (
      String(
        dados[i][colUsuario]
      ).trim() ===
      String(usuario).trim()
    ) {

      const linha = i + 1;

      config
        .getRange(
          linha,
          colInventario + 1
        )
        .setValue(inventario);

      if (colUltima !== -1) {

        config
          .getRange(
            linha,
            colUltima + 1
          )
          .setValue(codigo);
      }

      if (colData !== -1) {

        config
          .getRange(
            linha,
            colData + 1
          )
          .setValue(new Date());
      }

      return;
    }
  }
}


// ==================================================
// CONFIGURAÇÃO
// ==================================================

function getConfig() {

  const config =
    ss.getSheetByName("TB_CONFIG");

  const usuarios =
    ss.getSheetByName("TB_USUARIOS");

  if (!config)
    throw new Error(
      "Aba TB_CONFIG não encontrada."
    );

  if (!usuarios)
    throw new Error(
      "Aba TB_USUARIOS não encontrada."
    );


  criarConfiguracoesUsuarios();


  const dadosConfig =
    config.getDataRange().getValues();

  const cabConfig =
    dadosConfig[0];

  const configuracoes = [];


  for (
    let i = 1;
    i < dadosConfig.length;
    i++
  ) {

    if (!dadosConfig[i][0])
      continue;

    const obj = {};

    for (
      let j = 0;
      j < cabConfig.length;
      j++
    ) {

      obj[
        cabConfig[j]
      ] =
        dadosConfig[i][j];
    }

    configuracoes.push({

      id:
        String(
          obj.ID || ""
        ),

      usuario:
        String(
          obj.Usuario || ""
        ),

      inventario:
        obj.Inventario || "",

      enderecoAtual:
        obj.EnderecoAtual || "",

      dataUltimaAtualizacao:
        obj.DataUltimaAtualizacao || "",

      ultimaLeitura:
        obj.UltimaLeitura || ""
    });
  }


  const dadosUsuarios =
    usuarios.getDataRange().getValues();

  const listaUsuarios = [];


  for (
    let i = 1;
    i < dadosUsuarios.length;
    i++
  ) {

    if (
      dadosUsuarios[i][2] === true
    ) {

      listaUsuarios.push({

        id:
          String(
            dadosUsuarios[i][0]
          ),

        nome:
          dadosUsuarios[i][1]
      });
    }
  }


  return respostaJSON({

    Usuarios:
      listaUsuarios,

    Configuracoes:
      configuracoes
  });
}


// ==================================================
// CRIAR CONFIGURAÇÕES DOS USUÁRIOS
// ==================================================

function criarConfiguracoesUsuarios() {

  const config =
    ss.getSheetByName("TB_CONFIG");

  const usuarios =
    ss.getSheetByName("TB_USUARIOS");

  const dadosUsuarios =
    usuarios.getDataRange().getValues();

  const dadosConfig =
    config.getDataRange().getValues();

  if (!dadosConfig.length)
    throw new Error(
      "TB_CONFIG está sem cabeçalho."
    );

  const cab =
    dadosConfig[0];

  const colID =
    cab.indexOf("ID");

  const colUsuario =
    cab.indexOf("Usuario");

  const colInventario =
    cab.indexOf("Inventario");

  const colEndereco =
    cab.indexOf("EnderecoAtual");

  const colData =
    cab.indexOf(
      "DataUltimaAtualizacao"
    );

  const colUltima =
    cab.indexOf("UltimaLeitura");


  if (colUsuario === -1)
    throw new Error(
      "A coluna Usuario não existe na TB_CONFIG."
    );


  const usuariosConfigurados = {};


  for (
    let i = 1;
    i < dadosConfig.length;
    i++
  ) {

    const usuario =
      String(
        dadosConfig[i][colUsuario] ||
        ""
      ).trim();

    if (usuario)
      usuariosConfigurados[
        usuario
      ] = true;
  }


  for (
    let i = 1;
    i < dadosUsuarios.length;
    i++
  ) {

    const ativo =
      dadosUsuarios[i][2];

    const usuario =
      String(
        dadosUsuarios[i][0] ||
        ""
      ).trim();


    if (
      ativo === true &&
      usuario &&
      !usuariosConfigurados[
        usuario
      ]
    ) {

      const novaLinha =
        new Array(
          cab.length
        ).fill("");

      if (colID !== -1)
        novaLinha[colID] =
          Utilities.getUuid();

      novaLinha[colUsuario] =
        usuario;

      if (colInventario !== -1)
        novaLinha[colInventario] =
          "";

      if (colEndereco !== -1)
        novaLinha[colEndereco] =
          "";

      if (colData !== -1)
        novaLinha[colData] =
          "";

      if (colUltima !== -1)
        novaLinha[colUltima] =
          "";

      config.appendRow(
        novaLinha
      );

      usuariosConfigurados[
        usuario
      ] = true;
    }
  }
}


// ==================================================
// RESPOSTA JSON
// ==================================================

function respostaJSON(obj) {

  return ContentService
    .createTextOutput(
      JSON.stringify(obj)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}
