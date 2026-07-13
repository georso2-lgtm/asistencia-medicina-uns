// ==========================================================
// SISTEMA DE GESTIÓN ACADÉMICA
// UNIVERSIDAD NACIONAL DEL SANTA
// Encabezado Institucional del Reporte Excel
// ==========================================================

import {
  FONT,
  ALIGN,
  BORDER,
  FILL
} from "./excelStyles";

import {
  combinar,
  crearCelda
} from "./excelHelpers";

//==================================================
// ENCABEZADO PRINCIPAL
//==================================================

export function crearEncabezado(ws, datos, ultimaColumna = "J") {

  const {

    universidad = "UNIVERSIDAD NACIONAL DEL SANTA",

    escuela = "ESCUELA PROFESIONAL DE MEDICINA HUMANA",

    sistema = "SISTEMA DE GESTIÓN ACADÉMICA",

    titulo = "REPORTE GENERAL DE ASISTENCIA",

    asignatura = "",

    docente = "",

    grupo = "",

    unidad = "",

    semestre = "",

    fecha = "",

    estudiantes = 0,

    sesiones = 0

  } = datos;

  //----------------------------------------------------

  crearCelda(ws, "A1", universidad);

  crearCelda(ws, "A2", escuela);

  crearCelda(ws, "A3", sistema);

  crearCelda(ws, "A4", titulo);

  combinar(ws, `A1:${ultimaColumna}1`);
  combinar(ws, `A2:${ultimaColumna}2`);
  combinar(ws, `A3:${ultimaColumna}3`);
  combinar(ws, `A4:${ultimaColumna}4`);

  //----------------------------------------------------

  ws["A1"].s = {
  font: FONT.tituloPrincipal,

  alignment: {
    ...ALIGN.centro,
    vertical: "center"
  }
  };

  ws["A2"].s = {
  font: FONT.tituloSecundario,

  alignment: {
    ...ALIGN.centro,
    vertical: "center"
  }
  };

  ws["A3"].s = {
    font: FONT.negrita,
    alignment: ALIGN.centro
  };

  ws["A4"].s = {

  font: {
    ...FONT.encabezado,
    sz: 12,
    bold: true
  },
  fill: FILL.titulo,
  alignment: {
    ...ALIGN.centro,
    vertical: "center"
  },
  border: BORDER.fino
  };

  //----------------------------------------------------

  const info = [

  ["Asignatura", asignatura, "Fecha", fecha],

  ["Docente", docente, "Semestre", semestre],

  ["Grupo", grupo, "Unidad", unidad],

  ["Estudiantes", estudiantes, "Sesiones", sesiones]

];

  let fila = 6;

  info.forEach(item => {

    crearCelda(ws, `A${fila}`, item[0]);
    crearCelda(ws, `B${fila}`, item[1]);

    crearCelda(ws, `F${fila}`, item[2]);
    crearCelda(ws, `G${fila}`, item[3]);

    ["A","F"].forEach(col => {

        ws[`${col}${fila}`].s = {

            font: FONT.negrita,

            fill: FILL.subtitulo,

            border: BORDER.fino,

            alignment: ALIGN.izquierda

        };

    });

    ["B","G"].forEach(col => {

        ws[`${col}${fila}`].s = {

            font: FONT.normal,

            border: BORDER.fino,

            alignment: ALIGN.izquierda

        };

    });

    combinar(ws, `B${fila}:D${fila}`);
    combinar(ws, `G${fila}:I${fila}`);

    fila++;

});

  ws["!rows"] = ws["!rows"] || [];

ws["!rows"][0] = { hpt: 24 };
ws["!rows"][1] = { hpt: 20 };
ws["!rows"][2] = { hpt: 18 };
ws["!rows"][3] = { hpt: 22 };

ws["!rows"][5] = { hpt: 22 };
ws["!rows"][6] = { hpt: 22 };
ws["!rows"][7] = { hpt: 22 };
ws["!rows"][8] = { hpt: 22 };

ws["!cols"] = ws["!cols"] || [];

ws["!cols"][0] = { wch: 14 }; // A
ws["!cols"][1] = { wch: 38 }; // B
ws["!cols"][2] = { wch: 8 };  // C
ws["!cols"][3] = { wch: 8 };  // D
ws["!cols"][4] = { wch: 4 };  // E
ws["!cols"][5] = { wch: 14 }; // F
ws["!cols"][6] = { wch: 22 }; // G
ws["!cols"][7] = { wch: 8 };  // H
ws["!cols"][8] = { wch: 8 };  // I

}