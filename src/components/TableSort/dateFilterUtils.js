const formatearDiaCalendario = (year, month, day) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export const obtenerDiaCalendario = (valor) => {
    if (!valor) return null;
    if (typeof valor === 'string') {
        const fechaSinHora = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim());
        if (fechaSinHora) {
            const [, year, month, day] = fechaSinHora;
            const fecha = new Date(Number(year), Number(month) - 1, Number(day));
            if (
                fecha.getFullYear() === Number(year)
                && fecha.getMonth() === Number(month) - 1
                && fecha.getDate() === Number(day)
            ) {
                return `${year}-${month}-${day}`;
            }
            return null;
        }
    }

    const fecha = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(fecha.getTime())) return null;
    return formatearDiaCalendario(
        fecha.getFullYear(),
        fecha.getMonth() + 1,
        fecha.getDate()
    );
};
