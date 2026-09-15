const axios = require('axios');
const cheerio = require('cheerio');

const CHROME_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.7258.128 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function inspectAmazonHtml() {
  const url = 'https://www.amazon.com.br/LG-Condicionado-Split-Inverter-S3-Q09AA31F/dp/B0GQJP852H';
  const res = await axios.get(url, { headers: { ...CHROME_HEADERS, Referer: 'https://www.amazon.com.br/' } });
  const $ = cheerio.load(res.data);

  console.log('Right col buybox:');
  console.log($('#rightCol').text().replace(/\s+/g, ' ').slice(0, 500));

  console.log('\nCenter col corePrice:');
  console.log($('#corePrice_desktop, #corePrice_feature_div, #corePriceDisplay_desktop_feature_div, #apex_desktop').text().replace(/\s+/g, ' '));

  console.log('\nInstallment / Pix terms:');
  $('[id*="price"], [class*="price"], [id*="installment"], [id*="payment"]').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (/R\$\s*2\.\d{3},\d{2}/.test(text) && text.length < 150) {
      console.log('  tag:', $(el).prop('tagName'), 'id:', $(el).attr('id'), 'class:', $(el).attr('class'), '=>', text);
    }
  });
}
inspectAmazonHtml();
