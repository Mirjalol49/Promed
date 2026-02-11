export const formatCompactNumber = (number: number): string => {
    if (number === 0) return '0';

    const abs = Math.abs(number);
    const sign = number < 0 ? '-' : '';

    if (abs >= 1e9) {
        return sign + (abs / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (abs >= 1e6) {
        return sign + (abs / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (abs >= 1e3) {
        return sign + (abs / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    }

    return sign + abs.toString();
};

export const formatCurrency = (amount: number, currency: 'USD' | 'UZS' = 'UZS') => {
    return new Intl.NumberFormat('uz-UZ', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};
export const formatWithSpaces = (amount: number | string): string => {
    if (amount === undefined || amount === null) return '';
    const parts = amount.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join('.');
};
