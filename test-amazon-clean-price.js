const axios = require('axios');
const cheerio = require('cheerio');

const CHROME_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.7258.128 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function testMainPriceSelectors() {
  const url = 'https://www.amazon.com.br/LG-Condicionado-Split-Inverter-S3-Q09AA31F/dp/B0GQJP852H';
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await axios.get(url, { headers: { ...CHROME_HEADERS, Referer: 'https://www.amazon.com.br/' } });
    const $ = cheerio.load(res.data);

    // Filter out recommendations and carousels
    $('#dp-sims-container, #p13n-desktop-sims-fbt, [id*="sp_detail"], #desktop-dp-sims_feature_div, #sponsoredProducts2_feature_div').remove();

    // Check main product container
    const $main = $('#apex_desktop, #centerCol, #rightCol, #desktop_unifiedPrice');

    const apexLabel = $main.find('.apex-pricetopay-accessibility-label, [class*="apex-pricetopay"] .a-offscreen').first().text().trim();
    const coreOffscreen = $main.find('#corePrice_feature_div .a-offscreen, #corePriceDisplay_desktop_feature_div .a-offscreen, .priceToPay .a-offscreen, .apexPriceToPay .a-offscreen').first().text().trim();
    const whole = $main.find('.priceToPay .a-price-whole, #corePriceDisplay_desktop_feature_div .a-price-whole, #corePrice_feature_div .a-price-whole').first().text().trim();
    const fraction = $main.find('.priceToPay .a-price-fraction, #corePriceDisplay_desktop_feature_div .a-price-fraction, #corePrice_feature_div .a-price-fraction').first().text().trim();
    const buyboxPrice = $main.find('#price_inside_buybox, #price, #buyBoxAccordion .a-price .a-offscreen').first().text().trim();
    const fallbackOffscreen = $main.find('.a-price .a-offscreen').first().text().trim();

    console.log(`Attempt ${attempt}:`);
    console.log('  apexLabel:', apexLabel);
    console.log('  coreOffscreen:', coreOffscreen);
    console.log('  whole+fraction:', whole ? `${whole}${fraction ? `,${fraction}` : ''}` : '');
    console.log('  buyboxPrice:', buyboxPrice);
    console.log('  fallbackOffscreen in main:', fallbackOffscreen);
  }
}
testMainPriceSelectors();
