import * as XLSX from 'xlsx'
import {jsPDF} from 'jspdf'
import html2canvas from 'html2canvas'
import { AreaChart } from '@mantine/charts';

/**Añade la información de los archivos exel a los hojas en blanco */
function createSheet (data){
    return XLSX.utils.json_to_sheet(data);
}

/**Esta funcion de creación y descarga de un archivo Excel tipo XLSX */
export function exportXLSX (data, name){
    const workBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workBook, createSheet(data), `${name}`);
    XLSX.writeFile(workBook,`${name}.xlsx`)
}

/**Esta funcion de creación y descarga de un archivo Excel tipo CSV */
export function exportCSV (data, name){
    const csv = XLSX.utils.sheet_to_csv(createSheet(data));
    const blob = new Blob([`/ufeff${csv}`], {type: 'text/csv;charset=utf-8'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${name}.csv`
    link.click();
    URL.revokeObjectURL(link.href)
}

export function exportPDF (data, name, description){
    const document = new jsPDF();
    document.setFontSize(18)
    document.setFontSize(`${description}`,20,20)
    document.setFontSize(11)
    let positionY = 35 
    data.forEach((obj) => {
        if(positionY>270){
            document.addPage();
            positionY = 20;
        }
        
        const textColum = Object.values(obj).join(' | ');
        document.text(`${textColum}`, 20, positionY);
        positionY += 10;
    });
    document.save(`${name}.pdf`)
}

export async function exportPDFCanvas (element, name){
    const canvas = await html2canvas(element, {scale: 2, backgroundColor: '#ffffff'});
    const imgData = canvas.toDataURL('image/png')
    const document =  new jsPDF('p', 'mm', 'a4')
    /**Maximo de dimenciones de la hoja */
    const pageWidth = 210;
    const pageHeight = 295;

    /**Margen de las hojas */
    const margin = 10;

    /**Calculo de uso de  la hoja */
    const width = pageWidth - (margin * 2)
    const imgHeight = (canvas.height * width) / canvas.width;

    document.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, width, imgHeight);
    let heigthLeft = imgHeight - (pageHeight - (margin*2));
    let position = 0;
    while (heigthLeft > 0){
        position = heigthLeft - imgHeight;
        document.addPage();
        document.addImage(imgData, 'PNG', margin, position +  margin, width, imgHeight);
        heigthLeft -= (pageHeight - (margin * 2))
    }
    document.save(`${name}.pdf`)
}
const mantineColors = [
  'blue.6',
  'indigo.6',
  'teal.6',
  'violet.6',
  'cyan.6',
  'pink.6',
  'grape.6',
  'orange.6',
  'lime.6',
  'yellow.6'
];

export function chartsDynamic(data, height, xAxisKey) {
    if(!data || data.length === 0) return null
    const keys = Object.keys(data[0]).filter((key) => key !== xAxisKey);
    const dynamicSeries = keys.map((key, index) =>{
        const color = mantineColors[index % mantineColors.length];
        return{
            name: key,
            color: color,
        };
    });
  return (
    <AreaChart
      h={height }
      data={data}
      dataKey={xAxisKey}
      series={dynamicSeries}
      curveType='monotone'
      withLegend
    />
  );
}