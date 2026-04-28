const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('./data/company-profiles.json', 'utf8'));
const slice = data.slice(291, 388);

// Helper function to phonetize English names for French TTS
function getPhonetic(name) {
  // Remove common suffixes
  let phonetic = name
    .replace(/\s+(Inc|Corp|Ltd|Holdings|Group|LLC|SA|SARL|SAS|SE|NV|AG|GmbH|PLC)(\.|$)/i, '')
    .trim();

  // Return as-is for French names and simple/universal names
  // Apply phonetic rules for English names that would be mispronounced
  const rules = {
    'Nvidia': 'Ènvidia',
    'Coinbase': 'Coïnbèïse',
    'BlackRock': 'Blakroke',
    'Goldman Sachs': 'Goldmane Sax',
    'Micron': 'Maïkronne',
    'Oracle': 'Orakèl',
    'Broadcom': 'Brodkome',
    'Qualcomm': 'Kwolkome',
    'Amgen': 'Amjenne',
    'PayPal': 'Peïpole',
    'Spotify': 'Spotifaïe',
    'Airbnb': 'Èrbenebie',
    'Zoom': 'Zoume',
    'Stripe': 'Straïpe',
    'Slack': 'Slake',
    'Asana': 'Azana',
    'DocuSign': 'Dokysaïne',
    'Tableau': 'Tableuh', // FR-friendly
    'Workday': 'Werkeday',
    'ServiceNow': 'Service Naou',
    'Atlassian': 'Atlassiene',
    'JiraCloud': 'Jira Cloud',
    'Figma': 'Figma',
    'Adobe': 'Adobe',
    'Autodesk': 'Autodesk',
    'Shopify': 'Shopifaïe',
    'Square': 'Skouère',
    'Toast': 'Toste',
    'Block': 'Bloque',
    'Datadog': 'Data Dog',
    'Splunk': 'Splounke',
    'Elasticsearch': 'Elasticsearch',
    'MongoDB': 'Mongo Didi Bi',
    'Okta': 'Okta',
    'Zscaler': 'Ziskèleur',
    'Cloudflare': 'Cloudflaïre',
    'Akamai': 'Akamaïe',
    'CrowdStrike': 'Craoude Straïke',
    'SentinelOne': 'Sentinèl Ouane',
    'Crowdstrike': 'Craoude Straïke',
    'Palo Alto': 'Palo Alto',
    'Fortinet': 'Fortinet',
    'Sophos': 'Sofos',
    'Zscaler': 'Ziskèleur',
    'Tenable': 'Ténable',
    'Rapid7': 'Rapid Sèvene',
    'Qualys': 'Kwolys',
    'Blackline': 'Blaklaïne',
    'Alteryx': 'Altériks',
    'Domo': 'Domo',
    'Looker': 'Louker',
    'Cognos': 'Cognos',
    'MicroStrategy': 'Microstratagnie',
    'Informatica': 'Informatika',
    'Talend': 'Talend',
    'Matomo': 'Matomo',
    'Amplitude': 'Amplitioude',
    'Mixpanel': 'Mikspanal',
    'Segment': 'Segmant',
    'mParticle': 'Empartikal',
    'Treasure Data': 'Treasure Data',
    'Elastic': 'Elastique',
    'Splunk': 'Splounke',
    'Sumo Logic': 'Sumo Lojique',
    'Dynatrace': 'Dynatrace',
    'New Relic': 'Niou Relique',
    'Datadog': 'Data Dog',
    'HashiCorp': 'Hache Ikoure',
    'GitLab': 'Git Labe',
    'JFrog': 'Jay Frog',
    'CloudBees': 'Cloud Biz',
    'LaunchDarkly': 'Lontch Darkli',
    'Kong': 'Kong',
    'Mulesoft': 'Mioulesoft',
    'Boomi': 'Booumi',
    'Celonis': 'Célonisse',
    'Appian': 'Appiane',
    'UiPath': 'Yu-aï Pace',
    'Blue Prism': 'Blou Prizme',
    'Automation Anywhere': 'Otomachone Enywhere',
    'WorkFusion': 'Werk Fiouzion',
    'Nintex': 'Ninex',
    'Kissflow': 'Kissflou',
    'Zapier': 'Zapiere',
    'IFTTT': 'If Tii Tii',
    'Make': 'Meïk',
    'Power Automate': 'Pouère Otomeit',
    'Coupa': 'Koupa',
    'SAP Ariba': 'SAP Ariba',
    'Jaggr': 'Jager',
    'Workiva': 'Worquiva',
    'Alteryx': 'Altériks',
  };

  // Check for exact match (case-insensitive)
  for (const [key, value] of Object.entries(rules)) {
    if (phonetic.toLowerCase() === key.toLowerCase()) {
      return value;
    }
  }

  // Otherwise return the name as-is (French names, universal names)
  return phonetic;
}

const result = slice.map(entry => ({
  symbol: entry.symbol,
  phonetic: getPhonetic(entry.name || '')
}));

console.log(JSON.stringify(result, null, 2));
