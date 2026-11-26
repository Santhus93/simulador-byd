// gerar-json.js
//
// Este script le a aba "EXPORTACAO_WEB" da planilha de politica comercial BYD
// (.xlsm) e gera o arquivo politica.json no formato usado pelo Simulador
// Comercial BYD.
//
// A aba EXPORTACAO_WEB deve ter as colunas nesta ordem exata:
//
//   A = Modelo
//   B = FAMILIA
//   C = AnoModelo
//   D = PPS
//   E = Margem        (ex: 0,08 = 8%)
//   F = Bonus          (texto, ex: "10K VAREJO", "*")
//   G = Brasilia
//   H = Goiania
//   I = BH
//   J = ES GV          (ES - Grande Vitoria)
//   K = ES Interior
//   L = GO Interior
//   M = MG Interior
//
// COMO USAR:
//
// 1) Dentro da pasta do projeto (C:\Projetos\simulador-byd), instale a
//    biblioteca que le arquivos Excel (so precisa fazer isso uma vez):
//
//    npm install xlsx
//
// 2) Copie o arquivo "POLITICA VENDAS BYD SET ATUALIZADA.xlsm" para dentro
//    da pasta do projeto (a mesma pasta onde vai ficar este script).
//
// 3) Rode primeiro em MODO TESTE (nao grava nada, so mostra o que leu):
//
//    node gerar-json.js --teste
//
//    Confira no terminal se os dados batem com a planilha (modelo, PPS,
//    valores por regional, etc).
//
// 4) Quando os dados baterem certinho, rode sem --teste para gerar o
//    arquivo:
//
//    node gerar-json.js
//
//    Isso vai criar (ou substituir) o arquivo "politica.json" nesta mesma
//    pasta. Depois e so copiar ele para: src/data/politica.json

const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// ======================= CONFIGURACAO =======================

// Nome do arquivo Excel (deve estar na mesma pasta deste script)
const ARQUIVO_EXCEL = "./POLITICA/POLITICA VENDAS BYD ATUALIZADA.xlsm";

// Nome exato da aba com a tabela ja pronta para exportacao
const NOME_ABA = "EXPORTACAO_WEB";

// Versao e mes de referencia da politica (aparecem no topo do simulador)


// Numero da linha (contando visualmente, linha 1 = cabecalho) onde
// COMECAM os dados de verdade. Pelo print enviado, a linha 1 e o
// cabecalho (Modelo, AnoModelo, PPS...) e a linha 2 ja e o primeiro
// modelo (ATTO 8 GS DM). Por isso o valor abaixo e 2.
const LINHA_INICIO_DADOS = 2;

// Indice de cada coluna, contando a partir de 0 (0 = coluna A, 1 = coluna B,
// e assim por diante).
const COLUNAS = {
  modelo: 0, // A
  familia: 1, // B
  anoModelo: 2, // C
  pps: 3, // D
  margem: 4, // E
  bonusTexto: 5, // F
  brasilia: 6, // G
  goiania: 7, // H
  bh: 8, // I
  esGrandeVitoria: 9, // J
  esInterior: 10, // K
  goiasInterior: 11, // L
  mgInterior: 12, // M
};

// Se true, pula linhas onde o PPS for 0 (modelos desativados/placeholder,
// como aconteceu com "DOLPHIN PLUS" na planilha atual).
const PULAR_MODELOS_COM_PPS_ZERO = true;

// ======================= FIM DA CONFIGURACAO =======================

const modoTeste = process.argv.includes("--teste");

function limparTexto(valor) {
  if (valor === undefined || valor === null) return "";
  return String(valor).trim();
}

function numero(valor) {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

  if (valor === undefined || valor === null || valor === "") return 0;

  const texto = String(valor).trim();
  if (!texto || texto === "-" || texto === "*") return 0;

  const semMoeda = texto.replace(/R\$/gi, "").replace(/\s/g, "");
  const normalizado = semMoeda.includes(",")
    ? semMoeda.replace(/\./g, "").replace(",", ".")
    : semMoeda;

  const n = Number(normalizado);
  return Number.isFinite(n) ? n : 0;
}

function competenciaAtual() {
  const agora = new Date();
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });

  return formatter.format(agora).replace(" de ", "/").toUpperCase();
}

function main() {
  const caminho = path.resolve(ARQUIVO_EXCEL);
  const mesReferencia = competenciaAtual();

  if (!fs.existsSync(caminho)) {
    console.error(`\nArquivo nao encontrado: ${caminho}`);
    console.error(
      "Copie o arquivo .xlsm para esta mesma pasta, ou ajuste ARQUIVO_EXCEL no topo do script.\n"
    );
    process.exit(1);
  }

  const workbook = XLSX.readFile(caminho);

  if (!workbook.SheetNames.includes(NOME_ABA)) {
    console.error(`\nAba "${NOME_ABA}" nao encontrada neste arquivo.`);
    console.error("Abas disponiveis:");
    console.error(workbook.SheetNames.join(", ") + "\n");
    process.exit(1);
  }

  const planilha = workbook.Sheets[NOME_ABA];

  const linhas = XLSX.utils.sheet_to_json(planilha, {
    header: 1,
    blankrows: false,
    defval: "",
  });

  const modelos = [];
  const puladosPorPpsZero = [];

  for (let i = LINHA_INICIO_DADOS - 1; i < linhas.length; i++) {
    const linha = linhas[i];

    const modelo = limparTexto(linha[COLUNAS.modelo]);

    // Para quando encontrar linha totalmente vazia (fim da tabela)
    if (!modelo) break;

    const pps = numero(linha[COLUNAS.pps]);

    if (PULAR_MODELOS_COM_PPS_ZERO && pps === 0) {
      puladosPorPpsZero.push(`Linha ${i + 1}: ${modelo}`);
      continue;
    }

    const regionais = {
      "BYD BRASILIA": numero(linha[COLUNAS.brasilia]),
      "BYD GOIANIA": numero(linha[COLUNAS.goiania]),
      "BYD BH": numero(linha[COLUNAS.bh]),
      "BYD ES - GRANDE VITORIA": numero(linha[COLUNAS.esGrandeVitoria]),
      "BYD ES - INTERIOR": numero(linha[COLUNAS.esInterior]),
      "BYD GOIAS - INTERIOR": numero(linha[COLUNAS.goiasInterior]),
      "BYD MG - INTERIOR": numero(linha[COLUNAS.mgInterior]),
    };

    const item = {
      familia: limparTexto(linha[COLUNAS.familia]),
      modelo,
      anoModelo: limparTexto(linha[COLUNAS.anoModelo]),
      pps,
      margem: numero(linha[COLUNAS.margem]),
      lb: 0, // Nao existe nesta aba; ajuste se quiser trazer da MARGEM MIN
      bonus: 0, // Nao ha valor numerico fixo; a assistente informa na tela
      regionais,
      observacao: limparTexto(linha[COLUNAS.bonusTexto]),
      tipoAutorizacao: "REGIONAL", // Unico tipo ativo no momento
    };

    if (modoTeste) {
      console.log(`\n--- Linha ${i + 1} da planilha ---`);
      console.log(item);
    }

    modelos.push(item);
  }

  if (puladosPorPpsZero.length > 0) {
    console.log("\nModelos IGNORADOS por ter PPS = 0 (provavelmente desativados):");
    puladosPorPpsZero.forEach((m) => console.log("  - " + m));
  }

  if (modoTeste) {
    console.log(`\n\nMODO TESTE CONCLUIDO: ${modelos.length} modelos lidos.`);
    console.log(
      "Nenhum arquivo foi gerado. Confira os dados acima com a planilha."
    );
    console.log(
      "Se algo estiver errado, ajuste os numeros em COLUNAS no topo do script."
    );
    console.log("Se estiver tudo certo, rode novamente sem --teste.\n");
    return;
  }

  const resultado = {
  mesReferencia,
  modelos,
};

  const destino = path.resolve("./src/data/politica.json");
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, JSON.stringify(resultado, null, 2), "utf-8");

  console.log(`\nArquivo gerado: ${destino}`);
  console.log(`Total de modelos: ${modelos.length}`);
  console.log(
    "O simulador BYD utiliza: src/data/politica.json\n"
  );
}

main();
