// Debug: why /\bpricé\b/gi doesn't match
const re = /\bpricé\b/gi;
const input = 'Le marché avait pricé cette hypothèse.';
console.log('regex test:', re.test(input));
console.log('match:', input.match(/\bpricé\b/gi));
console.log('replace:', input.replace(/\bpricé\b/gi, 'praïcé'));

// Check if \b works with accented chars
console.log('\\b test é:', 'pricé'.match(/\bpricé\b/));
console.log('\\b test e:', 'price'.match(/\bprice\b/));

// The issue: \b treats é as a word boundary?
console.log('word boundary test:', 'pricé'.match(/pricé/));
console.log('without \\b:', input.replace(/pricé/gi, 'praïcé'));
