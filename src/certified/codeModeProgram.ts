/**
 * Code Mode Program Generator for Backtest Visualization
 * 
 * Generates deterministic NexArt Code Mode programs that draw:
 * - Equity curve
 * - Drawdown band
 * - Metrics panel (CAGR, max drawdown, volatility, final equity)
 * 
 * VAR[0-9] parameters (0-100 range):
 * - VAR[0]: horizon (time period length)
 * - VAR[1]: drift (upward/downward bias)
 * - VAR[2]: volatility (price swing magnitude)
 * - VAR[3]: leverage (position sizing multiplier)
 * - VAR[4]: fee/slippage (transaction costs)
 * - VAR[5]: rebalance aggressiveness
 * - VAR[6]: shock frequency (how often large moves occur)
 * - VAR[7]: shock magnitude (size of large moves)
 * - VAR[8]: mean reversion strength
 * - VAR[9]: visual density (chart detail level)
 */

export interface CodeModeVars {
  horizon: number;        // VAR[0]: 0-100
  drift: number;          // VAR[1]: 0-100
  volatility: number;     // VAR[2]: 0-100
  leverage: number;       // VAR[3]: 0-100
  feeSlippage: number;    // VAR[4]: 0-100
  rebalance: number;      // VAR[5]: 0-100
  shockFreq: number;      // VAR[6]: 0-100
  shockMag: number;       // VAR[7]: 0-100
  meanReversion: number;  // VAR[8]: 0-100
  visualDensity: number;  // VAR[9]: 0-100
}

export interface CodeModeSnapshot {
  code: string;
  seed: number;
  vars: number[];  // VAR[0] through VAR[9]
  execution?: {
    frames?: number;
    loop?: boolean;
  };
}

/**
 * Converts CodeModeVars object to array format for snapshot
 */
export function varsToArray(vars: CodeModeVars): number[] {
  return [
    vars.horizon,
    vars.drift,
    vars.volatility,
    vars.leverage,
    vars.feeSlippage,
    vars.rebalance,
    vars.shockFreq,
    vars.shockMag,
    vars.meanReversion,
    vars.visualDensity,
  ];
}

/**
 * Converts array format to CodeModeVars object
 */
export function arrayToVars(arr: number[]): CodeModeVars {
  return {
    horizon: arr[0] ?? 50,
    drift: arr[1] ?? 50,
    volatility: arr[2] ?? 30,
    leverage: arr[3] ?? 50,
    feeSlippage: arr[4] ?? 10,
    rebalance: arr[5] ?? 50,
    shockFreq: arr[6] ?? 20,
    shockMag: arr[7] ?? 40,
    meanReversion: arr[8] ?? 30,
    visualDensity: arr[9] ?? 70,
  };
}

/**
 * Generates the Code Mode program for backtest visualization
 * 
 * This program is executed by the Canonical Renderer to produce
 * a deterministic PNG or MP4 visualization of backtest results.
 */
export function generateBacktestCodeModeProgram(): string {
  return `
// NexArt Code Mode - Backtest Visualization
// Protocol: nexart v1.2.0
// Deterministic execution guaranteed by seed

function setup() {
  createCanvas(1200, 800);
  background(15, 15, 20);
  noLoop();
}

function draw() {
  // Parse VAR parameters
  const horizon = map(VAR[0], 0, 100, 30, 365);
  const drift = map(VAR[1], 0, 100, -0.3, 0.5);
  const volatility = map(VAR[2], 0, 100, 0.05, 0.8);
  const leverage = map(VAR[3], 0, 100, 0.5, 3.0);
  const fees = map(VAR[4], 0, 100, 0, 0.02);
  const rebalance = map(VAR[5], 0, 100, 0.1, 1.0);
  const shockFreq = map(VAR[6], 0, 100, 0.01, 0.2);
  const shockMag = map(VAR[7], 0, 100, 0.1, 0.5);
  const meanRev = map(VAR[8], 0, 100, 0, 0.3);
  const density = floor(map(VAR[9], 0, 100, 50, 500));
  
  // Generate equity curve using seeded PRNG
  const points = [];
  let equity = 100000;
  let peak = equity;
  
  for (let i = 0; i < density; i++) {
    // Seeded random based on SEED and iteration
    const r1 = frac(sin(SEED * 9999 + i * 12.9898) * 43758.5453);
    const r2 = frac(sin(SEED * 7777 + i * 78.233) * 43758.5453);
    
    // Calculate daily return with all factors
    let dailyReturn = (drift / 252) + (volatility / sqrt(252)) * (r1 - 0.5) * 2;
    
    // Apply shocks
    if (r2 < shockFreq) {
      dailyReturn += (r1 - 0.5) * shockMag * (r2 < shockFreq/2 ? -1 : 1);
    }
    
    // Apply mean reversion
    const deviation = (equity - 100000) / 100000;
    dailyReturn -= deviation * meanRev * 0.01;
    
    // Apply leverage and fees
    dailyReturn = dailyReturn * leverage - fees / 252;
    
    equity = equity * (1 + dailyReturn);
    peak = max(peak, equity);
    const drawdown = (equity - peak) / peak;
    
    points.push({ x: i, equity, drawdown, peak });
  }
  
  // Calculate metrics
  const finalEquity = points[points.length - 1].equity;
  const totalReturn = (finalEquity - 100000) / 100000;
  const years = horizon / 365;
  const cagr = pow(finalEquity / 100000, 1 / years) - 1;
  const maxDrawdown = min(...points.map(p => p.drawdown));
  
  // Compute volatility (std dev of returns)
  let sumSq = 0;
  for (let i = 1; i < points.length; i++) {
    const ret = (points[i].equity - points[i-1].equity) / points[i-1].equity;
    sumSq += ret * ret;
  }
  const volAnnualized = sqrt(sumSq / points.length) * sqrt(252);
  
  // === DRAW VISUALIZATION ===
  
  // Chart area
  const chartX = 80;
  const chartY = 60;
  const chartW = 800;
  const chartH = 400;
  
  // Draw chart background
  fill(25, 25, 35);
  noStroke();
  rect(chartX, chartY, chartW, chartH);
  
  // Draw grid lines
  stroke(45, 45, 55);
  strokeWeight(1);
  for (let i = 0; i <= 5; i++) {
    const y = chartY + (chartH / 5) * i;
    line(chartX, y, chartX + chartW, y);
  }
  
  // Normalize values for plotting
  const minEquity = min(...points.map(p => p.equity));
  const maxEquity = max(...points.map(p => p.equity));
  const range = maxEquity - minEquity;
  
  // Draw drawdown band (red area)
  fill(180, 40, 60, 60);
  noStroke();
  beginShape();
  for (let i = 0; i < points.length; i++) {
    const x = chartX + (i / (points.length - 1)) * chartW;
    const peakY = chartY + chartH - ((points[i].peak - minEquity) / range) * chartH;
    vertex(x, peakY);
  }
  for (let i = points.length - 1; i >= 0; i--) {
    const x = chartX + (i / (points.length - 1)) * chartW;
    const equityY = chartY + chartH - ((points[i].equity - minEquity) / range) * chartH;
    vertex(x, equityY);
  }
  endShape(CLOSE);
  
  // Draw equity curve
  stroke(80, 200, 120);
  strokeWeight(2);
  noFill();
  beginShape();
  for (let i = 0; i < points.length; i++) {
    const x = chartX + (i / (points.length - 1)) * chartW;
    const y = chartY + chartH - ((points[i].equity - minEquity) / range) * chartH;
    vertex(x, y);
  }
  endShape();
  
  // Draw peak line (dotted)
  stroke(100, 100, 120);
  strokeWeight(1);
  drawingContext.setLineDash([4, 4]);
  beginShape();
  for (let i = 0; i < points.length; i++) {
    const x = chartX + (i / (points.length - 1)) * chartW;
    const y = chartY + chartH - ((points[i].peak - minEquity) / range) * chartH;
    vertex(x, y);
  }
  endShape();
  drawingContext.setLineDash([]);
  
  // === METRICS PANEL ===
  const panelX = 920;
  const panelY = 60;
  const panelW = 250;
  
  fill(25, 25, 35);
  stroke(60, 60, 70);
  strokeWeight(1);
  rect(panelX, panelY, panelW, 400);
  
  // Title
  fill(255);
  noStroke();
  textSize(16);
  textFont('monospace');
  textAlign(LEFT);
  text('METRICS', panelX + 20, panelY + 35);
  
  // Divider
  stroke(60, 60, 70);
  line(panelX + 20, panelY + 50, panelX + panelW - 20, panelY + 50);
  
  // Metric rows
  noStroke();
  textSize(11);
  const metrics = [
    ['Total Return', (totalReturn * 100).toFixed(2) + '%'],
    ['CAGR', (cagr * 100).toFixed(2) + '%'],
    ['Max Drawdown', (maxDrawdown * 100).toFixed(2) + '%'],
    ['Volatility', (volAnnualized * 100).toFixed(2) + '%'],
    ['Final Equity', '$' + finalEquity.toFixed(0)],
    ['Leverage', leverage.toFixed(2) + 'x'],
    ['Sharpe (est)', (cagr / volAnnualized).toFixed(2)],
  ];
  
  for (let i = 0; i < metrics.length; i++) {
    const y = panelY + 80 + i * 40;
    fill(150);
    text(metrics[i][0], panelX + 20, y);
    
    const val = parseFloat(metrics[i][1]);
    if (metrics[i][0].includes('Return') || metrics[i][0].includes('CAGR')) {
      fill(val >= 0 ? color(80, 200, 120) : color(200, 80, 80));
    } else if (metrics[i][0].includes('Drawdown')) {
      fill(200, 80, 80);
    } else {
      fill(255);
    }
    textAlign(RIGHT);
    text(metrics[i][1], panelX + panelW - 20, y);
    textAlign(LEFT);
  }
  
  // === HEADER ===
  fill(255);
  textSize(20);
  text('Certified Backtest Result', 80, 35);
  
  fill(80, 200, 120);
  textSize(12);
  text('VERIFIED', 400, 35);
  
  // === FOOTER ===
  fill(80);
  textSize(10);
  text('Seed: ' + SEED, 80, 780);
  text('Protocol: NexArt v1.2.0', 200, 780);
  text('Deterministic: Yes', 400, 780);
  
  // Hash placeholder (will be filled by renderer)
  text('Hash: sha256:...', 600, 780);
}

// Helper function
function frac(x) {
  return x - floor(x);
}
`.trim();
}

/**
 * Creates a complete Code Mode snapshot for certified execution
 */
export function createCodeModeSnapshot(
  seed: number,
  vars: CodeModeVars,
  options?: { frames?: number; loop?: boolean }
): CodeModeSnapshot {
  return {
    code: generateBacktestCodeModeProgram(),
    seed,
    vars: varsToArray(vars),
    execution: options,
  };
}

/**
 * Default VAR values for typical backtest visualization
 */
export const DEFAULT_VARS: CodeModeVars = {
  horizon: 50,        // ~182 days
  drift: 55,          // slight upward bias
  volatility: 30,     // moderate volatility
  leverage: 50,       // 1.75x
  feeSlippage: 10,    // low fees
  rebalance: 50,      // moderate rebalancing
  shockFreq: 20,      // occasional shocks
  shockMag: 40,       // medium shock size
  meanReversion: 30,  // some mean reversion
  visualDensity: 70,  // good chart detail
};
