// ==========================================================
// SISTEMA DE GESTIÓN ACADÉMICA
// UNIVERSIDAD NACIONAL DEL SANTA
// Funciones auxiliares para generación de Excel
// ==========================================================

import * as XLSX from "xlsx-js-style";

//==================================================
// AUTOAJUSTE DE COLUMNAS
//==================================================

export function autoAjustarColumnas(ws, datos = []) {

  if (!datos.length) return;

  const columnas = [];

  datos.forEach((fila) => {

    fila.forEach((celda, i) => {

      const texto =
        celda === undefined || celda === null
          ? ""
          : celda.toString();

      columnas[i] = Math.max(
        columnas[i] || 10,
        texto.length + 2
      );

    });

  });

  ws["!cols"] = columnas.map((c) => ({
    wch: Math.min(Math.max(c, 8), 45)
  }));

}

//==================================================
// COMBINAR CELDAS
//==================================================

export function combinar(ws, rango) {

  if (!ws["!merges"])
    ws["!merges"] = [];

  ws["!merges"].push(
    XLSX.utils.decode_range(rango)
  );

}

//==================================================
// CONGELAR PANEL
//==================================================

export function congelar(ws, columnas = 0, filas = 0) {

  ws["!freeze"] = {
    xSplit: columnas,
    ySplit: filas
  };

}

//==================================================
// AUTOFILTRO
//==================================================

export function agregarFiltro(ws, rango) {

  ws["!autofilter"] = {
    ref: rango
  };

}

//==================================================
// ORIENTACIÓN DE IMPRESIÓN
//==================================================

export function configurarImpresion(ws) {

  ws["!pageSetup"] = {

    orientation: "landscape",

    fitToPage: true,

    fitToWidth: 1,

    fitToHeight: 0,

    paperSize: 9

  };

}

//==================================================
// ALTURA DE FILAS
//==================================================

export function alturaFilas(ws, totalFilas = 100) {

  ws["!rows"] = [];

  for (let i = 0; i < totalFilas; i++) {

    ws["!rows"].push({
      hpt: 22
    });

  }

}

//==================================================
// APLICAR ESTILO A UNA CELDA
//==================================================

export function aplicar(ws, celda, estilo) {

  if (!ws[celda]) return;

  ws[celda].s = {

    ...(ws[celda].s || {}),

    ...estilo

  };

}

//==================================================
// CREAR CELDA
//==================================================

export function crearCelda(ws, ref, valor, estilo = null) {

  ws[ref] = {

    t: typeof valor === "number" ? "n" : "s",

    v: valor

  };

  if (estilo) {

    ws[ref].s = estilo;

  }

  const rangoCelda = XLSX.utils.decode_range(ref + ":" + ref);

  if (!ws["!ref"]) {

    ws["!ref"] = ref + ":" + ref;

  } else {

    const rangoActual = XLSX.utils.decode_range(ws["!ref"]);

    rangoActual.s.r = Math.min(rangoActual.s.r, rangoCelda.s.r);
    rangoActual.s.c = Math.min(rangoActual.s.c, rangoCelda.s.c);

    rangoActual.e.r = Math.max(rangoActual.e.r, rangoCelda.e.r);
    rangoActual.e.c = Math.max(rangoActual.e.c, rangoCelda.e.c);

    ws["!ref"] = XLSX.utils.encode_range(rangoActual);

  }

}

//==================================================
// OBTENER LETRA DE COLUMNA
//==================================================

export function columna(numero) {

  let letra = "";

  while (numero >= 0) {

    letra =
      String.fromCharCode((numero % 26) + 65) +
      letra;

    numero =
      Math.floor(numero / 26) - 1;

  }

  return letra;

}

// Convierte 0=A, 25=Z, 26=AA, 27=AB...
export function numeroAColumna(numero) {

  let columna = "";

  let n = numero;

  while (n >= 0) {

    columna = String.fromCharCode((n % 26) + 65) + columna;

    n = Math.floor(n / 26) - 1;

  }

  return columna;

}