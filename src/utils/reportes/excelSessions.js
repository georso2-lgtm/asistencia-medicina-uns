// ==========================================================
// SISTEMA DE GESTIÓN ACADÉMICA
// UNIVERSIDAD NACIONAL DEL SANTA
// Hoja de Detalle de Sesiones
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

import { crearEncabezado } from "./excelHeader";


//==================================================

export function crearSesiones(ws, datos = {}) {

  const {

    sesionesOrdenadas = [],
    obtenerUnidad,
    obtenerTipoSesion,
    perfil = {},
    filtros = {},
    estudiantesFiltrados = []

} = datos;

crearEncabezado(ws, {

  universidad: "UNIVERSIDAD NACIONAL DEL SANTA",
  escuela: "ESCUELA PROFESIONAL DE MEDICINA HUMANA",
  sistema: "SISTEMA DE GESTIÓN ACADÉMICA",
  titulo: "DETALLE DE SESIONES",
  asignatura: filtros?.asignaturaNombre || "Todas",
  docente: perfil?.nombre || "",
  grupo: filtros?.grupo || "Todos",
  unidad: filtros?.unidad || "Todas",
  semestre: perfil?.semestre || "",
  fecha: new Date().toLocaleDateString("es-PE"),
  estudiantes: estudiantesFiltrados.length,
  sesiones: sesionesOrdenadas.length

});

  
crearCelda(ws,"A12","DETALLE DE SESIONES DESARROLLADAS");

combinar(ws, "A12:J12");

ws["A12"].s={

    font:{
    ...FONT.encabezado,
    sz:13,
    bold:true
    },

    fill:FILL.encabezado,

    border:BORDER.fino,

    alignment:ALIGN.centro

};

//------------------------------------------------
  // Encabezado de la tabla
  //------------------------------------------------
  const filaInicio = 14;

  const encabezados = [
  "N°",
  "Unidad",
  "Fecha",
  "Hora inicio",
  "Hora fin",
  "Asignatura",
  "Tipo",
  "Grupo",
  "Tema",
  "Estado"
];


encabezados.forEach((texto, c) => {

    const ref = numeroAColumna(c) + filaInicio;

    crearCelda(ws, ref, texto);

    ws[ref].s = {
        font: {
            ...FONT.encabezado,
            color: { rgb: "FFFFFF" },
            bold: true,
            sz: 10
        },

        fill: {
            patternType: "solid",
            fgColor: { rgb: "1F4E78" }
        },

        alignment: {
            horizontal: "center",
            vertical: "center",
            wrapText: true
        },

        border: BORDER.fino
    };

});

let fila = filaInicio + 1;

    sesionesOrdenadas.forEach((sesion, index) => {

   const datos = [

  index + 1,

  obtenerUnidad
    ? obtenerUnidad(sesion)
    : (sesion.unidad || ""),

  sesion.fecha || "",

  sesion.hora_inicio || "",

  sesion.hora_fin || sesion.hora_cierre || "",

  sesion.asignatura_nombre || "",

  obtenerTipoSesion
    ? obtenerTipoSesion(sesion)
    : (sesion.tipo_sesion || sesion.tipo || ""),

  sesion.grupo || "",

  sesion.tema || "",

  sesion.estado || ""

];

    datos.forEach((valor, c) => {

      const ref =
        numeroAColumna(c) +
        fila;

      crearCelda(ws, ref, valor);

      ws[ref].s = {

        font: FONT.normal,

        border: BORDER.fino,

        fill:

        c === 9

        ? (

        valor === "ABIERTA"

          ? FILL.presente

          : valor === "CERRADA"

          ? FILL.falta

          : fila % 2 === 0

            ? FILL.gris

            : undefined

          )

        : (

        fila % 2 === 0

          ? FILL.gris

          : undefined

        ),

        alignment:

          c === 8

          ? {

          ...ALIGN.izquierda,

          wrapText: true

          }

          : c >= 2 && c <= 4

          ? ALIGN.centro

          : ALIGN.izquierda

      };

    });

    fila++;

  });

  //--------------------------------------------------
// CONGELAR PANEL
//--------------------------------------------------

ws["!freeze"] = {

  xSplit: 2,

  ySplit: filaInicio + 1

};

//--------------------------------------------------
// FILTROS
//--------------------------------------------------

ws["!autofilter"] = {

  ref: `A${filaInicio}:${numeroAColumna(encabezados.length - 1)}${filaInicio}`

};
  
  const ultimaColumna = numeroAColumna(encabezados.length - 1);

  ws["!cols"] = [

    { wch: 6 },   // Nº
    { wch: 12 },  // Unidad
    { wch: 12 },  // Fecha
    { wch: 10 },  // Inicio
    { wch: 10 },  // Fin
    { wch: 28 },  // Asignatura
    { wch: 16 },  // Tipo
    { wch: 10 },  // Grupo
    { wch: 40 },  // Tema
    { wch: 12 }   // Estado

];

  ws["!ref"] = `A1:${ultimaColumna}${fila - 1}`;

}