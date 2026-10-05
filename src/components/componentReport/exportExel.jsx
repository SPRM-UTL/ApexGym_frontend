import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { AreaChart } from '@mantine/charts';


function crearHoja(datos) {
  return XLSX.utils.json_to_sheet(datos);
}

export function exportarExcel(datos, nombre = 'reporte-apexgym') {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, crearHoja(datos), 'Miembros');
  XLSX.writeFile(workbook, `${nombre}.xlsx`);
}

export function exportarCSV(datos, nombre = 'reporte-apexgym') {
  const csv = XLSX.utils.sheet_to_csv(crearHoja(datos));
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = `${nombre}.csv`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

export function exportarPDF(datos, nombre = 'reporte-apexgym') {
  const documento = new jsPDF();
  documento.setFontSize(18);
  documento.text('Reporte de miembros - ApexGym', 20, 20);
  documento.setFontSize(11);
  datos.forEach((miembro, indice) => {
    const posicionY = 35 + (indice * 10);
    documento.text(`${miembro.id}. ${miembro.nombre} | ${miembro.plan} | ${miembro.estado}`, 20, posicionY);
  });
  documento.save(`${nombre}.pdf`);
}

export async function exportarElementoComoPDF(elemento, nombre = 'reporte-apexgym') {
  const canvas = await html2canvas(elemento, { scale: 2, backgroundColor: '#ffffff' });
  const documento = new jsPDF('p', 'mm', 'a4');
  const ancho = 190;
  const alto = (canvas.height * ancho) / canvas.width;
  documento.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, ancho, alto);
  documento.save(`${nombre}.pdf`);
}

const dataGrafica = [
  { date: 'Ene', ingresos: 1200, gastos: 900 },
  { date: 'Feb', ingresos: 2100, gastos: 1200 },
  { date: 'Mar', ingresos: 800, gastos: 500 },
  { date: 'Abr', ingresos: 1400, gastos: 1100 },
  { date: 'May', ingresos: 2900, gastos: 1900 },
  { date: 'Jun', ingresos: 2600, gastos: 1700 },
];

export function GraficaVentas() {
  return (
    <AreaChart
      h={300}
      data={dataGrafica}
      dataKey="date"
      series={[
        { name: 'ingresos', color: 'indigo.6' },
        { name: 'gastos', color: 'red.6' },
      ]}
      curveType="natural"
    />
  );
}