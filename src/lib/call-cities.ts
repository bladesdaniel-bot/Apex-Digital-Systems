/**
 * City pools for the call list's random pick. When the team member leaves the
 * city box blank, we pick one city at random from the chosen state (US) or
 * country so searches are spread evenly between big cities and small towns
 * instead of always landing on the largest metro.
 */

/** US states (and DC) -> a mix of large, mid-size and small towns. */
export const US_STATE_CITIES: Record<string, string[]> = {
  Alabama: ["Birmingham", "Montgomery", "Huntsville", "Mobile", "Tuscaloosa", "Auburn", "Dothan", "Florence", "Gadsden", "Opelika", "Selma", "Enterprise"],
  Alaska: ["Anchorage", "Fairbanks", "Juneau", "Wasilla", "Sitka", "Ketchikan", "Kenai", "Kodiak", "Bethel", "Palmer", "Homer", "Soldotna"],
  Arizona: ["Phoenix", "Tucson", "Mesa", "Chandler", "Scottsdale", "Flagstaff", "Yuma", "Prescott", "Sierra Vista", "Casa Grande", "Lake Havasu City", "Show Low"],
  Arkansas: ["Little Rock", "Fayetteville", "Fort Smith", "Springdale", "Jonesboro", "Conway", "Rogers", "Pine Bluff", "Hot Springs", "Bentonville", "Searcy", "Mountain Home"],
  California: ["Los Angeles", "San Diego", "San Jose", "San Francisco", "Fresno", "Sacramento", "Bakersfield", "Redding", "Modesto", "Santa Rosa", "Visalia", "Eureka", "Chico", "San Luis Obispo", "Barstow"],
  Colorado: ["Denver", "Colorado Springs", "Aurora", "Fort Collins", "Boulder", "Pueblo", "Grand Junction", "Greeley", "Durango", "Montrose", "Sterling", "Cañon City"],
  Connecticut: ["Bridgeport", "New Haven", "Hartford", "Stamford", "Waterbury", "Norwalk", "Danbury", "New Britain", "Middletown", "Torrington", "Willimantic", "Putnam"],
  Delaware: ["Wilmington", "Dover", "Newark", "Middletown", "Smyrna", "Milford", "Seaford", "Georgetown", "Rehoboth Beach", "Laurel"],
  "District of Columbia": ["Washington"],
  Florida: ["Jacksonville", "Miami", "Tampa", "Orlando", "Tallahassee", "Fort Myers", "Pensacola", "Gainesville", "Daytona Beach", "Ocala", "Panama City", "Sebring", "Key West", "Lake City"],
  Georgia: ["Atlanta", "Savannah", "Augusta", "Columbus", "Macon", "Athens", "Albany", "Valdosta", "Rome", "Dalton", "Tifton", "Waycross"],
  Hawaii: ["Honolulu", "Hilo", "Kailua", "Kapolei", "Lihue", "Kahului", "Wailuku", "Kaneohe", "Waipahu", "Pahoa"],
  Idaho: ["Boise", "Meridian", "Nampa", "Idaho Falls", "Pocatello", "Coeur d'Alene", "Twin Falls", "Lewiston", "Sandpoint", "Burley", "McCall", "Salmon"],
  Illinois: ["Chicago", "Springfield", "Peoria", "Rockford", "Naperville", "Champaign", "Bloomington", "Decatur", "Quincy", "Carbondale", "Galesburg", "Effingham"],
  Indiana: ["Indianapolis", "Fort Wayne", "Evansville", "South Bend", "Bloomington", "Lafayette", "Muncie", "Terre Haute", "Kokomo", "Richmond", "Columbus", "Madison"],
  Iowa: ["Des Moines", "Cedar Rapids", "Davenport", "Sioux City", "Iowa City", "Waterloo", "Ames", "Dubuque", "Council Bluffs", "Ottumwa", "Fort Dodge", "Decorah"],
  Kansas: ["Wichita", "Overland Park", "Kansas City", "Topeka", "Olathe", "Lawrence", "Manhattan", "Salina", "Hutchinson", "Dodge City", "Garden City", "Hays"],
  Kentucky: ["Louisville", "Lexington", "Bowling Green", "Owensboro", "Covington", "Frankfort", "Paducah", "Pikeville", "Somerset", "Murray", "Maysville", "Hazard"],
  Louisiana: ["New Orleans", "Baton Rouge", "Shreveport", "Lafayette", "Lake Charles", "Monroe", "Alexandria", "Houma", "Slidell", "Ruston", "Natchitoches", "Thibodaux"],
  Maine: ["Portland", "Bangor", "Lewiston", "Augusta", "Auburn", "Biddeford", "Waterville", "Presque Isle", "Rockland", "Brunswick", "Bar Harbor", "Caribou"],
  Maryland: ["Baltimore", "Annapolis", "Frederick", "Rockville", "Gaithersburg", "Hagerstown", "Salisbury", "Cumberland", "Easton", "Cambridge", "Bel Air", "Ocean City"],
  Massachusetts: ["Boston", "Worcester", "Springfield", "Cambridge", "Lowell", "Brockton", "New Bedford", "Fall River", "Pittsfield", "Hyannis", "Greenfield", "North Adams"],
  Michigan: ["Detroit", "Grand Rapids", "Ann Arbor", "Lansing", "Flint", "Kalamazoo", "Saginaw", "Traverse City", "Marquette", "Battle Creek", "Alpena", "Sault Ste. Marie"],
  Minnesota: ["Minneapolis", "Saint Paul", "Rochester", "Duluth", "Bloomington", "St. Cloud", "Mankato", "Bemidji", "Brainerd", "Winona", "Alexandria", "International Falls"],
  Mississippi: ["Jackson", "Gulfport", "Biloxi", "Hattiesburg", "Meridian", "Tupelo", "Oxford", "Greenville", "Vicksburg", "Starkville", "Natchez", "Clarksdale"],
  Missouri: ["Kansas City", "St. Louis", "Springfield", "Columbia", "Independence", "Jefferson City", "Joplin", "St. Joseph", "Cape Girardeau", "Rolla", "Poplar Bluff", "Hannibal"],
  Montana: ["Billings", "Missoula", "Great Falls", "Bozeman", "Helena", "Kalispell", "Butte", "Havre", "Miles City", "Livingston", "Libby", "Glendive"],
  Nebraska: ["Omaha", "Lincoln", "Grand Island", "Kearney", "Fremont", "Norfolk", "Hastings", "North Platte", "Columbus", "Scottsbluff", "Beatrice", "McCook"],
  Nevada: ["Las Vegas", "Reno", "Henderson", "Carson City", "Sparks", "Elko", "Mesquite", "Pahrump", "Fallon", "Winnemucca", "Boulder City", "Ely"],
  "New Hampshire": ["Manchester", "Nashua", "Concord", "Dover", "Rochester", "Keene", "Portsmouth", "Laconia", "Lebanon", "Claremont", "Berlin", "Littleton"],
  "New Jersey": ["Newark", "Jersey City", "Paterson", "Trenton", "Atlantic City", "Camden", "Princeton", "Toms River", "Vineland", "Morristown", "Cape May", "Newton"],
  "New Mexico": ["Albuquerque", "Santa Fe", "Las Cruces", "Rio Rancho", "Roswell", "Farmington", "Clovis", "Hobbs", "Gallup", "Taos", "Silver City", "Raton"],
  "New York": ["New York City", "Buffalo", "Rochester", "Syracuse", "Albany", "Yonkers", "Utica", "Binghamton", "Ithaca", "Plattsburgh", "Saratoga Springs", "Jamestown"],
  "North Carolina": ["Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem", "Fayetteville", "Asheville", "Wilmington", "Greenville", "Hickory", "Boone", "Elizabeth City"],
  "North Dakota": ["Fargo", "Bismarck", "Grand Forks", "Minot", "West Fargo", "Williston", "Dickinson", "Mandan", "Jamestown", "Devils Lake", "Valley City", "Rugby"],
  Ohio: ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron", "Dayton", "Youngstown", "Canton", "Lima", "Mansfield", "Athens", "Zanesville"],
  Oklahoma: ["Oklahoma City", "Tulsa", "Norman", "Broken Arrow", "Lawton", "Edmond", "Stillwater", "Enid", "Muskogee", "Ardmore", "Durant", "Guymon"],
  Oregon: ["Portland", "Salem", "Eugene", "Gresham", "Hillsboro", "Bend", "Medford", "Corvallis", "Albany", "Pendleton", "Klamath Falls", "Astoria"],
  Pennsylvania: ["Philadelphia", "Pittsburgh", "Allentown", "Erie", "Reading", "Scranton", "Harrisburg", "Lancaster", "State College", "Altoona", "Williamsport", "Meadville"],
  "Rhode Island": ["Providence", "Warwick", "Cranston", "Pawtucket", "Newport", "Woonsocket", "Coventry", "Westerly", "Bristol", "Narragansett"],
  "South Carolina": ["Columbia", "Charleston", "Greenville", "Myrtle Beach", "Spartanburg", "Florence", "Rock Hill", "Sumter", "Aiken", "Beaufort", "Greenwood", "Orangeburg"],
  "South Dakota": ["Sioux Falls", "Rapid City", "Aberdeen", "Brookings", "Watertown", "Mitchell", "Pierre", "Yankton", "Huron", "Spearfish", "Sturgis", "Winner"],
  Tennessee: ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Clarksville", "Murfreesboro", "Johnson City", "Jackson", "Kingsport", "Cookeville", "Dyersburg", "Crossville"],
  Texas: ["Houston", "San Antonio", "Dallas", "Austin", "Fort Worth", "El Paso", "Corpus Christi", "Lubbock", "Amarillo", "Midland", "Tyler", "Waco", "Abilene", "Laredo", "Alpine"],
  Utah: ["Salt Lake City", "Provo", "Ogden", "St. George", "Orem", "Sandy", "Logan", "Cedar City", "Moab", "Price", "Vernal", "Richfield"],
  Vermont: ["Burlington", "Montpelier", "Rutland", "South Burlington", "Barre", "St. Albans", "Brattleboro", "Bennington", "Middlebury", "St. Johnsbury", "Newport", "Manchester"],
  Virginia: ["Virginia Beach", "Norfolk", "Richmond", "Arlington", "Newport News", "Alexandria", "Roanoke", "Charlottesville", "Lynchburg", "Winchester", "Bristol", "Abingdon"],
  Washington: ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue", "Everett", "Olympia", "Yakima", "Bellingham", "Kennewick", "Walla Walla", "Port Angeles"],
  "West Virginia": ["Charleston", "Huntington", "Morgantown", "Parkersburg", "Wheeling", "Fairmont", "Beckley", "Martinsburg", "Clarksburg", "Bluefield", "Elkins", "Keyser"],
  Wisconsin: ["Milwaukee", "Madison", "Green Bay", "Kenosha", "Racine", "Appleton", "Eau Claire", "La Crosse", "Wausau", "Oshkosh", "Superior", "Rhinelander"],
  Wyoming: ["Cheyenne", "Casper", "Laramie", "Gillette", "Rock Springs", "Sheridan", "Jackson", "Cody", "Riverton", "Rawlins", "Evanston", "Worland"],
};

/** US state abbreviations -> full state name, so "NV" and "Nevada" both match. */
export const US_STATE_ALIASES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska",
  NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

/** Country code -> a mix of big cities and smaller towns for random picks. */
export const COUNTRY_CITIES: Record<string, string[]> = {
  CA: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa", "Edmonton", "Winnipeg", "Halifax", "Kelowna", "Regina", "Sudbury", "Charlottetown", "Whitehorse", "Thunder Bay"],
  MX: ["Mexico City", "Guadalajara", "Monterrey", "Puebla", "Tijuana", "Mérida", "Cancún", "Querétaro", "Toluca", "Chihuahua", "San Luis Potosí", "Oaxaca"],
  GB: ["London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Liverpool", "Bristol", "Newcastle", "Sheffield", "Norwich", "Exeter", "Inverness", "York", "Truro"],
  IE: ["Dublin", "Cork", "Galway", "Limerick", "Waterford", "Kilkenny", "Sligo", "Athlone", "Letterkenny", "Tralee"],
  AU: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra", "Hobart", "Darwin", "Newcastle", "Wollongong", "Cairns", "Ballarat", "Alice Springs"],
  NZ: ["Auckland", "Wellington", "Christchurch", "Hamilton", "Dunedin", "Tauranga", "Napier", "Palmerston North", "Nelson", "Invercargill"],
  DE: ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Düsseldorf", "Leipzig", "Nuremberg", "Hannover", "Freiburg", "Kiel", "Bamberg", "Görlitz"],
  FR: ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Bordeaux", "Strasbourg", "Lille", "Rennes", "Dijon", "Annecy", "Perpignan", "Bayonne"],
  ES: ["Madrid", "Barcelona", "Valencia", "Seville", "Bilbao", "Málaga", "Zaragoza", "Alicante", "Granada", "Salamanca", "Santander", "Cáceres"],
  IT: ["Rome", "Milan", "Naples", "Turin", "Florence", "Venice", "Bologna", "Genoa", "Palermo", "Verona", "Perugia", "Bolzano", "Matera", "Lecce"],
  NL: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Groningen", "Maastricht", "Arnhem", "Zwolle", "Middelburg"],
  BE: ["Brussels", "Antwerp", "Ghent", "Bruges", "Liège", "Leuven", "Namur", "Mechelen", "Ostend", "Arlon"],
  SE: ["Stockholm", "Gothenburg", "Malmö", "Uppsala", "Västerås", "Örebro", "Linköping", "Umeå", "Karlstad", "Kiruna"],
  NO: ["Oslo", "Bergen", "Trondheim", "Stavanger", "Tromsø", "Kristiansand", "Drammen", "Ålesund", "Bodø", "Hamar"],
  DK: ["Copenhagen", "Aarhus", "Odense", "Aalborg", "Esbjerg", "Randers", "Kolding", "Roskilde", "Herning", "Rønne"],
  FI: ["Helsinki", "Espoo", "Tampere", "Turku", "Oulu", "Jyväskylä", "Kuopio", "Lahti", "Rovaniemi", "Joensuu"],
  PL: ["Warsaw", "Kraków", "Gdańsk", "Wrocław", "Poznań", "Łódź", "Szczecin", "Lublin", "Białystok", "Zakopane", "Toruń", "Olsztyn"],
  PT: ["Lisbon", "Porto", "Braga", "Coimbra", "Faro", "Aveiro", "Évora", "Leiria", "Guimarães", "Viseu"],
  CH: ["Zurich", "Geneva", "Basel", "Bern", "Lausanne", "Lucerne", "Lugano", "St. Gallen", "Interlaken", "Chur"],
  AT: ["Vienna", "Graz", "Linz", "Salzburg", "Innsbruck", "Klagenfurt", "Villach", "St. Pölten", "Bregenz", "Eisenstadt"],
  BR: ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Salvador", "Fortaleza", "Curitiba", "Manaus", "Recife", "Porto Alegre", "Florianópolis", "Cuiabá", "Boa Vista"],
  AR: ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "La Plata", "Salta", "Mar del Plata", "Bariloche", "Ushuaia", "Neuquén"],
  CL: ["Santiago", "Valparaíso", "Concepción", "Antofagasta", "Temuco", "La Serena", "Puerto Montt", "Punta Arenas", "Iquique", "Chillán"],
  CO: ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Bucaramanga", "Pereira", "Manizales", "Villavicencio", "Pasto"],
  PE: ["Lima", "Arequipa", "Cusco", "Trujillo", "Chiclayo", "Piura", "Iquitos", "Huancayo", "Pucallpa", "Tacna"],
  PH: ["Manila", "Quezon City", "Cebu City", "Davao", "Makati", "Iloilo City", "Baguio", "Bacolod", "Cagayan de Oro", "Dumaguete"],
  IN: ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Kochi", "Indore", "Coimbatore", "Shimla"],
  PK: ["Karachi", "Lahore", "Islamabad", "Faisalabad", "Rawalpindi", "Multan", "Peshawar", "Quetta", "Sialkot", "Gilgit"],
  NG: ["Lagos", "Abuja", "Ibadan", "Kano", "Port Harcourt", "Benin City", "Enugu", "Kaduna", "Jos", "Calabar"],
  ZA: ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth", "Bloemfontein", "East London", "Pietermaritzburg", "Nelspruit", "Kimberley"],
  KE: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi", "Nyeri", "Machakos", "Isiolo"],
  AE: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Al Ain", "Umm Al Quwain"],
  SA: ["Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Tabuk", "Abha", "Hail", "Najran"],
  SG: ["Singapore"],
  MY: ["Kuala Lumpur", "George Town", "Johor Bahru", "Ipoh", "Kota Kinabalu", "Kuching", "Malacca City", "Alor Setar", "Miri", "Kuala Terengganu"],
  JP: ["Tokyo", "Osaka", "Nagoya", "Sapporo", "Fukuoka", "Kyoto", "Hiroshima", "Sendai", "Kanazawa", "Naha", "Matsuyama", "Aomori"],
  KR: ["Seoul", "Busan", "Incheon", "Daegu", "Daejeon", "Gwangju", "Suwon", "Ulsan", "Jeju City", "Chuncheon", "Jeonju", "Gangneung"],
};

/**
 * Picks a random city for a region so searches aren't biased toward big
 * metros. Returns null when we have no city list for that region (the caller
 * then searches the whole region as before).
 */
export function randomCityFor(countryCode: string, stateOrRegion: string): string | null {
  const state = stateOrRegion.trim();
  if (countryCode === "US" && state) {
    const name = US_STATE_ALIASES[state.toUpperCase()] ?? Object.keys(US_STATE_CITIES).find(k => k.toLowerCase() === state.toLowerCase());
    const pool = name ? US_STATE_CITIES[name] : undefined;
    if (pool?.length) return pool[Math.floor(Math.random() * pool.length)] ?? null;
  }
  const pool = COUNTRY_CITIES[countryCode];
  if (pool?.length) return pool[Math.floor(Math.random() * pool.length)] ?? null;
  return null;
}
