const pdf = require('pdf-parse');

console.log('Type of pdf:', typeof pdf);
console.log('Value of pdf:', pdf);

if (typeof pdf === 'function') {
    console.log('It is a function!');
} else {
    console.log('It is NOT a function.');
    if (pdf.default) {
        console.log('Has default export:', typeof pdf.default);
    }
}
