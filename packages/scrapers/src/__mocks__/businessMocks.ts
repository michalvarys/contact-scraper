// @ts-nocheck
import { Business, WebsiteAnalysisResult } from '../types';

/**
 * Mock data pro Business objekty
 */
export const mockBusinesses: Record<string, Business> = {
  // Google Maps firma
  googleMapsCompany1: {
    id: 'gm1',
    name: 'Kavárna U Růže',
    address: 'Václavské náměstí 123, 110 00 Praha 1',
    email: 'info@kavarnaruze.cz',
    phone: '+420 123 456 789',
    website: 'https://www.kavarnaruze.cz',
    industry: 'kavárna',
    region: 'Praha',
    rating: '4.7',
    reviewsCount: 128,
    reviews: [
      { rating: 5, text: 'Výborná káva a příjemná obsluha.' },
      { rating: 4, text: 'Skvělé místo pro pracovní schůzky.' },
    ],
    categories: ['Kavárna', 'Restaurace', 'Cukrárna'],
    openingHours: [
      'Pondělí: 8:00–20:00',
      'Úterý: 8:00–20:00',
      'Středa: 8:00–20:00',
      'Čtvrtek: 8:00–20:00',
      'Pátek: 8:00–22:00',
      'Sobota: 9:00–22:00',
      'Neděle: 9:00–20:00',
    ],
    link: 'https://www.google.com/maps/place/Kavárna+U+Růže',
    contacts: [
      {
        name: 'Jan Novák',
        role: 'Manažer',
        phone: '+420 123 456 789',
        email: 'novak@kavarnaruze.cz',
      },
    ],
    scrapedAt: '2025-03-09T22:30:00.000Z',
  },

  googleMapsCompany2: {
    id: 'gm2',
    name: 'IT Solutions s.r.o.',
    address: 'Vinohradská 456, 120 00 Praha 2',
    email: 'info@itsolutions.cz',
    phone: '+420 234 567 890',
    website: 'https://www.itsolutions.cz',
    industry: 'IT',
    region: 'Praha',
    rating: '4.2',
    reviewsCount: 45,
    categories: ['IT služby', 'Webdesign', 'Programování'],
    link: 'https://www.google.com/maps/place/IT+Solutions+s.r.o.',
    scrapedAt: '2025-03-09T22:35:00.000Z',
  },

  // Firmy.cz firma
  firmyCzCompany1: {
    id: 'fc1',
    name: 'Autoservis Rychlý',
    address: 'Dlouhá 789, 301 00 Plzeň',
    email: 'servis@autoservisrychly.cz',
    phone: '+420 345 678 901',
    website: 'https://www.autoservisrychly.cz',
    industry: 'autoservis',
    region: 'Plzeň',
    reviewsCount: 32,
    categories: ['Autoservis', 'Pneuservis', 'Autodiagnostika'],
    link: 'https://www.firmy.cz/detail/12345-autoservis-rychly-plzen.html',
    scrapedAt: '2025-03-09T22:40:00.000Z',
  },

  firmyCzCompany2: {
    id: 'fc2',
    name: 'Květinářství Orchidej',
    address: 'Náměstí Republiky 10, 301 00 Plzeň',
    email: 'info@kvetinarstvi-orchidej.cz',
    phone: '+420 456 789 012',
    website: 'https://www.kvetinarstvi-orchidej.cz',
    industry: 'květinářství',
    region: 'Plzeň',
    reviewsCount: 18,
    categories: ['Květinářství', 'Zahradnictví'],
    link: 'https://www.firmy.cz/detail/67890-kvetinarstvi-orchidej-plzen.html',
    scrapedAt: '2025-03-09T22:45:00.000Z',
  },

  // Firma bez některých údajů
  incompleteCompany: {
    id: 'inc1',
    name: 'Malá pekárna',
    address: 'Polní 42, 370 01 České Budějovice',
    email: null,
    phone: '+420 567 890 123',
    website: null,
    industry: 'pekárna',
    region: 'České Budějovice',
    reviewsCount: 5,
    categories: ['Pekárna'],
    link: 'https://www.google.com/maps/place/Malá+pekárna',
    scrapedAt: '2025-03-09T22:50:00.000Z',
  },
};

/**
 * Mock data pro WebsiteAnalysisResult
 */
export const mockWebsiteAnalysis: Record<string, WebsiteAnalysisResult> = {
  kavarnaRuze: {
    metadata: {
      title: 'Kavárna U Růže | Domácí káva a dezerty v centru Prahy',
      description:
        'Navštivte naši kavárnu v centru Prahy. Nabízíme výběrovou kávu, domácí dezerty a příjemné prostředí pro setkání s přáteli nebo pracovní schůzky.',
      keywords: 'kavárna, káva, dezerty, Praha, centrum',
    },
    email: 'info@kavarnaruze.cz',
    thumbnail:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAB9JREFUaN7twQENAAAAwqD3T20ON6AAAAAAAAAAAL4NIQAAAZpj6/MAAAAASUVORK5CYII=',
    websiteAnalysis: {
      seoScore: 85,
      errors: ['Chybí alt texty u některých obrázků', 'Některé nadpisy nejsou ve správném pořadí'],
      designScore: 90,
      modernityScore: 88,
      responsiveScore: 95,
      recommendations: [
        'Přidat alt texty ke všem obrázkům',
        'Opravit strukturu nadpisů',
        'Zrychlit načítání stránky optimalizací obrázků',
      ],
      viewportDetails: [
        {
          size: 'mobile',
          seoScore: 82,
          designScore: 88,
          modernityScore: 85,
          errors: ['Některé prvky přesahují šířku obrazovky'],
          recommendations: ['Upravit rozložení pro mobilní zařízení'],
          responsiveIssues: ['Přesahující prvky na mobilních zařízeních'],
        },
        {
          size: 'desktop',
          seoScore: 87,
          designScore: 92,
          modernityScore: 90,
          errors: ['Chybí alt texty u některých obrázků'],
          recommendations: ['Přidat alt texty ke všem obrázkům'],
          responsiveIssues: [],
        },
      ],
    },
  },

  itSolutions: {
    metadata: {
      title: 'IT Solutions s.r.o. | Profesionální IT služby pro firmy',
      description:
        'Poskytujeme komplexní IT služby pro firmy všech velikostí. Specializujeme se na vývoj software, webdesign, správu sítí a IT bezpečnost.',
      keywords: 'IT služby, vývoj software, webdesign, správa sítí, IT bezpečnost',
    },
    email: 'info@itsolutions.cz',
    thumbnail:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAB9JREFUaN7twQENAAAAwqD3T20ON6AAAAAAAAAAAL4NIQAAAZpj6/MAAAAASUVORK5CYII=',
    websiteAnalysis: {
      seoScore: 92,
      errors: ['Některé stránky mají duplicitní meta popisky'],
      designScore: 85,
      modernityScore: 95,
      responsiveScore: 90,
      recommendations: [
        'Odstranit duplicitní meta popisky',
        'Zlepšit kontrast některých textů',
        'Optimalizovat načítání JavaScriptu',
      ],
      viewportDetails: [
        {
          size: 'mobile',
          seoScore: 90,
          designScore: 82,
          modernityScore: 93,
          errors: ['Tlačítka jsou příliš malá pro mobilní zařízení'],
          recommendations: ['Zvětšit interaktivní prvky pro mobilní zařízení'],
          responsiveIssues: ['Malá tlačítka na mobilních zařízeních'],
        },
        {
          size: 'desktop',
          seoScore: 94,
          designScore: 88,
          modernityScore: 97,
          errors: ['Některé stránky mají duplicitní meta popisky'],
          recommendations: ['Odstranit duplicitní meta popisky'],
          responsiveIssues: [],
        },
      ],
    },
  },
};

/**
 * Mock HTML obsah pro Google Maps stránku
 */
export const mockGoogleMapsHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Kavárna U Růže - Google Maps</title>
</head>
<body>
  <div role="main">
    <h1>Kavárna U Růže</h1>
    <div>
      <button aria-label="Adresa: Václavské náměstí 123, 110 00 Praha 1">Václavské náměstí 123, 110 00 Praha 1</button>
      <a href="tel:+420123456789">+420 123 456 789</a>
      <a href="https://www.kavarnaruze.cz" data-item-id="authority">www.kavarnaruze.cz</a>
      <div aria-label="4,7 hvězdičkami">4,7 hvězdičkami</div>
      <div aria-label="128 recenzí">128 recenzí</div>
      <button class="DkEaL">Kavárna</button>
    </div>
    <div role="feed">
      <div role="article">
        <h3 class="fontHeadlineSmall">Kavárna U Růže</h3>
        <div data-item-id="address">Václavské náměstí 123, 110 00 Praha 1</div>
        <div data-item-id="phone">+420 123 456 789</div>
        <div class="F7nice"><span aria-hidden="true">4,7</span></div>
        <div class="HHrUdb"><span>Recenze: 128</span></div>
        <div class="jftiEf">
          <div class="d4r55">Jan Novák</div>
          <div aria-label="5 hvězdiček">5 hvězdiček</div>
          <div class="MyEned"><span>Výborná káva a příjemná obsluha.</span></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Mock HTML obsah pro Firmy.cz stránku
 */
export const mockFirmyCzHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Autoservis Rychlý - Firmy.cz</title>
</head>
<body>
  <h1 class="detailPrimaryTitle">Autoservis Rychlý</h1>
  <div class="detailAddress">Dlouhá 789, 301 00 Plzeň Navigovat</div>
  <div class="detailPhonePrimary">+420 345 678 901</div>
  <div class="detailEmail"><a href="mailto:servis@autoservisrychly.cz">servis@autoservisrychly.cz</a></div>
  <div class="detailWebUrl"><a href="https://www.autoservisrychly.cz">www.autoservisrychly.cz</a></div>
  <div class="list lcat">
    <ul>
      <li><a href="#">Autoservis</a></li>
      <li><a href="#">Pneuservis</a></li>
      <li><a href="#">Autodiagnostika</a></li>
    </ul>
  </div>
</body>
</html>
`;

/**
 * Mock data pro výsledky vyhledávání na Google Maps
 */
export const mockGoogleMapsSearchResults = [
  {
    link: 'https://www.google.com/maps/place/Kavárna+U+Růže',
    name: 'Kavárna U Růže',
  },
  {
    link: 'https://www.google.com/maps/place/IT+Solutions+s.r.o.',
    name: 'IT Solutions s.r.o.',
  },
  {
    link: 'https://www.google.com/maps/place/Malá+pekárna',
    name: 'Malá pekárna',
  },
];

/**
 * Mock data pro výsledky vyhledávání na Firmy.cz
 */
export const mockFirmyCzSearchResults = [
  'https://www.firmy.cz/detail/12345-autoservis-rychly-plzen.html',
  'https://www.firmy.cz/detail/67890-kvetinarstvi-orchidej-plzen.html',
];
