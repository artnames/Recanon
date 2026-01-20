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

import type { ClaimType, SportsClaimDetails, PnlClaimDetails } from '@/types/claimBundle';

export type ClaimPreset = 'generic' | 'sports' | 'financial' | 'custom';

/**
 * Generic visualization template
 * Displays claim metadata with an abstract pattern
 */
export function generateGenericTemplate(): string {
  return `
// NexArt Code Mode - Claim Visualization (Generic Statement)
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
  const scaleVal = map(VAR[9], 0, 100, 0.8, 1.2);

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
  text('SEALED STATEMENT', 100, 120);

  // Verified badge
  fill(80, 200, 120);
  textSize(14);
  text('● SEALED', width - 200, 120);

  // Abstract pattern area
  push();
  translate(width / 2, 600);
  rotate(rotation);
  scale(scaleVal);

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
  text('Type: Generic Statement', 350, height - 80);
  text('Canvas: 1950×2400', 600, height - 80);
}
`.trim();
}

/**
 * Sports result visualization template - Scorecard style
 */
export function generateSportsTemplate(details?: SportsClaimDetails): string {
  // Use VAR values for visual styling, but embed actual data if provided
  const homeTeam = details?.homeTeam || 'HOME';
  const awayTeam = details?.awayTeam || 'AWAY';
  const homeScore = details?.homeScore ?? 0;
  const awayScore = details?.awayScore ?? 0;
  const competition = details?.competition || 'COMPETITION';
  const matchEvent = details?.matchEvent || 'EVENT';
  const venue = details?.venue || '';
  const eventDate = details?.eventDate || '';

  return `
// NexArt Code Mode - Sports Result Scorecard
// Protocol: nexart v1.2.0
// Canvas: 1950x2400 (provided by runtime - do NOT call createCanvas)

function setup() {
  background(15, 15, 20);
  noLoop();
}

function draw() {
  // Embedded claim data
  const homeTeam = "${homeTeam.replace(/"/g, '\\"')}";
  const awayTeam = "${awayTeam.replace(/"/g, '\\"')}";
  const homeScore = ${homeScore};
  const awayScore = ${awayScore};
  const competition = "${competition.replace(/"/g, '\\"')}";
  const matchEvent = "${matchEvent.replace(/"/g, '\\"')}";
  const venue = "${venue.replace(/"/g, '\\"')}";
  const eventDate = "${eventDate.replace(/"/g, '\\"')}";

  // VAR interpretation for visual styling
  const density = floor(map(VAR[0], 0, 100, 20, 80));
  const teamHue1 = map(VAR[1], 0, 100, 0, 360);
  const teamHue2 = map(VAR[2], 0, 100, 0, 360);
  const intensity = map(VAR[3], 0, 100, 0.5, 1.5);
  const confettiAmount = floor(map(VAR[4], 0, 100, 0, 200));
  const accentHue = map(VAR[5], 0, 100, 0, 360);
  const patternDetail = floor(map(VAR[6], 0, 100, 10, 50));
  const glowAmount = map(VAR[7], 0, 100, 0, 30);
  const borderWidth = map(VAR[8], 0, 100, 2, 8);
  const textureOpacity = map(VAR[9], 0, 100, 10, 60);

  // Main panel
  fill(22, 22, 28);
  noStroke();
  rect(60, 60, width - 120, height - 120, 16);

  // Header with competition name
  fill(35, 35, 45);
  rect(60, 60, width - 120, 180, 16, 16, 0, 0);

  fill(255);
  textSize(28);
  textFont('monospace');
  textAlign(CENTER, CENTER);
  text(competition.toUpperCase(), width / 2, 110);

  fill(150, 150, 170);
  textSize(18);
  text(matchEvent, width / 2, 150);

  // Sealed badge
  fill(80, 200, 120);
  textSize(12);
  textAlign(RIGHT, CENTER);
  text('● SEALED', width - 100, 120);

  // Scorecard area
  const centerY = 550;
  const cardWidth = 600;
  const cardHeight = 350;

  // Team cards with color strips
  colorMode(HSB, 360, 100, 100);
  
  // Home team card
  fill(teamHue1, 50, 25);
  noStroke();
  rect(width / 2 - cardWidth - 50, centerY - cardHeight / 2, cardWidth, cardHeight, 12);
  
  // Home team color strip
  fill(teamHue1, 70, 60);
  rect(width / 2 - cardWidth - 50, centerY - cardHeight / 2, 12, cardHeight, 12, 0, 0, 12);
  
  // Away team card
  fill(teamHue2, 50, 25);
  rect(width / 2 + 50, centerY - cardHeight / 2, cardWidth, cardHeight, 12);
  
  // Away team color strip
  fill(teamHue2, 70, 60);
  rect(width / 2 + 50 + cardWidth - 12, centerY - cardHeight / 2, 12, cardHeight, 0, 12, 12, 0);
  
  colorMode(RGB, 255);

  // Team names
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(32);
  text(homeTeam.toUpperCase(), width / 2 - cardWidth / 2 - 50, centerY - 80);
  text(awayTeam.toUpperCase(), width / 2 + cardWidth / 2 + 50, centerY - 80);

  // Scores - large
  textSize(140);
  fill(255);
  text(homeScore.toString(), width / 2 - cardWidth / 2 - 50, centerY + 40);
  text(awayScore.toString(), width / 2 + cardWidth / 2 + 50, centerY + 40);

  // VS divider
  fill(40, 40, 50);
  rect(width / 2 - 50, centerY - 60, 100, 120, 8);
  fill(100, 100, 120);
  textSize(28);
  text('VS', width / 2, centerY);

  // Winner indicator
  const winner = homeScore > awayScore ? 'home' : (awayScore > homeScore ? 'away' : 'draw');
  if (winner !== 'draw') {
    stroke(80, 200, 120);
    strokeWeight(borderWidth);
    noFill();
    const winX = winner === 'home' ? width / 2 - cardWidth / 2 - 50 : width / 2 + cardWidth / 2 + 50;
    ellipse(winX, centerY + 40, 200, 200);
    noStroke();
  }

  // Confetti effect for celebrations
  if (confettiAmount > 0) {
    colorMode(HSB, 360, 100, 100, 255);
    for (let i = 0; i < confettiAmount; i++) {
      const x = random() * width;
      const y = 300 + random() * 500;
      const h = (accentHue + random() * 60) % 360;
      fill(h, 80, 90, textureOpacity * 2);
      noStroke();
      const size = 3 + random() * 8;
      push();
      translate(x, y);
      rotate(random() * TWO_PI);
      rect(0, 0, size, size * 2, 1);
      pop();
    }
    colorMode(RGB, 255);
  }

  // Venue and date footer
  fill(28, 28, 35);
  noStroke();
  rect(150, centerY + cardHeight / 2 + 60, width - 300, 80, 8);

  fill(150, 150, 170);
  textSize(14);
  textAlign(CENTER, CENTER);
  if (venue) {
    text(venue + (eventDate ? ' • ' + eventDate : ''), width / 2, centerY + cardHeight / 2 + 100);
  } else if (eventDate) {
    text(eventDate, width / 2, centerY + cardHeight / 2 + 100);
  }

  // Bottom info panel
  fill(28, 28, 35);
  rect(100, height - 350, width - 200, 230, 8);

  fill(120, 120, 140);
  textSize(12);
  textAlign(LEFT);
  text('VERIFICATION DETAILS', 140, height - 310);

  stroke(50, 50, 60);
  line(140, height - 290, width - 140, height - 290);

  fill(180, 180, 200);
  textSize(14);
  text('This sports result has been sealed with cryptographic verification.', 140, height - 250);
  text('The score data is deterministically embedded in the visual hash.', 140, height - 220);
  text('Re-execute with identical inputs to independently verify.', 140, height - 190);

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
 * P&L / Financial result visualization template
 */
export function generatePnlTemplate(details?: {
  assetName: string;
  startBalance: number;
  endBalance: number;
  fees: number;
  profit: number;
  returnPct: number;
  periodStart: string;
  periodEnd: string;
}): string {
  const assetName = details?.assetName || 'ASSET';
  const startBalance = details?.startBalance ?? 10000;
  const endBalance = details?.endBalance ?? 10000;
  const fees = details?.fees ?? 0;
  const profit = details?.profit ?? 0;
  const returnPct = details?.returnPct ?? 0;
  const periodStart = details?.periodStart || '';
  const periodEnd = details?.periodEnd || '';

  return `
// NexArt Code Mode - P&L Statement
// Protocol: nexart v1.2.0
// Canvas: 1950x2400 (provided by runtime - do NOT call createCanvas)

function setup() {
  background(15, 15, 20);
  noLoop();
}

function draw() {
  // Embedded claim data
  const assetName = "${assetName.replace(/"/g, '\\"')}";
  const startBalance = ${startBalance};
  const endBalance = ${endBalance};
  const fees = ${fees};
  const profit = ${profit.toFixed(2)};
  const returnPct = ${returnPct.toFixed(2)};
  const periodStart = "${periodStart}";
  const periodEnd = "${periodEnd}";
  const isPositive = profit >= 0;

  // VAR interpretation for visual styling
  const barCount = floor(map(VAR[0], 0, 100, 20, 80));
  const volatility = map(VAR[1], 0, 100, 0.1, 0.5);
  const trendStrength = map(VAR[2], 0, 100, 0.3, 0.9);
  const gridDensity = floor(map(VAR[3], 0, 100, 4, 12));
  const accentSaturation = map(VAR[4], 0, 100, 40, 90);
  const chartSmoothing = map(VAR[5], 0, 100, 0.1, 0.8);
  const glowIntensity = map(VAR[6], 0, 100, 0, 40);
  const patternDensity = floor(map(VAR[7], 0, 100, 10, 40));
  const borderAccent = map(VAR[8], 0, 100, 0, 100);
  const textureNoise = map(VAR[9], 0, 100, 5, 30);

  // Main panel
  fill(22, 22, 28);
  noStroke();
  rect(60, 60, width - 120, height - 120, 16);

  // Header
  fill(35, 35, 45);
  rect(60, 60, width - 120, 140, 16, 16, 0, 0);

  fill(255);
  textSize(28);
  textFont('monospace');
  textAlign(LEFT, CENTER);
  text('P&L STATEMENT', 100, 100);

  fill(150, 150, 170);
  textSize(16);
  text(assetName, 100, 140);

  // Sealed badge
  fill(80, 200, 120);
  textSize(12);
  textAlign(RIGHT, CENTER);
  text('● SEALED', width - 100, 100);

  // Main profit display
  const profitColor = isPositive ? color(80, 200, 120) : color(220, 80, 80);
  const centerY = 380;

  fill(profitColor);
  textAlign(CENTER, CENTER);
  textSize(100);
  const sign = profit >= 0 ? '+' : '';
  text(sign + '$' + Math.abs(profit).toLocaleString(), width / 2, centerY);

  fill(isPositive ? color(60, 160, 100) : color(180, 60, 60));
  textSize(48);
  text(sign + returnPct.toFixed(2) + '%', width / 2, centerY + 80);

  fill(120, 120, 140);
  textSize(14);
  text('RETURN', width / 2, centerY + 130);

  // Mini equity bar chart
  const chartX = 150;
  const chartY = 550;
  const chartW = width - 300;
  const chartH = 300;

  fill(28, 28, 35);
  noStroke();
  rect(chartX, chartY, chartW, chartH, 8);

  // Grid
  stroke(40, 40, 50);
  strokeWeight(1);
  for (let i = 0; i <= gridDensity; i++) {
    const y = chartY + (chartH / gridDensity) * i;
    line(chartX + 20, y, chartX + chartW - 20, y);
  }

  // Generate equity curve
  const points = [];
  let value = chartH * 0.5;
  const direction = isPositive ? 1 : -1;
  
  for (let i = 0; i < barCount; i++) {
    const noise = (random() - 0.5) * volatility * chartH;
    const trend = direction * trendStrength * (i / barCount) * chartH * 0.3;
    value = chartH * 0.5 + trend + noise;
    value = constrain(value, 30, chartH - 30);
    points.push(value);
  }

  // Smooth the points
  const smoothed = [];
  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      smoothed.push(points[i]);
    } else {
      smoothed.push(lerp(smoothed[i-1], points[i], 1 - chartSmoothing));
    }
  }

  // Draw area under curve
  colorMode(HSB, 360, 100, 100, 255);
  const hue = isPositive ? 140 : 0;
  fill(hue, accentSaturation, 40, 100);
  noStroke();
  
  beginShape();
  vertex(chartX + 20, chartY + chartH);
  for (let i = 0; i < smoothed.length; i++) {
    const x = chartX + 20 + (i / (smoothed.length - 1)) * (chartW - 40);
    const y = chartY + chartH - smoothed[i];
    vertex(x, y);
  }
  vertex(chartX + chartW - 20, chartY + chartH);
  endShape(CLOSE);

  // Draw line on top
  stroke(hue, 70, 85);
  strokeWeight(3);
  noFill();
  beginShape();
  for (let i = 0; i < smoothed.length; i++) {
    const x = chartX + 20 + (i / (smoothed.length - 1)) * (chartW - 40);
    const y = chartY + chartH - smoothed[i];
    vertex(x, y);
  }
  endShape();
  colorMode(RGB, 255);

  // Metrics row
  fill(28, 28, 35);
  noStroke();
  rect(150, chartY + chartH + 40, width - 300, 100, 8);

  fill(180, 180, 200);
  textSize(13);
  textAlign(CENTER, TOP);
  
  const metricX1 = width * 0.25;
  const metricX2 = width * 0.5;
  const metricX3 = width * 0.75;
  const metricY = chartY + chartH + 60;

  fill(100, 100, 120);
  textSize(11);
  text('START BALANCE', metricX1, metricY);
  text('END BALANCE', metricX2, metricY);
  text('FEES', metricX3, metricY);

  fill(200, 200, 220);
  textSize(18);
  text('$' + startBalance.toLocaleString(), metricX1, metricY + 25);
  text('$' + endBalance.toLocaleString(), metricX2, metricY + 25);
  text('$' + fees.toLocaleString(), metricX3, metricY + 25);

  // Period display
  fill(80, 80, 100);
  textSize(12);
  textAlign(CENTER);
  if (periodStart && periodEnd) {
    text(periodStart + ' → ' + periodEnd, width / 2, chartY + chartH + 170);
  }

  // Bottom info panel
  fill(28, 28, 35);
  rect(100, height - 320, width - 200, 200, 8);

  fill(120, 120, 140);
  textSize(12);
  textAlign(LEFT);
  text('VERIFICATION DETAILS', 140, height - 280);

  stroke(50, 50, 60);
  line(140, height - 260, width - 140, height - 260);

  fill(180, 180, 200);
  textSize(14);
  text('This P&L statement has been sealed with cryptographic verification.', 140, height - 220);
  text('Financial figures are deterministically embedded in the visual hash.', 140, height - 190);
  text('Re-execute with identical inputs to independently verify.', 140, height - 160);

  // Footer
  fill(60, 60, 70);
  textSize(10);
  textAlign(LEFT);
  text('Protocol: NexArt v1.2.0', 100, height - 80);
  text('Type: P&L Statement', 350, height - 80);
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
      return generatePnlTemplate();
    case 'generic':
    case 'custom':
    default:
      return generateGenericTemplate();
  }
}

/**
 * Get code template for claim type with embedded data
 */
export function getCodeTemplateForClaimType(
  claimType: ClaimType,
  sportsDetails?: SportsClaimDetails,
  pnlDetails?: {
    assetName: string;
    startBalance: number;
    endBalance: number;
    fees: number;
    profit: number;
    returnPct: number;
    periodStart: string;
    periodEnd: string;
  }
): string {
  switch (claimType) {
    case 'sports':
      return generateSportsTemplate(sportsDetails);
    case 'pnl':
      return generatePnlTemplate(pnlDetails);
    case 'generic':
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
      return 'Scorecard visualization for sports matches and events';
    case 'financial':
      return 'P&L visualization with profit/loss figures and charts';
    case 'custom':
      return 'Manual code entry (advanced users)';
    case 'generic':
    default:
      return 'Abstract pattern suitable for any verifiable statement';
  }
}

/**
 * Get claim type description
 */
export function getClaimTypeDescription(type: ClaimType): string {
  switch (type) {
    case 'sports':
      return 'Sports matches, competitions, and event outcomes';
    case 'pnl':
      return 'Profit/Loss calculations, financial returns, and trading results';
    case 'generic':
    default:
      return 'Any verifiable statement, fact, or record';
  }
}
