const axios = require('axios');
const cheerio = require('cheerio');

const CHROME_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.7258.128 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function testAllOffersDisplay() {
  const url = 'https://www.amazon.com.br/gp/product/ajax/?asin=B0GQJP852H&pc=dp&experienceId=aodAjaxMain';
  try {
    const res = await axios.get(url, {
      headers: {
        ...CHROME_HEADERS,
        Referer: 'https://www.amazon.com.br/dp/B0GQJP852H'
      }
    });
    const $ = cheerio.load(res.data);
    console.log('AOD Status:', res.status);
    console.log('AOD HTML length:', res.data.length);
    
    // Find all offers in AOD
    $('#aod-offer').each((i, el) => {
      const price = $(el).find('.a-price .a-offscreen').first().text().trim();
      const seller = $(el).find('#aod-offer-soldBy a, #aod-offer-soldBy span').text().replace(/\s+/g, ' ').trim();
      const shipping = $(el).find('#aod-offer-shipping').text().replace(/\s+/g, ' ').trim();
      console.log(`Offer ${i}: Price: ${price} | Seller: ${seller} | Shipping: ${shipping}`);
    });
  } catch(e) {
    console.log('AOD error:', e.message);
  }
}
testAllOffersDisplay();
