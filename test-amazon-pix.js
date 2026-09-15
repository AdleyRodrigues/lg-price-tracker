const axios = require('axios');
const cheerio = require('cheerio');

const CHROME_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.7258.128 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function debugAmazonPrice() {
  const url = 'https://www.amazon.com.br/LG-Condicionado-Split-Inverter-S3-Q09AA31F/dp/B0GQJP852H';
  const res = await axios.get(url, {
    headers: {
      ...CHROME_HEADERS,
      Referer: 'https://www.amazon.com.br/'
    }
  });

  const html = res.data;
  const $ = cheerio.load(html);

  console.log('--- Price Selectors ---');
  console.log('.apexPriceToPay .a-offscreen:', $('.apexPriceToPay .a-offscreen').text().trim());
  console.log('.priceToPay .a-offscreen:', $('.priceToPay .a-offscreen').text().trim());
  console.log('#corePrice_feature_div .a-offscreen:', $('#corePrice_feature_div .a-offscreen').text().trim());
  console.log('#corePriceDisplay_desktop_feature_div .a-offscreen:', $('#corePriceDisplay_desktop_feature_div .a-offscreen').text().trim());
  console.log('#corePriceDisplay_desktop_feature_div text:', $('#corePriceDisplay_desktop_feature_div').text().replace(/\s+/g, ' ').trim());
  
  console.log('--- Pix / Cash Discount Elements ---');
  $('*').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if ((text.includes('2.072') || text.includes('2072') || text.includes('Pix') || text.includes('NuPay')) && text.length < 200 && $(el).children().length === 0) {
      console.log('Found element with Pix/price:', $(el).prop('tagName'), $(el).attr('class'), $(el).attr('id'), '=>', text);
    }
  });

  console.log('--- All prices in HTML ---');
  $('.a-price .a-offscreen').each((i, el) => {
    console.log(`[${i}]`, $(el).text().trim(), 'Parent ID:', $(el).closest('[id]').attr('id'), 'Parent Class:', $(el).parent().attr('class'));
  });
}
debugAmazonPrice();
