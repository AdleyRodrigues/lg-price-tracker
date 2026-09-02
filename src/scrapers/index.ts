import { FonteScraper } from '../types/oferta';
import { amazonScraper } from './amazon';
import { lgScraper } from './lg';
import { promobitScraper } from './promobit';

export const scrapers: FonteScraper[] = [amazonScraper, lgScraper, promobitScraper];
