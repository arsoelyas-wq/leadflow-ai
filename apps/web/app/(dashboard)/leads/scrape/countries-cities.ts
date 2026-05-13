export interface Country {
  code: string;
  name: string;   // Turkish display name
  flag: string;
  region: string;
}

export const REGIONS = [
  'Avrupa', 'Orta Doğu & Körfez', 'Kuzey Afrika',
  'Kuzey Amerika', 'Güney Amerika', 'Orta Amerika & Karayipler',
  'Asya', 'Güney & Güneydoğu Asya', 'Afrika', 'Okyanusya',
]

export const COUNTRIES: Country[] = [
  // ── AVRUPA ───────────────────────────────────────────────────────────────
  { code: 'TR', name: 'Türkiye',          flag: '🇹🇷', region: 'Avrupa' },
  { code: 'DE', name: 'Almanya',          flag: '🇩🇪', region: 'Avrupa' },
  { code: 'FR', name: 'Fransa',           flag: '🇫🇷', region: 'Avrupa' },
  { code: 'GB', name: 'İngiltere',        flag: '🇬🇧', region: 'Avrupa' },
  { code: 'IT', name: 'İtalya',           flag: '🇮🇹', region: 'Avrupa' },
  { code: 'ES', name: 'İspanya',          flag: '🇪🇸', region: 'Avrupa' },
  { code: 'NL', name: 'Hollanda',         flag: '🇳🇱', region: 'Avrupa' },
  { code: 'BE', name: 'Belçika',          flag: '🇧🇪', region: 'Avrupa' },
  { code: 'PL', name: 'Polonya',          flag: '🇵🇱', region: 'Avrupa' },
  { code: 'RO', name: 'Romanya',          flag: '🇷🇴', region: 'Avrupa' },
  { code: 'PT', name: 'Portekiz',         flag: '🇵🇹', region: 'Avrupa' },
  { code: 'CZ', name: 'Çekya',            flag: '🇨🇿', region: 'Avrupa' },
  { code: 'HU', name: 'Macaristan',       flag: '🇭🇺', region: 'Avrupa' },
  { code: 'SE', name: 'İsveç',            flag: '🇸🇪', region: 'Avrupa' },
  { code: 'AT', name: 'Avusturya',        flag: '🇦🇹', region: 'Avrupa' },
  { code: 'CH', name: 'İsviçre',          flag: '🇨🇭', region: 'Avrupa' },
  { code: 'NO', name: 'Norveç',           flag: '🇳🇴', region: 'Avrupa' },
  { code: 'DK', name: 'Danimarka',        flag: '🇩🇰', region: 'Avrupa' },
  { code: 'FI', name: 'Finlandiya',       flag: '🇫🇮', region: 'Avrupa' },
  { code: 'GR', name: 'Yunanistan',       flag: '🇬🇷', region: 'Avrupa' },
  { code: 'SK', name: 'Slovakya',         flag: '🇸🇰', region: 'Avrupa' },
  { code: 'BG', name: 'Bulgaristan',      flag: '🇧🇬', region: 'Avrupa' },
  { code: 'HR', name: 'Hırvatistan',      flag: '🇭🇷', region: 'Avrupa' },
  { code: 'RS', name: 'Sırbistan',        flag: '🇷🇸', region: 'Avrupa' },
  { code: 'UA', name: 'Ukrayna',          flag: '🇺🇦', region: 'Avrupa' },
  { code: 'IE', name: 'İrlanda',          flag: '🇮🇪', region: 'Avrupa' },
  { code: 'AL', name: 'Arnavutluk',       flag: '🇦🇱', region: 'Avrupa' },
  { code: 'BY', name: 'Belarus',          flag: '🇧🇾', region: 'Avrupa' },
  { code: 'BA', name: 'Bosna Hersek',     flag: '🇧🇦', region: 'Avrupa' },
  { code: 'CY', name: 'Kıbrıs',          flag: '🇨🇾', region: 'Avrupa' },
  { code: 'EE', name: 'Estonya',          flag: '🇪🇪', region: 'Avrupa' },
  { code: 'IS', name: 'İzlanda',          flag: '🇮🇸', region: 'Avrupa' },
  { code: 'XK', name: 'Kosova',           flag: '🇽🇰', region: 'Avrupa' },
  { code: 'LV', name: 'Letonya',          flag: '🇱🇻', region: 'Avrupa' },
  { code: 'LI', name: 'Lihtenştayn',      flag: '🇱🇮', region: 'Avrupa' },
  { code: 'LT', name: 'Litvanya',         flag: '🇱🇹', region: 'Avrupa' },
  { code: 'LU', name: 'Lüksemburg',       flag: '🇱🇺', region: 'Avrupa' },
  { code: 'MT', name: 'Malta',            flag: '🇲🇹', region: 'Avrupa' },
  { code: 'MD', name: 'Moldova',          flag: '🇲🇩', region: 'Avrupa' },
  { code: 'MC', name: 'Monako',           flag: '🇲🇨', region: 'Avrupa' },
  { code: 'ME', name: 'Karadağ',          flag: '🇲🇪', region: 'Avrupa' },
  { code: 'MK', name: 'Kuzey Makedonya', flag: '🇲🇰', region: 'Avrupa' },
  { code: 'RU', name: 'Rusya',            flag: '🇷🇺', region: 'Avrupa' },
  { code: 'SI', name: 'Slovenya',         flag: '🇸🇮', region: 'Avrupa' },
  // ── ORTA DOĞU & KÖRFEZ ───────────────────────────────────────────────────
  { code: 'AE', name: 'Birleşik Arap Emirlikleri', flag: '🇦🇪', region: 'Orta Doğu & Körfez' },
  { code: 'SA', name: 'Suudi Arabistan',  flag: '🇸🇦', region: 'Orta Doğu & Körfez' },
  { code: 'QA', name: 'Katar',            flag: '🇶🇦', region: 'Orta Doğu & Körfez' },
  { code: 'KW', name: 'Kuveyt',           flag: '🇰🇼', region: 'Orta Doğu & Körfez' },
  { code: 'BH', name: 'Bahreyn',          flag: '🇧🇭', region: 'Orta Doğu & Körfez' },
  { code: 'OM', name: 'Umman',            flag: '🇴🇲', region: 'Orta Doğu & Körfez' },
  { code: 'IL', name: 'İsrail',           flag: '🇮🇱', region: 'Orta Doğu & Körfez' },
  { code: 'JO', name: 'Ürdün',            flag: '🇯🇴', region: 'Orta Doğu & Körfez' },
  { code: 'LB', name: 'Lübnan',           flag: '🇱🇧', region: 'Orta Doğu & Körfez' },
  { code: 'IQ', name: 'Irak',             flag: '🇮🇶', region: 'Orta Doğu & Körfez' },
  { code: 'IR', name: 'İran',             flag: '🇮🇷', region: 'Orta Doğu & Körfez' },
  { code: 'SY', name: 'Suriye',           flag: '🇸🇾', region: 'Orta Doğu & Körfez' },
  { code: 'YE', name: 'Yemen',            flag: '🇾🇪', region: 'Orta Doğu & Körfez' },
  { code: 'PS', name: 'Filistin',         flag: '🇵🇸', region: 'Orta Doğu & Körfez' },
  // ── KUZEY AFRİKA ─────────────────────────────────────────────────────────
  { code: 'EG', name: 'Mısır',            flag: '🇪🇬', region: 'Kuzey Afrika' },
  { code: 'MA', name: 'Fas',              flag: '🇲🇦', region: 'Kuzey Afrika' },
  { code: 'TN', name: 'Tunus',            flag: '🇹🇳', region: 'Kuzey Afrika' },
  { code: 'DZ', name: 'Cezayir',          flag: '🇩🇿', region: 'Kuzey Afrika' },
  { code: 'LY', name: 'Libya',            flag: '🇱🇾', region: 'Kuzey Afrika' },
  { code: 'SD', name: 'Sudan',            flag: '🇸🇩', region: 'Kuzey Afrika' },
  // ── KUZEY AMERİKA ────────────────────────────────────────────────────────
  { code: 'US', name: 'Amerika Birleşik Devletleri', flag: '🇺🇸', region: 'Kuzey Amerika' },
  { code: 'CA', name: 'Kanada',           flag: '🇨🇦', region: 'Kuzey Amerika' },
  { code: 'MX', name: 'Meksika',          flag: '🇲🇽', region: 'Kuzey Amerika' },
  // ── GÜNEY AMERİKA ────────────────────────────────────────────────────────
  { code: 'BR', name: 'Brezilya',         flag: '🇧🇷', region: 'Güney Amerika' },
  { code: 'AR', name: 'Arjantin',         flag: '🇦🇷', region: 'Güney Amerika' },
  { code: 'CL', name: 'Şili',             flag: '🇨🇱', region: 'Güney Amerika' },
  { code: 'CO', name: 'Kolombiya',        flag: '🇨🇴', region: 'Güney Amerika' },
  { code: 'PE', name: 'Peru',             flag: '🇵🇪', region: 'Güney Amerika' },
  { code: 'VE', name: 'Venezuela',        flag: '🇻🇪', region: 'Güney Amerika' },
  { code: 'EC', name: 'Ekvador',          flag: '🇪🇨', region: 'Güney Amerika' },
  { code: 'BO', name: 'Bolivya',          flag: '🇧🇴', region: 'Güney Amerika' },
  { code: 'PY', name: 'Paraguay',         flag: '🇵🇾', region: 'Güney Amerika' },
  { code: 'UY', name: 'Uruguay',          flag: '🇺🇾', region: 'Güney Amerika' },
  { code: 'GY', name: 'Guyana',           flag: '🇬🇾', region: 'Güney Amerika' },
  { code: 'SR', name: 'Surinam',          flag: '🇸🇷', region: 'Güney Amerika' },
  // ── ORTA AMERİKA & KARAYİPLER ────────────────────────────────────────────
  { code: 'GT', name: 'Guatemala',        flag: '🇬🇹', region: 'Orta Amerika & Karayipler' },
  { code: 'BZ', name: 'Belize',           flag: '🇧🇿', region: 'Orta Amerika & Karayipler' },
  { code: 'HN', name: 'Honduras',         flag: '🇭🇳', region: 'Orta Amerika & Karayipler' },
  { code: 'SV', name: 'El Salvador',      flag: '🇸🇻', region: 'Orta Amerika & Karayipler' },
  { code: 'NI', name: 'Nikaragua',        flag: '🇳🇮', region: 'Orta Amerika & Karayipler' },
  { code: 'CR', name: 'Kosta Rika',       flag: '🇨🇷', region: 'Orta Amerika & Karayipler' },
  { code: 'PA', name: 'Panama',           flag: '🇵🇦', region: 'Orta Amerika & Karayipler' },
  { code: 'CU', name: 'Küba',             flag: '🇨🇺', region: 'Orta Amerika & Karayipler' },
  { code: 'DO', name: 'Dominik Cumhuriyeti', flag: '🇩🇴', region: 'Orta Amerika & Karayipler' },
  { code: 'HT', name: 'Haiti',            flag: '🇭🇹', region: 'Orta Amerika & Karayipler' },
  { code: 'JM', name: 'Jamaika',          flag: '🇯🇲', region: 'Orta Amerika & Karayipler' },
  { code: 'TT', name: 'Trinidad ve Tobago', flag: '🇹🇹', region: 'Orta Amerika & Karayipler' },
  // ── ASYA (Doğu & Orta) ───────────────────────────────────────────────────
  { code: 'CN', name: 'Çin',              flag: '🇨🇳', region: 'Asya' },
  { code: 'JP', name: 'Japonya',          flag: '🇯🇵', region: 'Asya' },
  { code: 'KR', name: 'Güney Kore',       flag: '🇰🇷', region: 'Asya' },
  { code: 'TW', name: 'Tayvan',           flag: '🇹🇼', region: 'Asya' },
  { code: 'HK', name: 'Hong Kong',        flag: '🇭🇰', region: 'Asya' },
  { code: 'SG', name: 'Singapur',         flag: '🇸🇬', region: 'Asya' },
  { code: 'MY', name: 'Malezya',          flag: '🇲🇾', region: 'Asya' },
  { code: 'TH', name: 'Tayland',          flag: '🇹🇭', region: 'Asya' },
  { code: 'VN', name: 'Vietnam',          flag: '🇻🇳', region: 'Asya' },
  { code: 'ID', name: 'Endonezya',        flag: '🇮🇩', region: 'Asya' },
  { code: 'PH', name: 'Filipinler',       flag: '🇵🇭', region: 'Asya' },
  { code: 'KZ', name: 'Kazakistan',       flag: '🇰🇿', region: 'Asya' },
  { code: 'UZ', name: 'Özbekistan',       flag: '🇺🇿', region: 'Asya' },
  { code: 'AZ', name: 'Azerbaycan',       flag: '🇦🇿', region: 'Asya' },
  { code: 'GE', name: 'Gürcistan',        flag: '🇬🇪', region: 'Asya' },
  { code: 'AM', name: 'Ermenistan',       flag: '🇦🇲', region: 'Asya' },
  { code: 'TM', name: 'Türkmenistan',     flag: '🇹🇲', region: 'Asya' },
  { code: 'KG', name: 'Kırgızistan',      flag: '🇰🇬', region: 'Asya' },
  { code: 'TJ', name: 'Tacikistan',       flag: '🇹🇯', region: 'Asya' },
  { code: 'MN', name: 'Moğolistan',       flag: '🇲🇳', region: 'Asya' },
  { code: 'MM', name: 'Myanmar',          flag: '🇲🇲', region: 'Asya' },
  { code: 'KH', name: 'Kamboçya',         flag: '🇰🇭', region: 'Asya' },
  { code: 'LA', name: 'Laos',             flag: '🇱🇦', region: 'Asya' },
  // ── GÜNEY & GÜNEYDOĞU ASYA ───────────────────────────────────────────────
  { code: 'IN', name: 'Hindistan',        flag: '🇮🇳', region: 'Güney & Güneydoğu Asya' },
  { code: 'PK', name: 'Pakistan',         flag: '🇵🇰', region: 'Güney & Güneydoğu Asya' },
  { code: 'BD', name: 'Bangladeş',        flag: '🇧🇩', region: 'Güney & Güneydoğu Asya' },
  { code: 'LK', name: 'Sri Lanka',        flag: '🇱🇰', region: 'Güney & Güneydoğu Asya' },
  { code: 'NP', name: 'Nepal',            flag: '🇳🇵', region: 'Güney & Güneydoğu Asya' },
  { code: 'AF', name: 'Afganistan',       flag: '🇦🇫', region: 'Güney & Güneydoğu Asya' },
  // ── AFRİKA (Sub-Saharan) ─────────────────────────────────────────────────
  { code: 'ZA', name: 'Güney Afrika',     flag: '🇿🇦', region: 'Afrika' },
  { code: 'NG', name: 'Nijerya',          flag: '🇳🇬', region: 'Afrika' },
  { code: 'KE', name: 'Kenya',            flag: '🇰🇪', region: 'Afrika' },
  { code: 'ET', name: 'Etiyopya',         flag: '🇪🇹', region: 'Afrika' },
  { code: 'GH', name: 'Gana',             flag: '🇬🇭', region: 'Afrika' },
  { code: 'TZ', name: 'Tanzanya',         flag: '🇹🇿', region: 'Afrika' },
  { code: 'UG', name: 'Uganda',           flag: '🇺🇬', region: 'Afrika' },
  { code: 'SN', name: 'Senegal',          flag: '🇸🇳', region: 'Afrika' },
  { code: 'CI', name: 'Fildişi Sahili',   flag: '🇨🇮', region: 'Afrika' },
  { code: 'CM', name: 'Kamerun',          flag: '🇨🇲', region: 'Afrika' },
  { code: 'AO', name: 'Angola',           flag: '🇦🇴', region: 'Afrika' },
  { code: 'MZ', name: 'Mozambik',         flag: '🇲🇿', region: 'Afrika' },
  { code: 'MG', name: 'Madagaskar',       flag: '🇲🇬', region: 'Afrika' },
  { code: 'ZM', name: 'Zambiya',          flag: '🇿🇲', region: 'Afrika' },
  { code: 'ZW', name: 'Zimbabve',         flag: '🇿🇼', region: 'Afrika' },
  { code: 'RW', name: 'Ruanda',           flag: '🇷🇼', region: 'Afrika' },
  // ── OKYANUSYA ────────────────────────────────────────────────────────────
  { code: 'AU', name: 'Avustralya',       flag: '🇦🇺', region: 'Okyanusya' },
  { code: 'NZ', name: 'Yeni Zelanda',     flag: '🇳🇿', region: 'Okyanusya' },
  { code: 'FJ', name: 'Fiji',             flag: '🇫🇯', region: 'Okyanusya' },
  { code: 'PG', name: 'Papua Yeni Gine',  flag: '🇵🇬', region: 'Okyanusya' },
]

export const CITIES: Record<string, string[]> = {
  // ── TÜRKİYE (81 il) ──────────────────────────────────────────────────────
  TR: [
    'İstanbul','Ankara','İzmir','Bursa','Antalya','Adana','Konya','Gaziantep',
    'Şanlıurfa','Kocaeli','Mersin','Diyarbakır','Hatay','Manisa','Kayseri',
    'Samsun','Balıkesir','Kahramanmaraş','Van','Aydın','Tekirdağ','Sakarya',
    'Eskişehir','Denizli','Muğla','Mardin','Erzurum','Trabzon','Malatya',
    'Batman','Elazığ','Sivas','Ordu','Rize','Tokat','Bolu','Çorum','Giresun',
    'Nevşehir','Afyonkarahisar','İskenderun','Isparta','Niğde','Uşak',
    'Kırıkkale','Düzce','Zonguldak','Yozgat','Karabük','Edirne','Burdur',
    'Kütahya','Şırnak','Ağrı','Hakkari','Siirt','Muş','Bitlis','Bingöl',
    'Ardahan','Kars','Iğdır','Erzincan','Gümüşhane','Artvin','Tunceli',
    'Sinop','Kastamonu','Bartın','Çankırı','Amasya','Yalova','Kırşehir',
    'Kırklareli','Aksaray','Karaman','Osmaniye','Adıyaman','Kilis',
  ],
  // ── ALMANYA ───────────────────────────────────────────────────────────────
  DE: [
    'Berlin','Hamburg','München','Köln','Frankfurt','Stuttgart','Düsseldorf',
    'Leipzig','Dortmund','Essen','Bremen','Dresden','Hannover','Nürnberg',
    'Duisburg','Bochum','Wuppertal','Bielefeld','Bonn','Münster','Karlsruhe',
    'Mannheim','Augsburg','Wiesbaden','Gelsenkirchen','Mönchengladbach',
    'Braunschweig','Kiel','Chemnitz','Aachen','Halle','Magdeburg','Freiburg',
    'Krefeld','Lübeck','Oberhausen','Erfurt','Mainz','Rostock','Kassel',
    'Saarbrücken','Potsdam','Hamm','Hagen','Heidelberg','Darmstadt','Regensburg',
    'Ingolstadt','Würzburg','Ulm','Heilbronn','Göttingen','Wolfsburg',
  ],
  // ── FRANSA ────────────────────────────────────────────────────────────────
  FR: [
    'Paris','Marseille','Lyon','Toulouse','Nice','Nantes','Strasbourg',
    'Montpellier','Bordeaux','Lille','Rennes','Reims','Le Havre','Saint-Étienne',
    'Toulon','Grenoble','Dijon','Angers','Nîmes','Villeurbanne','Le Mans',
    'Clermont-Ferrand','Aix-en-Provence','Brest','Tours','Amiens','Limoges',
    'Metz','Perpignan','Besançon','Orléans','Mulhouse','Rouen','Caen',
    'Nancy','Saint-Denis','Argenteuil','Montreuil','Roubaix','Tourcoing',
    'Dunkerque','Avignon','Poitiers','Versailles','Courbevoie','Vitry-sur-Seine',
  ],
  // ── İNGİLTERE ─────────────────────────────────────────────────────────────
  GB: [
    'London','Birmingham','Leeds','Glasgow','Sheffield','Bradford','Edinburgh',
    'Liverpool','Manchester','Bristol','Wakefield','Cardiff','Coventry',
    'Nottingham','Leicester','Sunderland','Belfast','Newcastle upon Tyne',
    'Brighton','Hull','Plymouth','Stoke-on-Trent','Wolverhampton','Derby',
    'Swansea','Southampton','Salford','Aberdeen','Portsmouth','York',
    'Oxford','Cambridge','Exeter','Norwich','Peterborough','Luton',
    'Swindon','Bolton','Stockport','Middlesbrough','Doncaster','Reading',
    'Ipswich','Northampton','Milton Keynes','Huddersfield','Preston',
  ],
  // ── İTALYA ────────────────────────────────────────────────────────────────
  IT: [
    'Roma','Milano','Napoli','Torino','Palermo','Genova','Bologna','Firenze',
    'Catania','Bari','Venezia','Messina','Verona','Padova','Trieste',
    'Brescia','Taranto','Prato','Modena','Reggio Calabria','Reggio Emilia',
    'Perugia','Livorno','Ravenna','Cagliari','Foggia','Rimini','Salerno',
    'Ferrara','Sassari','Latina','Bergamo','Pescara','Siracusa','Monza',
    'Vicenza','Andria','Trento','Forlì','Novara','La Spezia','Ancona',
  ],
  // ── İSPANYA ───────────────────────────────────────────────────────────────
  ES: [
    'Madrid','Barcelona','Valencia','Sevilla','Zaragoza','Málaga','Murcia',
    'Palma','Las Palmas','Bilbao','Alicante','Córdoba','Valladolid','Vigo',
    'Gijón','L\'Hospitalet','A Coruña','Vitoria-Gasteiz','Granada','Elche',
    'Oviedo','Badalona','Cartagena','Terrassa','Jerez de la Frontera',
    'Sabadell','Santa Cruz de Tenerife','Pamplona','Almería','Burgos',
    'Santander','Castellón de la Plana','Albacete','Huelva','Logroño',
    'Badajoz','Salamanca','San Sebastián','Getafe','Leganés','Fuenlabrada',
  ],
  // ── HOLLANDA ──────────────────────────────────────────────────────────────
  NL: [
    'Amsterdam','Rotterdam','The Hague','Utrecht','Eindhoven','Tilburg',
    'Groningen','Almere','Breda','Nijmegen','Enschede','Apeldoorn','Haarlem',
    'Arnhem','Zaanstad','Amersfoort','\'s-Hertogenbosch','Maastricht',
    'Dordrecht','Leiden','Zoetermeer','Zwolle','Alkmaar','Ede','Delft',
    'Deventer','Helmond','Emmen','Venlo','Leeuwarden','Westland','Sittard-Geleen',
  ],
  // ── BELÇİKA ───────────────────────────────────────────────────────────────
  BE: [
    'Bruxelles','Antwerpen','Gent','Charleroi','Liège','Bruges','Namur',
    'Leuven','Mons','Aalst','Mechelen','La Louvière','Kortrijk','Hasselt',
    'Ostend','Sint-Niklaas','Tournai','Genk','Seraing','Mouscron','Verviers',
  ],
  // ── POLONYA ───────────────────────────────────────────────────────────────
  PL: [
    'Warsaw','Kraków','Łódź','Wrocław','Poznań','Gdańsk','Szczecin',
    'Bydgoszcz','Lublin','Katowice','Białystok','Gdynia','Częstochowa',
    'Radom','Sosnowiec','Toruń','Kielce','Gliwice','Zabrze','Bytom',
    'Rzeszów','Olsztyn','Bielsko-Biała','Ruda Śląska','Rybnik','Tychy',
    'Dąbrowa Górnicza','Opole','Płock','Wałbrzych','Zielona Góra','Tarnów',
  ],
  // ── ROMANYA ───────────────────────────────────────────────────────────────
  RO: [
    'Bucharest','Cluj-Napoca','Timișoara','Iași','Constanța','Craiova',
    'Brașov','Galați','Ploiești','Oradea','Brăila','Arad','Pitești',
    'Sibiu','Bacău','Târgu Mureș','Baia Mare','Buzău','Botoșani','Satu Mare',
    'Râmnicu Vâlcea','Suceava','Piatra Neamț','Deva','Focșani','Drobeta',
  ],
  // ── PORTEKİZ ──────────────────────────────────────────────────────────────
  PT: [
    'Lisbon','Porto','Vila Nova de Gaia','Amadora','Braga','Funchal',
    'Setúbal','Coimbra','Queluz','Almada','Odivelas','Aveiro','Barreiro',
    'Viseu','Guimarães','Cascais','Oeiras','Leiria','Faro','Gondomar',
    'Matosinhos','Loures','Sintra','Vila Franca de Xira','Seixal',
  ],
  // ── ÇEKYA ─────────────────────────────────────────────────────────────────
  CZ: [
    'Prague','Brno','Ostrava','Plzeň','Liberec','Olomouc','Ústí nad Labem',
    'České Budějovice','Hradec Králové','Pardubice','Zlín','Havířov',
    'Kladno','Most','Opava','Frýdek-Místek','Karviná','Jihlava','Teplice',
  ],
  // ── MACARİSTAN ────────────────────────────────────────────────────────────
  HU: [
    'Budapest','Debrecen','Miskolc','Szeged','Pécs','Győr','Nyíregyháza',
    'Kecskemét','Székesfehérvár','Szombathely','Érd','Tatabánya','Kaposvár',
    'Sopron','Eger','Veszprém','Nagykanizsa','Zalaegerszeg','Dunajváros',
  ],
  // ── İSVEÇ ─────────────────────────────────────────────────────────────────
  SE: [
    'Stockholm','Gothenburg','Malmö','Uppsala','Västerås','Örebro','Linköping',
    'Helsingborg','Jönköping','Norrköping','Lund','Umeå','Gävle','Borås',
    'Södertälje','Eskilstuna','Karlstad','Växjö','Halmstad','Sundsvall',
    'Luleå','Trollhättan','Östersund','Borlänge','Falun','Skövde',
  ],
  // ── AVUSTURYA ─────────────────────────────────────────────────────────────
  AT: [
    'Vienna','Graz','Linz','Salzburg','Innsbruck','Klagenfurt','Villach',
    'Wels','Sankt Pölten','Dornbirn','Wiener Neustadt','Steyr','Feldkirch',
    'Bregenz','Leonding','Baden','Wolfsberg','Leoben','Klosterneuburg',
  ],
  // ── İSVİÇRE ───────────────────────────────────────────────────────────────
  CH: [
    'Zurich','Geneva','Basel','Bern','Lausanne','Winterthur','Lucerne',
    'St. Gallen','Lugano','Biel/Bienne','Thun','Köniz','La Chaux-de-Fonds',
    'Schaffhausen','Fribourg','Chur','Vernier','Neuchâtel','Uster','Sion',
    'Emmen','Kriens','Arlesheim','Wettingen','Zug','Kloten',
  ],
  // ── NORVEÇ ────────────────────────────────────────────────────────────────
  NO: [
    'Oslo','Bergen','Trondheim','Stavanger','Drammen','Fredrikstad',
    'Kristiansand','Sandnes','Tromsø','Sarpsborg','Skien','Ålesund',
    'Sandefjord','Haugesund','Moss','Bodø','Arendal','Tønsberg','Hamar',
  ],
  // ── DANİMARKA ─────────────────────────────────────────────────────────────
  DK: [
    'Copenhagen','Aarhus','Odense','Aalborg','Frederiksberg','Esbjerg',
    'Randers','Kolding','Horsens','Vejle','Roskilde','Herning','Helsingør',
    'Silkeborg','Næstved','Holstebro','Slagelse','Hillerød','Viborg',
  ],
  // ── FİNLANDİYA ────────────────────────────────────────────────────────────
  FI: [
    'Helsinki','Espoo','Tampere','Vantaa','Oulu','Turku','Jyväskylä',
    'Lahti','Kuopio','Kouvola','Pori','Joensuu','Lappeenranta','Hämeenlinna',
    'Vaasa','Rovaniemi','Seinäjoki','Mikkeli','Kotka','Salo','Porvoo',
  ],
  // ── YUNANİSTAN ────────────────────────────────────────────────────────────
  GR: [
    'Athens','Thessaloniki','Patras','Piraeus','Heraklion','Larissa','Volos',
    'Rhodes','Ioannina','Chania','Chalcis','Agrinio','Katerini','Trikala',
    'Lamia','Kavala','Serres','Alexandroupoli','Veria','Drama','Corfu',
  ],
  // ── UKRAYNA ───────────────────────────────────────────────────────────────
  UA: [
    'Kyiv','Kharkiv','Odessa','Dnipro','Zaporizhzhia','Lviv','Kryvyi Rih',
    'Mykolaiv','Vinnytsia','Makiivka','Chernivtsi','Kherson','Poltava',
    'Cherkasy','Khmelnytskyi','Zhytomyr','Sumy','Rivne','Ivano-Frankivsk',
    'Ternopil','Chernihiv','Kremenchuk','Kropyvnytskyi','Lutsk','Bila Tserkva',
  ],
  // ── RUSYA ─────────────────────────────────────────────────────────────────
  RU: [
    'Moscow','Saint Petersburg','Novosibirsk','Yekaterinburg','Kazan',
    'Nizhny Novgorod','Chelyabinsk','Samara','Ufa','Rostov-on-Don',
    'Krasnoyarsk','Voronezh','Perm','Volgograd','Krasnodar','Saratov',
    'Tyumen','Tolyatti','Izhevsk','Barnaul','Irkutsk','Ulyanovsk',
    'Khabarovsk','Yaroslavl','Vladivostok','Makhachkala','Tomsk','Orenburg',
    'Kemerovo','Ryazan','Naberezhnye Chelny','Astrakhan','Kirov','Penza',
  ],
  // ── BULGARİSTAN ───────────────────────────────────────────────────────────
  BG: [
    'Sofia','Plovdiv','Varna','Burgas','Rousse','Stara Zagora','Pleven',
    'Sliven','Dobrich','Shumen','Pernik','Haskovo','Yambol','Pazardzhik',
    'Blagoevgrad','Vratsa','Gabrovo','Vidin','Montana','Targovishte',
  ],
  // ── HIRVATİSTAN ───────────────────────────────────────────────────────────
  HR: [
    'Zagreb','Split','Rijeka','Osijek','Zadar','Slavonski Brod','Pula',
    'Sesvete','Karlovac','Varaždin','Sisak','Šibenik','Vinkovci','Petrinja',
  ],
  // ── SIRBİSTAN ─────────────────────────────────────────────────────────────
  RS: [
    'Belgrade','Novi Sad','Niš','Kragujevac','Subotica','Zrenjanin','Pančevo',
    'Čačak','Novi Pazar','Požarevac','Kraljevo','Smederevo','Leskovac','Valjevo',
  ],
  // ── İRLANDA ───────────────────────────────────────────────────────────────
  IE: [
    'Dublin','Cork','Limerick','Galway','Waterford','Drogheda','Dundalk',
    'Swords','Bray','Navan','Kilkenny','Ennis','Tralee','Sligo','Carlow',
  ],
  // ── ESTONYA ───────────────────────────────────────────────────────────────
  EE: ['Tallinn','Tartu','Narva','Pärnu','Kohtla-Järve','Viljandi','Rakvere','Maardu','Sillamäe'],
  // ── LITVANYA ──────────────────────────────────────────────────────────────
  LT: ['Vilnius','Kaunas','Klaipeda','Siauliai','Panevezys','Alytus','Marijampole','Mazeikiai'],
  // ── LETONYA ───────────────────────────────────────────────────────────────
  LV: ['Riga','Daugavpils','Liepāja','Jelgava','Jūrmala','Ventspils','Rēzekne','Valmiera'],
  // ── SLOVAKYA ──────────────────────────────────────────────────────────────
  SK: ['Bratislava','Košice','Prešov','Žilina','Nitra','Banská Bystrica','Trnava','Martin','Trenčín','Poprad'],
  // ── SLOVENYA ──────────────────────────────────────────────────────────────
  SI: ['Ljubljana','Maribor','Celje','Kranj','Koper','Velenje','Novo Mesto','Ptuj','Nova Gorica'],
  // ── ARNAVUTLUK ────────────────────────────────────────────────────────────
  AL: ['Tirana','Durrës','Vlorë','Shkodër','Fier','Korçë','Elbasan','Berat','Lushnjë'],
  // ── BELARUS ───────────────────────────────────────────────────────────────
  BY: ['Minsk','Gomel','Mogilev','Vitebsk','Grodno','Brest','Babruysk','Baranovichi','Pinsk'],
  // ── BOSNA HERSEK ──────────────────────────────────────────────────────────
  BA: ['Sarajevo','Banja Luka','Tuzla','Zenica','Mostar','Bijeljina','Bihać','Prijedor'],
  // ── KIBRIS ────────────────────────────────────────────────────────────────
  CY: ['Nicosia','Limassol','Larnaca','Famagusta','Paphos','Kyrenia'],
  // ── İZLANDA ───────────────────────────────────────────────────────────────
  IS: ['Reykjavik','Kópavogur','Hafnarfjörður','Akureyri','Reykjanesbær'],
  // ── LÜKSEMBURG ────────────────────────────────────────────────────────────
  LU: ['Luxembourg City','Esch-sur-Alzette','Dudelange','Schifflange','Differdange'],
  // ── MOLDOVA ───────────────────────────────────────────────────────────────
  MD: ['Chișinău','Tiraspol','Bălți','Bender','Cahul','Ungheni','Soroca'],
  // ── KARADAĞ ───────────────────────────────────────────────────────────────
  ME: ['Podgorica','Nikšić','Bijelo Polje','Herceg Novi','Bar','Budva','Cetinje'],
  // ── KUZEY MAKEDONYA ───────────────────────────────────────────────────────
  MK: ['Skopje','Bitola','Kumanovo','Prilep','Tetovo','Veles','Ohrid'],
  // ── MALTA ─────────────────────────────────────────────────────────────────
  MT: ['Valletta','Birkirkara','Qormi','Mosta','Żabbar','San Ġwann','Naxxar'],
  // ── KOSOVA ────────────────────────────────────────────────────────────────
  XK: ['Pristina','Prizren','Mitrovica','Peja','Gjakova','Gjilan'],
  // ── MONAKİ ────────────────────────────────────────────────────────────────
  MC: ['Monaco','Monte Carlo','La Condamine','Fontvieille'],
  // ── BİRLEŞİK ARAP EMİRLİKLERİ ────────────────────────────────────────────
  AE: [
    'Dubai','Abu Dhabi','Sharjah','Al Ain','Ajman','Ras Al Khaimah',
    'Fujairah','Umm Al Quwain','Khor Fakkan','Dibba Al Hisn',
  ],
  // ── SUUDİ ARABİSTAN ───────────────────────────────────────────────────────
  SA: [
    'Riyadh','Jeddah','Mecca','Medina','Dammam','Khobar','Tabuk',
    'Buraidah','Abha','Najran','Taif','Jubail','Yanbu','Hail','Al Hofuf',
  ],
  // ── KATAR ─────────────────────────────────────────────────────────────────
  QA: ['Doha','Al Wakrah','Al Khor','Al Rayyan','Umm Salal','Al Daayen','Mesaieed'],
  // ── KUVEYT ────────────────────────────────────────────────────────────────
  KW: ['Kuwait City','Hawalli','Salmiya','Farwaniya','Ahmadi','Jahra','Mubarak Al-Kabeer'],
  // ── UMMAN ─────────────────────────────────────────────────────────────────
  OM: ['Muscat','Salalah','Nizwa','Sohar','Sur','Ibri','Barka','Rustaq','Al Buraimi'],
  // ── BAHREYN ───────────────────────────────────────────────────────────────
  BH: ['Manama','Riffa','Muharraq','Hamad Town','A\'ali','Isa Town','Sitra'],
  // ── İSRAİL ────────────────────────────────────────────────────────────────
  IL: [
    'Jerusalem','Tel Aviv','Haifa','Rishon LeZion','Petah Tikva','Ashdod',
    'Netanya','Beersheba','Bnei Brak','Holon','Bat Yam','Ramat Gan',
    'Ashkelon','Rehovot','Herzliya','Hadera','Modiin','Nazareth',
  ],
  // ── ÜRDÜN ─────────────────────────────────────────────────────────────────
  JO: ['Amman','Zarqa','Irbid','Russeifa','Quwaysimah','Wadi as-Seer','Aqaba','Madaba'],
  // ── LÜBNAN ────────────────────────────────────────────────────────────────
  LB: ['Beirut','Tripoli','Sidon','Tyre','Jounieh','Zahle','Baabda','Nabatieh'],
  // ── IRAK ──────────────────────────────────────────────────────────────────
  IQ: ['Baghdad','Basra','Mosul','Erbil','Sulaymaniyah','Kirkuk','Najaf','Karbala','Nasiriyah'],
  // ── İRAN ──────────────────────────────────────────────────────────────────
  IR: [
    'Tehran','Mashhad','Isfahan','Karaj','Tabriz','Shiraz','Qom','Ahvaz',
    'Kermanshah','Urmia','Rasht','Zahedan','Hamadan','Kerman','Arak','Yazd',
  ],
  // ── MISIR ─────────────────────────────────────────────────────────────────
  EG: [
    'Cairo','Alexandria','Giza','Shubra El Kheima','Port Said','Suez',
    'Luxor','Aswan','Mansoura','Tanta','Faiyum','Zagazig','Ismailia',
    'Damietta','Asyut','Beni Suef','Hurghada','Sharm El Sheikh',
  ],
  // ── FAS ───────────────────────────────────────────────────────────────────
  MA: [
    'Casablanca','Rabat','Fez','Marrakech','Agadir','Tangier','Meknes',
    'Oujda','Kenitra','Tetouan','Safi','Mohammedia','Khouribga','El Jadida',
    'Beni Mellal','Nador','Taza','Settat','Berrechid','Khemisset',
  ],
  // ── TUNUS ─────────────────────────────────────────────────────────────────
  TN: [
    'Tunis','Sfax','Sousse','Ettadhamen','Kairouan','Bizerte','Gabès',
    'Ariana','Gafsa','Monastir','Ben Arous','Nabeul','Kasserine','Medenine',
  ],
  // ── CEZAYİR ───────────────────────────────────────────────────────────────
  DZ: [
    'Algiers','Oran','Constantine','Annaba','Blida','Batna','Djelfa',
    'Sétif','Sidi Bel Abbès','Biskra','Tébessa','El Oued','Skikda','Béjaïa',
    'Tiaret','Tlemcen','Béchar','Bordj Bou Arréridj','Boumerdès',
  ],
  // ── LİBYA ─────────────────────────────────────────────────────────────────
  LY: ['Tripoli','Benghazi','Misrata','Tarhuna','Al Khums','Az Zawiyah','Sirte','Derna'],
  // ── AMERİKA BİRLEŞİK DEVLETLERİ ──────────────────────────────────────────
  US: [
    'New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia',
    'San Antonio','San Diego','Dallas','San Jose','Austin','Jacksonville',
    'Fort Worth','Columbus','Charlotte','Indianapolis','San Francisco',
    'Seattle','Denver','Washington DC','Nashville','Oklahoma City',
    'El Paso','Boston','Portland','Las Vegas','Memphis','Louisville',
    'Baltimore','Milwaukee','Albuquerque','Tucson','Fresno','Sacramento',
    'Mesa','Kansas City','Atlanta','Omaha','Colorado Springs','Raleigh',
    'Miami','Long Beach','Minneapolis','Tampa','New Orleans','Cleveland',
    'Pittsburgh','Orlando','Cincinnati','Detroit','Salt Lake City',
    'Honolulu','St. Louis','Buffalo','Richmond','Baton Rouge','Anchorage',
  ],
  // ── KANADA ────────────────────────────────────────────────────────────────
  CA: [
    'Toronto','Montreal','Vancouver','Calgary','Edmonton','Ottawa','Winnipeg',
    'Quebec City','Hamilton','Kitchener','London','Halifax','Victoria',
    'Oshawa','Windsor','Saskatoon','Regina','Sherbrooke','Kelowna','Barrie',
    'Abbotsford','Richmond','Markham','Brampton','Mississauga','Burnaby',
  ],
  // ── MEKSİKA ───────────────────────────────────────────────────────────────
  MX: [
    'Mexico City','Guadalajara','Monterrey','Puebla','Tijuana','Toluca',
    'León','Juárez','Torreón','Querétaro','San Luis Potosí','Mérida',
    'Mexicali','Aguascalientes','Cuernavaca','Acapulco','Tampico',
    'Culiacán','Veracruz','Chihuahua','Morelia','Hermosillo','Saltillo',
  ],
  // ── BREZİLYA ──────────────────────────────────────────────────────────────
  BR: [
    'São Paulo','Rio de Janeiro','Brasília','Salvador','Fortaleza','Belo Horizonte',
    'Manaus','Curitiba','Recife','Porto Alegre','Belém','Goiânia','Guarulhos',
    'Campinas','São Luís','Maceió','Natal','Teresina','Campo Grande',
    'João Pessoa','Osasco','Ribeirão Preto','Contagem','São Bernardo do Campo',
    'Aracaju','Feira de Santana','Cuiabá','Joinville','Juiz de Fora',
  ],
  // ── ARJANTİN ──────────────────────────────────────────────────────────────
  AR: [
    'Buenos Aires','Córdoba','Rosario','Mendoza','Tucumán','La Plata',
    'Mar del Plata','Salta','Santa Fe','San Juan','Resistencia','Santiago del Estero',
    'Neuquén','Corrientes','Bahía Blanca','Formosa','Posadas','San Salvador de Jujuy',
  ],
  // ── ŞİLİ ──────────────────────────────────────────────────────────────────
  CL: [
    'Santiago','Valparaíso','Concepción','La Serena','Antofagasta','Temuco',
    'Rancagua','Talca','Arica','Iquique','Puerto Montt','Coquimbo','Chillán',
  ],
  // ── KOLOMBİYA ─────────────────────────────────────────────────────────────
  CO: [
    'Bogotá','Medellín','Cali','Barranquilla','Cartagena','Cúcuta',
    'Bucaramanga','Pereira','Santa Marta','Ibagué','Manizales','Pasto',
    'Neiva','Villavicencio','Montería','Armenia','Sincelejo',
  ],
  // ── PERU ──────────────────────────────────────────────────────────────────
  PE: ['Lima','Arequipa','Trujillo','Chiclayo','Piura','Iquitos','Cusco','Chimbote','Huancayo','Tacna'],
  // ── VENEZELlA ─────────────────────────────────────────────────────────────
  VE: ['Caracas','Maracaibo','Valencia','Barquisimeto','Maracay','Ciudad Guayana','Barcelona','Maturín'],
  // ── EKVADOR ───────────────────────────────────────────────────────────────
  EC: ['Quito','Guayaquil','Cuenca','Ambato','Portoviejo','Manta','Machala','Loja'],
  // ── BOLİVYA ───────────────────────────────────────────────────────────────
  BO: ['La Paz','Santa Cruz','Cochabamba','Oruro','Sucre','Potosí','Trinidad','Tarija'],
  // ── URUGUAY ───────────────────────────────────────────────────────────────
  UY: ['Montevideo','Salto','Ciudad de la Costa','Paysandú','Las Piedras','Rivera','Maldonado'],
  // ── PARAGUAY ──────────────────────────────────────────────────────────────
  PY: ['Asunción','Ciudad del Este','Lambaré','Fernando de la Mora','Luque','Capiatá','San Lorenzo'],
  // ── GUATEMELA ─────────────────────────────────────────────────────────────
  GT: ['Guatemala City','Mixco','Villa Nueva','Petapa','San Juan Sacatepéquez','Quetzaltenango'],
  // ── KOSTA RİKA ────────────────────────────────────────────────────────────
  CR: ['San José','Cartago','Alajuela','Heredia','Liberia','Puntarenas','Limón'],
  // ── PANAMA ────────────────────────────────────────────────────────────────
  PA: ['Panama City','San Miguelito','Tocumen','Las Cumbres','David','Arraiján','La Chorrera'],
  // ── DON. CUMHURİYETİ ──────────────────────────────────────────────────────
  DO: ['Santo Domingo','Santiago','Los Alcarrizos','Santo Domingo Este','La Romana','San Pedro de Macorís'],
  // ── ÇİN ───────────────────────────────────────────────────────────────────
  CN: [
    'Beijing','Shanghai','Guangzhou','Shenzhen','Chengdu','Chongqing','Tianjin',
    'Xi\'an','Wuhan','Hangzhou','Nanjing','Zhengzhou','Jinan','Qingdao',
    'Harbin','Dalian','Fuzhou','Shenyang','Xiamen','Shijiazhuang','Dongguan',
    'Foshan','Suzhou','Kunming','Changsha','Hefei','Wenzhou','Ningbo',
    'Guiyang','Urumqi','Lanzhou','Haikou','Nanning','Changchun','Hohhot',
    'Yinchuan','Taiyuan','Nanchang','Xining','Lhasa',
  ],
  // ── JAPONYA ───────────────────────────────────────────────────────────────
  JP: [
    'Tokyo','Yokohama','Osaka','Nagoya','Sapporo','Fukuoka','Kobe','Kyoto',
    'Kawasaki','Saitama','Hiroshima','Sendai','Kitakyushu','Chiba','Sakai',
    'Kumamoto','Okayama','Shizuoka','Hamamatsu','Niigata','Sagamihara',
    'Himeji','Matsuyama','Utsunomiya','Kanazawa','Kagoshima','Oita',
  ],
  // ── GÜNEY KORE ────────────────────────────────────────────────────────────
  KR: [
    'Seoul','Busan','Incheon','Daegu','Daejeon','Gwangju','Suwon','Ulsan',
    'Seongnam','Goyang','Yongin','Changwon','Cheongju','Jeonju','Ansan',
    'Bucheon','Namyangju','Anyang','Gimhae','Cheonan','Hwaseong',
  ],
  // ── TAYLAND ───────────────────────────────────────────────────────────────
  TH: [
    'Bangkok','Nonthaburi','Pak Kret','Hat Yai','Udon Thani','Chiang Mai',
    'Phitsanulok','Surat Thani','Khon Kaen','Nakhon Ratchasima','Phuket',
    'Rayong','Chonburi','Pattaya','Chiang Rai','Lampang','Nakhon Si Thammarat',
  ],
  // ── VİETNAM ───────────────────────────────────────────────────────────────
  VN: [
    'Ho Chi Minh City','Hanoi','Haiphong','Da Nang','Bien Hoa','Hue',
    'Nha Trang','Can Tho','Rach Gia','Qui Nhon','Buon Ma Thuot','Vinh',
    'My Tho','Da Lat','Vung Tau','Long Xuyen','Thai Nguyen',
  ],
  // ── ENDONEZYA ─────────────────────────────────────────────────────────────
  ID: [
    'Jakarta','Surabaya','Bekasi','Bandung','Medan','Depok','Tangerang',
    'Semarang','Palembang','Makassar','South Tangerang','Batam','Bogor',
    'Pekanbaru','Bandar Lampung','Malang','Padang','Samarinda','Pontianak',
    'Yogyakarta','Denpasar','Manado','Balikpapan','Surakarta',
  ],
  // ── MALEZYA ───────────────────────────────────────────────────────────────
  MY: [
    'Kuala Lumpur','Subang Jaya','Klang','Johor Bahru','Ipoh','Shah Alam',
    'Petaling Jaya','Kuching','Kota Kinabalu','Seremban','George Town',
    'Miri','Kuala Terengganu','Kota Bharu','Alor Setar','Sandakan',
  ],
  // ── SİNGAPUR ──────────────────────────────────────────────────────────────
  SG: ['Singapore','Jurong East','Woodlands','Tampines','Ang Mo Kio','Toa Payoh','Pasir Ris'],
  // ── FİLİPİNLER ────────────────────────────────────────────────────────────
  PH: [
    'Manila','Quezon City','Davao','Caloocan','Cebu City','Zamboanga',
    'Antipolo','Taguig','Valenzuela','Las Piñas','Makati','Pasig',
    'Cagayan de Oro','Bacoor','Paranaque','General Santos',
  ],
  // ── KAZAKİSTAN ────────────────────────────────────────────────────────────
  KZ: [
    'Almaty','Nur-Sultan','Shymkent','Karaganda','Aktobe','Taraz',
    'Pavlodar','Ust-Kamenogorsk','Semey','Atyrau','Kostanay','Kyzylorda',
  ],
  // ── ÖZBEKİSTAN ────────────────────────────────────────────────────────────
  UZ: ['Tashkent','Namangan','Samarkand','Andijan','Nukus','Qarshi','Bukhara','Fergana'],
  // ── AZERBAYCAN ────────────────────────────────────────────────────────────
  AZ: ['Baku','Ganja','Sumqayit','Minsk','Nakhchivan','Lankaran','Shaki'],
  // ── GÜRCİSTAN ─────────────────────────────────────────────────────────────
  GE: ['Tbilisi','Kutaisi','Batumi','Rustavi','Zugdidi','Gori','Poti'],
  // ── ERMENİSTAN ────────────────────────────────────────────────────────────
  AM: ['Yerevan','Gyumri','Vanadzor','Vagharshapat','Abovyan','Kapan'],
  // ── MOĞOLISTAN ────────────────────────────────────────────────────────────
  MN: ['Ulaanbaatar','Erdenet','Darkhan','Choibalsan','Mörön'],
  // ── MYANMAR ───────────────────────────────────────────────────────────────
  MM: ['Yangon','Mandalay','Naypyidaw','Mawlamyine','Bago','Taunggyi','Pathein'],
  // ── KAMBOÇYA ──────────────────────────────────────────────────────────────
  KH: ['Phnom Penh','Siem Reap','Sihanoukville','Battambang','Kampong Cham'],
  // ── TAYVAN ────────────────────────────────────────────────────────────────
  TW: ['Taipei','New Taipei','Kaohsiung','Taichung','Tainan','Taoyuan','Hsinchu','Keelung'],
  // ── HONG KONG ─────────────────────────────────────────────────────────────
  HK: ['Hong Kong','Kowloon','Sha Tin','Tsuen Wan','Kwun Tong','Tuen Mun','Yuen Long'],
  // ── HİNDİSTAN ─────────────────────────────────────────────────────────────
  IN: [
    'Mumbai','Delhi','Bangalore','Hyderabad','Chennai','Kolkata','Surat',
    'Pune','Ahmedabad','Jaipur','Lucknow','Kanpur','Nagpur','Visakhapatnam',
    'Indore','Thane','Bhopal','Patna','Vadodara','Ghaziabad','Ludhiana',
    'Agra','Nashik','Faridabad','Meerut','Rajkot','Varanasi','Srinagar',
    'Aurangabad','Dhanbad','Amritsar','Allahabad','Ranchi','Coimbatore',
    'Jabalpur','Gwalior','Vijayawada','Jodhpur','Madurai','Raipur','Kota',
  ],
  // ── PAKİSTAN ──────────────────────────────────────────────────────────────
  PK: [
    'Karachi','Lahore','Faisalabad','Rawalpindi','Gujranwala','Peshawar',
    'Multan','Hyderabad','Islamabad','Quetta','Bahawalpur','Sargodha',
    'Sialkot','Sukkur','Larkana','Sheikhupura','Rahim Yar Khan','Jhang',
    'Dera Ghazi Khan','Gujrat','Okara','Sahiwal',
  ],
  // ── BANGLADEŞ ─────────────────────────────────────────────────────────────
  BD: [
    'Dhaka','Chittagong','Khulna','Rajshahi','Sylhet','Comilla','Barisal',
    'Mymensingh','Rangpur','Narayanganj','Gazipur','Bogra','Jessore',
  ],
  // ── SRİ LANKA ─────────────────────────────────────────────────────────────
  LK: ['Colombo','Dehiwala','Moratuwa','Negombo','Kandy','Jaffna','Galle','Sri Jayawardenepura Kotte'],
  // ── NEPAL ─────────────────────────────────────────────────────────────────
  NP: ['Kathmandu','Pokhara','Lalitpur','Bharatpur','Biratnagar','Birgunj','Dharan','Butwal'],
  // ── GÜNEY AFRİKA ──────────────────────────────────────────────────────────
  ZA: [
    'Johannesburg','Cape Town','Durban','Pretoria','Port Elizabeth','Pietermaritzburg',
    'Benoni','Tembisa','East London','Vereeniging','Bloemfontein','Boksburg',
    'Welkom','Newcastle','Krugersdorp','Soweto','Randburg','Sandton','Midrand',
  ],
  // ── NİJERYA ───────────────────────────────────────────────────────────────
  NG: [
    'Lagos','Kano','Ibadan','Abuja','Port Harcourt','Benin City','Maiduguri',
    'Zaria','Aba','Jos','Ilorin','Oyo','Enugu','Abeokuta','Warri',
    'Sokoto','Onitsha','Kaduna','Owerri','Ogbomosho',
  ],
  // ── KENYA ─────────────────────────────────────────────────────────────────
  KE: ['Nairobi','Mombasa','Nakuru','Eldoret','Kisumu','Thika','Malindi','Kitale','Garissa'],
  // ── ETİYOPYA ──────────────────────────────────────────────────────────────
  ET: ['Addis Ababa','Dire Dawa','Mekele','Gondar','Bahir Dar','Adama','Hawassa','Jimma'],
  // ── GANA ──────────────────────────────────────────────────────────────────
  GH: ['Accra','Kumasi','Tamale','Sekondi-Takoradi','Ashaiman','Sunyani','Cape Coast'],
  // ── TANZANYA ──────────────────────────────────────────────────────────────
  TZ: ['Dar es Salaam','Mwanza','Arusha','Dodoma','Mbeya','Morogoro','Tanga','Zanzibar City'],
  // ── KAMERUN ───────────────────────────────────────────────────────────────
  CM: ['Douala','Yaoundé','Bamenda','Bafoussam','Garoua','Kumba','Maroua'],
  // ── ANGOLA ────────────────────────────────────────────────────────────────
  AO: ['Luanda','Huambo','Lobito','Benguela','Namibe','Malanje','Lubango'],
  // ── MOZAMBİK ──────────────────────────────────────────────────────────────
  MZ: ['Maputo','Matola','Beira','Nampula','Chimoio','Quelimane','Tete'],
  // ── ZİMBABVE ──────────────────────────────────────────────────────────────
  ZW: ['Harare','Bulawayo','Chitungwiza','Mutare','Gweru','Kwekwe','Kadoma'],
  // ── RUANDA ────────────────────────────────────────────────────────────────
  RW: ['Kigali','Butare','Gitarama','Musanze','Gisenyi','Byumba'],
  // ── AVUSTRALYA ────────────────────────────────────────────────────────────
  AU: [
    'Sydney','Melbourne','Brisbane','Perth','Adelaide','Gold Coast','Canberra',
    'Newcastle','Sunshine Coast','Wollongong','Hobart','Geelong','Townsville',
    'Cairns','Darwin','Toowoomba','Ballarat','Bendigo','Albury','Launceston',
  ],
  // ── YENİ ZELANDA ──────────────────────────────────────────────────────────
  NZ: ['Auckland','Wellington','Christchurch','Hamilton','Tauranga','Napier','Dunedin','Palmerston North'],
  // ── FİJİ ──────────────────────────────────────────────────────────────────
  FJ: ['Suva','Lautoka','Nadi','Labasa','Ba'],
  // ── PAPUA YENİ GİNE ───────────────────────────────────────────────────────
  PG: ['Port Moresby','Lae','Mount Hagen','Madang','Wewak'],
}
