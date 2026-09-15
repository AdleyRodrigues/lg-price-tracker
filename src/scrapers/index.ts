import { FonteScraper } from '../types/oferta';
import { amazonScraper } from './amazon';
import { promobitScraper } from './promobit';

export const scrapers: FonteScraper[] = [amazonScraper, promobitScraper];
