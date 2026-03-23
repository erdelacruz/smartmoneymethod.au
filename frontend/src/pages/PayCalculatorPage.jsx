// ============================================================
// PayCalculatorPage.jsx — Australian Pay Calculator
//
// Features:
//   - Gross income input (annual, monthly, fortnightly, weekly, daily, hourly)
//   - Pay frequency selector
//   - Hours per week (for hourly rate calc)
//   - Residency status (resident / non-resident / working holiday)
//   - Tax-free threshold toggle
//   - Medicare levy (with low-income reduction)
//   - HECS/HELP debt repayment
//   - Super contributions (employer 11.5% SGC)
//   - Results: income tax, medicare, HECS, super, net pay
//   - All figures shown across annual / monthly / fortnightly / weekly
// ============================================================

import React, { useState, useMemo } from 'react';

// ---------------------------------------------------------------------------
// 2024–25 ATO individual income tax brackets (resident)
// ---------------------------------------------------------------------------
const RESIDENT_BRACKETS = [
  { min: 0,       max: 18_200,  base: 0,      rate: 0      },
  { min: 18_201,  max: 45_000,  base: 0,      rate: 0.19   },
  { min: 45_001,  max: 120_000, base: 5_092,  rate: 0.325  },
  { min: 120_001, max: 180_000, base: 29_467, rate: 0.37   },
  { min: 180_001, max: Infinity,base: 51_667, rate: 0.45   },
];

// 2024–25 non-resident brackets
const NON_RESIDENT_BRACKETS = [
  { min: 0,       max: 120_000, base: 0,      rate: 0.325  },
  { min: 120_001, max: 180_000, base: 39_000, rate: 0.37   },
  { min: 180_001, max: Infinity,base: 61_200, rate: 0.45   },
];

// Working holiday maker — first $45k at 15%, then resident rates above
const WHM_BRACKETS = [
  { min: 0,       max: 45_000,  base: 0,      rate: 0.15   },
  { min: 45_001,  max: 120_000, base: 6_750,  rate: 0.325  },
  { min: 120_001, max: 180_000, base: 31_125, rate: 0.37   },
  { min: 180_001, max: Infinity,base: 53_325, rate: 0.45   },
];

// Low Income Tax Offset (LITO) — resident only
function calcLITO(income) {
  if (income <= 37_500) return 700;
  if (income <= 45_000) return 700 - (income - 37_500) * 0.05;
  if (income <= 66_667) return 325 - (income - 45_000) * 0.015;
  return 0;
}

// Low and Middle Income Tax Offset (LMITO) removed from 2022-23 onwards
// Low Income Medicare Levy reduction threshold 2024-25
const MEDICARE_RATE = 0.02;
const MEDICARE_SHADE_IN_LOWER = 26_000;   // below this → no levy
const MEDICARE_SHADE_IN_UPPER = 32_500;   // above this → full 2%

// HECS/HELP repayment thresholds 2024-25
const HECS_THRESHOLDS = [
  { min: 0,        max: 54_435,  rate: 0      },
  { min: 54_435,   max: 62_739,  rate: 0.01   },
  { min: 62_739,   max: 66_529,  rate: 0.02   },
  { min: 66_529,   max: 70_539,  rate: 0.025  },
  { min: 70_539,   max: 74_980,  rate: 0.03   },
  { min: 74_980,   max: 79_614,  rate: 0.035  },
  { min: 79_614,   max: 84_627,  rate: 0.04   },
  { min: 84_627,   max: 89_680,  rate: 0.045  },
  { min: 89_680,   max: 95_062,  rate: 0.05   },
  { min: 95_062,   max: 100_877, rate: 0.055  },
  { min: 100_877,  max: 107_133, rate: 0.06   },
  { min: 107_133,  max: 113_760, rate: 0.065  },
  { min: 113_760,  max: 120_783, rate: 0.07   },
  { min: 120_783,  max: 128_226, rate: 0.075  },
  { min: 128_226,  max: 136_097, rate: 0.08   },
  { min: 136_097,  max: 144_493, rate: 0.085  },
  { min: 144_493,  max: 153_421, rate: 0.09   },
  { min: 153_421,  max: 162_981, rate: 0.095  },
  { min: 162_981,  max: Infinity,rate: 0.10   },
];

function calcTax(income, brackets) {
  for (const b of [...brackets].reverse()) {
    if (income > b.min - 1) {
      return b.base + (income - (b.min - 1)) * b.rate;
    }
  }
  return 0;
}

function calcMedicare(income, resident) {
  if (!resident) return 0;
  if (income <= MEDICARE_SHADE_IN_LOWER) return 0;
  if (income <= MEDICARE_SHADE_IN_UPPER) {
    // shade-in: 10 cents for every dollar over lower threshold
    return (income - MEDICARE_SHADE_IN_LOWER) * 0.1;
  }
  return income * MEDICARE_RATE;
}

function calcHECS(income) {
  for (const t of [...HECS_THRESHOLDS].reverse()) {
    if (income >= t.min) return income * t.rate;
  }
  return 0;
}

const SUPER_RATE = 0.115; // 11.5% SGC 2024-25

const FREQUENCIES = [
  { id: 'annual',      label: 'Annual',      perYear: 1       },
  { id: 'monthly',     label: 'Monthly',     perYear: 12      },
  { id: 'fortnightly', label: 'Fortnightly', perYear: 26      },
  { id: 'weekly',      label: 'Weekly',      perYear: 52      },
  { id: 'daily',       label: 'Daily',       perYear: 260     },
  { id: 'hourly',      label: 'Hourly',      perYear: null    }, // depends on hours
];

function fmt(n) {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ResultRow({ label, annual, color, bold }) {
  return (
    <div className={`pay-result-row${bold ? ' bold' : ''}`} style={color ? { color } : {}}>
      <span className="pay-result-label">{label}</span>
      <span className="pay-result-val">${fmt(annual)}</span>
      <span className="pay-result-val">${fmt(annual / 12)}</span>
      <span className="pay-result-val">${fmt(annual / 26)}</span>
      <span className="pay-result-val">${fmt(annual / 52)}</span>
    </div>
  );
}

export default function PayCalculatorPage() {
  const [grossInput, setGrossInput]     = useState('80000');
  const [frequency, setFrequency]       = useState('annual');
  const [hoursPerWeek, setHoursPerWeek] = useState('38');
  const [residency, setResidency]       = useState('resident');
  const [taxFreeThreshold, setTaxFreeThreshold] = useState(true);
  const [includeHECS, setIncludeHECS]   = useState(false);
  const [superInclusive, setSuperInclusive] = useState(false); // salary package or on-top

  const results = useMemo(() => {
    const raw = parseFloat(grossInput.replace(/,/g, '')) || 0;
    if (raw <= 0) return null;

    // Convert input to annual gross
    const freq = FREQUENCIES.find(f => f.id === frequency);
    const hours = parseFloat(hoursPerWeek) || 38;
    const perYear = freq.perYear ?? (hours * 52);
    const annualGross = raw * perYear;

    // Super
    let annualSalary = annualGross;
    let superAmount = 0;
    if (superInclusive) {
      // salary packages super — gross already includes super
      annualSalary = annualGross / (1 + SUPER_RATE);
      superAmount  = annualGross - annualSalary;
    } else {
      superAmount  = annualGross * SUPER_RATE;
    }

    // Income tax
    let brackets = RESIDENT_BRACKETS;
    if (residency === 'non-resident') brackets = NON_RESIDENT_BRACKETS;
    if (residency === 'whm') brackets = WHM_BRACKETS;

    let tax = calcTax(annualSalary, brackets);

    // LITO (resident only, tax-free threshold applies)
    if (residency === 'resident' && taxFreeThreshold) {
      const lito = calcLITO(annualSalary);
      tax = Math.max(0, tax - lito);
    }

    // Medicare
    const medicare = calcMedicare(annualSalary, residency === 'resident');

    // HECS
    const hecs = includeHECS ? calcHECS(annualSalary) : 0;

    const totalDeductions = tax + medicare + hecs;
    const netIncome = annualSalary - totalDeductions;

    return { annualGross, annualSalary, tax, medicare, hecs, superAmount, netIncome, totalDeductions };
  }, [grossInput, frequency, hoursPerWeek, residency, taxFreeThreshold, includeHECS, superInclusive]);

  const activeTaxRate = results
    ? ((results.tax / results.annualSalary) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="pay-page">
      {/* Header */}
      <div className="pay-header">
        <div className="section-eyebrow">Financial Tools</div>
        <h1 className="pay-title">Australian Pay Calculator</h1>
        <p className="pay-subtitle">Calculate your take-home pay after income tax, Medicare levy, HECS/HELP and super — based on 2024–25 ATO rates.</p>
      </div>

      <div className="pay-body">
        {/* ── INPUTS ── */}
        <div className="pay-inputs">
          <h2 className="pay-section-heading">Your Income</h2>

          {/* Gross income */}
          <div className="pay-field">
            <label className="pay-label">Gross Income</label>
            <div className="pay-input-row">
              <span className="pay-prefix">$</span>
              <input
                className="pay-input"
                type="number"
                min="0"
                value={grossInput}
                onChange={e => setGrossInput(e.target.value)}
                placeholder="e.g. 80000"
              />
            </div>
          </div>

          {/* Frequency */}
          <div className="pay-field">
            <label className="pay-label">Pay Frequency</label>
            <div className="pay-freq-grid">
              {FREQUENCIES.map(f => (
                <button
                  key={f.id}
                  className={`pay-freq-btn${frequency === f.id ? ' active' : ''}`}
                  onClick={() => setFrequency(f.id)}
                >{f.label}</button>
              ))}
            </div>
          </div>

          {/* Hours per week — only relevant for hourly */}
          {frequency === 'hourly' && (
            <div className="pay-field">
              <label className="pay-label">Hours per Week</label>
              <div className="pay-input-row">
                <input
                  className="pay-input"
                  type="number"
                  min="1"
                  max="168"
                  value={hoursPerWeek}
                  onChange={e => setHoursPerWeek(e.target.value)}
                />
                <span className="pay-suffix">hrs</span>
              </div>
            </div>
          )}

          <h2 className="pay-section-heading" style={{marginTop:28}}>Tax Settings</h2>

          {/* Residency */}
          <div className="pay-field">
            <label className="pay-label">Residency Status</label>
            <div className="pay-select-group">
              {[
                { id:'resident',     label:'Australian Resident' },
                { id:'non-resident', label:'Non-Resident' },
                { id:'whm',          label:'Working Holiday' },
              ].map(r => (
                <button
                  key={r.id}
                  className={`pay-select-btn${residency === r.id ? ' active' : ''}`}
                  onClick={() => setResidency(r.id)}
                >{r.label}</button>
              ))}
            </div>
          </div>

          {/* Tax-free threshold */}
          {residency === 'resident' && (
            <div className="pay-toggle-row">
              <div>
                <div className="pay-toggle-label">Claim Tax-Free Threshold</div>
                <div className="pay-toggle-sub">First $18,200 is tax-free for residents</div>
              </div>
              <button
                className={`pay-toggle${taxFreeThreshold ? ' on' : ''}`}
                onClick={() => setTaxFreeThreshold(v => !v)}
              >
                <span className="pay-toggle-knob" />
              </button>
            </div>
          )}

          {/* HECS */}
          <div className="pay-toggle-row">
            <div>
              <div className="pay-toggle-label">HECS / HELP Debt</div>
              <div className="pay-toggle-sub">Compulsory repayment via ATO</div>
            </div>
            <button
              className={`pay-toggle${includeHECS ? ' on' : ''}`}
              onClick={() => setIncludeHECS(v => !v)}
            >
              <span className="pay-toggle-knob" />
            </button>
          </div>

          {/* Super */}
          <div className="pay-toggle-row">
            <div>
              <div className="pay-toggle-label">Super Inclusive (Salary Package)</div>
              <div className="pay-toggle-sub">Off = super is paid on top of your gross; On = super is included in your gross</div>
            </div>
            <button
              className={`pay-toggle${superInclusive ? ' on' : ''}`}
              onClick={() => setSuperInclusive(v => !v)}
            >
              <span className="pay-toggle-knob" />
            </button>
          </div>

          {/* Disclaimer */}
          <p className="pay-disclaimer">
            Estimates based on 2024–25 ATO rates. Does not include state taxes, salary sacrifice, private health rebate, or other offsets. For personal advice speak to a registered tax agent.
          </p>
        </div>

        {/* ── RESULTS ── */}
        <div className="pay-results">
          {results ? (
            <>
              {/* Summary cards */}
              <div className="pay-summary-cards">
                <div className="pay-summary-card highlight">
                  <div className="pay-summary-top">Annual Take-Home</div>
                  <div className="pay-summary-amount">${fmt(results.netIncome)}</div>
                  <div className="pay-summary-sub">${fmt(results.netIncome / 12)} / month</div>
                </div>
                <div className="pay-summary-card">
                  <div className="pay-summary-top">Effective Tax Rate</div>
                  <div className="pay-summary-amount">{activeTaxRate}%</div>
                  <div className="pay-summary-sub">Income tax only</div>
                </div>
                <div className="pay-summary-card">
                  <div className="pay-summary-top">Total Tax &amp; Levies</div>
                  <div className="pay-summary-amount">${fmt(results.totalDeductions)}</div>
                  <div className="pay-summary-sub">Tax + Medicare{results.hecs > 0 ? ' + HECS' : ''}</div>
                </div>
              </div>

              {/* Breakdown table */}
              <div className="pay-breakdown">
                <div className="pay-breakdown-header">
                  <span>Breakdown</span>
                  <span>Annual</span>
                  <span>Monthly</span>
                  <span>Fortnightly</span>
                  <span>Weekly</span>
                </div>

                <ResultRow label="Gross Income"     annual={results.annualSalary} bold />
                <div className="pay-divider" />
                <ResultRow label="Income Tax"       annual={-results.tax}      color="var(--danger)" />
                <ResultRow label="Medicare Levy"    annual={-results.medicare} color="var(--danger)" />
                {results.hecs > 0 && (
                  <ResultRow label="HECS / HELP"    annual={-results.hecs}     color="var(--danger)" />
                )}
                <div className="pay-divider" />
                <ResultRow label="Net Income"       annual={results.netIncome}  color="var(--success)" bold />
                <div className="pay-divider" />
                <ResultRow label={`Super (${(SUPER_RATE*100).toFixed(1)}% SGC)`} annual={results.superAmount} color="var(--primary)" />
              </div>

              {/* Tax breakdown bar */}
              <div className="pay-bar-wrap">
                <div className="pay-bar-label-row">
                  <span>Income breakdown</span>
                </div>
                <div className="pay-bar">
                  {(() => {
                    const total = results.annualSalary;
                    const netPct     = (results.netIncome / total * 100).toFixed(1);
                    const taxPct     = (results.tax / total * 100).toFixed(1);
                    const medPct     = (results.medicare / total * 100).toFixed(1);
                    const hecsPct    = (results.hecs / total * 100).toFixed(1);
                    return (
                      <>
                        <div className="pay-bar-seg net"      style={{width:`${netPct}%`}}  title={`Take-home ${netPct}%`} />
                        <div className="pay-bar-seg tax"      style={{width:`${taxPct}%`}}  title={`Income Tax ${taxPct}%`} />
                        <div className="pay-bar-seg medicare" style={{width:`${medPct}%`}}  title={`Medicare ${medPct}%`} />
                        {results.hecs > 0 && (
                          <div className="pay-bar-seg hecs"   style={{width:`${hecsPct}%`}} title={`HECS ${hecsPct}%`} />
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="pay-bar-legend">
                  <span><span className="pay-legend-dot net" />Take-home</span>
                  <span><span className="pay-legend-dot tax" />Income Tax</span>
                  <span><span className="pay-legend-dot medicare" />Medicare</span>
                  {results.hecs > 0 && <span><span className="pay-legend-dot hecs" />HECS</span>}
                </div>
              </div>
            </>
          ) : (
            <div className="pay-empty">Enter your income to see results.</div>
          )}
        </div>
      </div>
    </div>
  );
}
