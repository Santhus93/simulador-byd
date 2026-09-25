import { useState } from "react";
import politica from "../data/politica.json";

interface Modelo {
  modelo: string;
  anoModelo: string;
  pps: number;
  margem: number;
  lb: number;
  bonus: number;
  regionais: Record<string, number>;
  observacao: string;
  tipoAutorizacao?: string;
}

// ===== Helpers de mascara monetaria (R$ 0.000,00) =====

function formatarDigitosParaMoeda(digitos: string): string {
  const somenteNumeros = digitos.replace(/\D/g, "");

  if (!somenteNumeros) return "";

  const valorEmCentavos = parseInt(somenteNumeros, 10);
  const valorEmReais = valorEmCentavos / 100;

  return valorEmReais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function moedaParaNumero(valorFormatado: string): number {
  if (!valorFormatado) return 0;

  const limpo = valorFormatado
    .replace("R$", "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

function numeroParaMoedaInicial(valor: number): string {
  if (!valor) return "";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function Home() {
  const [modelo, setModelo] = useState("");
  const [regional, setRegional] = useState("");
  const [valorNF, setValorNF] = useState<string>("");
  const [bonus, setBonus] = useState<string>("");
  const [incidencia, setIncidencia] = useState<string>("");
  const [cliente, setCliente] = useState<string>("");
  const [chassi, setChassi] = useState<string>("");
  const [usadoNaTroca, setUsadoNaTroca] = useState<string>("");
  const [calculado, setCalculado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const modelos: Modelo[] = politica.modelos;

  const regionais = [
    "BYD BRASILIA",
    "BYD GOIANIA",
    "BYD BH",
    "BYD ES - GRANDE VITORIA",
    "BYD ES - INTERIOR",
    "BYD GOIAS - INTERIOR",
    "BYD MG - INTERIOR",
  ];

  const modeloSelecionado = modelos.find((item) => item.modelo === modelo);

  const valorMinimo =
    modeloSelecionado && regional
      ? modeloSelecionado.regionais[regional]
      : undefined;

  // Ao selecionar o modelo, pre-preenche o Bonus sugerido pela politica
  function handleSelecionarModelo(novoModelo: string) {
    setModelo(novoModelo);
    setCalculado(false);
    const encontrado = modelos.find((item) => item.modelo === novoModelo);
    if (encontrado) {
      setBonus(numeroParaMoedaInicial(encontrado.bonus));
    }
  }

  // Handler generico para qualquer campo de moeda
  function handleCampoMoeda(
    valorDigitado: string,
    setter: (v: string) => void
  ) {
    const formatado = formatarDigitosParaMoeda(valorDigitado);
    setter(formatado);
    setCalculado(false);
  }

  function formatarMoeda(valor: number): string {
    return valor.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatarPercentual(valor: number): string {
    return (valor * 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const pps = modeloSelecionado?.pps ?? 0;
  const margem = modeloSelecionado?.margem ?? 0;
  const margemPPS = pps * margem;

  const nValorNF = moedaParaNumero(valorNF);
  const nBonus = moedaParaNumero(bonus);
  const nIncidencia = moedaParaNumero(incidencia);

  const desvio = pps - (nValorNF + nBonus - nIncidencia);
  const valorAlcancado = margemPPS - desvio;

  const percMargemMinima =
    valorMinimo && valorMinimo > 0
      ? (margemPPS - (pps - valorMinimo)) / valorMinimo
      : 0;

  const percMargemAlcancada =
    nValorNF + nBonus > 0 ? valorAlcancado / (nValorNF + nBonus) : 0;

  let alcada: "LIBERADO" | "AMARELO" | "VERMELHO" = "LIBERADO";
  if (percMargemAlcancada < percMargemMinima - 0.01) {
    alcada = "VERMELHO";
  } else if (percMargemAlcancada < percMargemMinima) {
    alcada = "AMARELO";
  }

  const tipoAutorizacao = modeloSelecionado?.tipoAutorizacao ?? "REGIONAL";

  const textoAlcada =
    alcada === "LIBERADO"
      ? "LIBERADO FATURAMENTO"
      : `AUTORIZAÇÃO ${tipoAutorizacao}`;

  const corAlcada =
    alcada === "LIBERADO"
      ? "#2e7d32"
      : alcada === "AMARELO"
      ? "#f9a825"
      : "#ee2427"; // vermelho da marca BYD

  const podeCalcular = modelo !== "" && regional !== "" && valorNF !== "";

  function handleCalcular() {
    setCalculado(true);
    setCopiado(false);
  }

  function montarTextoWhatsapp(): string {
    return (
      `🚗 *SOLICITAÇÃO DE AUTORIZAÇÃO BYD*\n\n` +
      `*Cliente:* ${cliente || "-"}\n` +
      `*Chassi 0km:* ${chassi || "-"}\n` +
      `*Usado na troca:* ${usadoNaTroca || "-"}\n\n` +
      `*Modelo:* ${modelo}\n` +
      `*Regional:* ${regional}\n\n` +
      `*PPS:* R$ ${formatarMoeda(pps)}\n` +
      `*Valor NF:* R$ ${formatarMoeda(nValorNF)}\n` +
      `*Bônus:* R$ ${formatarMoeda(nBonus)}\n` +
      `*Incidência:* R$ ${formatarMoeda(nIncidencia)}\n` +
      `*Valor Mínimo:* R$ ${formatarMoeda(valorMinimo ?? 0)}\n` +
      `*Valor Alcançado:* R$ ${formatarMoeda(valorAlcancado)}\n\n` +
      `*Margem Mínima:* ${formatarPercentual(percMargemMinima)}%\n` +
      `*Margem Alcançada:* ${formatarPercentual(percMargemAlcancada)}%\n\n` +
      `*ALÇADA:* ${textoAlcada}`
    );
  }

  async function handleCopiarWhatsapp() {
    const texto = montarTextoWhatsapp();
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch (e) {
      alert("Não foi possível copiar automaticamente. Copie manualmente:\n\n" + texto);
    }
  }

  return (
    <div className="container">
      <div className="header-app">
        <span className="badge-byd">BYD</span>
        <h1>Simulador Comercial</h1>
      </div>

      <p className="subtitulo">
        Política {politica.version} - {politica.mesReferencia}
      </p>

      <div className="layout">
        {/* ===== COLUNA ESQUERDA: FORMULÁRIO ===== */}
        <div className="coluna-form">
          {/* MODELO + REGIONAL */}
          <div className="form-grid">
            <div className="campo">
              <label>Modelo</label>
              <select
                value={modelo}
                onChange={(e) => handleSelecionarModelo(e.target.value)}
              >
                <option value="">Selecione...</option>
                {modelos.map((item, index) => (
                  <option key={index} value={item.modelo}>
                    {item.modelo}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo">
              <label>Regional</label>
              <select
                value={regional}
                onChange={(e) => {
                  setRegional(e.target.value);
                  setCalculado(false);
                }}
              >
                <option value="">Selecione...</option>
                {regionais.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DADOS DA NEGOCIAÇÃO - agrupado em card */}
          <div className="secao-card">
            <h3 className="secao-titulo">Dados da Negociação</h3>

            {/* Valor NF + Bônus + Incidência, os 3 na mesma linha */}
            <div className="form-grid-3">
              <div className="campo">
                <label>Valor NF (Preço Pleiteado)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={valorNF}
                  onChange={(e) =>
                    handleCampoMoeda(e.target.value, setValorNF)
                  }
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="campo">
                <label>Bônus</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={bonus}
                  onChange={(e) => handleCampoMoeda(e.target.value, setBonus)}
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="campo">
                <label>Incidência (Bancagem)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={incidencia}
                  onChange={(e) =>
                    handleCampoMoeda(e.target.value, setIncidencia)
                  }
                  placeholder="R$ 0,00"
                />
              </div>
            </div>
          </div>

          {/* DADOS DA VENDA - agrupado em card */}
          <div className="secao-card">
            <h3 className="secao-titulo">Dados da Venda</h3>

            {/* Cliente + Chassi + Usado na troca, os 3 na mesma linha */}
            <div className="form-grid-3">
              <div className="campo">
                <label>Cliente</label>
                <input
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                />
              </div>

              <div className="campo">
                <label>Chassi 0km</label>
                <input
                  type="text"
                  value={chassi}
                  onChange={(e) => setChassi(e.target.value)}
                />
              </div>

              <div className="campo">
                <label>Usado na troca</label>
                <input
                  type="text"
                  value={usadoNaTroca}
                  onChange={(e) => setUsadoNaTroca(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* BOTÃO CALCULAR */}
          <button
            className="botao-calcular"
            onClick={handleCalcular}
            disabled={!podeCalcular}
          >
            CALCULAR
          </button>
        </div>

        {/* ===== COLUNA DIREITA: INFO DO MODELO + RESULTADO ===== */}
        <div className="coluna-resultado">
          {modeloSelecionado && (
            <div className="card-info">
              <p>
                <strong>Ano/Modelo:</strong> {modeloSelecionado.anoModelo}
              </p>
              <p>
                <strong>PPS:</strong> R$ {formatarMoeda(pps)}
              </p>
              <p>
                <strong>Margem PPS:</strong> R$ {formatarMoeda(margemPPS)} (
                {(margem * 100).toFixed(0)}%)
              </p>
              <p>
                <strong>Observação:</strong> {modeloSelecionado.observacao}
              </p>
              {valorMinimo !== undefined && (
                <p>
                  <strong>Valor Mínimo ({regional}):</strong> R${" "}
                  {formatarMoeda(valorMinimo)}
                </p>
              )}
            </div>
          )}

          {!calculado && (
            <div className="resultado-placeholder">
              Preencha os dados da negociação e clique em{" "}
              <strong>CALCULAR</strong> para ver o resultado aqui.
            </div>
          )}

          {calculado && (
            <div className="resultado-box">
              <h3>Resultado</h3>

              <div className="resultado-linha">
                <span>Desvio</span>
                <span>R$ {formatarMoeda(desvio)}</span>
              </div>
              <div className="resultado-linha">
                <span>Valor Alcançado</span>
                <span>R$ {formatarMoeda(valorAlcancado)}</span>
              </div>
              <div className="resultado-linha">
                <span>Margem Mínima</span>
                <span>{formatarPercentual(percMargemMinima)}%</span>
              </div>
              <div className="resultado-linha">
                <span>Margem Alcançada</span>
                <span>{formatarPercentual(percMargemAlcancada)}%</span>
              </div>

              <div className="alcada-box" style={{ background: corAlcada }}>
                {textoAlcada}
              </div>

              <button
                className="botao-whatsapp"
                onClick={handleCopiarWhatsapp}
              >
                {copiado ? "✅ COPIADO!" : "📋 COPIAR PARA WHATSAPP"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
