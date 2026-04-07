const fs = require('fs');
const path = require('path');

// Years: 2021-2033
const years = [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];

// Geographies with their region grouping
const regions = {
  "North America": ["U.S.", "Canada"],
  "Europe": ["U.K.", "Germany", "Italy", "France", "Spain", "Russia", "Rest of Europe"],
  "Asia Pacific": ["China", "India", "Japan", "South Korea", "ASEAN", "Australia", "Rest of Asia Pacific"],
  "Latin America": ["Brazil", "Argentina", "Mexico", "Rest of Latin America"],
  "Middle East & Africa": ["GCC", "South Africa", "Rest of Middle East & Africa"]
};

// New segment definitions with market share splits (proportions within each segment type)
const segmentTypes = {
  "By Product Component": {
    "Acrylic Polymer Powders": 0.30,
    "Acrylic Liquids / Monomers": 0.22,
    "Prep & Adhesion Products": 0.12,
    "Extension Support Products": 0.13,
    "Acrylic Nail Kits / System Bundles": 0.15,
    "Removal & Aftercare Products": 0.08
  },
  "By Application": {
    "Full Set Acrylic Extensions": 0.35,
    "Acrylic Overlays on Natural Nails": 0.22,
    "Refill / Rebalance Services": 0.20,
    "Nail Repair / Reconstruction": 0.13,
    "Acrylic Nail Art / 3D Design": 0.10
  },
  "By Extension Construction Method": {
    "Tip-Based Extensions": 0.45,
    "Sculpted / Form-Based Extensions": 0.35,
    "Overlay-Only Applications": 0.20
  },
  "By End User": {
    "Professional Nail Salons": 0.45,
    "Independent Nail Technicians / Nail Artists": 0.22,
    "Nail Schools / Academies": 0.10,
    "At-Home / DIY Users": 0.15,
    "Brands / Private Label Buyers": 0.08
  },
  "By Sales Channel": {
    "Offline Distributors (B2B)": 0.35,
    "B2B - Online Market Places": 0.20,
    "Offline Distributor/Retailers (B2C)": 0.25,
    "Online D2C Channels (Online Market Places)": 0.20
  }
};

// Regional base values (USD Million) for 2021 - total market per region
// Global Acrylic Nail Extensions market ~$1.6B in 2021, growing ~7% CAGR
const regionBaseValues = {
  "North America": 560,
  "Europe": 420,
  "Asia Pacific": 380,
  "Latin America": 140,
  "Middle East & Africa": 90
};

// Country share within region (must sum to ~1.0)
const countryShares = {
  "North America": { "U.S.": 0.82, "Canada": 0.18 },
  "Europe": { "U.K.": 0.18, "Germany": 0.22, "Italy": 0.12, "France": 0.16, "Spain": 0.10, "Russia": 0.08, "Rest of Europe": 0.14 },
  "Asia Pacific": { "China": 0.28, "India": 0.12, "Japan": 0.25, "South Korea": 0.12, "ASEAN": 0.10, "Australia": 0.07, "Rest of Asia Pacific": 0.06 },
  "Latin America": { "Brazil": 0.45, "Argentina": 0.15, "Mexico": 0.25, "Rest of Latin America": 0.15 },
  "Middle East & Africa": { "GCC": 0.45, "South Africa": 0.25, "Rest of Middle East & Africa": 0.30 }
};

// Growth rates (CAGR) per region - slightly different for variety
const regionGrowthRates = {
  "North America": 0.068,
  "Europe": 0.062,
  "Asia Pacific": 0.092,
  "Latin America": 0.078,
  "Middle East & Africa": 0.082
};

// Segment-specific growth multipliers (relative to regional base CAGR)
const segmentGrowthMultipliers = {
  "By Product Component": {
    "Acrylic Polymer Powders": 0.98,
    "Acrylic Liquids / Monomers": 1.00,
    "Prep & Adhesion Products": 1.05,
    "Extension Support Products": 1.08,
    "Acrylic Nail Kits / System Bundles": 1.12,
    "Removal & Aftercare Products": 1.04
  },
  "By Application": {
    "Full Set Acrylic Extensions": 1.02,
    "Acrylic Overlays on Natural Nails": 1.06,
    "Refill / Rebalance Services": 0.96,
    "Nail Repair / Reconstruction": 1.04,
    "Acrylic Nail Art / 3D Design": 1.15
  },
  "By Extension Construction Method": {
    "Tip-Based Extensions": 1.05,
    "Sculpted / Form-Based Extensions": 0.97,
    "Overlay-Only Applications": 1.03
  },
  "By End User": {
    "Professional Nail Salons": 0.98,
    "Independent Nail Technicians / Nail Artists": 1.08,
    "Nail Schools / Academies": 1.04,
    "At-Home / DIY Users": 1.18,
    "Brands / Private Label Buyers": 1.10
  },
  "By Sales Channel": {
    "Offline Distributors (B2B)": 0.94,
    "B2B - Online Market Places": 1.12,
    "Offline Distributor/Retailers (B2C)": 0.96,
    "Online D2C Channels (Online Market Places)": 1.20
  }
};

// Volume multiplier: units per USD Million (~12,000 units per $1M for nail products)
const volumePerMillionUSD = 12000;

// Seeded pseudo-random for reproducibility
let seed = 42;
function seededRandom() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}

function addNoise(value, noiseLevel = 0.03) {
  return value * (1 + (seededRandom() - 0.5) * 2 * noiseLevel);
}

function roundTo1(val) {
  return Math.round(val * 10) / 10;
}

function roundToInt(val) {
  return Math.round(val);
}

function generateTimeSeries(baseValue, growthRate, roundFn) {
  const series = {};
  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const rawValue = baseValue * Math.pow(1 + growthRate, i);
    series[year] = roundFn(addNoise(rawValue));
  }
  return series;
}

function generateData(isVolume) {
  const data = {};
  const roundFn = isVolume ? roundToInt : roundTo1;
  const multiplier = isVolume ? volumePerMillionUSD : 1;

  // Generate data for each region and country
  for (const [regionName, countries] of Object.entries(regions)) {
    const regionBase = regionBaseValues[regionName] * multiplier;
    const regionGrowth = regionGrowthRates[regionName];

    // Region-level data
    data[regionName] = {};
    for (const [segType, segments] of Object.entries(segmentTypes)) {
      data[regionName][segType] = {};
      for (const [segName, share] of Object.entries(segments)) {
        const segGrowth = regionGrowth * segmentGrowthMultipliers[segType][segName];
        const segBase = regionBase * share;
        data[regionName][segType][segName] = generateTimeSeries(segBase, segGrowth, roundFn);
      }
    }

    // Add "By Country" for each region
    data[regionName]["By Country"] = {};
    for (const country of countries) {
      const cShare = countryShares[regionName][country];
      // Use a slight variation of region growth per country
      const countryGrowthVariation = 1 + (seededRandom() - 0.5) * 0.06;
      const countryBase = regionBase * cShare;
      const countryGrowth = regionGrowth * countryGrowthVariation;
      data[regionName]["By Country"][country] = generateTimeSeries(countryBase, countryGrowth, roundFn);
    }

    // Country-level data
    for (const country of countries) {
      const cShare = countryShares[regionName][country];
      const countryBase = regionBase * cShare;
      const countryGrowthVariation = 1 + (seededRandom() - 0.5) * 0.04;
      const countryGrowth = regionGrowth * countryGrowthVariation;

      data[country] = {};
      for (const [segType, segments] of Object.entries(segmentTypes)) {
        data[country][segType] = {};
        for (const [segName, share] of Object.entries(segments)) {
          const segGrowth = countryGrowth * segmentGrowthMultipliers[segType][segName];
          const segBase = countryBase * share;
          // Add slight country-specific variation to segment share
          const shareVariation = 1 + (seededRandom() - 0.5) * 0.1;
          data[country][segType][segName] = generateTimeSeries(segBase * shareVariation, segGrowth, roundFn);
        }
      }
    }
  }

  return data;
}

// Generate both datasets
seed = 42;
const valueData = generateData(false);
seed = 7777;
const volumeData = generateData(true);

// Write files
const outDir = path.join(__dirname, 'public', 'data');
fs.writeFileSync(path.join(outDir, 'value.json'), JSON.stringify(valueData, null, 2));
fs.writeFileSync(path.join(outDir, 'volume.json'), JSON.stringify(volumeData, null, 2));

console.log('Generated value.json and volume.json successfully');
console.log('Value geographies:', Object.keys(valueData).length);
console.log('Volume geographies:', Object.keys(volumeData).length);
console.log('Segment types:', Object.keys(valueData['North America']));
console.log('Sample - North America, By Type:', JSON.stringify(valueData['North America']['By Type'], null, 2));
