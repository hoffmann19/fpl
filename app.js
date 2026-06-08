// State Variables
let appData = null;
let currentGW = 1;
let playing = false;
let playbackInterval = null;
let playbackSpeed = 800; // ms per gameweek
let selectedManager = null;
let activeTab = 'bar-race'; // 'bar-race' or 'bump-chart'
let managerFormations = {};

// Constants for SVG Bump Chart
const SVG_WIDTH = 1000;
const SVG_HEIGHT = 500;
const BUMP_MARGIN = { top: 40, right: 40, bottom: 40, left: 40 };
const BUMP_INNER_WIDTH = SVG_WIDTH - BUMP_MARGIN.left - BUMP_MARGIN.right;
const BUMP_INNER_HEIGHT = SVG_HEIGHT - BUMP_MARGIN.top - BUMP_MARGIN.bottom;
const TOTAL_GWS = 38;
const TOTAL_RANKS = 13;
const STEP_X = BUMP_INNER_WIDTH / (TOTAL_GWS - 1);
const STEP_Y = BUMP_INNER_HEIGHT / (TOTAL_RANKS - 1);

// DOM Elements
const elBtnPlayPause = document.getElementById('btn-play-pause');
const elSelectSpeed = document.getElementById('select-speed');
const elSlider = document.getElementById('timeline-slider');
const elHeaderGw = document.getElementById('header-gw');
const elHeaderLeader = document.getElementById('header-leader');
const elHeaderLeaderPts = document.getElementById('header-leader-pts');
const elBtnReset = document.getElementById('btn-reset');

// Tab Panels
const elTabBarRace = document.getElementById('tab-bar-race');
const elTabBumpChart = document.getElementById('tab-bump-chart');
const elTabGlobalRank = document.getElementById('tab-global-rank');
const elPanelBarRace = document.getElementById('panel-bar-race');
const elPanelBumpChart = document.getElementById('panel-bump-chart');
const elPanelGlobalRank = document.getElementById('panel-global-rank');

// Bar Race Container
const elBarRaceContainer = document.getElementById('bar-race-container');

// Bump Chart Elements
const elBumpSvg = document.getElementById('bump-chart-svg');
const elBumpLegend = document.getElementById('bump-legend');
const elBumpTracker = document.getElementById('bump-tracker');
const elBumpTooltip = document.getElementById('bump-tooltip');

// Global Rank Chart Elements
const elGlobalSvg = document.getElementById('global-rank-svg');
const elGlobalLegend = document.getElementById('global-rank-legend');
const elGlobalTracker = document.getElementById('global-rank-tracker');
const elGlobalTooltip = document.getElementById('global-rank-tooltip');

// Manager Details Card
const elManagerName = document.getElementById('m-name');
const elManagerTeam = document.getElementById('m-team');
const elManagerRank = document.getElementById('m-rank');
const elManagerGwPts = document.getElementById('m-gw-pts');
const elManagerGwNetPts = document.getElementById('m-gw-net-pts');
const elManagerOverallPts = document.getElementById('m-overall-pts');
const elManagerOverallRank = document.getElementById('m-overall-rank');
const elManagerBestRank = document.getElementById('m-best-rank');
const elManagerFinalRank = document.getElementById('m-final-rank');
const elManagerCaptainName = document.getElementById('m-captain-name');
const elManagerChipBadge = document.getElementById('m-chip-badge');
const elManagerChipName = document.getElementById('m-chip-name');
const elManagerTransfersCount = document.getElementById('m-transfers-count');
const elManagerTransfersIn = document.getElementById('m-transfers-in');
const elManagerTransfersOut = document.getElementById('m-transfers-out');
const elFormationPie = document.getElementById('m-formation-pie');
const elFormationLegend = document.getElementById('m-formation-legend');
const elManagerAvatar = document.getElementById('m-avatar');

// Pitch Lineups
const elPitchManagerTeam = document.getElementById('pitch-manager-team');
const elPitchRowFWD = document.getElementById('pitch-row-FWD');
const elPitchRowMID = document.getElementById('pitch-row-MID');
const elPitchRowDEF = document.getElementById('pitch-row-DEF');
const elPitchRowGKP = document.getElementById('pitch-row-GKP');
const elPitchRowBench = document.getElementById('pitch-row-bench');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  fetchData();
  setupEventListeners();
});

// Fetch data from server
function fetchData() {
  fetch('./visualizer_data.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to load visualizer data');
      }
      return response.json();
    })
    .then(data => {
      appData = data;
      // Initialize with leader of GW1
      const gw1Standings = appData.gameweeks["1"].standings;
      const leaderRecord = gw1Standings.find(s => s.rank === 1);
      selectedManager = leaderRecord ? leaderRecord.manager : Object.keys(appData.managers)[0];
      
      initDashboard();
    })
    .catch(error => {
      console.error('Error fetching data:', error);
      elHeaderLeader.innerText = "Error loading data";
    });
}

function setupEventListeners() {
  // Playback Control
  elBtnPlayPause.addEventListener('click', togglePlayback);
  elSelectSpeed.addEventListener('change', (e) => {
    playbackSpeed = parseInt(e.target.value);
    if (playing) {
      pauseTimeline();
      playTimeline();
    }
  });
  
  // Slider / Timeline
  elSlider.addEventListener('input', (e) => {
    currentGW = parseInt(e.target.value);
    updateDashboard();
  });
  
  // Reset
  elBtnReset.addEventListener('click', () => {
    pauseTimeline();
    currentGW = 1;
    updateDashboard();
  });
  
  // Tabs
  elTabBarRace.addEventListener('click', () => switchTab('bar-race'));
  elTabBumpChart.addEventListener('click', () => switchTab('bump-chart'));
  elTabGlobalRank.addEventListener('click', () => switchTab('global-rank'));
}

function initDashboard() {
  // Initialize slider limits
  elSlider.min = 1;
  elSlider.max = TOTAL_GWS;
  elSlider.value = currentGW;
  
  // Calculate historical MVP stats
  calculateSeasonStats();
  
  // Create Bars in HTML for Bar Chart Race
  createBarRaceElements();
  
  // Render Bump Chart (which remains static in background, only tracker moves)
  renderBumpChart();
  
  // Render Global Rank Chart
  renderGlobalRankChart();
  
  // Update view
  updateDashboard();
}

function switchTab(tab) {
  activeTab = tab;
  
  elTabBarRace.classList.remove('active');
  elTabBumpChart.classList.remove('active');
  elTabGlobalRank.classList.remove('active');
  
  elPanelBarRace.classList.remove('active');
  elPanelBumpChart.classList.remove('active');
  elPanelGlobalRank.classList.remove('active');
  
  if (tab === 'bar-race') {
    elTabBarRace.classList.add('active');
    elPanelBarRace.classList.add('active');
  } else if (tab === 'bump-chart') {
    elTabBumpChart.classList.add('active');
    elPanelBumpChart.classList.add('active');
  } else if (tab === 'global-rank') {
    elTabGlobalRank.classList.add('active');
    elPanelGlobalRank.classList.add('active');
  }
}

// Playback Logic
function togglePlayback() {
  if (playing) {
    pauseTimeline();
  } else {
    if (currentGW >= TOTAL_GWS) {
      currentGW = 1;
    }
    playTimeline();
  }
}

function playTimeline() {
  playing = true;
  elBtnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i> <span>Pause</span>';
  elBtnPlayPause.classList.add('playing');
  
  playbackInterval = setInterval(() => {
    currentGW++;
    if (currentGW > TOTAL_GWS) {
      pauseTimeline();
      currentGW = TOTAL_GWS;
    } else {
      updateDashboard();
    }
  }, playbackSpeed);
}

function pauseTimeline() {
  playing = false;
  elBtnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i> <span>Play</span>';
  elBtnPlayPause.classList.remove('playing');
  if (playbackInterval) {
    clearInterval(playbackInterval);
  }
}

// Coordinate helper for Bump Chart SVG
function getBumpX(gw) {
  return BUMP_MARGIN.left + (gw - 1) * STEP_X;
}

function getBumpY(rank) {
  return BUMP_MARGIN.top + (rank - 1) * STEP_Y;
}

// ----------------------------------------------------
// BAR CHART RACE IMPLEMENTATION
// ----------------------------------------------------
function createBarRaceElements() {
  elBarRaceContainer.innerHTML = '';
  
  Object.keys(appData.managers).forEach(managerName => {
    const mgrInfo = appData.managers[managerName];
    
    const barRow = document.createElement('div');
    barRow.className = 'bar-row';
    barRow.id = `bar-row-${managerName.replace(/\s+/g, '_')}`;
    barRow.setAttribute('data-manager', managerName);
    
    barRow.innerHTML = `
      <div class="bar-rank">#</div>
      <div class="bar-label">
        <span class="bar-manager-name">${managerName}</span>
        <span class="bar-team-name">${mgrInfo.team}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="background: ${mgrInfo.color}; width: 0%;"></div>
      </div>
      <div class="bar-points-value">0 pts</div>
      <div class="bar-chip-indicator hidden">WC</div>
    `;
    
    barRow.addEventListener('click', () => {
      selectManager(managerName);
    });
    
    elBarRaceContainer.appendChild(barRow);
  });
}

function renderBarChartRace() {
  const standings = appData.gameweeks[currentGW.toString()].standings;
  
  // Find current maximum overall points to calculate scale
  const maxPts = Math.max(...standings.map(s => s.overall_points));
  
  standings.forEach(record => {
    const managerName = record.manager;
    const barRow = document.getElementById(`bar-row-${managerName.replace(/\s+/g, '_')}`);
    if (!barRow) return;
    
    // Sort vertical position based on rank (1-indexed)
    // 0-indexed top offset
    const rowHeight = 39; // Row height + margin
    const topPosition = (record.rank - 1) * rowHeight;
    barRow.style.top = `${topPosition}px`;
    
    // Update rank display
    const rankEl = barRow.querySelector('.bar-rank');
    rankEl.innerText = record.rank;
    
    // Calculate width percentage relative to leader (ensure min 5% for visibility)
    const percentage = maxPts > 0 ? Math.max(5, (record.overall_points / maxPts) * 100) : 5;
    const fillEl = barRow.querySelector('.bar-fill');
    fillEl.style.width = `${percentage}%`;
    
    // Points text
    const pointsEl = barRow.querySelector('.bar-points-value');
    pointsEl.innerText = `${record.overall_points} pts`;
    
    // Chip Indicator
    const chipEl = barRow.querySelector('.bar-chip-indicator');
    if (record.chip && record.chip !== 'None') {
      chipEl.classList.remove('hidden');
      chipEl.innerText = getChipShortName(record.chip);
      chipEl.title = record.chip;
    } else {
      chipEl.classList.add('hidden');
    }
    
    // Highlight if selected
    if (managerName === selectedManager) {
      barRow.classList.add('selected');
    } else {
      barRow.classList.remove('selected');
    }
  });
}

function getChipShortName(chip) {
  if (chip.includes("Wildcard")) return "WC";
  if (chip.includes("Free Hit")) return "FH";
  if (chip.includes("Bench Boost")) return "BB";
  if (chip.includes("Triple Captain")) return "TC";
  return chip;
}

// ----------------------------------------------------
// BUMP CHART IMPLEMENTATION
// ----------------------------------------------------
function renderBumpChart() {
  // Clear existing SVG paths/circles
  elBumpSvg.innerHTML = '';
  elBumpLegend.innerHTML = '';
  
  const managers = Object.keys(appData.managers);
  
  // 1. Draw SVG Background Grid Lines
  // Draw gameweek vertical lines
  for (let gw = 1; gw <= TOTAL_GWS; gw++) {
    const x = getBumpX(gw);
    const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    gridLine.setAttribute("x1", x);
    gridLine.setAttribute("y1", BUMP_MARGIN.top);
    gridLine.setAttribute("x2", x);
    gridLine.setAttribute("y2", SVG_HEIGHT - BUMP_MARGIN.bottom);
    gridLine.setAttribute("stroke", "rgba(255,255,255,0.03)");
    gridLine.setAttribute("stroke-width", "1");
    elBumpSvg.appendChild(gridLine);
    
    // Add GW label text at top and bottom occasionally (every 5 weeks)
    if (gw === 1 || gw % 5 === 0 || gw === TOTAL_GWS) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x);
      text.setAttribute("y", BUMP_MARGIN.top - 12);
      text.setAttribute("fill", "#64748b");
      text.setAttribute("font-size", "10px");
      text.setAttribute("font-family", "Space Grotesk");
      text.setAttribute("text-anchor", "middle");
      text.textContent = `GW${gw}`;
      elBumpSvg.appendChild(text);
    }
  }
  
  // Draw rank horizontal lines
  for (let rank = 1; rank <= TOTAL_RANKS; rank++) {
    const y = getBumpY(rank);
    const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    gridLine.setAttribute("x1", BUMP_MARGIN.left);
    gridLine.setAttribute("y1", y);
    gridLine.setAttribute("x2", SVG_WIDTH - BUMP_MARGIN.right);
    gridLine.setAttribute("y2", y);
    gridLine.setAttribute("stroke", "rgba(255,255,255,0.03)");
    gridLine.setAttribute("stroke-width", "1");
    elBumpSvg.appendChild(gridLine);
    
    // Rank labels on Y-axis
    const textLeft = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textLeft.setAttribute("x", BUMP_MARGIN.left - 15);
    textLeft.setAttribute("y", y + 4);
    textLeft.setAttribute("fill", "#94a3b8");
    textLeft.setAttribute("font-size", "11px");
    textLeft.setAttribute("font-weight", "bold");
    textLeft.setAttribute("font-family", "Space Grotesk");
    textLeft.setAttribute("text-anchor", "middle");
    textLeft.textContent = rank;
    elBumpSvg.appendChild(textLeft);
  }

  // 2. Draw Paths for each manager
  managers.forEach(managerName => {
    const mgrColor = appData.managers[managerName].color;
    
    // Build path points
    let points = [];
    for (let gw = 1; gw <= TOTAL_GWS; gw++) {
      const standings = appData.gameweeks[gw.toString()].standings;
      const record = standings.find(s => s.manager === managerName);
      if (record) {
        points.push({
          gw: gw,
          rank: record.rank,
          points: record.overall_points,
          chip: record.chip
        });
      }
    }
    
    if (points.length === 0) return;
    
    // Create bezier curve string
    let d = `M ${getBumpX(points[0].gw)} ${getBumpY(points[0].rank)}`;
    for (let i = 1; i < points.length; i++) {
      const pPrev = points[i - 1];
      const pCurr = points[i];
      const xPrev = getBumpX(pPrev.gw);
      const yPrev = getBumpY(pPrev.rank);
      const xCurr = getBumpX(pCurr.gw);
      const yCurr = getBumpY(pCurr.rank);
      
      // Control points for cubic bezier curves (smooth S-curve)
      const cpX1 = xPrev + STEP_X / 2;
      const cpY1 = yPrev;
      const cpX2 = xCurr - STEP_X / 2;
      const cpY2 = yCurr;
      
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${xCurr} ${yCurr}`;
    }
    
    // SVG Path Element
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("stroke", mgrColor);
    path.setAttribute("stroke-width", "3.5");
    path.setAttribute("class", "bump-path");
    path.id = `bump-path-${managerName.replace(/\s+/g, '_')}`;
    
    // Path Interactions
    path.addEventListener('click', () => selectManager(managerName));
    path.addEventListener('mouseover', () => hoverPath(managerName, true));
    path.addEventListener('mouseout', () => hoverPath(managerName, false));
    
    elBumpSvg.appendChild(path);
    
    // Draw circles at gameweeks occasionally (circles at nodes can clutter, but look great when hovered)
    points.forEach(p => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", getBumpX(p.gw));
      circle.setAttribute("cy", getBumpY(p.rank));
      circle.setAttribute("r", "3.5");
      circle.setAttribute("fill", mgrColor);
      circle.setAttribute("stroke", "#0a0c14");
      circle.setAttribute("stroke-width", "1");
      circle.setAttribute("class", `bump-node node-${managerName.replace(/\s+/g, '_')}`);
      
      // Node events
      circle.addEventListener('click', () => {
        selectManager(managerName);
        currentGW = p.gw;
        updateDashboard();
      });
      
      circle.addEventListener('mouseover', (e) => {
        hoverPath(managerName, true);
        showBumpTooltip(e, managerName, p);
      });
      
      circle.addEventListener('mouseout', () => {
        hoverPath(managerName, false);
        hideBumpTooltip();
      });
      
      elBumpSvg.appendChild(circle);
    });
    
    // 3. Add Legend Item
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.id = `legend-${managerName.replace(/\s+/g, '_')}`;
    legendItem.innerHTML = `
      <span class="legend-color" style="background: ${mgrColor}"></span>
      <span>${managerName}</span>
    `;
    legendItem.addEventListener('click', () => selectManager(managerName));
    legendItem.addEventListener('mouseover', () => hoverPath(managerName, true));
    legendItem.addEventListener('mouseout', () => hoverPath(managerName, false));
    elBumpLegend.appendChild(legendItem);
  });
}

function hoverPath(managerName, active) {
  const allPaths = elBumpSvg.querySelectorAll('.bump-path');
  const allNodes = elBumpSvg.querySelectorAll('.bump-node');
  const targetPathId = `bump-path-${managerName.replace(/\s+/g, '_')}`;
  const targetNodeClass = `node-${managerName.replace(/\s+/g, '_')}`;
  
  if (active) {
    // Dim all except target
    allPaths.forEach(p => {
      if (p.id === targetPathId) {
        p.setAttribute("stroke-width", "6");
        p.style.opacity = "1";
        // Bring to front
        elBumpSvg.appendChild(p);
      } else {
        p.style.opacity = "0.1";
      }
    });
    allNodes.forEach(n => {
      if (n.classList.contains(targetNodeClass)) {
        n.setAttribute("r", "6.5");
        n.style.fillOpacity = "1";
        elBumpSvg.appendChild(n);
      } else {
        n.style.fillOpacity = "0.1";
      }
    });
  } else {
    // Restore opacity and stroke-width
    allPaths.forEach(p => {
      const isSelected = p.id === `bump-path-${(selectedManager || '').replace(/\s+/g, '_')}`;
      p.setAttribute("stroke-width", isSelected ? "6" : "3.5");
      p.style.opacity = selectedManager ? (isSelected ? "1" : "0.15") : "0.85";
    });
    allNodes.forEach(n => {
      const isSelected = n.classList.contains(`node-${(selectedManager || '').replace(/\s+/g, '_')}`);
      n.setAttribute("r", isSelected ? "5.5" : "3.5");
      n.style.fillOpacity = selectedManager ? (isSelected ? "1" : "0.15") : "1";
    });
  }
}

function showBumpTooltip(event, managerName, dataPoint) {
  const containerRect = elBumpSvg.getBoundingClientRect();
  // Get local mouse coordinates relative to SVG
  const x = getBumpX(dataPoint.gw);
  const y = getBumpY(dataPoint.rank);
  
  elBumpTooltip.innerHTML = `
    <span class="tooltip-title">${managerName}</span>
    <span><strong>Gameweek ${dataPoint.gw}</strong></span>
    <span>Rank in League: <strong>#${dataPoint.rank}</strong></span>
    <span>Total Points: <strong>${dataPoint.points} pts</strong></span>
    ${dataPoint.chip && dataPoint.chip !== 'None' ? `<span>Chip Played: <strong style="color:var(--warning)">${dataPoint.chip}</strong></span>` : ''}
  `;
  
  elBumpTooltip.classList.remove('hidden');
  
  // Center tooltip above the node
  const tooltipWidth = elBumpTooltip.offsetWidth;
  const tooltipHeight = elBumpTooltip.offsetHeight;
  
  // Calculate relative percent positions
  const xPct = (x / SVG_WIDTH) * 100;
  const yPct = (y / SVG_HEIGHT) * 100;
  
  elBumpTooltip.style.left = `calc(${xPct}% - ${tooltipWidth / 2}px)`;
  elBumpTooltip.style.top = `calc(${yPct}% - ${tooltipHeight + 15}px)`;
}

function hideBumpTooltip() {
  elBumpTooltip.classList.add('hidden');
}

function updateBumpTracker() {
  // Move tracker line on SVG
  const x = getBumpX(currentGW);
  const xPct = (x / SVG_WIDTH) * 100;
  elBumpTracker.style.left = `${xPct}%`;
  elBumpTracker.style.display = 'block';
  
  if (elGlobalTracker) {
    elGlobalTracker.style.left = `${xPct}%`;
    elGlobalTracker.style.display = 'block';
  }
}

function updateBumpChartHighlight() {
  // Bold the path of the selected manager, dim all others
  const allPaths = elBumpSvg.querySelectorAll('.bump-path');
  const allNodes = elBumpSvg.querySelectorAll('.bump-node');
  
  if (!selectedManager) {
    allPaths.forEach(p => {
      p.setAttribute("stroke-width", "3.5");
      p.style.opacity = "0.85";
    });
    allNodes.forEach(n => {
      n.setAttribute("r", "3.5");
      n.style.fillOpacity = "1";
    });
    
    updateGlobalRankChartHighlight();
    return;
  }
  
  const selectedPathId = `bump-path-${selectedManager.replace(/\s+/g, '_')}`;
  const selectedNodeClass = `node-${selectedManager.replace(/\s+/g, '_')}`;
  
  allPaths.forEach(p => {
    if (p.id === selectedPathId) {
      p.setAttribute("stroke-width", "6");
      p.style.opacity = "1";
      // Bring path to front of DOM so it sits above others
      elBumpSvg.appendChild(p);
    } else {
      p.setAttribute("stroke-width", "3.5");
      p.style.opacity = "0.15";
    }
  });
  
  allNodes.forEach(n => {
    if (n.classList.contains(selectedNodeClass)) {
      n.setAttribute("r", "5.5");
      n.style.fillOpacity = "1";
    } else {
      n.setAttribute("r", "3.5");
      n.style.fillOpacity = "0.15";
    }
  });
  
  // Bring selected nodes to front too
  const nodesToFront = elBumpSvg.querySelectorAll(`.${selectedNodeClass}`);
  nodesToFront.forEach(n => elBumpSvg.appendChild(n));
  
  // Highlight selected path in Global Rank Chart
  updateGlobalRankChartHighlight();
}

// ----------------------------------------------------
// SELECTION & DETAIL DRAWERS
// ----------------------------------------------------
function selectManager(managerName) {
  selectedManager = managerName;
  
  // Update UI components
  updateManagerCard();
  updateLineupPitch();
  
  // Highlight selected bar in Bar Chart Race
  const barRows = elBarRaceContainer.querySelectorAll('.bar-row');
  barRows.forEach(row => {
    if (row.getAttribute('data-manager') === managerName) {
      row.classList.add('selected');
    } else {
      row.classList.remove('selected');
    }
  });
  
  // Highlight selected path in Bump Chart
  updateBumpChartHighlight();
}

function updateManagerCard() {
  if (!selectedManager || !appData) return;
  
  const standings = appData.gameweeks[currentGW.toString()].standings;
  const mgrRecord = standings.find(s => s.manager === selectedManager);
  const mgrMeta = appData.managers[selectedManager];
  
  if (!mgrRecord) return;
  
  // Colors and avatars
  elManagerAvatar.style.backgroundColor = mgrMeta.color;
  elManagerAvatar.style.boxShadow = `0 4px 15px ${mgrMeta.color}40`;
  
  // Card top indicator border
  document.getElementById('manager-info-card').style.setProperty('--accent', mgrMeta.color);
  
  // Text details
  elManagerName.innerText = selectedManager;
  elManagerTeam.innerText = mgrMeta.team;
  elManagerRank.innerText = `#${mgrRecord.rank}`;
  elManagerRank.style.color = mgrMeta.color;
  elManagerRank.style.backgroundColor = `${mgrMeta.color}15`;
  elManagerRank.style.borderColor = `${mgrMeta.color}30`;
  
  elManagerGwPts.innerText = `${mgrRecord.gw_points} pts`;
  
  // Hits display
  const hitsStr = mgrRecord.gw_hits > 0 ? `(-${mgrRecord.gw_hits} hits)` : '';
  elManagerGwNetPts.innerText = `${mgrRecord.gw_net_points} pts ${hitsStr}`;
  elManagerOverallPts.innerText = `${mgrRecord.overall_points} pts`;
  elManagerOverallRank.innerText = mgrRecord.overall_rank.toLocaleString();
  
  // Calculate Best Rank and Final Rank
  let bestRank = Infinity;
  Object.keys(appData.gameweeks).forEach(gw => {
    const standings = appData.gameweeks[gw].standings;
    const record = standings.find(s => s.manager === selectedManager);
    if (record && record.overall_rank && record.overall_rank < bestRank) {
      bestRank = record.overall_rank;
    }
  });
  
  const availableGWs = Object.keys(appData.gameweeks).map(Number);
  const maxGW = Math.max(...availableGWs);
  const finalStandings = appData.gameweeks[maxGW.toString()].standings;
  const finalRecord = finalStandings.find(s => s.manager === selectedManager);
  const finalRank = finalRecord ? finalRecord.overall_rank : null;
  
  elManagerBestRank.innerText = bestRank !== Infinity ? bestRank.toLocaleString() : '—';
  elManagerFinalRank.innerText = finalRank ? finalRank.toLocaleString() : '—';
  
  // Captain Row
  const capPointsStr = mgrRecord.captain_points !== undefined ? ` (${mgrRecord.captain_points} pts)` : '';
  elManagerCaptainName.innerText = mgrRecord.captain ? `${mgrRecord.captain}${capPointsStr}` : '—';
  
  // Chip Played
  if (mgrRecord.chip && mgrRecord.chip !== 'None') {
    elManagerChipBadge.classList.remove('hidden');
    elManagerChipName.innerText = mgrRecord.chip;
  } else {
    elManagerChipBadge.classList.add('hidden');
  }
  
  // Transfers Made
  elManagerTransfersCount.innerText = mgrRecord.transfers;
  
  // Transfers In / Out lists
  elManagerTransfersIn.innerHTML = '';
  if (mgrRecord.transfers_in && mgrRecord.transfers_in.length > 0) {
    mgrRecord.transfers_in.forEach(p => {
      const li = document.createElement('li');
      li.textContent = p;
      elManagerTransfersIn.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.className = 'transfer-none';
    li.textContent = 'None';
    elManagerTransfersIn.appendChild(li);
  }

  elManagerTransfersOut.innerHTML = '';
  if (mgrRecord.transfers_out && mgrRecord.transfers_out.length > 0) {
    mgrRecord.transfers_out.forEach(p => {
      const li = document.createElement('li');
      li.textContent = p;
      elManagerTransfersOut.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.className = 'transfer-none';
    li.textContent = 'None';
    elManagerTransfersOut.appendChild(li);
  }
  
  // Render Formation Pie Chart
  elFormationPie.innerHTML = '';
  elFormationLegend.innerHTML = '';
  
  const formations = managerFormations[selectedManager] || {};
  const sortedFormations = Object.entries(formations).sort((a, b) => b[1] - a[1]);
  const totalWeeks = Object.values(formations).reduce((a, b) => a + b, 0);
  
  if (sortedFormations.length === 0 || totalWeeks === 0) {
    elFormationPie.style.background = 'conic-gradient(var(--card-border) 0% 100%)';
    elFormationLegend.innerHTML = '<div class="transfer-none">No formation data available.</div>';
  } else {
    // Premium color palette for formations
    const formationColors = [
      '#00d2d3', // teal/accent
      '#3742fa', // deep royal blue
      '#ff4757', // coral red
      '#ffa502', // orange
      '#2ed573', // green
      '#a55eea'  // purple
    ];
    
    let gradientParts = [];
    let currentPct = 0;
    
    sortedFormations.forEach(([formCode, count], idx) => {
      const color = formationColors[idx % formationColors.length];
      const pct = (count / totalWeeks) * 100;
      const nextPct = currentPct + pct;
      
      gradientParts.push(`${color} ${currentPct.toFixed(1)}% ${nextPct.toFixed(1)}%`);
      currentPct = nextPct;
      
      // Add to legend
      const legendItem = document.createElement('div');
      legendItem.className = 'formation-legend-item';
      legendItem.innerHTML = `
        <div class="formation-legend-label">
          <span class="formation-legend-color" style="background: ${color}"></span>
          <span>${formCode}</span>
        </div>
        <span class="formation-legend-value">${count} weeks (${pct.toFixed(0)}%)</span>
      `;
      elFormationLegend.appendChild(legendItem);
    });
    
    // Apply conic gradient background
    elFormationPie.style.background = `conic-gradient(${gradientParts.join(', ')})`;
  }
}

function updateLineupPitch() {
  if (!selectedManager || !appData) return;
  
  const lineups = appData.gameweeks[currentGW.toString()].lineups;
  const mgrLineup = lineups[selectedManager];
  const mgrMeta = appData.managers[selectedManager];
  
  elPitchManagerTeam.innerText = `${mgrMeta.team} (GW ${currentGW})`;
  elPitchManagerTeam.style.color = mgrMeta.color;
  
  // Reset Rows
  elPitchRowFWD.innerHTML = '';
  elPitchRowMID.innerHTML = '';
  elPitchRowDEF.innerHTML = '';
  elPitchRowGKP.innerHTML = '';
  elPitchRowBench.innerHTML = '';
  
  if (!mgrLineup || mgrLineup.length === 0) {
    const errorMsg = `<div style="color:var(--text-secondary); width:100%; text-align:center; padding: 20px;">No lineup data collected for this week.</div>`;
    elPitchRowGKP.innerHTML = errorMsg;
    return;
  }
  
  // Find Squad MVP (highest point scorer)
  const maxPts = Math.max(...mgrLineup.map(p => p.points));
  
  // Separate starters and bench
  const starters = mgrLineup.filter(p => p.starting);
  const bench = mgrLineup.filter(p => !p.starting);
  
  // Render Starters by row
  starters.forEach(player => {
    const playerCard = createPlayerCardDOM(player, maxPts);
    const targetRow = document.getElementById(`pitch-row-${player.position}`);
    if (targetRow) {
      targetRow.appendChild(playerCard);
    }
  });
  
  // Render Bench
  // Bench has 4 players. Sort bench players: GKP first, then others
  const sortedBench = [...bench].sort((a, b) => {
    if (a.position === 'GKP' && b.position !== 'GKP') return -1;
    if (a.position !== 'GKP' && b.position === 'GKP') return 1;
    return 0;
  });
  
  sortedBench.forEach(player => {
    const playerCard = createPlayerCardDOM(player, maxPts);
    elPitchRowBench.appendChild(playerCard);
  });
}

function createPlayerCardDOM(player, maxSquadPts) {
  const card = document.createElement('div');
  card.className = `player-card ${player.position}`;
  
  // Captaincy badge
  let badgeHtml = '';
  if (player.captain) {
    badgeHtml = `<span class="player-badge captain" title="Captain">C</span>`;
  } else if (player.vice_captain) {
    badgeHtml = `<span class="player-badge vice-captain" title="Vice Captain">V</span>`;
  }
  
  // MVP badge (highest points)
  let mvpHtml = '';
  if (player.points === maxSquadPts && player.points > 0) {
    mvpHtml = `<span class="player-badge mvp" title="GW Squad MVP"><i class="fa-solid fa-star"></i></span>`;
  }
  
  // Sub indicators
  let subHtml = '';
  if (player.sub_in) {
    subHtml = `<i class="fa-solid fa-circle-chevron-up sub-in-icon" style="color:var(--success); position:absolute; bottom:0; right:0; font-size: 0.8rem; background:#000; border-radius:50%;"></i>`;
  } else if (player.sub_out) {
    subHtml = `<i class="fa-solid fa-circle-chevron-down sub-out-icon" style="color:var(--danger); position:absolute; bottom:0; right:0; font-size: 0.8rem; background:#000; border-radius:50%;"></i>`;
  }
  
  // Points display text (sign indicator)
  const ptsText = player.points >= 0 ? `+${player.points}` : player.points;
  
  card.innerHTML = `
    <div class="player-shirt">
      ${ptsText}
      ${badgeHtml}
      ${mvpHtml}
      ${subHtml}
    </div>
    <span class="player-name">${player.name}</span>
    <span class="player-club">${player.club}</span>
  `;
  
  return card;
}

// ----------------------------------------------------
// GLOBAL DASHBOARD UPDATER
// ----------------------------------------------------
function updateDashboard() {
  if (!appData) return;
  
  // Sync slider and input value
  elSlider.value = currentGW;
  elHeaderGw.innerText = currentGW;
  
  // 1. Find Leader for current GW
  const standings = appData.gameweeks[currentGW.toString()].standings;
  const leaderRecord = standings.find(s => s.rank === 1);
  
  if (leaderRecord) {
    elHeaderLeader.innerText = leaderRecord.manager;
    elHeaderLeaderPts.innerText = `${leaderRecord.overall_points} pts`;
    
    // Dynamically color leader box
    const leaderMeta = appData.managers[leaderRecord.manager];
    elHeaderLeader.style.color = leaderMeta.color;
  }
  
  // 2. Render Bar Chart Race
  renderBarChartRace();
  
  // 3. Move Bump Tracker Line
  updateBumpTracker();
  
  // 4. Update highlights in bump chart
  updateBumpChartHighlight();
  
  // 5. Update selected manager card & lineup
  updateManagerCard();
  updateLineupPitch();
}

// ----------------------------------------------------
// GLOBAL RANK CHART IMPLEMENTATION & SEASON STATS
// ----------------------------------------------------
let globalRankMin = Infinity;
let globalRankMax = -Infinity;
let globalRankYMinLimit = 0;
let globalRankYMaxLimit = 0;

function getGlobalRankY(r) {
  if (globalRankYMaxLimit === globalRankYMinLimit) return BUMP_MARGIN.top;
  const pct = (r - globalRankYMinLimit) / (globalRankYMaxLimit - globalRankYMinLimit);
  return BUMP_MARGIN.top + pct * BUMP_INNER_HEIGHT;
}

function formatGlobalRank(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(0) + 'k';
  }
  return num.toString();
}

function calculateSeasonStats() {
  managerFormations = {};
  
  // Initialize
  Object.keys(appData.managers).forEach(mgr => {
    managerFormations[mgr] = {};
  });
  
  // Go through all gameweeks
  Object.keys(appData.gameweeks).forEach(gw => {
    const lineups = appData.gameweeks[gw].lineups;
    if (!lineups) return;
    
    Object.keys(lineups).forEach(mgr => {
      const lineup = lineups[mgr];
      if (!lineup) return;
      
      let defCount = 0;
      let midCount = 0;
      let fwdCount = 0;
      
      lineup.forEach(p => {
        if (p.starting) {
          if (p.position === 'DEF') defCount++;
          else if (p.position === 'MID') midCount++;
          else if (p.position === 'FWD') fwdCount++;
        }
      });
      
      // Goalkeeper is always 1, so the other 10 are defCount-midCount-fwdCount
      const formation = `${defCount}-${midCount}-${fwdCount}`;
      
      if (!managerFormations[mgr][formation]) {
        managerFormations[mgr][formation] = 0;
      }
      managerFormations[mgr][formation]++;
    });
  });
}

function renderGlobalRankChart() {
  if (!appData) return;

  // Clear existing SVG paths/circles and legend
  elGlobalSvg.innerHTML = '';
  elGlobalLegend.innerHTML = '';

  const managers = Object.keys(appData.managers);

  // Find min and max global rank to scale Y-axis
  globalRankMin = Infinity;
  globalRankMax = -Infinity;
  for (let gw = 1; gw <= TOTAL_GWS; gw++) {
    const standings = appData.gameweeks[gw.toString()].standings;
    standings.forEach(s => {
      const r = s.overall_rank;
      if (r < globalRankMin) globalRankMin = r;
      if (r > globalRankMax) globalRankMax = r;
    });
  }

  // Add a 5% margin to min and max so values don't clip at top/bottom
  const diff = globalRankMax - globalRankMin;
  const pad = diff * 0.05 || 1000;
  globalRankYMinLimit = Math.max(1, globalRankMin - pad);
  globalRankYMaxLimit = globalRankMax + pad;

  // 1. Draw SVG Background Grid Lines
  // Draw gameweek vertical lines
  for (let gw = 1; gw <= TOTAL_GWS; gw++) {
    const x = getBumpX(gw);
    const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    gridLine.setAttribute("x1", x);
    gridLine.setAttribute("y1", BUMP_MARGIN.top);
    gridLine.setAttribute("x2", x);
    gridLine.setAttribute("y2", SVG_HEIGHT - BUMP_MARGIN.bottom);
    gridLine.setAttribute("stroke", "rgba(255,255,255,0.03)");
    gridLine.setAttribute("stroke-width", "1");
    elGlobalSvg.appendChild(gridLine);
    
    if (gw === 1 || gw % 5 === 0 || gw === TOTAL_GWS) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x);
      text.setAttribute("y", BUMP_MARGIN.top - 12);
      text.setAttribute("fill", "#64748b");
      text.setAttribute("font-size", "10px");
      text.setAttribute("font-family", "Space Grotesk");
      text.setAttribute("text-anchor", "middle");
      text.textContent = `GW${gw}`;
      elGlobalSvg.appendChild(text);
    }
  }

  // Draw rank horizontal lines (ticks)
  const ticksCount = 5;
  for (let i = 0; i < ticksCount; i++) {
    const pct = i / (ticksCount - 1);
    const rankVal = Math.round(globalRankYMinLimit + pct * (globalRankYMaxLimit - globalRankYMinLimit));
    const y = BUMP_MARGIN.top + pct * BUMP_INNER_HEIGHT;

    const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    gridLine.setAttribute("x1", BUMP_MARGIN.left);
    gridLine.setAttribute("y1", y);
    gridLine.setAttribute("x2", SVG_WIDTH - BUMP_MARGIN.right);
    gridLine.setAttribute("y2", y);
    gridLine.setAttribute("stroke", "rgba(255,255,255,0.03)");
    gridLine.setAttribute("stroke-width", "1");
    elGlobalSvg.appendChild(gridLine);

    const textLeft = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textLeft.setAttribute("x", BUMP_MARGIN.left - 15);
    textLeft.setAttribute("y", y + 4);
    textLeft.setAttribute("fill", "#94a3b8");
    textLeft.setAttribute("font-size", "10px");
    textLeft.setAttribute("font-weight", "bold");
    textLeft.setAttribute("font-family", "Space Grotesk");
    textLeft.setAttribute("text-anchor", "end");
    textLeft.textContent = formatGlobalRank(rankVal);
    elGlobalSvg.appendChild(textLeft);
  }

  // 2. Draw Paths for each manager
  managers.forEach(managerName => {
    const mgrColor = appData.managers[managerName].color;

    let points = [];
    for (let gw = 1; gw <= TOTAL_GWS; gw++) {
      const standings = appData.gameweeks[gw.toString()].standings;
      const record = standings.find(s => s.manager === managerName);
      if (record) {
        points.push({
          gw: gw,
          overall_rank: record.overall_rank,
          points: record.overall_points,
          chip: record.chip
        });
      }
    }

    if (points.length === 0) return;

    // Create Bezier curve string
    let d = `M ${getBumpX(points[0].gw)} ${getGlobalRankY(points[0].overall_rank)}`;
    for (let i = 1; i < points.length; i++) {
      const pPrev = points[i - 1];
      const pCurr = points[i];
      const xPrev = getBumpX(pPrev.gw);
      const yPrev = getGlobalRankY(pPrev.overall_rank);
      const xCurr = getBumpX(pCurr.gw);
      const yCurr = getGlobalRankY(pCurr.overall_rank);

      const cpX1 = xPrev + STEP_X / 2;
      const cpY1 = yPrev;
      const cpX2 = xCurr - STEP_X / 2;
      const cpY2 = yCurr;

      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${xCurr} ${yCurr}`;
    }

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("stroke", mgrColor);
    path.setAttribute("stroke-width", "3.5");
    path.setAttribute("class", "bump-path global-path");
    path.id = `global-path-${managerName.replace(/\s+/g, '_')}`;

    path.addEventListener('click', () => selectManager(managerName));
    path.addEventListener('mouseover', () => hoverGlobalPath(managerName, true));
    path.addEventListener('mouseout', () => hoverGlobalPath(managerName, false));

    elGlobalSvg.appendChild(path);

    // Draw circles at nodes
    points.forEach(p => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", getBumpX(p.gw));
      circle.setAttribute("cy", getGlobalRankY(p.overall_rank));
      circle.setAttribute("r", "3.5");
      circle.setAttribute("fill", mgrColor);
      circle.setAttribute("stroke", "#0a0c14");
      circle.setAttribute("stroke-width", "1");
      circle.setAttribute("class", `bump-node global-node node-global-${managerName.replace(/\s+/g, '_')}`);

      circle.addEventListener('click', () => {
        selectManager(managerName);
        currentGW = p.gw;
        updateDashboard();
      });

      circle.addEventListener('mouseover', (e) => {
        hoverGlobalPath(managerName, true);
        showGlobalTooltip(e, managerName, p);
      });

      circle.addEventListener('mouseout', () => {
        hoverGlobalPath(managerName, false);
        hideGlobalTooltip();
      });

      elGlobalSvg.appendChild(circle);
    });

    // Add legend item
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.id = `legend-global-${managerName.replace(/\s+/g, '_')}`;
    legendItem.innerHTML = `
      <span class="legend-color" style="background: ${mgrColor}"></span>
      <span>${managerName}</span>
    `;
    legendItem.addEventListener('click', () => selectManager(managerName));
    legendItem.addEventListener('mouseover', () => hoverGlobalPath(managerName, true));
    legendItem.addEventListener('mouseout', () => hoverGlobalPath(managerName, false));
    elGlobalLegend.appendChild(legendItem);
  });
}

function hoverGlobalPath(managerName, active) {
  const allPaths = elGlobalSvg.querySelectorAll('.global-path');
  const allNodes = elGlobalSvg.querySelectorAll('.global-node');
  const targetPathId = `global-path-${managerName.replace(/\s+/g, '_')}`;
  const targetNodeClass = `node-global-${managerName.replace(/\s+/g, '_')}`;
  
  if (active) {
    allPaths.forEach(p => {
      if (p.id === targetPathId) {
        p.setAttribute("stroke-width", "6");
        p.style.opacity = "1";
        elGlobalSvg.appendChild(p);
      } else {
        p.style.opacity = "0.1";
      }
    });
    allNodes.forEach(n => {
      if (n.classList.contains(targetNodeClass)) {
        n.setAttribute("r", "6.5");
        n.style.fillOpacity = "1";
        elGlobalSvg.appendChild(n);
      } else {
        n.style.fillOpacity = "0.1";
      }
    });
  } else {
    allPaths.forEach(p => {
      const isSelected = p.id === `global-path-${(selectedManager || '').replace(/\s+/g, '_')}`;
      p.setAttribute("stroke-width", isSelected ? "6" : "3.5");
      p.style.opacity = selectedManager ? (isSelected ? "1" : "0.15") : "0.85";
    });
    allNodes.forEach(n => {
      const isSelected = n.classList.contains(`node-global-${(selectedManager || '').replace(/\s+/g, '_')}`);
      n.setAttribute("r", isSelected ? "5.5" : "3.5");
      n.style.fillOpacity = selectedManager ? (isSelected ? "1" : "0.15") : "1";
    });
  }
}

function showGlobalTooltip(event, managerName, dataPoint) {
  const x = getBumpX(dataPoint.gw);
  const y = getGlobalRankY(dataPoint.overall_rank);
  
  elGlobalTooltip.innerHTML = `
    <span class="tooltip-title">${managerName}</span>
    <span><strong>Gameweek ${dataPoint.gw}</strong></span>
    <span>Global Rank: <strong>#${dataPoint.overall_rank.toLocaleString()}</strong></span>
    <span>Total Points: <strong>${dataPoint.points} pts</strong></span>
    ${dataPoint.chip && dataPoint.chip !== 'None' ? `<span>Chip Played: <strong style="color:var(--warning)">${dataPoint.chip}</strong></span>` : ''}
  `;
  
  elGlobalTooltip.classList.remove('hidden');
  
  const tooltipWidth = elGlobalTooltip.offsetWidth;
  const tooltipHeight = elGlobalTooltip.offsetHeight;
  
  const xPct = (x / SVG_WIDTH) * 100;
  const yPct = (y / SVG_HEIGHT) * 100;
  
  elGlobalTooltip.style.left = `calc(${xPct}% - ${tooltipWidth / 2}px)`;
  elGlobalTooltip.style.top = `calc(${yPct}% - ${tooltipHeight + 15}px)`;
}

function hideGlobalTooltip() {
  elGlobalTooltip.classList.add('hidden');
}

function updateGlobalRankChartHighlight() {
  const allPaths = elGlobalSvg.querySelectorAll('.global-path');
  const allNodes = elGlobalSvg.querySelectorAll('.global-node');
  
  if (!selectedManager) {
    allPaths.forEach(p => {
      p.setAttribute("stroke-width", "3.5");
      p.style.opacity = "0.85";
    });
    allNodes.forEach(n => {
      n.setAttribute("r", "3.5");
      n.style.fillOpacity = "1";
    });
    return;
  }
  
  const selectedPathId = `global-path-${selectedManager.replace(/\s+/g, '_')}`;
  const selectedNodeClass = `node-global-${selectedManager.replace(/\s+/g, '_')}`;
  
  allPaths.forEach(p => {
    if (p.id === selectedPathId) {
      p.setAttribute("stroke-width", "6");
      p.style.opacity = "1";
      elGlobalSvg.appendChild(p);
    } else {
      p.setAttribute("stroke-width", "3.5");
      p.style.opacity = "0.15";
    }
  });
  
  allNodes.forEach(n => {
    if (n.classList.contains(selectedNodeClass)) {
      n.setAttribute("r", "5.5");
      n.style.fillOpacity = "1";
    } else {
      n.setAttribute("r", "3.5");
      n.style.fillOpacity = "0.15";
    }
  });
  
  const nodesToFront = elGlobalSvg.querySelectorAll(`.${selectedNodeClass}`);
  nodesToFront.forEach(n => elGlobalSvg.appendChild(n));
}
