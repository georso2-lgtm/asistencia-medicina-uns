// ==========================================================
// SISTEMA DE GESTIÓN ACADÉMICA
// UNIVERSIDAD NACIONAL DEL SANTA
// Hoja Resumen del Reporte Excel
// ==========================================================

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

//==================================================

export function crearResumen(ws, reporteMatriz = []) {
    //==================================================
// RESUMEN EJECUTIVO
//==================================================

crearCelda(ws, "A12", "RESUMEN GENERAL DE ASISTENCIA");

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
ws["!rows"][11] = { hpt: 28 };

  //------------------------------------------------
  // Encabezado de la tabla
  //------------------------------------------------

  const filaInicio = 14;

  const encabezados = [

  "Código",
  "Estudiante",
  "Grupo",
  "Asignatura",
  "Sesiones",
  "Presentes",
  "Tardanzas",
  "Justificados",
  "Faltas",
  "% Asistencia"

];

  encabezados.forEach((texto, i) => {

    const ref =
      numeroAColumna(i) +
      filaInicio;

    crearCelda(
      ws,
      ref,
      texto
    );

    ws[ref].s = {

      font: FONT.encabezado,

      fill: FILL.encabezado,

      border: BORDER.fino,

      alignment: ALIGN.centro

    };

  });

  //------------------------------------------------

  let fila = filaInicio + 1;

  if (reporteMatriz.length === 0) return;

  reporteMatriz.forEach(item => {

    const datos = [

      item.codigo,

      item.estudiante,

      item.grupo,

      item.asignatura,

      item.totalSesiones,

      item.totalP,

      item.totalT,

      item.totalJ,

      item.totalF,

      `${item.porcentaje}%`

    ];

    datos.forEach((valor, c) => {

      const ref =
        numeroAColumna(c) +
        fila;

      crearCelda(
        ws,
        ref,
        valor
      );

      ws[ref].s = {

        font: FONT.normal,

        border: BORDER.fino,

        fill:
        c === 9
        ? (
        item.porcentaje >= 90
          ? FILL.presente
          : item.porcentaje >= 70
            ? FILL.tardanza
            : FILL.falta
         )
        : (
        fila % 2 === 0
          ? FILL.gris
          : undefined
        ),

        alignment:
        c === 1 || c === 3
        ? {
        ...ALIGN.izquierda,
        wrapText: true
         }
        : ALIGN.centro,

      };

    });

    fila++;

  });

  ws["!freeze"] = {

  xSplit: 2,

  ySplit: filaInicio + 1

  };

    ws["!autofilter"] = {

    ref: `A${filaInicio}:${numeroAColumna(encabezados.length - 1)}${filaInicio}`

  };

  //--------------------------------------------------
  // ANCHO DE COLUMNAS
  //--------------------------------------------------

  ws["!cols"] = [

    { wch: 12 }, // Código

    { wch: 45 }, // Estudiante

    { wch: 8 },  // Grupo

    { wch: 28 }, // Asignatura

    { wch: 10 }, // Sesiones

    { wch: 10 }, // Presentes

    { wch: 10 }, // Tardanzas

    { wch: 12 }, // Justificados

    { wch: 10 }, // Faltas

    { wch: 12 }  // % Asistencia

  ];

  ws["!ref"] = `A1:${numeroAColumna(encabezados.length - 1)}${fila - 1}`;

}