import {
  crearCelda,
  combinar
} from "./excelHelpers";

import {
  FONT,
  FILL,
  BORDER,
  ALIGN
} from "./excelStyles";

export function crearIncidencias(ws, datos) {

  const {
    asistencias = [],
    sesionesOrdenadas = [],
    obtenerUnidad,
    obtenerTipoSesion
  } = datos;

  crearCelda(ws, "A12", "REGISTRO DE INCIDENCIAS DOCENTES");

  combinar(ws, "A12:I12");

  ws["A12"].s = {
    font: {
      ...FONT.encabezado,
      sz: 13,
      bold: true
    },
    fill: FILL.encabezado,
    border: BORDER.fino,
    alignment: ALIGN.centro
  };

  const filaInicio = 14;

  const encabezados = [
    "N°",
    "Fecha",
    "Unidad",
    "Tipo",
    "Código",
    "Estudiante",
    "Estado",
    "Observación"
  ];

  encabezados.forEach((texto, i) => {

    const ref =
      String.fromCharCode(65 + i) + filaInicio;

    crearCelda(ws, ref, texto);

    ws[ref].s = {
      font: {
        ...FONT.encabezado,
        bold: true
      },
      fill: FILL.encabezado,
      border: BORDER.fino,
      alignment: ALIGN.centro
    };

  });

  let fila = filaInicio + 1;

  asistencias
    .filter(a => a.observacion && a.observacion.trim() !== "")
    .forEach((a, index) => {

      const sesion = sesionesOrdenadas.find(
       s => String(s.id) === String(a.sesion_id)
      );


      const datosFila = [

        index + 1,

        sesion?.fecha || "",

        sesion ? obtenerUnidad(sesion) : "",

        sesion ? obtenerTipoSesion(sesion) : "",

        a.codigo,

        a.estudiante,

        a.estado,

        a.observacion

      ];

      datosFila.forEach((valor, c) => {

        const ref =
          String.fromCharCode(65 + c) + fila;

        crearCelda(ws, ref, valor);

      });

      fila++;

    });

  ws["!cols"] = [

    { wch: 6 },

    { wch: 12 },

    { wch: 14 },

    { wch: 12 },

    { wch: 12 },

    { wch: 35 },

    { wch: 12 },

    { wch: 60 }

  ];

}