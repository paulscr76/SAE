((root, factory) => {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  if (root) root.EnergyModelV6 = model;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  const BENCHMARKS = {
    'england-wales': {
      label: 'England and Wales',
      year: 2024,
      electricity: {lower:1600, median:2500, upper:4100},
      gas: {lower:6500, median:10000, upper:14400}
    },
    scotland: {
      label: 'Scotland',
      year: 2024,
      electricity: {lower:1500, median:2400, upper:3900},
      gas: {lower:6900, median:10600, upper:15200}
    }
  };

  const baseE = {1:1700,2:2150,3:2500,4:3200,5:3900,6:4600};
  const baseG = {1:6200,2:7800,3:9500,4:12200,5:15000,6:17800};
  const propertyFactor = {flat:.78,terrace:.92,semi:1,detached:1.18,bungalow:1.08};
  const efficiencyFactor = {efficient:.82,average:1,inefficient:1.22};
  const occupancyFactor = {low:.94,mixed:1,high:1.1};

  function householdEstimate(state = {}) {
    const beds = Math.max(1, +state.bedrooms || 3);
    const people = Math.max(1, +state.occupants || 3);
    let electricity = baseE[beds] || 5200;
    electricity += Math.max(0, people - beds) * 320;
    electricity *= propertyFactor[state.property] || 1;
    electricity *= occupancyFactor[state.daytime] || 1;
    if (state.ev === 'yes') electricity += 2200;
    if (state.solar === 'yes') electricity *= .78;
    if (state.heating === 'electric') electricity += 6500;
    if (state.heating === 'heatpump') electricity += 2800;

    let gas = 0;
    if (state.heating === 'gas') {
      gas = (baseG[beds] || 20000) + Math.max(0, people - beds) * 400;
      gas *= propertyFactor[state.property] || 1;
      gas *= efficiencyFactor[state.efficiency] || 1;
      gas = Math.max(3000, gas);
    }
    return {
      e: Math.max(1000, electricity),
      g: Math.max(0, gas),
      modelState: {...state, bedrooms:beds, occupants:people}
    };
  }

  function gasUnitsToKwh(units, unit = 'metric', calorificValue = 39.2) {
    const amount = +units;
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    if (unit === 'kwh') return amount;
    const cv = Math.min(43, Math.max(37.5, +calorificValue || 39.2));
    const cubicMetres = unit === 'imperial' ? amount * 2.83 : amount;
    return cubicMetres * 1.02264 * cv / 3.6;
  }

  function annualiseReadings({
    days,
    electricityStart = 0,
    electricityEnd = 0,
    gasStart = 0,
    gasEnd = 0,
    gasUnit = 'metric',
    calorificValue = 39.2
  } = {}) {
    const periodDays = +days;
    if (!Number.isFinite(periodDays) || periodDays < 1) return {e:0,g:0,days:0};
    const electricUnits = Math.max(0, (+electricityEnd || 0) - (+electricityStart || 0));
    const gasUnits = Math.max(0, (+gasEnd || 0) - (+gasStart || 0));
    return {
      e: electricUnits ? (electricUnits / periodDays) * 365 : 0,
      g: gasUnits ? (gasUnitsToKwh(gasUnits, gasUnit, calorificValue) / periodDays) * 365 : 0,
      days: periodDays
    };
  }

  function benchmarkPosition(value, benchmark) {
    const amount = +value;
    if (!amount || !benchmark) return {label:'Not supplied', className:'none', percent:0};
    let label = 'Within the national middle range';
    let className = 'typical';
    if (amount < benchmark.lower) {label = 'Below the national lower quartile'; className = 'low';}
    else if (amount > benchmark.upper) {label = 'Above the national upper quartile'; className = 'high';}
    else if (amount < benchmark.median) {label = 'Below the national median'; className = 'low-mid';}
    else if (amount > benchmark.median) {label = 'Above the national median'; className = 'high-mid';}
    const max = benchmark.upper * 1.6;
    return {label, className, percent:Math.max(2,Math.min(98,(amount/max)*100))};
  }

  return {BENCHMARKS, householdEstimate, gasUnitsToKwh, annualiseReadings, benchmarkPosition};
});
