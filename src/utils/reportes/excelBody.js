// ======================================================
// CUERPO PRINCIPAL DEL REPORTE EXCEL
// ======================================================

import {
  FONT,
  ALIGN,
  BORDER,
  FILL
} from "./excelStyles";

import {
  crearCelda,
  numeroAColumna,
  combinar
} from "./excelHelpers";

import { crearEncabezado } from "./excelHeader";

// ======================================================

export function crearBody(ws, datos = {}) {

  const {

  reporteMatriz = [],
  sesionesOrdenadas = [],
  construirEncabezadoSesion,
  perfil = {},
  filtros = {},
  estudiantesFiltrados = []

} = datos;

crearEncabezado(ws, {
  universidad: "UNIVERSIDAD NACIONAL DEL SANTA",
  escuela: "ESCUELA PROFESIONAL DE MEDICINA HUMANA",
  sistema: "SISTEMA DE GESTIÓN ACADÉMICA",
  titulo: "REPORTE GENERAL DE ASISTENCIA",

  asignatura: filtros?.asignaturaNombre || "Todas",
  docente: perfil?.nombre || "",
  grupo: filtros?.grupo || "Todos",
  unidad: filtros?.unidad || "Todas",
  semestre: perfil?.semestre || "",
  fecha: new Date().toLocaleDateString("es-PE"),
  estudiantes: estudiantesFiltrados.length,
  sesiones: sesionesOrdenadas.length
});

  //----------------------------------------------------
  // TÍTULO DE LA TABLA
  //----------------------------------------------------

  crearCelda(ws, "A12", "REGISTRO GENERAL DE ASISTENCIA");

  combinar(ws, "A12:J12");

  ws["A12"].s = {

  font:{
    ...FONT.encabezado,
    sz:13,
    bold:true
    },

  fill: FILL.encabezado,

  border: BORDER.fino,

  alignment: ALIGN.centro

  };

  //----------------------------------------------------
  // FILA DONDE INICIA LA MATRIZ
  //----------------------------------------------------

  const filaInicio = 14;

  //----------------------------------------------------
  // CABECERA
  //----------------------------------------------------

  const encabezados = [

    "Código",
    "Estudiante",
    "Grupo",
    "Asignatura"
  ];

  //----------------------------------------------------
  // COLUMNAS DE SESIONES
  //----------------------------------------------------

  sesionesOrdenadas.forEach((sesion, indice) => {

    encabezados.push(

      construirEncabezadoSesion
        ? construirEncabezadoSesion(sesion, indice)
        : `S${String(indice + 1).padStart(2, "0")}`
    );

  });

  //----------------------------------------------------
  // COLUMNAS FINALES
  //----------------------------------------------------

  encabezados.push(

    "Total",
    "P",
    "T",
    "J",
    "F",
    "%"

  );

  //----------------------------------------------------
  // ESCRIBIR CABECERA
  //----------------------------------------------------

  encabezados.forEach((texto, columna) => {

    const ref =
      numeroAColumna(columna) +
      filaInicio;

    crearCelda(
      ws,
      ref,
      texto

    );

    ws[ref].s = {

    font: {
    ...FONT.encabezado,
    sz: 7,
    bold: true
    },

    alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true
    },

    border: BORDER.fino,

    fill: FILL.encabezado

};

  });

  //--------------------------------------------------
// ALTURA DEL ENCABEZADO
//--------------------------------------------------

ws["!rows"] = ws["!rows"] || [];

ws["!rows"][filaInicio - 1] = {
    hpt: 55
};

  //----------------------------------------------------
  // COMIENZA EL CUERPO
  //----------------------------------------------------

  let fila = filaInicio + 1;
  //----------------------------------------------------
  // RECORRER ESTUDIANTES
  //----------------------------------------------------

  reporteMatriz.forEach((item) => {

    const filaDatos = [

      item.codigo,

      item.estudiante,

      item.grupo,

      item.asignatura

    ];

    //----------------------------------------------------
    // ESTADO DE CADA SESIÓN
    //----------------------------------------------------

    sesionesOrdenadas.forEach((sesion) => {

      filaDatos.push(

        item.estados?.[sesion.id] || "F"

      );

    });

    //----------------------------------------------------
    // TOTALES
    //----------------------------------------------------

    filaDatos.push(

      item.totalSesiones,

      item.totalP,

      item.totalT,

      item.totalJ,

      item.totalF,

      `${item.porcentaje}%`

    );

    //----------------------------------------------------
    // ESCRIBIR FILA
    //----------------------------------------------------

    filaDatos.forEach((valor, columna) => {

      const ref = numeroAColumna(columna) + fila;

      crearCelda(

        ws,

        ref,

        valor

      );

      ws[ref].s = {

        font: {
         ...FONT.normal,
          sz: 10
        },

        border: BORDER.fino,

        fill:
         columna >= 4 &&
          columna < (4 + sesionesOrdenadas.length)
          ? (
          valor === "P"
            ? FILL.presente
            : valor === "T"
            ? FILL.tardanza
            : valor === "J"
            ? FILL.justificado
            : valor === "F"
            ? FILL.falta
            : (fila % 2 === 0 ? FILL.gris : undefined)
          )
        : (fila % 2 === 0 ? FILL.gris : undefined),

        alignment:
         columna === 1
          ? {
        ...ALIGN.izquierda,
        wrapText: true
           }
        : ALIGN.centro,

      };

    });

    fila++;

  });
  //----------------------------------------------------
  // AJUSTAR ANCHO DE COLUMNAS
  //----------------------------------------------------

  const totalColumnas = encabezados.length;

  ws["!cols"] = [];

  for (let i = 0; i < totalColumnas; i++) {

    if (i === 0) {

      ws["!cols"].push({ wch: 12 });

    } else if (i === 1) {

      ws["!cols"].push({ wch: 35 });

    } else if (i === 2) {

      ws["!cols"].push({ wch: 10 });

    } else if (i === 3) {

      ws["!cols"].push({ wch: 28 });

    } else if (i >= 4 && i < (4 + sesionesOrdenadas.length)) {

      ws["!cols"].push({ wch: 10 });

    } else {

      ws["!cols"].push({ wch: 9 });

    }

  }

  //----------------------------------------------------
  // CONGELAR PANEL
  //----------------------------------------------------

  ws["!freeze"] = {

  xSplit: 2,

  ySplit: filaInicio + 1

};

  //----------------------------------------------------
  // FILTROS
  //----------------------------------------------------

  const ultimaColumna = numeroAColumna(encabezados.length - 1);

  ws["!autofilter"] = {

    ref: `A${filaInicio}:${ultimaColumna}${filaInicio}`

  };

  //----------------------------------------------------
  // RANGO DE LA HOJA
  //----------------------------------------------------

  ws["!ref"] = `A1:${ultimaColumna}${fila - 1}`;

}

//======================================================

export default crearBody;