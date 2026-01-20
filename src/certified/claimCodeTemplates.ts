/**
 * Code Templates for Claim Visualization
 * 
 * These templates generate deterministic visualizations for different claim types.
 * All templates:
 * - Never call createCanvas() (canvas is 1950x2400, provided by runtime)
 * - Use only random() and noise() for randomness (seeded by snapshot.seed)
 * - Never rely on SEED global
 * - Are fully deterministic under NexArt Canonical Renderer
 */

export type ClaimPreset = 'generic' | 'sports' | 'financial' | 'custom';

/**
 * Generic visualization template
 * Displays claim metadata with an abstract pattern
 */
export function generateGenericTemplate(): string {
  return `
// NexArt Code Mode - Claim Visualization (Generic)
// Protocol: nexart v1.2.0
// Canvas: 1950x2400 (provided by runtime - do NOT call createCanvas)

function setup() {
  background(15, 15, 20);
  noLoop();
}

function draw() {
  // Parse VAR parameters for visual variation
  const patternDensity = floor(map(VAR[0], 0, 100, 20, 100));
  const hue1 = map(VAR[1], 0, 100, 0, 360);
  const hue2 = map(VAR[2], 0, 100, 0, 360);
  const lineWeight = map(VAR[3], 0, 100, 1, 4);
  const complexity = map(VAR[4], 0, 100, 3, 12);
  const opacity = map(VAR[5], 0, 100, 40, 120);
  const gridSize = floor(map(VAR[6], 0, 100, 40, 120));
  const curve = map(VAR[7], 0, 100, 0.2, 0.8);
  const rotation = map(VAR[8], 0, 100, 0, PI / 4);
  const scale = map(VAR[9], 0, 100, 0.8, 1.2);

  // Main panel background
  fill(22, 22, 28);
  noStroke();
  rect(60, 60, width - 120, height - 120, 8);

  // Header bar
  fill(35, 35, 45);
  rect(60, 60, width - 120, 120, 8, 8, 0, 0);

  // Title
  fill(255);
  textSize(36);
  textFont('monospace');
  textAlign(LEFT, CENTER);
  text('SEALED CLAIM', 100, 120);

  // Verified badge
  fill(80, 200, 120);
  textSize(14);
  text('● SEALED', width - 200, 120);

  // Abstract pattern area
  push();
  translate(width / 2, 600);
  rotate(rotation);
  scale(scale);

  strokeWeight(lineWeight);
  noFill();

  // Draw concentric pattern
  for (let i = 0; i < patternDensity; i++) {
    const r = random();
    const angle = i * (TWO_PI / patternDensity);
    const radius = 150 + i * 3;
    
    // Blend between two hues based on random
    colorMode(HSB, 360, 100, 100, 255);
    const h = lerp(hue1, hue2, r);
    stroke(h, 60, 80, opacity);
    
    // Draw curved lines
    beginShape();
    for (let j = 0; j < complexity; j++) {
      const a = angle + j * (TWO_PI / complexity);
      const rad = radius + sin(a * 3 + i * curve) * 50 * random();
      const x = cos(a) * rad;
      const y = sin(a) * rad;
      curveVertex(x, y);
    }
    endShape();
  }
  pop();
  colorMode(RGB, 255);

  // Grid pattern overlay
  stroke(40, 40, 50, 100);
  strokeWeight(0.5);
  for (let x = 100; x < width - 100; x += gridSize) {
    line(x, 200, x, height - 200);
  }
  for (let y = 200; y < height - 200; y += gridSize) {
    line(100, y, width - 100, y);
  }

  // Info panel at bottom
  fill(28, 28, 35);
  noStroke();
  rect(100, height - 400, width - 200, 280, 8);

  fill(120, 120, 140);
  textSize(12);
  textAlign(LEFT);
  text('CLAIM DETAILS', 140, height - 360);

  stroke(50, 50, 60);
  line(140, height - 340, width - 140, height - 340);

  fill(180, 180, 200);
  textSize(14);
  text('This claim has been sealed using the NexArt Canonical Renderer.', 140, height - 300);
  text('The visual pattern above is deterministically generated from the claim inputs.', 140, height - 270);
  text('Any modification to inputs will produce a different pattern and hash.', 140, height - 240);

  fill(80, 200, 120);
  textSize(11);
  text('Verification: Re-execute with same inputs to verify hash match.', 140, height - 180);

  // Footer
  fill(60, 60, 70);
  textSize(10);
  textAlign(LEFT);
  text('Protocol: NexArt v1.2.0', 100, height - 80);
  text('Deterministic: Yes', 350, height - 80);
  text('Canvas: 1950×2400', 550, height - 80);
}
`.trim();
}

/**
 * Sports result visualization template
 */
export function generateSportsTemplate(): string {
  return `
// NexArt Code Mode - Claim Visualization (Sports Result)
// Protocol: nexart v1.2.0
// Canvas: 1950x2400 (provided by runtime - do NOT call createCanvas)

function setup() {
  background(15, 15, 20);
  noLoop();
}

function draw() {
  // VAR interpretation for sports
  const score1 = floor(map(VAR[0], 0, 100, 0, 10));
  const score2 = floor(map(VAR[1], 0, 100, 0, 10));
  const eventType = floor(map(VAR[2], 0, 100, 0, 4)); // 0-3 different layouts
  const teamHue1 = map(VAR[3], 0, 100, 0, 360);
  const teamHue2 = map(VAR[4], 0, 100, 0, 360);
  const intensity = map(VAR[5], 0, 100, 0.5, 1.5);
  const patternVar = VAR[6];
  const detailLevel = floor(map(VAR[7], 0, 100, 10, 50));
  const glowAmount = map(VAR[8], 0, 100, 0, 30);
  const accentOffset = map(VAR[9], 0, 100, 0, 60);

  // Main panel
  fill(22, 22, 28);
  noStroke();
  rect(60, 60, width - 120, height - 120, 12);

  // Header
  fill(35, 35, 45);
  rect(60, 60, width - 120, 140, 12, 12, 0, 0);

  fill(255);
  textSize(32);
  textFont('monospace');
  textAlign(LEFT, CENTER);
  text('SPORTS RESULT', 100, 130);

  fill(80, 200, 120);
  textSize(14);
  text('● SEALED', width - 200, 130);

  // Score display area
  const centerY = 450;
  
  // Team 1 color bar
  colorMode(HSB, 360, 100, 100);
  fill(teamHue1, 70, 70);
  noStroke();
  rect(200, centerY - 100, 400, 200, 8);
  
  // Team 2 color bar
  fill(teamHue2, 70, 70);
  rect(width - 600, centerY - 100, 400, 200, 8);
  colorMode(RGB, 255);

  // Score numbers
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(120);
  text(score1.toString(), 400, centerY);
  text(score2.toString(), width - 400, centerY);

  // VS divider
  fill(60, 60, 70);
  textSize(36);
  text('VS', width / 2, centerY);

  // Decorative elements based on outcome
  const winner = score1 > score2 ? 1 : (score2 > score1 ? 2 : 0);
  
  if (winner > 0) {
    stroke(80, 200, 120);
    strokeWeight(3);
    noFill();
    const winX = winner === 1 ? 400 : width - 400;
    ellipse(winX, centerY, 300, 300);
  }

  // Pattern grid below scores
  const patternY = 700;
  stroke(40, 40, 50);
  strokeWeight(1);
  
  for (let i = 0; i < detailLevel; i++) {
    const x = 150 + (i / detailLevel) * (width - 300);
    const h = 50 + random() * 100 * intensity;
    line(x, patternY, x, patternY + h);
  }

  // Footer panel
  fill(28, 28, 35);
  noStroke();
  rect(100, height - 350, width - 200, 230, 8);

  fill(120, 120, 140);
  textSize(12);
  textAlign(LEFT);
  text('EVENT VERIFICATION', 140, height - 310);

  stroke(50, 50, 60);
  line(140, height - 290, width - 140, height - 290);

  fill(180, 180, 200);
  textSize(14);
  text('This sports result has been sealed with cryptographic verification.', 140, height - 250);
  text('The score and event data are embedded in the visual hash.', 140, height - 220);

  // Footer
  fill(60, 60, 70);
  textSize(10);
  textAlign(LEFT);
  text('Protocol: NexArt v1.2.0', 100, height - 80);
  text('Type: Sports Result', 350, height - 80);
}
`.trim();
}

/**
 * Financial result visualization template
 */
export function generateFinancialTemplate(): string {
  return `
// NexArt Code Mode - Claim Visualization (Financial)
// Protocol: nexart v1.2.0
// Canvas: 1950x2400 (provided by runtime - do NOT call createCanvas)

function setup() {
  background(15, 15, 20);
  noLoop();
}

function draw() {
  // VAR interpretation for financial data
  const returnPct = map(VAR[0], 0, 100, -50, 100);
  const volatility = map(VAR[1], 0, 100, 5, 80);
  const trendStrength = map(VAR[2], 0, 100, 0.2, 0.9);
  const dataPoints = floor(map(VAR[3], 0, 100, 30, 200));
  const chartType = floor(map(VAR[4], 0, 100, 0, 3));
  const accentHue = map(VAR[5], 0, 100, 100, 180);
  const gridDensity = floor(map(VAR[6], 0, 100, 4, 12));
  const smoothing = map(VAR[7], 0, 100, 0.1, 0.9);
  const barWidth = map(VAR[8], 0, 100, 2, 8);
  const baseline = map(VAR[9], 0, 100, 0.3, 0.7);

  // Main panel
  fill(22, 22, 28);
  noStroke();
  rect(60, 60, width - 120, height - 120, 12);

  // Header
  fill(35, 35, 45);
  rect(60, 60, width - 120, 140, 12, 12, 0, 0);

  fill(255);
  textSize(32);
  textFont('monospace');
  textAlign(LEFT, CENTER);
  text('FINANCIAL RESULT', 100, 130);

  fill(80, 200, 120);
  textSize(14);
  text('● SEALED', width - 200, 130);

  // Chart area
  const chartX = 150;
  const chartY = 280;
  const chartW = width - 300;
  const chartH = 400;

  // Chart background
  fill(28, 28, 35);
  rect(chartX, chartY, chartW, chartH, 4);

  // Grid lines
  stroke(40, 40, 50);
  strokeWeight(1);
  for (let i = 0; i <= gridDensity; i++) {
    const y = chartY + (chartH / gridDensity) * i;
    line(chartX, y, chartX + chartW, y);
    
    const x = chartX + (chartW / gridDensity) * i;
    line(x, chartY, x, chartY + chartH);
  }

  // Generate data curve
  const points = [];
  let value = chartH * baseline;
  
  for (let i = 0; i < dataPoints; i++) {
    const trend = (trendStrength - 0.5) * 2;
    const noise = (random() - 0.5) * volatility * 0.1;
    value = value + trend * 0.5 + noise;
    value = constrain(value, 20, chartH - 20);
    points.push(value);
  }

  // Apply smoothing
  const smoothed = [];
  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      smoothed.push(points[i]);
    } else {
      smoothed.push(lerp(smoothed[i-1], points[i], 1 - smoothing));
    }
  }

  // Draw area fill
  colorMode(HSB, 360, 100, 100, 255);
  const isPositive = returnPct >= 0;
  fill(isPositive ? 140 : 0, 60, 50, 60);
  noStroke();
  
  beginShape();
  vertex(chartX, chartY + chartH);
  for (let i = 0; i < smoothed.length; i++) {
    const x = chartX + (i / (smoothed.length - 1)) * chartW;
    const y = chartY + chartH - smoothed[i];
    vertex(x, y);
  }
  vertex(chartX + chartW, chartY + chartH);
  endShape(CLOSE);

  // Draw line
  stroke(isPositive ? 140 : 0, 70, 80);
  strokeWeight(2);
  noFill();
  beginShape();
  for (let i = 0; i < smoothed.length; i++) {
    const x = chartX + (i / (smoothed.length - 1)) * chartW;
    const y = chartY + chartH - smoothed[i];
    vertex(x, y);
  }
  endShape();
  colorMode(RGB, 255);

  // Return display
  const returnColor = returnPct >= 0 ? color(80, 200, 120) : color(200, 80, 80);
  fill(returnColor);
  textSize(64);
  textAlign(CENTER, CENTER);
  text((returnPct >= 0 ? '+' : '') + returnPct.toFixed(1) + '%', width / 2, 780);

  fill(120, 120, 140);
  textSize(14);
  text('RETURN', width / 2, 840);

  // Metrics row
  fill(28, 28, 35);
  noStroke();
  rect(150, 900, width - 300, 80, 4);

  fill(180);
  textSize(12);
  textAlign(CENTER);
  text('Volatility: ' + volatility.toFixed(1) + '%', 350, 945);
  text('Data Points: ' + dataPoints, width / 2, 945);
  text('Trend: ' + (trendStrength > 0.5 ? 'Bullish' : 'Bearish'), width - 350, 945);

  // Footer
  fill(60, 60, 70);
  textSize(10);
  textAlign(LEFT);
  text('Protocol: NexArt v1.2.0', 100, height - 80);
  text('Type: Financial Result', 350, height - 80);
}
`.trim();
}

/**
 * Get the code template for a given preset
 */
export function getCodeTemplate(preset: ClaimPreset): string {
  switch (preset) {
    case 'sports':
      return generateSportsTemplate();
    case 'financial':
      return generateFinancialTemplate();
    case 'generic':
    case 'custom':
    default:
      return generateGenericTemplate();
  }
}

/**
 * Get preset description
 */
export function getPresetDescription(preset: ClaimPreset): string {
  switch (preset) {
    case 'sports':
      return 'Optimized for sports scores and event outcomes';
    case 'financial':
      return 'Optimized for financial returns and market data';
    case 'custom':
      return 'Manual code entry (advanced users)';
    case 'generic':
    default:
      return 'Abstract pattern suitable for any claim type';
  }
}
