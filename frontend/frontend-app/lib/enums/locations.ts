// Location data for Creerlio Platform
// Auto-generated from MASTER_DATA_SPECIFICATION.md

export const COUNTRIES = [
  'Australia',
  'New Zealand',
  'United Kingdom',
  'Ireland',
  'Canada',
  'United States',
  'India',
  'Philippines',
  'China',
  'South Africa',
  'Singapore',
  'Malaysia',
  'Indonesia',
  'Vietnam',
  'Thailand',
  'Nepal',
  'Sri Lanka',
  'Pakistan',
  'Bangladesh',
  'United Arab Emirates',
  'Saudi Arabia',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Netherlands',
  'Belgium',
  'Switzerland',
  'Austria',
  'Poland',
  'Czech Republic',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Greece',
  'Portugal',
  'Turkey',
  'Brazil',
  'Argentina',
  'Mexico',
  'Chile',
  'Colombia',
  'Peru',
  'Venezuela',
  'Japan',
  'South Korea',
  'Taiwan',
  'Hong Kong',
  'Egypt',
  'Nigeria',
  'Kenya',
  'Ghana',
  'Zimbabwe',
  'Fiji',
  'Papua New Guinea',
] as const;

export type Country = typeof COUNTRIES[number];

export const AUSTRALIAN_STATES = [
  { code: 'NSW', name: 'New South Wales' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'WA', name: 'Western Australia' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'ACT', name: 'Australian Capital Territory' },
  { code: 'NT', name: 'Northern Territory' },
] as const;

export type StateCode = typeof AUSTRALIAN_STATES[number]['code'];
export type StateName = typeof AUSTRALIAN_STATES[number]['name'];

export const AUSTRALIAN_CITIES = {
  NSW: [
    'Sydney', 'North Sydney', 'Parramatta', 'Penrith', 'Liverpool', 'Campbelltown',
    'Blacktown', 'Hornsby', 'Ryde', 'Canterbury-Bankstown', 'Sutherland Shire',
    'The Hills Shire', 'Fairfield', 'Gosford', 'Wyong', 'Newcastle', 'Lake Macquarie',
    'Maitland', 'Port Stephens', 'Cessnock', 'Singleton', 'Muswellbrook', 'Wollongong',
    'Shellharbour', 'Kiama', 'Nowra', 'Queanbeyan', 'Goulburn', 'Yass', 'Bathurst',
    'Orange', 'Lithgow', 'Oberon', 'Dubbo', 'Mudgee', 'Wellington', 'Parkes', 'Forbes',
    'Cowra', 'Young', 'Wagga Wagga', 'Griffith', 'Leeton', 'Narrandera', 'Cootamundra',
    'Temora', 'Albury', 'Tumut', 'Gundagai', 'Junee', 'Broken Hill', 'Wilcannia',
    'Menindee', 'Tamworth', 'Armidale', 'Glen Innes', 'Inverell', 'Tenterfield', 'Moree',
    'Narrabri', 'Gunnedah', 'Coonabarabran', 'Coffs Harbour', 'Port Macquarie', 'Kempsey',
    'Taree', 'Forster-Tuncurry', 'Ballina', 'Byron Bay', 'Lismore', 'Casino', 'Tweed Heads',
    'Grafton', 'Maclean', 'Yamba', 'Bega', 'Eden', 'Merimbula', 'Cooma', 'Jindabyne',
    'Tumbarumba', 'Deniliquin', 'Hay', 'Balranald', 'Finley', 'Tocumwal',
  ],
  VIC: [
    'Melbourne', 'Geelong', 'Ballarat', 'Bendigo', 'Shepparton', 'Wodonga', 'Mildura',
    'Warrnambool', 'Traralgon', 'Morwell', 'Sale', 'Bairnsdale', 'Moe', 'Wonthaggi',
    'Leongatha', 'Drouin', 'Warragul', 'Pakenham', 'Cranbourne', 'Dandenong', 'Frankston',
    'Mornington', 'Rosebud', 'Hastings', 'Werribee', 'Melton', 'Sunbury', 'Craigieburn',
    'Whittlesea', 'Epping', 'Reservoir', 'Preston', 'Coburg', 'Brunswick', 'Footscray',
    'Williamstown', 'Altona', 'Hoppers Crossing', 'Point Cook', 'Caroline Springs',
    'Deer Park', 'St Albans', 'Broadmeadows', 'Greensborough', 'Eltham', 'Diamond Creek',
    'Hurstbridge', 'Ringwood', 'Croydon', 'Lilydale', 'Healesville', 'Yarra Glen',
    'Belgrave', 'Emerald', 'Gembrook', 'Officer', 'Berwick', 'Narre Warren',
    'Endeavour Hills', 'Mount Waverley', 'Glen Waverley', 'Oakleigh', 'Bentleigh',
    'Brighton', 'Sandringham', 'Hampton', 'Malvern', 'Toorak', 'Hawthorn', 'Kew',
    'Colac', 'Camperdown', 'Terang', 'Portland', 'Hamilton', 'Casterton', 'Horsham',
    'Dimboola', 'Nhill', 'Ararat', 'Stawell', 'Halls Gap', 'Swan Hill', 'Echuca',
    'Cobram', 'Yarrawonga', 'Benalla', 'Wangaratta', 'Bright', 'Mount Beauty',
    'Mansfield', 'Alexandra', 'Seymour', 'Kilmore', 'Wallan', 'Kyneton', 'Castlemaine',
    'Maryborough', 'Daylesford', 'Bacchus Marsh', 'Lara',
  ],
  QLD: [
    'Brisbane', 'Gold Coast', 'Maroochydore', 'Caloundra', 'Noosa', 'Ipswich', 'Logan',
    'Redland', 'Moreton Bay', 'Toowoomba', 'Cairns', 'Townsville', 'Mackay', 'Rockhampton',
    'Bundaberg', 'Hervey Bay', 'Maryborough', 'Gladstone', 'Mount Isa', 'Charters Towers',
    'Atherton', 'Mareeba', 'Innisfail', 'Tully', 'Mossman', 'Port Douglas', 'Weipa',
    'Thursday Island', 'Palm Island', 'Magnetic Island', 'Burdekin', 'Ayr', 'Home Hill',
    'Proserpine', 'Airlie Beach', 'Bowen', 'Emerald', 'Blackwater', 'Moranbah', 'Clermont',
    'Longreach', 'Winton', 'Barcaldine', 'Charleville', 'Roma', 'Dalby', 'Chinchilla',
    'Miles', 'Warwick', 'Stanthorpe', 'Goondiwindi', 'St George', 'Dirranbandi',
    'Cunnamulla', 'Quilpie', 'Thargomindah', 'Birdsville', 'Bedourie', 'Boulia',
    'Mount Garnet', 'Croydon', 'Georgetown', 'Normanton', 'Karumba', 'Burketown',
    'Doomadgee', 'Mornington Island', 'Kowanyama', 'Pormpuraaw', 'Aurukun',
    'Lockhart River', 'Cooktown', 'Laura', 'Coen', 'Bamaga', 'Gympie', 'Kingaroy',
    'Nanango', 'Murgon', 'Cherbourg', 'Wondai',
  ],
  WA: [
    'Perth', 'Fremantle', 'Mandurah', 'Rockingham', 'Joondalup', 'Wanneroo', 'Armadale',
    'Gosnells', 'Canning', 'Belmont', 'Bayswater', 'Stirling', 'Cockburn', 'Melville',
    'South Perth', 'Victoria Park', 'Subiaco', 'Nedlands', 'Claremont', 'Cottesloe',
    'Bunbury', 'Busselton', 'Margaret River', 'Augusta', 'Collie', 'Harvey', 'Waroona',
    'Pinjarra', 'Albany', 'Denmark', 'Mount Barker', 'Katanning', 'Narrogin', 'Northam',
    'York', 'Toodyay', 'Beverley', 'Kalgoorlie-Boulder', 'Coolgardie', 'Kambalda',
    'Norseman', 'Esperance', 'Ravenstine', 'Southern Cross', 'Geraldton', 'Carnarvon',
    'Exmouth', 'Coral Bay', 'Denham', 'Kalbarri', 'Northampton', 'Port Hedland',
    'Karratha', 'Wickham', 'Roebourne', 'Dampier', 'Tom Price', 'Paraburdoo', 'Newman',
    'Broome', 'Derby', 'Fitzroy Crossing', 'Halls Creek', 'Kununurra', 'Wyndham',
    'Merredin', 'Bruce Rock', 'Corrigin', 'Kondinin', 'Kulin', 'Lake Grace', 'Newdegate',
    'Leonora', 'Laverton', 'Meekatharra', 'Cue', 'Sandstone', 'Wiluna', 'Leinster',
    'Mount Magnet',
  ],
  SA: [
    'Adelaide', 'Mount Gambier', 'Whyalla', 'Murray Bridge', 'Port Augusta', 'Port Pirie',
    'Port Lincoln', 'Victor Harbor', 'Gawler', 'Mount Barker', 'Noarlunga', 'Salisbury',
    'Tea Tree Gully', 'Unley', 'Norwood Payneham St Peters', 'Burnside', 'Campbelltown',
    'Mitcham', 'Onkaparinga', 'Marion', 'Holdfast Bay', 'Charles Sturt', 'West Torrens',
    'Prospect', 'Port Adelaide Enfield', 'Renmark', 'Berri', 'Loxton', 'Waikerie',
    'Barmera', 'Kingston', 'Naracoorte', 'Bordertown', 'Keith', 'Millicent', 'Penola',
    'Robe', 'Beachport', 'Ceduna', 'Streaky Bay', 'Elliston', 'Tumby Bay', 'Cummins',
    'Cleve', 'Cowell', 'Kimba', 'Wudinna', 'Minnipa', 'Roxby Downs', 'Andamooka',
    'Leigh Creek', 'Marree', 'Oodnadatta', 'William Creek', 'Coober Pedy', 'Mintabie',
    'Marla', 'Clare', 'Auburn', 'Burra', 'Jamestown', 'Peterborough', 'Orroroo',
    'Hawker', 'Quorn',
  ],
  TAS: [
    'Hobart', 'Launceston', 'Devonport', 'Burnie', 'Somerset', 'Wynyard', 'Ulverstone',
    'Penguin', 'Smithton', 'Stanley', 'George Town', 'Bridport', 'Scottsdale', 'St Helens',
    'Swansea', 'Triabunna', 'Sorell', 'Richmond', 'New Norfolk', 'Hamilton', 'Bothwell',
    'Oatlands', 'Campbell Town', 'Ross', 'Deloraine', 'Westbury', 'Longford', 'Perth',
    'Evandale', 'Kingston', 'Huonville', 'Cygnet', 'Dover', 'Geeveston', 'Southport',
    'Strahan', 'Queenstown', 'Zeehan', 'Rosebery',
  ],
  ACT: [
    'Canberra', 'Belconnen', 'Tuggeranong', 'Woden Valley', 'Weston Creek', 'Gungahlin',
    'Molonglo Valley',
  ],
  NT: [
    'Darwin', 'Palmerston', 'Alice Springs', 'Katherine', 'Tennant Creek', 'Nhulunbuy',
    'Jabiru', 'Casuarina', 'Howard Springs', 'Humpty Doo', 'Batchelor', 'Pine Creek',
    'Adelaide River', 'Mataranka', 'Daly Waters', 'Elliott', 'Renner Springs',
    'Barrow Creek', 'Ti Tree', 'Yulara', 'Hermannsburg', 'Papunya', 'Yuendumu',
    'Lajamanu', 'Ngukurr', 'Borroloola', 'Alyangula', 'Maningrida', 'Gunbalanya',
    'Wadeye', 'Kalkarindji', 'Timber Creek', 'Gove',
  ],
} as const;

export const RADIUS_OPTIONS = [
  { value: 1, label: '1 km' },
  { value: 2, label: '2 km' },
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 15, label: '15 km' },
  { value: 20, label: '20 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: 75, label: '75 km' },
  { value: 100, label: '100 km' },
  { value: 150, label: '150 km' },
  { value: 200, label: '200 km' },
  { value: -1, label: 'Statewide' },
  { value: -2, label: 'Nationwide' },
  { value: -3, label: 'Any distance' },
] as const;

export type RadiusOption = typeof RADIUS_OPTIONS[number];

// Helper function to get all cities across all states
export const getAllAustralianCities = (): string[] => {
  return Object.values(AUSTRALIAN_CITIES).flat();
};

// Helper function to get cities by state code
export const getCitiesByState = (stateCode: StateCode): readonly string[] => {
  return AUSTRALIAN_CITIES[stateCode] || [];
};

// Helper function to search cities
export const searchCities = (query: string, limit: number = 20): string[] => {
  const allCities = getAllAustralianCities();
  const lowerQuery = query.toLowerCase();
  
  return allCities
    .filter(city => city.toLowerCase().includes(lowerQuery))
    .slice(0, limit);
};
