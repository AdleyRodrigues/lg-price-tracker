const axios = require('axios');
const cheerio = require('cheerio');

const CHROME_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.7258.128 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function testMultipleRuns() {
  const url = 'https://www.amazon.com.br/LG-Condicionado-Split-Inverter-S3-Q09AA31F/dp/B0GQJP852H';
  for (let i = 1; i <= 3; i++) {
    const res = await axios.get(url, { headers: { ...CHROME_HEADERS, Referer: 'https://www.amazon.com.br/' } });
    const $ = cheerio.load(res.data);
    const seller = $('#merchant-info').text().trim();
    const corePrice = $('#corePrice_feature_div .a-offscreen').text().trim();
    const apexPrice = $('.apexPriceToPay .a-offscreen').text().trim();
    const priceToPay = $('.priceToPay .a-offscreen').text().trim();
    const allOffscreen = $('.a-price .a-offscreen').map((_, el) => $(el).text().trim()).get().slice(0, 5);
    const whole = $('.a-price-whole').first().text().trim();
    const fraction = $('.a-price-fraction').first().text().trim();
    console.log(`Run ${i}:`);
    console.log('  Seller:', seller);
    console.log('  #corePrice_feature_div:', corePrice);
    console.log('  .apexPriceToPay:', apexPrice);
    console.log('  .priceToPay:', priceToPay);
    console.log('  Whole+fraction:', `${whole}${fraction}`);
    console.log('  First 5 offscreen:', allOffscreen);
    console.log('  Page text snippet:', $('#centerCol').text().replace(/\s+/g, ' ').slice(0, 300));
  }
}
testMultipleRuns();
