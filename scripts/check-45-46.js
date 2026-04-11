const data = JSON.parse(require('fs').readFileSync('data/json/azkar.json','utf8'));
[45,46].forEach(id => {
  const z = data.azkar.find(x => x.id === id);
  console.log('ID', id, '| count:', z.count, '| rich:', !!(z.translations && z.translations.en));
  console.log('  ', z.arabic);
  console.log('');
});
