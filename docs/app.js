// State Variables
let appData = null;
let currentGW = 1;
let currentSeason = '2026_27'; // Default to upcoming 2026/27 season
let loadedSeasons = {};
let playing = false;
let playbackInterval = null;
let playbackSpeed = 800; // ms per gameweek
let selectedManager = null;
let activeTab = 'field-roster'; // 'field-roster' by default for winning team / pitch view
let managerFormations = {};
let managerCumulativeCapPoints = {};
let finalGW = 38;
let scatterRanges = {
  xMin: Infinity,
  xMax: -Infinity,
  yMin: Infinity,
  yMax: -Infinity,
  sizeMin: Infinity,
  sizeMax: -Infinity
};

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

// Constants for SVG Scatter Plot
const SCATTER_MARGIN = { top: 50, right: 60, bottom: 60, left: 70 };
const SCATTER_INNER_WIDTH = SVG_WIDTH - SCATTER_MARGIN.left - SCATTER_MARGIN.right;
const SCATTER_INNER_HEIGHT = SVG_HEIGHT - SCATTER_MARGIN.top - SCATTER_MARGIN.bottom;


// DOM Elements
const elBtnPlayPause = document.getElementById('btn-play-pause');
const elSelectSpeed = document.getElementById('select-speed');
const elSlider = document.getElementById('timeline-slider');
const elHeaderGw = document.getElementById('header-gw');
const elHeaderLeader = document.getElementById('header-leader');
const elHeaderLeaderPts = document.getElementById('header-leader-pts');
const elBtnReset = document.getElementById('btn-reset');

// Filter Selectors
const elSelectSeason = document.getElementById('select-season');
const elSelectTeam = document.getElementById('select-team');

// Tab Panels
const elTabFieldRoster = document.getElementById('tab-field-roster');
const elTabBarRace = document.getElementById('tab-bar-race');
const elTabBumpChart = document.getElementById('tab-bump-chart');
const elTabGlobalRank = document.getElementById('tab-global-rank');
const elTabScatterPlot = document.getElementById('tab-scatter-plot');

const elPanelFieldRoster = document.getElementById('panel-field-roster');
const elPanelBarRace = document.getElementById('panel-bar-race');
const elPanelBumpChart = document.getElementById('panel-bump-chart');
const elPanelGlobalRank = document.getElementById('panel-global-rank');
const elPanelScatterPlot = document.getElementById('panel-scatter-plot');

// Main Pitch Elements
const elMainPitchTeamName = document.getElementById('main-pitch-team-name');
const elMainPitchManagerName = document.getElementById('main-pitch-manager-name');
const elMainPitchGwPts = document.getElementById('main-pitch-gw-pts');
const elMainPitchTotalPts = document.getElementById('main-pitch-total-pts');
const elMainPitchRank = document.getElementById('main-pitch-rank');
const elMainPitchAvatar = document.getElementById('main-pitch-avatar');

const elMainPitchRowFWD = document.getElementById('main-pitch-row-FWD');
const elMainPitchRowMID = document.getElementById('main-pitch-row-MID');
const elMainPitchRowDEF = document.getElementById('main-pitch-row-DEF');
const elMainPitchRowGKP = document.getElementById('main-pitch-row-GKP');
const elMainPitchRowBench = document.getElementById('main-pitch-row-bench');

// Bar Race Container
const elBarRaceContainer = document.getElementById('bar-race-container');

// Bump Chart Elements
const elBumpSvg = document.getElementById('bump-chart-svg');
const elBumpLegend = document.getElementById('bump-legend');
const elBumpTracker = document.getElementById('bump-tracker');
const elBumpTooltip = document.getElementById('bump-tooltip');

// Scatter Chart Elements
const elScatterSvg = document.getElementById('scatter-plot-svg');
const elScatterLegend = document.getElementById('scatter-legend');
const elScatterTooltip = document.getElementById('scatter-tooltip');

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

// Pitch Lineups (Right Column)
const elPitchManagerTeam = document.getElementById('pitch-manager-team');
const elPitchRowFWD = document.getElementById('pitch-row-FWD');
const elPitchRowMID = document.getElementById('pitch-row-MID');
const elPitchRowDEF = document.getElementById('pitch-row-DEF');
const elPitchRowGKP = document.getElementById('pitch-row-GKP');
const elPitchRowBench = document.getElementById('pitch-row-bench');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadSeasonData(currentSeason);
});

// Fetch season data dynamically
function loadSeasonData(seasonKey) {
  currentSeason = seasonKey;
  
  if (loadedSeasons[seasonKey]) {
    appData = loadedSeasons[seasonKey];
    onSeasonDataLoaded();
    return;
  }
  
  const jsonUrl = seasonKey === '2025_26' ? './visualizer_data_2025_26.json' : './visualizer_data_2026_27.json';
  
  fetch(jsonUrl)
    .then(response => {
      if (!response.ok) {
        return fetch('./visualizer_data.json').then(r => r.json());
      }
      return response.json();
    })
    .then(data => {
      loadedSeasons[seasonKey] = data;
      appData = data;
      onSeasonDataLoaded();
    })
    .catch(error => {
      console.error('Error fetching season data:', error);
      elHeaderLeader.innerText = "Error loading data";
    });
}

function getLatestGWWithData(data) {
  if (!data || !data.gameweeks) return 1;
  const gws = Object.keys(data.gameweeks).map(Number).sort((a, b) => b - a);
  for (const gw of gws) {
    const gwStr = gw.toString();
    const standings = data.gameweeks[gwStr] ? data.gameweeks[gwStr].standings : [];
    const lineups = data.gameweeks[gwStr] ? data.gameweeks[gwStr].lineups : {};
    const hasPoints = standings.some(s => (s.gw_points && s.gw_points > 0) || (s.overall_points && s.overall_points > 0));
    const hasLineups = Object.values(lineups).some(l => Array.isArray(l) && l.length > 0);
    if (hasPoints || hasLineups) return gw;
  }
  return 1;
}

function onSeasonDataLoaded() {
  currentGW = getLatestGWWithData(appData);
  
  const activeGWStandings = appData.gameweeks[currentGW.toString()] ? appData.gameweeks[currentGW.toString()].standings : [];
  const leader = activeGWStandings.find(s => s.rank === 1);
  selectedManager = leader ? leader.manager : Object.keys(appData.managers)[0];
  
  populateTeamDropdown();
  initDashboard();
}

function populateTeamDropdown() {
  if (!elSelectTeam || !appData || !appData.managers) return;
  elSelectTeam.innerHTML = '<option value="">-- All Teams / Leader --</option>';
  
  const sortedManagers = Object.keys(appData.managers).sort((a, b) => {
    return appData.managers[a].team.localeCompare(appData.managers[b].team);
  });
  
  sortedManagers.forEach(mgr => {
    const meta = appData.managers[mgr];
    const opt = document.createElement('option');
    opt.value = mgr;
    opt.innerText = `${meta.team} (${mgr})`;
    if (mgr === selectedManager) {
      opt.selected = true;
    }
    elSelectTeam.appendChild(opt);
  });
}

function setupEventListeners() {
  // Season Selector
  if (elSelectSeason) {
    elSelectSeason.addEventListener('change', (e) => {
      pauseTimeline();
      loadSeasonData(e.target.value);
    });
  }

  // Team Selector Filter
  if (elSelectTeam) {
    elSelectTeam.addEventListener('change', (e) => {
      if (e.target.value) {
        selectManager(e.target.value);
      }
    });
  }

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
  if (elTabFieldRoster) elTabFieldRoster.addEventListener('click', () => switchTab('field-roster'));
  if (elTabBarRace) elTabBarRace.addEventListener('click', () => switchTab('bar-race'));
  if (elTabBumpChart) elTabBumpChart.addEventListener('click', () => switchTab('bump-chart'));
  if (elTabGlobalRank) elTabGlobalRank.addEventListener('click', () => switchTab('global-rank'));
  if (elTabScatterPlot) elTabScatterPlot.addEventListener('click', () => switchTab('scatter-plot'));
}

function initDashboard() {
  // Initialize slider limits
  elSlider.min = 1;
  elSlider.max = TOTAL_GWS;
  elSlider.value = currentGW;
  
  // Calculate historical MVP stats
  calculateSeasonStats();
  
  const availableGWs = Object.keys(appData.gameweeks).map(Number);
  finalGW = Math.max(...availableGWs);
  
  // Create Bars in HTML for Bar Chart Race
  createBarRaceElements();
  
  // Render Bump Chart (which remains static in background, only tracker moves)
  renderBumpChart();
  
  // Render Global Rank Chart
  renderGlobalRankChart();
  
  // Pre-calculate ranges and cumulative captain points if scatter plot active
  if (elScatterSvg) {
    calculateScatterRanges();
    renderScatterPlotBase();
  }
  
  // Update view
  updateDashboard();
}

function switchTab(tab) {
  activeTab = tab;
  
  if (elTabFieldRoster) elTabFieldRoster.classList.remove('active');
  elTabBarRace.classList.remove('active');
  elTabBumpChart.classList.remove('active');
  elTabGlobalRank.classList.remove('active');
  elTabScatterPlot.classList.remove('active');
  
  if (elPanelFieldRoster) elPanelFieldRoster.classList.remove('active');
  elPanelBarRace.classList.remove('active');
  elPanelBumpChart.classList.remove('active');
  elPanelGlobalRank.classList.remove('active');
  elPanelScatterPlot.classList.remove('active');
  
  if (tab === 'field-roster') {
    if (elTabFieldRoster) elTabFieldRoster.classList.add('active');
    if (elPanelFieldRoster) elPanelFieldRoster.classList.add('active');
  } else if (tab === 'bar-race') {
    elTabBarRace.classList.add('active');
    elPanelBarRace.classList.add('active');
  } else if (tab === 'bump-chart') {
    elTabBumpChart.classList.add('active');
    elPanelBumpChart.classList.add('active');
  } else if (tab === 'global-rank') {
    elTabGlobalRank.classList.add('active');
    elPanelGlobalRank.classList.add('active');
  } else if (tab === 'scatter-plot') {
    elTabScatterPlot.classList.add('active');
    elPanelScatterPlot.classList.add('active');
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
        <span class="bar-manager-name">${mgrInfo.team}</span>
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
    const mgrTeamName = appData.managers[managerName] ? appData.managers[managerName].team : managerName;
    legendItem.innerHTML = `
      <span class="legend-color" style="background: ${mgrColor}"></span>
      <span>${mgrTeamName}</span>
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
  
  const mgrTeamName = (appData && appData.managers && appData.managers[managerName]) ? appData.managers[managerName].team : managerName;
  elBumpTooltip.innerHTML = `
    <span class="tooltip-title">${mgrTeamName}</span>
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
  if (elSelectTeam) {
    elSelectTeam.value = managerName;
  }
  
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
  
  // Highlight selected bubble in Scatter Plot
  if (elScatterSvg) updateScatterPlotHighlight();
  
  // Highlight selected leaderboard row
  renderLeaderboard();
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
  elManagerName.innerText = mgrMeta.team;
  elManagerTeam.innerText = `Leaderboard Rank #${mgrRecord.rank}`;
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
  if (elFormationPie && elFormationLegend) {
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
}

function updateLineupPitch() {
  if (!selectedManager || !appData) return;
  
  const gwData = appData.gameweeks[currentGW.toString()];
  if (!gwData) return;
  
  const standings = gwData.standings || [];
  const mgrRecord = standings.find(s => s.manager === selectedManager);
  const lineups = gwData.lineups || {};
  const mgrLineup = lineups[selectedManager] || [];
  const mgrMeta = appData.managers[selectedManager] || { team: selectedManager, color: '#00d2d3' };
  
  // 1. Update Main Pitch Header Stats
  if (elMainPitchTeamName) {
    const isWinner = mgrRecord && mgrRecord.rank === 1 && currentGW === 38;
    elMainPitchTeamName.innerHTML = `${mgrMeta.team} ${isWinner ? '<span class="winner-badge-inline"><i class="fa-solid fa-crown"></i> WINNER</span>' : ''}`;
  }
  if (elMainPitchManagerName) elMainPitchManagerName.innerText = `${selectedManager} (GW ${currentGW})`;
  if (elMainPitchAvatar) {
    elMainPitchAvatar.style.backgroundColor = mgrMeta.color;
    elMainPitchAvatar.style.boxShadow = `0 0 15px ${mgrMeta.color}60`;
  }
  if (mgrRecord) {
    if (elMainPitchGwPts) elMainPitchGwPts.innerHTML = `<i class="fa-solid fa-bolt"></i> ${mgrRecord.gw_points} GW Pts`;
    if (elMainPitchTotalPts) elMainPitchTotalPts.innerHTML = `<i class="fa-solid fa-trophy"></i> ${mgrRecord.overall_points} Total Pts`;
    if (elMainPitchRank) elMainPitchRank.innerHTML = `<i class="fa-solid fa-ranking-star"></i> Rank #${mgrRecord.rank}`;
  }

  // 2. Update Right Column pitch header if present
  if (elPitchManagerTeam) {
    elPitchManagerTeam.innerText = `${mgrMeta.team} (GW ${currentGW})`;
    elPitchManagerTeam.style.color = mgrMeta.color;
  }
  
  // Reset Rows
  if (elPitchRowFWD) elPitchRowFWD.innerHTML = '';
  if (elPitchRowMID) elPitchRowMID.innerHTML = '';
  if (elPitchRowDEF) elPitchRowDEF.innerHTML = '';
  if (elPitchRowGKP) elPitchRowGKP.innerHTML = '';
  if (elPitchRowBench) elPitchRowBench.innerHTML = '';

  if (elMainPitchRowFWD) elMainPitchRowFWD.innerHTML = '';
  if (elMainPitchRowMID) elMainPitchRowMID.innerHTML = '';
  if (elMainPitchRowDEF) elMainPitchRowDEF.innerHTML = '';
  if (elMainPitchRowGKP) elMainPitchRowGKP.innerHTML = '';
  if (elMainPitchRowBench) elMainPitchRowBench.innerHTML = '';
  
  if (!mgrLineup || mgrLineup.length === 0) {
    const errorMsg = `<div style="color:var(--text-secondary); width:100%; text-align:center; padding: 20px;">No lineup data collected for this week.</div>`;
    if (elPitchRowGKP) elPitchRowGKP.innerHTML = errorMsg;
    if (elMainPitchRowGKP) elMainPitchRowGKP.innerHTML = errorMsg;
    return;
  }
  
  // Find Squad MVP (highest point scorer)
  const maxPts = Math.max(...mgrLineup.map(p => p.points));
  
  // Separate starters and bench
  const starters = mgrLineup.filter(p => p.starting);
  const bench = mgrLineup.filter(p => !p.starting);
  
  // Render Starters by row
  starters.forEach(player => {
    const card1 = createPlayerCardDOM(player, maxPts);
    const card2 = createPlayerCardDOM(player, maxPts);
    
    const targetRowRight = document.getElementById(`pitch-row-${player.position}`);
    if (targetRowRight) targetRowRight.appendChild(card1);

    const targetRowMain = document.getElementById(`main-pitch-row-${player.position}`);
    if (targetRowMain) targetRowMain.appendChild(card2);
  });
  
  // Render Bench
  const sortedBench = [...bench].sort((a, b) => {
    if (a.position === 'GKP' && b.position !== 'GKP') return -1;
    if (a.position !== 'GKP' && b.position === 'GKP') return 1;
    return 0;
  });
  
  sortedBench.forEach(player => {
    const card1 = createPlayerCardDOM(player, maxPts);
    const card2 = createPlayerCardDOM(player, maxPts);
    if (elPitchRowBench) elPitchRowBench.appendChild(card1);
    if (elMainPitchRowBench) elMainPitchRowBench.appendChild(card2);
  });
}

const CLUB_BADGES = {
  'ARS': 'https://resources.premierleague.com/premierleague/badges/70/t3.png',
  'AVL': 'https://resources.premierleague.com/premierleague/badges/70/t7.png',
  'AST': 'https://resources.premierleague.com/premierleague/badges/70/t7.png',
  'BOU': 'https://resources.premierleague.com/premierleague/badges/70/t91.png',
  'BRE': 'https://resources.premierleague.com/premierleague/badges/70/t94.png',
  'BHA': 'https://resources.premierleague.com/premierleague/badges/70/t36.png',
  'CHE': 'https://resources.premierleague.com/premierleague/badges/70/t8.png',
  'CRY': 'https://resources.premierleague.com/premierleague/badges/70/t31.png',
  'EVE': 'https://resources.premierleague.com/premierleague/badges/70/t11.png',
  'FUL': 'https://resources.premierleague.com/premierleague/badges/70/t54.png',
  'IPS': 'https://resources.premierleague.com/premierleague/badges/70/t40.png',
  'LEE': 'https://resources.premierleague.com/premierleague/badges/70/t2.png',
  'LEI': 'https://resources.premierleague.com/premierleague/badges/70/t13.png',
  'LIV': 'https://resources.premierleague.com/premierleague/badges/70/t14.png',
  'MCI': 'https://resources.premierleague.com/premierleague/badges/70/t43.png',
  'MUN': 'https://resources.premierleague.com/premierleague/badges/70/t1.png',
  'NEW': 'https://resources.premierleague.com/premierleague/badges/70/t4.png',
  'NFO': 'https://resources.premierleague.com/premierleague/badges/70/t17.png',
  'SOU': 'https://resources.premierleague.com/premierleague/badges/70/t20.png',
  'TOT': 'https://resources.premierleague.com/premierleague/badges/70/t6.png',
  'WHU': 'https://resources.premierleague.com/premierleague/badges/70/t21.png',
  'WOL': 'https://resources.premierleague.com/premierleague/badges/70/t39.png',
  'BUR': 'https://resources.premierleague.com/premierleague/badges/70/t90.png',
  'SHU': 'https://resources.premierleague.com/premierleague/badges/70/t49.png',
  'LUT': 'https://resources.premierleague.com/premierleague/badges/70/t102.png'
};

const CLUB_KITS = {
  'ARS': { bg: '#DB0007', sleeve: '#FFFFFF', text: '#FFFFFF', name: '#FFFFFF', collar: '#FFFFFF' },
  'MCI': { bg: '#6CABDD', sleeve: '#6CABDD', text: '#1C2C5B', name: '#FFFFFF', collar: '#1C2C5B' },
  'LIV': { bg: '#C8102E', sleeve: '#C8102E', text: '#F6EB61', name: '#FFFFFF', collar: '#00B2A9' },
  'CHE': { bg: '#034694', sleeve: '#034694', text: '#FFFFFF', name: '#FFFFFF', collar: '#DB0007' },
  'MUN': { bg: '#DA291C', sleeve: '#DA291C', text: '#FFE500', name: '#FFFFFF', collar: '#000000' },
  'TOT': { bg: '#FFFFFF', sleeve: '#132257', text: '#132257', name: '#132257', collar: '#132257' },
  'AVL': { bg: '#670E36', sleeve: '#95B255', text: '#FFE500', name: '#FFFFFF', collar: '#95B255' },
  'AST': { bg: '#670E36', sleeve: '#95B255', text: '#FFE500', name: '#FFFFFF', collar: '#95B255' },
  'BOU': { bg: '#DA291C', sleeve: '#000000', text: '#FFFFFF', name: '#FFFFFF', collar: '#000000' },
  'BHA': { bg: '#0057B8', sleeve: '#FFFFFF', text: '#FFE500', name: '#FFFFFF', collar: '#FFE500' },
  'BRE': { bg: '#E30613', sleeve: '#FFFFFF', text: '#FFFFFF', name: '#FFFFFF', collar: '#000000' },
  'CRY': { bg: '#1B458F', sleeve: '#C41230', text: '#FFE500', name: '#FFFFFF', collar: '#C41230' },
  'EVE': { bg: '#003399', sleeve: '#003399', text: '#FFFFFF', name: '#FFFFFF', collar: '#FFFFFF' },
  'FUL': { bg: '#FFFFFF', sleeve: '#000000', text: '#000000', name: '#000000', collar: '#000000' },
  'IPS': { bg: '#003399', sleeve: '#FFFFFF', text: '#FFFFFF', name: '#FFFFFF', collar: '#FFFFFF' },
  'LEE': { bg: '#FFFFFF', sleeve: '#FFFFFF', text: '#1D428A', name: '#1D428A', collar: '#FFCD00' },
  'LEI': { bg: '#0053A0', sleeve: '#0053A0', text: '#FDBE11', name: '#FFFFFF', collar: '#FDBE11' },
  'NFO': { bg: '#DD0000', sleeve: '#DD0000', text: '#FFFFFF', name: '#FFFFFF', collar: '#FFFFFF' },
  'SOU': { bg: '#D4001C', sleeve: '#FFFFFF', text: '#000000', name: '#FFFFFF', collar: '#000000' },
  'WHU': { bg: '#7A263A', sleeve: '#1BB1E7', text: '#F3A813', name: '#FFFFFF', collar: '#1BB1E7' },
  'WOL': { bg: '#FDB913', sleeve: '#231F20', text: '#231F20', name: '#FFFFFF', collar: '#231F20' }
};

const GKP_KIT = { bg: '#00FF87', sleeve: '#00FF87', text: '#38003C', name: '#38003C', collar: '#38003C' };

function createPlayerCardDOM(player, maxSquadPts) {
  const card = document.createElement('div');
  card.className = `player-card ${player.position}`;
  
  const clubCode = (player.club || '').toUpperCase().trim();
  const badgeUrl = CLUB_BADGES[clubCode] || 'https://resources.premierleague.com/premierleague/badges/70/t3.png';
  const kit = player.position === 'GKP' ? GKP_KIT : (CLUB_KITS[clubCode] || { bg: '#3742fa', sleeve: '#1e90ff', text: '#ffffff', name: '#ffffff', collar: '#ffffff' });
  
  // Extract surname for jersey back (e.g. B.Fernandes -> FERNANDES)
  let rawName = player.name || '';
  if (rawName.includes('.')) {
    const parts = rawName.split('.');
    rawName = parts[parts.length - 1].trim();
  }
  const nameOnJersey = rawName.toUpperCase().substring(0, 10);
  
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
    subHtml = `<i class="fa-solid fa-circle-chevron-up sub-in-icon" style="color:var(--success); position:absolute; bottom:-2px; right:-2px; font-size: 0.9rem; background:#000; border-radius:50%;"></i>`;
  } else if (player.sub_out) {
    subHtml = `<i class="fa-solid fa-circle-chevron-down sub-out-icon" style="color:var(--danger); position:absolute; bottom:-2px; right:-2px; font-size: 0.9rem; background:#000; border-radius:50%;"></i>`;
  }
  
  // Points text for back of shirt
  const ptsText = player.points >= 0 ? `${player.points}` : `${player.points}`;
  
  // Generate SVG Football Jersey Back
  const jerseySvg = `
    <svg class="jersey-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <!-- Outer Glow Shadow -->
      <filter id="jersey-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.5"/>
      </filter>
      <!-- Sleeves -->
      <path d="M 24 22 L 38 14 L 30 46 L 16 52 Z" fill="${kit.sleeve}" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/>
      <path d="M 76 22 L 62 14 L 70 46 L 84 52 Z" fill="${kit.sleeve}" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/>
      <!-- Shirt Body -->
      <path d="M 32 16 L 40 12 L 60 12 L 68 16 L 70 44 L 70 90 L 30 90 L 30 44 Z" fill="${kit.bg}" stroke="rgba(0,0,0,0.4)" stroke-width="2" filter="url(#jersey-shadow)"/>
      <!-- Collar Trim -->
      <path d="M 40 12 C 46 17, 54 17, 60 12" fill="none" stroke="${kit.collar}" stroke-width="3"/>
      <!-- Player Name on Back of Jersey -->
      <text x="50" y="30" font-family="'Outfit', sans-serif" font-weight="800" font-size="11" fill="${kit.name}" text-anchor="middle" letter-spacing="0.5">${nameOnJersey}</text>
      <!-- Gameweek Points Number on Back -->
      <text x="50" y="65" font-family="'Space Grotesk', sans-serif" font-weight="900" font-size="34" fill="${kit.text}" text-anchor="middle" dominant-baseline="central">${ptsText}</text>
    </svg>
  `;
  
  card.innerHTML = `
    <div class="player-jersey-wrapper">
      ${jerseySvg}
      <img src="${badgeUrl}" alt="${player.club}" class="jersey-club-crest" onerror="this.style.opacity='0'">
      <span class="player-pts-pill-tag">${player.points >= 0 ? '+' : ''}${player.points} pts</span>
      ${badgeHtml}
      ${mvpHtml}
      ${subHtml}
    </div>
    <span class="player-name">${player.name}</span>
    <span class="player-club-sub">${player.club}</span>
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
    elHeaderLeader.innerText = leaderRecord.team || leaderRecord.manager;
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
  
  // 6. Update Leaderboard
  renderLeaderboard();
  
  // 7. Update Scatter Plot
  if (elScatterSvg) updateScatterPlot();
}

function renderLeaderboard() {
  const elLeaderboardList = document.getElementById('gw-leaderboard-list');
  const elLbGwNum = document.getElementById('lb-gw-num');
  if (!elLeaderboardList || !appData) return;
  
  if (elLbGwNum) elLbGwNum.innerText = currentGW;
  elLeaderboardList.innerHTML = '';
  
  const gwData = appData.gameweeks[currentGW.toString()];
  if (!gwData || !gwData.standings) return;
  
  const standings = [...gwData.standings].sort((a, b) => a.rank - b.rank);
  
  standings.forEach((mgrRecord) => {
    const mgrMeta = appData.managers[mgrRecord.manager] || { team: mgrRecord.manager, color: '#00d2d3' };
    const isSelected = mgrRecord.manager === selectedManager;
    const isWinner = mgrRecord.rank === 1;
    
    const row = document.createElement('div');
    row.className = `leaderboard-row ${isSelected ? 'active' : ''}`;
    row.style.borderLeft = `4px solid ${mgrMeta.color}`;
    
    row.innerHTML = `
      <div class="lb-rank-badge ${isWinner ? 'winner' : ''}">
        ${isWinner ? '<i class="fa-solid fa-crown"></i>' : `#${mgrRecord.rank}`}
      </div>
      <div class="lb-team-info">
        <span class="lb-team-title" style="color: ${mgrMeta.color}">${mgrMeta.team}</span>
        <span class="lb-mgr-sub">${mgrRecord.manager}</span>
      </div>
      <div class="lb-points-cell">
        <span class="lb-gw-pts">+${mgrRecord.gw_points} <small>GW${currentGW}</small></span>
        <span class="lb-total-pts">${mgrRecord.overall_points.toLocaleString()} <small>Total</small></span>
      </div>
    `;
    
    row.addEventListener('click', () => {
      selectManager(mgrRecord.manager);
    });
    
    elLeaderboardList.appendChild(row);
  });
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
    const mgrTeamName = appData.managers[managerName] ? appData.managers[managerName].team : managerName;
    legendItem.innerHTML = `
      <span class="legend-color" style="background: ${mgrColor}"></span>
      <span>${mgrTeamName}</span>
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
  
  const mgrTeamName = (appData && appData.managers && appData.managers[managerName]) ? appData.managers[managerName].team : managerName;
  elGlobalTooltip.innerHTML = `
    <span class="tooltip-title">${mgrTeamName}</span>
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

// ----------------------------------------------------
// SCATTER PLOT IMPLEMENTATION
// ----------------------------------------------------
function getScatterX(avgGwPts) {
  const diff = scatterRanges.xMax - scatterRanges.xMin;
  const pct = diff > 0 ? (avgGwPts - scatterRanges.xMin) / diff : 0.5;
  return SCATTER_MARGIN.left + pct * SCATTER_INNER_WIDTH;
}

function getScatterY(avgCapPts) {
  const diff = scatterRanges.yMax - scatterRanges.yMin;
  const pct = diff > 0 ? (avgCapPts - scatterRanges.yMin) / diff : 0.5;
  return SCATTER_MARGIN.top + (1 - pct) * SCATTER_INNER_HEIGHT;
}

function getScatterRadius(overallPoints, currentStandings) {
  const pointsList = currentStandings.map(s => s.overall_points);
  const minPts = Math.min(...pointsList);
  const maxPts = Math.max(...pointsList);
  
  if (maxPts === minPts) return 10;
  const pct = (overallPoints - minPts) / (maxPts - minPts);
  return 6 + pct * 10; // radius between 6px and 16px
}

function calculateScatterRanges() {
  if (!appData) return;
  const managers = Object.keys(appData.managers);
  
  managerCumulativeCapPoints = {};
  scatterRanges = {
    xMin: Infinity,
    xMax: -Infinity,
    yMin: Infinity,
    yMax: -Infinity,
    sizeMin: Infinity,
    sizeMax: -Infinity
  };
  
  // Calculate cumulative captain points for all weeks first (for detail cards and lookup)
  managers.forEach(mgr => {
    managerCumulativeCapPoints[mgr] = {};
    let runningCapPts = 0;
    
    for (let gw = 1; gw <= TOTAL_GWS; gw++) {
      const standings = appData.gameweeks[gw.toString()]?.standings;
      if (!standings) continue;
      
      const record = standings.find(s => s.manager === mgr);
      if (record) {
        runningCapPts += record.captain_points || 0;
        managerCumulativeCapPoints[mgr][gw] = runningCapPts;
      }
    }
  });
  
  // Define axis ranges based ONLY on finalGW's stats to zoom in on the final distribution!
  const finalStandings = appData.gameweeks[finalGW.toString()]?.standings;
  if (finalStandings) {
    managers.forEach(mgr => {
      const record = finalStandings.find(s => s.manager === mgr);
      if (record) {
        const avgGwPts = record.overall_points / finalGW;
        const cumCapPts = managerCumulativeCapPoints[mgr][finalGW] || 0;
        const avgCapPts = cumCapPts / finalGW;
        
        if (avgGwPts < scatterRanges.xMin) scatterRanges.xMin = avgGwPts;
        if (avgGwPts > scatterRanges.xMax) scatterRanges.xMax = avgGwPts;
        
        if (avgCapPts < scatterRanges.yMin) scatterRanges.yMin = avgCapPts;
        if (avgCapPts > scatterRanges.yMax) scatterRanges.yMax = avgCapPts;
        
        if (record.overall_points < scatterRanges.sizeMin) scatterRanges.sizeMin = record.overall_points;
        if (record.overall_points > scatterRanges.sizeMax) scatterRanges.sizeMax = record.overall_points;
      }
    });
  }
  
  // Pad the ranges by 15% so bubbles don't sit on the margins
  const xDiff = scatterRanges.xMax - scatterRanges.xMin || 10;
  scatterRanges.xMin = Math.max(0, scatterRanges.xMin - xDiff * 0.15);
  scatterRanges.xMax = scatterRanges.xMax + xDiff * 0.15;
  
  const yDiff = scatterRanges.yMax - scatterRanges.yMin || 5;
  scatterRanges.yMin = Math.max(0, scatterRanges.yMin - yDiff * 0.15);
  scatterRanges.yMax = scatterRanges.yMax + yDiff * 0.15;
}

function renderScatterPlotBase() {
  if (!appData) return;
  elScatterSvg.innerHTML = '';
  
  // 1. Draw SVG Background Grid Lines & Ticks
  const xTicksCount = 6;
  for (let i = 0; i < xTicksCount; i++) {
    const pct = i / (xTicksCount - 1);
    const val = scatterRanges.xMin + pct * (scatterRanges.xMax - scatterRanges.xMin);
    const x = SCATTER_MARGIN.left + pct * SCATTER_INNER_WIDTH;
    
    // Grid line
    const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    gridLine.setAttribute("x1", x);
    gridLine.setAttribute("y1", SCATTER_MARGIN.top);
    gridLine.setAttribute("x2", x);
    gridLine.setAttribute("y2", SVG_HEIGHT - SCATTER_MARGIN.bottom);
    gridLine.setAttribute("stroke", "rgba(255,255,255,0.03)");
    gridLine.setAttribute("stroke-width", "1");
    elScatterSvg.appendChild(gridLine);
    
    // Tick text
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x);
    text.setAttribute("y", SVG_HEIGHT - SCATTER_MARGIN.bottom + 18);
    text.setAttribute("fill", "#94a3b8");
    text.setAttribute("font-size", "10px");
    text.setAttribute("font-family", "Space Grotesk");
    text.setAttribute("text-anchor", "middle");
    text.textContent = val.toFixed(1);
    elScatterSvg.appendChild(text);
  }
  
  const yTicksCount = 6;
  for (let i = 0; i < yTicksCount; i++) {
    const pct = i / (yTicksCount - 1);
    const val = scatterRanges.yMin + pct * (scatterRanges.yMax - scatterRanges.yMin);
    const y = SCATTER_MARGIN.top + (1 - pct) * SCATTER_INNER_HEIGHT;
    
    // Grid line
    const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    gridLine.setAttribute("x1", SCATTER_MARGIN.left);
    gridLine.setAttribute("y1", y);
    gridLine.setAttribute("x2", SVG_WIDTH - SCATTER_MARGIN.right);
    gridLine.setAttribute("y2", y);
    gridLine.setAttribute("stroke", "rgba(255,255,255,0.03)");
    gridLine.setAttribute("stroke-width", "1");
    elScatterSvg.appendChild(gridLine);
    
    // Tick text
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", SCATTER_MARGIN.left - 12);
    text.setAttribute("y", y + 4);
    text.setAttribute("fill", "#94a3b8");
    text.setAttribute("font-size", "10px");
    text.setAttribute("font-family", "Space Grotesk");
    text.setAttribute("text-anchor", "end");
    text.textContent = val.toFixed(1);
    elScatterSvg.appendChild(text);
  }
  
  // Draw Axes
  const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  xAxis.setAttribute("x1", SCATTER_MARGIN.left);
  xAxis.setAttribute("y1", SVG_HEIGHT - SCATTER_MARGIN.bottom);
  xAxis.setAttribute("x2", SVG_WIDTH - SCATTER_MARGIN.right);
  xAxis.setAttribute("y2", SVG_HEIGHT - SCATTER_MARGIN.bottom);
  xAxis.setAttribute("stroke", "rgba(255,255,255,0.1)");
  xAxis.setAttribute("stroke-width", "1");
  elScatterSvg.appendChild(xAxis);

  const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  yAxis.setAttribute("x1", SCATTER_MARGIN.left);
  yAxis.setAttribute("y1", SCATTER_MARGIN.top);
  yAxis.setAttribute("x2", SCATTER_MARGIN.left);
  yAxis.setAttribute("y2", SVG_HEIGHT - SCATTER_MARGIN.bottom);
  yAxis.setAttribute("stroke", "rgba(255,255,255,0.1)");
  yAxis.setAttribute("stroke-width", "1");
  elScatterSvg.appendChild(yAxis);
  
  // Axis Titles
  const xAxisTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
  xAxisTitle.setAttribute("x", SCATTER_MARGIN.left + SCATTER_INNER_WIDTH / 2);
  xAxisTitle.setAttribute("y", SVG_HEIGHT - 12);
  xAxisTitle.setAttribute("text-anchor", "middle");
  xAxisTitle.setAttribute("fill", "#cbd5e1");
  xAxisTitle.setAttribute("font-size", "12px");
  xAxisTitle.setAttribute("font-weight", "600");
  xAxisTitle.setAttribute("font-family", "Space Grotesk");
  xAxisTitle.textContent = "Average Gameweek Points (Net)";
  elScatterSvg.appendChild(xAxisTitle);

  const yAxisTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
  yAxisTitle.setAttribute("transform", `translate(20, ${SCATTER_MARGIN.top + SCATTER_INNER_HEIGHT / 2}) rotate(-90)`);
  yAxisTitle.setAttribute("text-anchor", "middle");
  yAxisTitle.setAttribute("fill", "#cbd5e1");
  yAxisTitle.setAttribute("font-size", "12px");
  yAxisTitle.setAttribute("font-weight", "600");
  yAxisTitle.setAttribute("font-family", "Space Grotesk");
  yAxisTitle.textContent = "Average Captain Points";
  elScatterSvg.appendChild(yAxisTitle);
  
  // Bubbles Group
  const bubblesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  bubblesGroup.id = "scatter-bubbles-group";
  elScatterSvg.appendChild(bubblesGroup);
}

function updateScatterPlot() {
  if (!appData) return;
  
  const bubblesGroup = document.getElementById('scatter-bubbles-group');
  if (!bubblesGroup) return;
  bubblesGroup.innerHTML = '';
  
  const standings = appData.gameweeks[finalGW.toString()]?.standings;
  if (!standings) return;
  
  const managers = Object.keys(appData.managers);
  
  managers.forEach(managerName => {
    const record = standings.find(s => s.manager === managerName);
    if (!record) return;
    
    const mgrMeta = appData.managers[managerName];
    const mgrColor = mgrMeta.color;
    
    const avgGwPts = record.overall_points / finalGW;
    const cumCapPts = managerCumulativeCapPoints[managerName]?.[finalGW] || 0;
    const avgCapPts = cumCapPts / finalGW;
    
    const x = getScatterX(avgGwPts);
    const y = getScatterY(avgCapPts);
    const r = getScatterRadius(record.overall_points, standings);
    
    const bubbleG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    bubbleG.setAttribute("class", "scatter-bubble-group");
    bubbleG.setAttribute("data-manager", managerName);
    bubbleG.id = `scatter-bubble-${managerName.replace(/\s+/g, '_')}`;
    
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", r);
    circle.setAttribute("fill", mgrColor);
    circle.setAttribute("fill-opacity", "0.7");
    circle.setAttribute("stroke", mgrColor);
    circle.setAttribute("stroke-width", "1.5");
    
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", x + r + 5);
    label.setAttribute("y", y + 3.5);
    label.setAttribute("text-anchor", "start");
    label.textContent = managerName;
    
    bubbleG.appendChild(circle);
    bubbleG.appendChild(label);
    
    // Interactions
    bubbleG.addEventListener('click', () => selectManager(managerName));
    bubbleG.addEventListener('mouseover', (e) => {
      hoverScatterBubble(managerName, true);
      showScatterTooltip(e, managerName, record, avgCapPts);
    });
    bubbleG.addEventListener('mouseout', () => {
      hoverScatterBubble(managerName, false);
      hideScatterTooltip();
    });
    
    bubblesGroup.appendChild(bubbleG);
  });
  
  renderScatterLegend();
  updateScatterPlotHighlight();
}

function renderScatterLegend() {
  if (!elScatterLegend) return;
  elScatterLegend.innerHTML = '';
  
  const managers = Object.keys(appData.managers);
  managers.forEach(managerName => {
    const mgrColor = appData.managers[managerName].color;
    
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.id = `legend-scatter-${managerName.replace(/\s+/g, '_')}`;
    const mgrTeamName = appData.managers[managerName] ? appData.managers[managerName].team : managerName;
    legendItem.innerHTML = `
      <span class="legend-color" style="background: ${mgrColor}"></span>
      <span>${mgrTeamName}</span>
    `;
    legendItem.addEventListener('click', () => selectManager(managerName));
    legendItem.addEventListener('mouseover', () => hoverScatterBubble(managerName, true));
    legendItem.addEventListener('mouseout', () => hoverScatterBubble(managerName, false));
    elScatterLegend.appendChild(legendItem);
  });
}

function hoverScatterBubble(managerName, active) {
  const allGroups = document.querySelectorAll('.scatter-bubble-group');
  const targetGroupId = `scatter-bubble-${managerName.replace(/\s+/g, '_')}`;
  
  if (active) {
    allGroups.forEach(g => {
      const circle = g.querySelector('circle');
      if (g.id === targetGroupId) {
        g.style.opacity = "1";
        if (circle) {
          circle.setAttribute("stroke-width", "4");
          circle.setAttribute("fill-opacity", "0.95");
          circle.setAttribute("stroke", "#ffffff");
        }
        // Bring to front
        g.parentNode.appendChild(g);
      } else {
        g.style.opacity = "0.75";
        if (circle) {
          circle.setAttribute("fill-opacity", "0.55");
        }
      }
    });
  } else {
    allGroups.forEach(g => {
      const isSelected = g.getAttribute('data-manager') === selectedManager;
      const mgrColor = appData.managers[g.getAttribute('data-manager')].color;
      g.style.opacity = "1";
      const circle = g.querySelector('circle');
      if (circle) {
        circle.setAttribute("stroke-width", isSelected ? "4" : "1.5");
        circle.setAttribute("fill-opacity", isSelected ? "0.9" : "0.7");
        circle.setAttribute("stroke", isSelected ? "#ffffff" : mgrColor);
      }
    });
  }
}

function updateScatterPlotHighlight() {
  const allGroups = document.querySelectorAll('.scatter-bubble-group');
  if (!allGroups.length) return;
  
  if (!selectedManager) {
    allGroups.forEach(g => {
      g.style.opacity = "1";
      const mgrColor = appData.managers[g.getAttribute('data-manager')].color;
      const circle = g.querySelector('circle');
      if (circle) {
        circle.setAttribute("stroke-width", "1.5");
        circle.setAttribute("fill-opacity", "0.7");
        circle.setAttribute("stroke", mgrColor);
      }
    });
    return;
  }
  
  const targetGroupId = `scatter-bubble-${selectedManager.replace(/\s+/g, '_')}`;
  allGroups.forEach(g => {
    const isSelected = g.id === targetGroupId;
    const mgrColor = appData.managers[g.getAttribute('data-manager')].color;
    g.style.opacity = "1";
    const circle = g.querySelector('circle');
    if (circle) {
      circle.setAttribute("stroke-width", isSelected ? "4" : "1.5");
      circle.setAttribute("fill-opacity", isSelected ? "0.9" : "0.7");
      circle.setAttribute("stroke", isSelected ? "#ffffff" : mgrColor);
    }
    if (isSelected) {
      // Bring to front
      g.parentNode.appendChild(g);
    }
  });
}

function showScatterTooltip(event, managerName, record, avgCapPts) {
  if (!elScatterTooltip) return;
  
  const mgrMeta = appData.managers[managerName];
  const avgGwPts = record.overall_points / finalGW;
  const r = getScatterRadius(record.overall_points, appData.gameweeks[finalGW.toString()].standings);
  
  elScatterTooltip.innerHTML = `
    <span class="tooltip-title" style="color: ${mgrMeta.color}">${mgrMeta.team}</span>
    <hr style="border: 0; border-top: 1px solid var(--card-border); margin: 6px 0;">
    <span>Total Points: <strong>${record.overall_points} pts</strong></span>
    <span>Average GW Points: <strong>${avgGwPts.toFixed(2)}</strong></span>
    <span>Average Captain Points: <strong>${avgCapPts.toFixed(2)}</strong></span>
    <span>GW Rank in League: <strong>#${record.rank}</strong></span>
  `;
  
  elScatterTooltip.classList.remove('hidden');
  
  const x = getScatterX(avgGwPts);
  const y = getScatterY(avgCapPts);
  
  const tooltipWidth = elScatterTooltip.offsetWidth;
  const tooltipHeight = elScatterTooltip.offsetHeight;
  
  const xPct = (x / SVG_WIDTH) * 100;
  const yPct = (y / SVG_HEIGHT) * 100;
  
  elScatterTooltip.style.left = `calc(${xPct}% - ${tooltipWidth / 2}px)`;
  elScatterTooltip.style.top = `calc(${yPct}% - ${tooltipHeight + r + 15}px)`;
}

function hideScatterTooltip() {
  if (elScatterTooltip) {
    elScatterTooltip.classList.add('hidden');
  }
}

