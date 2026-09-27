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
const TOTAL_RANKS = 11;
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
const elBtnReset = document.getElementById('btn-reset');

// Filter Selectors
const elSelectSeason = document.getElementById('select-season');
const elSelectTeam = document.getElementById('select-team');
const elSelectGw = document.getElementById('select-gw');

// Tab Panels
const elTabFieldRoster = document.getElementById('tab-field-roster');
const elTabWinners = document.getElementById('tab-winners');
const elTabRankings = document.getElementById('tab-rankings');
const elTabScatterPlot = document.getElementById('tab-scatter-plot');
const elTabTransfers = document.getElementById('tab-transfers');

const elPanelFieldRoster = document.getElementById('panel-field-roster');
const elPanelWinners = document.getElementById('panel-winners');
const elPanelRankings = document.getElementById('panel-rankings');
const elPanelScatterPlot = document.getElementById('panel-scatter-plot');
const elPanelTransfers = document.getElementById('panel-transfers');

// Rankings Elements (Consolidated League & Global)
const elBtnViewLeagueRank = document.getElementById('btn-view-league-rank');
const elBtnViewGlobalRank = document.getElementById('btn-view-global-rank');
const elSubviewLeagueRank = document.getElementById('subview-league-rank');
const elSubviewGlobalRank = document.getElementById('subview-global-rank');
const elRankingsHeaderTitleText = document.getElementById('rankings-header-title-text');
let rankingsSubView = 'league'; // 'league' | 'global'

// Winners Elements
const elBtnViewGwWinners = document.getElementById('btn-view-gw-winners');
const elBtnViewWinsTable = document.getElementById('btn-view-wins-table');
const elWinnersGwView = document.getElementById('winners-gw-view');
const elWinnersTableView = document.getElementById('winners-table-view');
const elWinnersCardsContainer = document.getElementById('winners-cards-container');
const elWinnersTableBody = document.getElementById('winners-table-body');
const elMetricMostWins = document.getElementById('metric-most-wins');
const elMetricHighScore = document.getElementById('metric-high-score');
const elMetricTotalPayout = document.getElementById('metric-total-payout');
const elMetricAvgWinningScore = document.getElementById('metric-avg-winning-score');

let winnersSubView = 'gw'; // 'gw' | 'table'

// Transfers Elements
const elBtnViewTeamHistory = document.getElementById('btn-view-team-history');
const elBtnViewGwTransfers = document.getElementById('btn-view-gw-transfers');
const elBtnViewSeasonTransfers = document.getElementById('btn-view-season-transfers');

const elTransfersTeamView = document.getElementById('transfers-team-view');
const elTransfersGwView = document.getElementById('transfers-gw-view');
const elTransfersSeasonView = document.getElementById('transfers-season-view');

const elTransfersTeamCardsContainer = document.getElementById('transfers-team-cards-container');
const elTransfersCardsContainer = document.getElementById('transfers-cards-container');
const elTransfersSeasonTableBody = document.getElementById('transfers-season-table-body');
const elTransfersHeaderTitleText = document.getElementById('transfers-header-title-text');

const elTransfersTeamBanner = document.getElementById('transfers-team-banner');
const elTransfersTeamAvatar = document.getElementById('transfers-team-avatar');
const elTransfersTeamName = document.getElementById('transfers-team-name');
const elTransfersTeamMgr = document.getElementById('transfers-team-mgr');
const elTransfersTeamRoiBadge = document.getElementById('transfers-team-roi-badge');
const elTransfersTeamFtBadge = document.getElementById('transfers-team-ft-badge');
const elSelectTransfersTeam = document.getElementById('select-transfers-team');

const elMetricLabel1 = document.getElementById('metric-label-1');
const elMetricLabel2 = document.getElementById('metric-label-2');
const elMetricLabel3 = document.getElementById('metric-label-3');
const elMetricLabel4 = document.getElementById('metric-label-4');
const elMetricTotalTransfers = document.getElementById('metric-total-transfers');
const elMetricTotalHits = document.getElementById('metric-total-hits');
const elMetricTransferKing = document.getElementById('metric-transfer-king');
const elMetricTransferFlop = document.getElementById('metric-transfer-flop');

let transfersSubView = 'gw'; // 'gw' | 'team' | 'season'

// Main Pitch Elements
const elMainPitchTeamName = document.getElementById('main-pitch-team-name');
const elMainPitchManagerName = document.getElementById('main-pitch-manager-name');
const elMainPitchGwPts = document.getElementById('main-pitch-gw-pts');
const elMainPitchTotalPts = document.getElementById('main-pitch-total-pts');
const elMainPitchRank = document.getElementById('main-pitch-rank');
const elMainPitchAvatar = document.getElementById('main-pitch-avatar');
const elMainPitchRemaining = document.getElementById('main-pitch-remaining');

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
function initApp() {
  setupEventListeners();
  loadSeasonData(currentSeason);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Fetch season data dynamically
function loadSeasonData(seasonKey) {
  currentSeason = seasonKey;
  
  if (loadedSeasons[seasonKey]) {
    appData = loadedSeasons[seasonKey];
    onSeasonDataLoaded();
    return;
  }
  
  const cacheBuster = '?t=' + Date.now();
  const jsonUrl = (seasonKey === '2025_26' ? './visualizer_data_2025_26.json' : './visualizer_data_2026_27.json') + cacheBuster;
  
  fetch(jsonUrl)
    .then(response => {
      if (!response.ok) {
        return fetch('./visualizer_data.json' + cacheBuster).then(r => {
          if (!r.ok) throw new Error(`Failed to load visualizer data (HTTP ${r.status})`);
          return r.json();
        });
      }
      return response.json();
    })
    .then(data => {
      loadedSeasons[seasonKey] = data;
      appData = data;
      try {
        onSeasonDataLoaded();
      } catch (renderError) {
        console.error('Error rendering dashboard:', renderError);
      }
    })
    .catch(error => {
      console.error('Error fetching season data:', error);
      if (elHeaderLeader) elHeaderLeader.innerText = "Error loading data";
    });
}

function getLatestGWWithData(data) {
  if (!data || !data.gameweeks) return 1;
  const gws = Object.keys(data.gameweeks).map(Number).sort((a, b) => b - a);
  for (const gw of gws) {
    const gwStr = gw.toString();
    const standings = data.gameweeks[gwStr] ? data.gameweeks[gwStr].standings : [];
    const hasData = standings.some(s => (s.gw_points && s.gw_points > 0) || (s.transfers && s.transfers > 0) || (s.gw_hits && s.gw_hits !== 0));
    if (hasData) return gw;
  }
  return 1;
}

function onSeasonDataLoaded() {
  currentGW = getLatestGWWithData(appData);
  
  const activeGWStandings = appData.gameweeks[currentGW.toString()] ? appData.gameweeks[currentGW.toString()].standings : [];
  let leader = null;
  if (leaderboardSortMode === 'gw') {
    const sortedByGw = [...activeGWStandings].sort((a, b) => (b.gw_points || 0) - (a.gw_points || 0));
    leader = sortedByGw[0];
  } else {
    leader = activeGWStandings.find(s => s.rank === 1);
  }
  selectedManager = leader ? leader.manager : Object.keys(appData.managers)[0];
  
  populateTeamDropdown();
  initDashboard();
}

function populateTeamDropdown() {
  if (!appData || !appData.managers) return;
  if (elSelectTeam) elSelectTeam.innerHTML = '<option value="">-- All Teams / Leader --</option>';
  if (elSelectTransfersTeam) elSelectTransfersTeam.innerHTML = '';
  
  const sortedManagers = Object.keys(appData.managers).sort((a, b) => {
    return appData.managers[a].team.localeCompare(appData.managers[b].team);
  });
  
  sortedManagers.forEach(mgr => {
    const meta = appData.managers[mgr];
    if (elSelectTeam) {
      const opt = document.createElement('option');
      opt.value = mgr;
      opt.innerText = `${meta.team} (${mgr})`;
      if (mgr === selectedManager) opt.selected = true;
      elSelectTeam.appendChild(opt);
    }
    if (elSelectTransfersTeam) {
      const optT = document.createElement('option');
      optT.value = mgr;
      optT.innerText = `${meta.team} (${mgr})`;
      if (mgr === selectedManager) optT.selected = true;
      elSelectTransfersTeam.appendChild(optT);
    }
  });
}

function populateGwDropdown() {
  if (!elSelectGw || !appData || !appData.gameweeks) return;
  elSelectGw.innerHTML = '';
  
  const gws = Object.keys(appData.gameweeks).map(Number).sort((a, b) => a - b);
  const maxPlayedGW = getLatestGWWithData(appData);
  
  gws.forEach(i => {
    const isPlayed = i <= maxPlayedGW;
    
    const opt = document.createElement('option');
    opt.value = i;
    
    if (isPlayed) {
      opt.innerText = `Gameweek ${i}`;
    } else {
      opt.innerText = `GW ${i} (Upcoming)`;
      opt.disabled = true;
    }
    
    if (i === currentGW) opt.selected = true;
    elSelectGw.appendChild(opt);
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

  // Gameweek Selector Dropdown
  if (elSelectGw) {
    elSelectGw.addEventListener('change', (e) => {
      currentGW = parseInt(e.target.value);
      updateDashboard();
    });
  }

  // Playback Controls (if present)
  if (elBtnPlayPause) elBtnPlayPause.addEventListener('click', togglePlayback);
  if (elSelectSpeed) {
    elSelectSpeed.addEventListener('change', (e) => {
      playbackSpeed = parseInt(e.target.value);
      if (playing) {
        pauseTimeline();
        playTimeline();
      }
    });
  }
  
  // Slider / Timeline (if present)
  if (elSlider) {
    elSlider.addEventListener('input', (e) => {
      currentGW = parseInt(e.target.value);
      updateDashboard();
    });
  }
  
  // Reset
  if (elBtnReset) {
    elBtnReset.addEventListener('click', () => {
      pauseTimeline();
      currentGW = 1;
      updateDashboard();
    });
  }
  
  // Tabs
  if (elTabFieldRoster) elTabFieldRoster.addEventListener('click', () => switchTab('field-roster'));
  if (elTabWinners) elTabWinners.addEventListener('click', () => switchTab('winners'));
  if (elTabRankings) elTabRankings.addEventListener('click', () => switchTab('rankings'));
  if (elTabScatterPlot) elTabScatterPlot.addEventListener('click', () => switchTab('scatter-plot'));
  if (elTabTransfers) elTabTransfers.addEventListener('click', () => switchTab('transfers'));

  // Rankings Subview Listeners
  if (elBtnViewLeagueRank) {
    elBtnViewLeagueRank.addEventListener('click', () => switchRankingsSubView('league'));
  }
  if (elBtnViewGlobalRank) {
    elBtnViewGlobalRank.addEventListener('click', () => switchRankingsSubView('global'));
  }

  // Winners Subview Listeners
  if (elBtnViewGwWinners) {
    elBtnViewGwWinners.addEventListener('click', () => switchWinnersSubView('gw'));
  }
  if (elBtnViewWinsTable) {
    elBtnViewWinsTable.addEventListener('click', () => switchWinnersSubView('table'));
  }

  // Transfers Subview Listeners
  if (elBtnViewTeamHistory) {
    elBtnViewTeamHistory.addEventListener('click', () => switchTransfersSubView('team'));
  }
  if (elBtnViewGwTransfers) {
    elBtnViewGwTransfers.addEventListener('click', () => switchTransfersSubView('gw'));
  }
  if (elBtnViewSeasonTransfers) {
    elBtnViewSeasonTransfers.addEventListener('click', () => switchTransfersSubView('season'));
  }

  // Transfers Team Select Dropdown Listener
  if (elSelectTransfersTeam) {
    elSelectTransfersTeam.addEventListener('change', (e) => {
      if (e.target.value) {
        selectManager(e.target.value);
      }
    });
  }

  // Leaderboard Sort Listeners
  setupLeaderboardListeners();
}

function initDashboard() {
  // Determine the latest gameweek that has actually been played
  finalGW = getLatestGWWithData(appData);

  // Populate Gameweek dropdown and slider limits
  populateGwDropdown();
  if (elSlider) {
    elSlider.min = 1;
    elSlider.max = finalGW;
    elSlider.value = currentGW;
  }
  
  // Calculate historical MVP stats
  calculateSeasonStats();
  
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
  if (elTabWinners) elTabWinners.classList.remove('active');
  if (elTabRankings) elTabRankings.classList.remove('active');
  if (elTabScatterPlot) elTabScatterPlot.classList.remove('active');
  if (elTabTransfers) elTabTransfers.classList.remove('active');
  
  if (elPanelFieldRoster) elPanelFieldRoster.classList.remove('active');
  if (elPanelWinners) elPanelWinners.classList.remove('active');
  if (elPanelRankings) elPanelRankings.classList.remove('active');
  if (elPanelScatterPlot) elPanelScatterPlot.classList.remove('active');
  if (elPanelTransfers) elPanelTransfers.classList.remove('active');
  
  if (tab === 'field-roster') {
    if (elTabFieldRoster) elTabFieldRoster.classList.add('active');
    if (elPanelFieldRoster) elPanelFieldRoster.classList.add('active');
  } else if (tab === 'winners') {
    if (elTabWinners) elTabWinners.classList.add('active');
    if (elPanelWinners) elPanelWinners.classList.add('active');
    renderWinnersView();
  } else if (tab === 'rankings') {
    if (elTabRankings) elTabRankings.classList.add('active');
    if (elPanelRankings) elPanelRankings.classList.add('active');
    if (rankingsSubView === 'league') {
      renderBumpChart();
    } else {
      renderGlobalRankChart();
    }
    updateBumpTracker();
  } else if (tab === 'scatter-plot') {
    if (elTabScatterPlot) elTabScatterPlot.classList.add('active');
    if (elPanelScatterPlot) elPanelScatterPlot.classList.add('active');
  } else if (tab === 'transfers') {
    if (elTabTransfers) elTabTransfers.classList.add('active');
    if (elPanelTransfers) elPanelTransfers.classList.add('active');
    renderTransfersView();
  }
}

function switchRankingsSubView(subView) {
  rankingsSubView = subView;

  if (elBtnViewLeagueRank) elBtnViewLeagueRank.classList.toggle('active', subView === 'league');
  if (elBtnViewGlobalRank) elBtnViewGlobalRank.classList.toggle('active', subView === 'global');

  if (elSubviewLeagueRank) elSubviewLeagueRank.classList.toggle('hidden', subView !== 'league');
  if (elSubviewGlobalRank) elSubviewGlobalRank.classList.toggle('hidden', subView !== 'global');

  if (elRankingsHeaderTitleText) {
    elRankingsHeaderTitleText.innerText = subView === 'league' 
      ? 'Blue Square Rank Trajectory' 
      : 'Global Rank Trajectory';
  }

  if (subView === 'league') {
    renderBumpChart();
  } else {
    renderGlobalRankChart();
  }
  updateBumpTracker();
}

// Playback Logic
function togglePlayback() {
  if (playing) {
    pauseTimeline();
  } else {
    if (currentGW >= finalGW) {
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
    if (currentGW > finalGW) {
      pauseTimeline();
      currentGW = finalGW;
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

// Coordinate helper for Bump Chart & Global Rank SVGs
function getMaxChartGW() {
  const maxGW = finalGW || getLatestGWWithData(appData) || 1;
  return Math.max(1, maxGW);
}

function getBumpX(gw) {
  const maxGW = getMaxChartGW();
  if (maxGW <= 1) return BUMP_MARGIN.left + BUMP_INNER_WIDTH / 2;
  const stepX = BUMP_INNER_WIDTH / (maxGW - 1);
  return BUMP_MARGIN.left + (gw - 1) * stepX;
}

function getTotalRanks() {
  if (appData && appData.managers) {
    const count = Object.keys(appData.managers).length;
    if (count > 1) return count;
  }
  return TOTAL_RANKS;
}

function getBumpY(rank) {
  const totalRanks = getTotalRanks();
  const stepY = BUMP_INNER_HEIGHT / (totalRanks - 1);
  return BUMP_MARGIN.top + (rank - 1) * stepY;
}

// ----------------------------------------------------
// CHIP HELPER
// ----------------------------------------------------

function getChipShortName(chip) {
  if (!chip) return '';
  const info = getChipInfo(chip);
  return info ? info.short : chip;
}

function getChipInfo(chip) {
  if (!chip || chip === 'None') return null;
  const lower = chip.toLowerCase().replace(/[\s_0-9]+/g, '');
  
  if (lower.includes('wildcard') || lower === 'wc') {
    return { name: 'Wildcard', short: 'WC', cssClass: 'wildcard', icon: 'fa-wand-magic-sparkles' };
  }
  if (lower.includes('freehit') || lower === 'fh') {
    return { name: 'Free Hit', short: 'FH', cssClass: 'freehit', icon: 'fa-shuffle' };
  }
  if (lower.includes('bboost') || lower.includes('benchboost') || lower === 'bb') {
    return { name: 'Bench Boost', short: 'BB', cssClass: 'bboost', icon: 'fa-couch' };
  }
  if (lower.includes('3xc') || lower.includes('triplecaptain') || lower === 'tc') {
    return { name: '3x Captain', short: '3xC', cssClass: '3xc', icon: 'fa-bolt' };
  }
  return { name: chip, short: chip, cssClass: 'wildcard', icon: 'fa-bolt' };
}

// ----------------------------------------------------
// BUMP CHART IMPLEMENTATION
// ----------------------------------------------------
function renderBumpChart() {
  // Clear existing SVG paths/circles
  elBumpSvg.innerHTML = '';
  elBumpLegend.innerHTML = '';
  
  const managers = Object.keys(appData.managers);
  const maxGW = getMaxChartGW();
  
  // 1. Draw SVG Background Grid Lines
  // Draw gameweek vertical lines
  for (let gw = 1; gw <= maxGW; gw++) {
    const x = getBumpX(gw);
    const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    gridLine.setAttribute("x1", x);
    gridLine.setAttribute("y1", BUMP_MARGIN.top);
    gridLine.setAttribute("x2", x);
    gridLine.setAttribute("y2", SVG_HEIGHT - BUMP_MARGIN.bottom);
    gridLine.setAttribute("stroke", "rgba(255,255,255,0.03)");
    gridLine.setAttribute("stroke-width", "1");
    elBumpSvg.appendChild(gridLine);
    
    // Add GW label text at top
    const showLabel = (maxGW <= 15) || (gw === 1 || gw % 5 === 0 || gw === maxGW);
    if (showLabel) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x);
      text.setAttribute("y", BUMP_MARGIN.top - 12);
      text.setAttribute("fill", "#64748b");
      text.setAttribute("font-size", "11px");
      text.setAttribute("font-weight", "600");
      text.setAttribute("font-family", "Space Grotesk");
      text.setAttribute("text-anchor", "middle");
      text.textContent = `GW${gw}`;
      elBumpSvg.appendChild(text);
    }
  }
  
  // Draw rank horizontal lines
  const totalRanks = getTotalRanks();
  for (let rank = 1; rank <= totalRanks; rank++) {
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
    for (let gw = 1; gw <= finalGW; gw++) {
      const gwData = appData?.gameweeks?.[gw.toString()];
      if (!gwData || !gwData.standings) continue;
      const standings = gwData.standings;
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
      const cpX1 = xPrev + (xCurr - xPrev) / 2;
      const cpY1 = yPrev;
      const cpX2 = xCurr - (xCurr - xPrev) / 2;
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
  if (elSelectTransfersTeam) {
    elSelectTransfersTeam.value = managerName;
  }
  
  // Update UI components
  updateManagerCard();
  updateLineupPitch();
  
  // Highlight selected path in Bump Chart
  updateBumpChartHighlight();
  
  // Highlight selected path in Global Rank Chart
  updateGlobalRankChartHighlight();
  
  // Highlight selected bubble in Scatter Plot
  if (elScatterSvg) updateScatterPlotHighlight();
  
  // Highlight selected leaderboard row
  renderLeaderboard();

  // Re-render Transfers View (updates team history by gameweek for this manager)
  renderTransfersView();
}

function updateManagerCard() {
  const mgrInfoCard = document.getElementById('manager-info-card');
  if (!mgrInfoCard && !elManagerCaptainName && !elManagerName) return;
  if (!selectedManager || !appData) return;
  
  const gwData = appData?.gameweeks?.[currentGW.toString()];
  if (!gwData || !gwData.standings) return;
  const standings = gwData.standings;
  const mgrRecord = standings.find(s => s.manager === selectedManager);
  const mgrMeta = appData.managers[selectedManager];
  
  if (!mgrRecord || !mgrMeta) return;
  
  // Colors and avatars
  if (elManagerAvatar) {
    elManagerAvatar.style.backgroundColor = mgrMeta.color;
    elManagerAvatar.style.boxShadow = `0 4px 15px ${mgrMeta.color}40`;
  }
  
  // Card top indicator border
  if (mgrInfoCard) mgrInfoCard.style.setProperty('--accent', mgrMeta.color);
  
  // Text details
  if (elManagerName) elManagerName.innerText = mgrMeta.team;
  if (elManagerTeam) elManagerTeam.innerText = `Leaderboard Rank #${mgrRecord.rank}`;
  if (elManagerRank) {
    elManagerRank.innerText = `#${mgrRecord.rank}`;
    elManagerRank.style.color = mgrMeta.color;
    elManagerRank.style.backgroundColor = `${mgrMeta.color}15`;
    elManagerRank.style.borderColor = `${mgrMeta.color}30`;
  }
  
  if (elManagerGwPts) elManagerGwPts.innerText = `${mgrRecord.gw_points} pts`;
  
  // Hits display
  const hitsStr = mgrRecord.gw_hits > 0 ? `(-${mgrRecord.gw_hits} hits)` : '';
  if (elManagerGwNetPts) elManagerGwNetPts.innerText = `${mgrRecord.gw_net_points} pts ${hitsStr}`;
  if (elManagerOverallPts) elManagerOverallPts.innerText = `${mgrRecord.overall_points} pts`;
  if (elManagerOverallRank) elManagerOverallRank.innerText = mgrRecord.overall_rank ? mgrRecord.overall_rank.toLocaleString() : '—';
  
  // Calculate Best Rank and Final Rank
  let bestRank = Infinity;
  Object.keys(appData.gameweeks || {}).forEach(gw => {
    const gwObj = appData.gameweeks[gw];
    if (!gwObj || !gwObj.standings) return;
    const record = gwObj.standings.find(s => s.manager === selectedManager);
    if (record && record.overall_rank && record.overall_rank > 0 && record.overall_rank < bestRank) {
      bestRank = record.overall_rank;
    }
  });
  
  const availableGWs = Object.keys(appData.gameweeks || {}).map(Number);
  const maxGW = availableGWs.length > 0 ? Math.max(...availableGWs) : 1;
  const finalStandings = appData?.gameweeks?.[maxGW.toString()]?.standings || [];
  const finalRecord = finalStandings.find(s => s.manager === selectedManager);
  const finalRank = finalRecord ? finalRecord.overall_rank : null;
  
  if (elManagerBestRank) elManagerBestRank.innerText = bestRank !== Infinity ? bestRank.toLocaleString() : '—';
  if (elManagerFinalRank) elManagerFinalRank.innerText = finalRank ? finalRank.toLocaleString() : '—';
  
  // Captain Row
  const capPointsStr = mgrRecord.captain_points !== undefined ? ` (${mgrRecord.captain_points} pts)` : '';
  if (elManagerCaptainName) elManagerCaptainName.innerText = mgrRecord.captain ? `${mgrRecord.captain}${capPointsStr}` : '—';
  
  // Chip Played
  if (elManagerChipBadge && elManagerChipName) {
    if (mgrRecord.chip && mgrRecord.chip !== 'None') {
      elManagerChipBadge.classList.remove('hidden');
      elManagerChipName.innerText = mgrRecord.chip;
    } else {
      elManagerChipBadge.classList.add('hidden');
    }
  }
  
  // Transfers Made
  if (elManagerTransfersCount) elManagerTransfersCount.innerText = mgrRecord.transfers;
  
  // Transfers In / Out lists
  if (elManagerTransfersIn) {
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
  }

  if (elManagerTransfersOut) {
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
    if (elMainPitchRemaining) {
      const leftCount = mgrRecord.players_left !== undefined ? mgrRecord.players_left : 0;
      const leftVal = mgrRecord.value_left !== undefined ? mgrRecord.value_left : 0;
      elMainPitchRemaining.innerHTML = `<i class="fa-solid fa-stopwatch"></i> ${leftCount}/11 Left <small>(£${leftVal}m)</small>`;
    }
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
  let starters = mgrLineup.filter(p => p.starting);
  let bench = mgrLineup.filter(p => !p.starting);
  
  // Failsafe: Guarantee exactly 11 starters and 4 bench players if data has unexpected starting flags
  if (starters.length !== 11 && mgrLineup.length === 15) {
    starters = mgrLineup.slice(0, 11).map(p => ({ ...p, starting: true }));
    bench = mgrLineup.slice(11).map(p => ({ ...p, starting: false }));
  }
  
  // Identify players transferred in for this manager in this gameweek
  const transferredInSet = new Set(mgrRecord?.transfers_in || []);

  // Render Starters by row
  starters.forEach(player => {
    const isTransferredIn = transferredInSet.has(player.name);
    const card1 = createPlayerCardDOM(player, maxPts, isTransferredIn);
    const card2 = createPlayerCardDOM(player, maxPts, isTransferredIn);
    
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
    const isTransferredIn = transferredInSet.has(player.name);
    const card1 = createPlayerCardDOM(player, maxPts, isTransferredIn);
    const card2 = createPlayerCardDOM(player, maxPts, isTransferredIn);
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

function createPlayerCardDOM(player, maxSquadPts, isTransferredIn = false) {
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

  // Transferred-in badge
  let transferInHtml = '';
  if (isTransferredIn) {
    transferInHtml = `<span class="player-badge transfer-in-badge" title="New transfer signing in GW ${currentGW}">IN</span>`;
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
      ${badgeHtml}
      ${mvpHtml}
      ${transferInHtml}
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
  if (!appData || !appData.gameweeks) return;
  
  if (finalGW && currentGW > finalGW) {
    currentGW = finalGW;
  }
  
  // Sync Gameweek selector, slider and header tags
  if (elSelectGw) elSelectGw.value = currentGW;
  if (elSlider) elSlider.value = currentGW;
  if (elHeaderGw) elHeaderGw.innerText = currentGW;
  
  // 1. Move Bump Tracker Line
  updateBumpTracker();
  
  // 4. Update highlights in bump chart
  updateBumpChartHighlight();
  
  // 5. Update selected manager card & lineup
  updateManagerCard();
  updateLineupPitch();
  
  // 6. Update Leaderboard
  renderLeaderboard();
  
  // 7. Update Transfers View
  renderTransfersView();

  // 8. Update Scatter Plot
  if (elScatterSvg) updateScatterPlot();
}

let leaderboardSortMode = 'gw'; // 'gw' | 'total'

function setupLeaderboardListeners() {
  const btnSortTotal = document.getElementById('sort-total-pts');
  const btnSortGw = document.getElementById('sort-gw-pts');
  
  if (btnSortTotal) {
    btnSortTotal.addEventListener('click', () => {
      leaderboardSortMode = 'total';
      btnSortTotal.classList.add('active');
      if (btnSortGw) btnSortGw.classList.remove('active');
      renderLeaderboard();
    });
  }
  
  if (btnSortGw) {
    btnSortGw.addEventListener('click', () => {
      leaderboardSortMode = 'gw';
      btnSortGw.classList.add('active');
      if (btnSortTotal) btnSortTotal.classList.remove('active');
      renderLeaderboard();
    });
  }
}

function renderLeaderboard() {
  const elLeaderboardList = document.getElementById('gw-leaderboard-list');
  const elLbGwNum = document.getElementById('lb-gw-num');
  if (!elLeaderboardList || !appData) return;
  
  if (elLbGwNum) elLbGwNum.innerText = currentGW;
  elLeaderboardList.innerHTML = '';
  
  const gwData = appData.gameweeks[currentGW.toString()];
  if (!gwData || !gwData.standings) return;
  
  // Sort standings dynamically based on leaderboardSortMode
  const standings = [...gwData.standings].sort((a, b) => {
    if (leaderboardSortMode === 'gw') {
      if (b.gw_points !== a.gw_points) return b.gw_points - a.gw_points;
      return b.overall_points - a.overall_points;
    }
    // Default 'total': sort by overall_points
    if (b.overall_points !== a.overall_points) return b.overall_points - a.overall_points;
    return b.gw_points - a.gw_points;
  });

  // Find maximum score in active sort mode for bar width scaling
  const maxScore = standings.length > 0 
    ? (leaderboardSortMode === 'gw' ? standings[0].gw_points : standings[0].overall_points)
    : 1;
  
  standings.forEach((mgrRecord, index) => {
    const mgrMeta = appData.managers[mgrRecord.manager] || { team: mgrRecord.manager, color: '#00d2d3' };
    const isSelected = mgrRecord.manager === selectedManager;
    const rankNum = index + 1;
    const isWinner = rankNum === 1;
    
    // Calculate background bar width percentage
    const rowScore = leaderboardSortMode === 'gw' ? mgrRecord.gw_points : mgrRecord.overall_points;
    const barWidthPct = maxScore > 0 ? Math.max(6, (rowScore / maxScore) * 100) : 6;

    // Transfers & Hits
    const transfersCount = mgrRecord.transfers !== undefined ? mgrRecord.transfers : (mgrRecord.transfers_detail?.length || 0);
    const hitsCount = mgrRecord.gw_hits !== undefined ? mgrRecord.gw_hits : 0;
    const hitsPenalty = Math.abs(hitsCount);
    
    let hitBadgeHtml = '';
    if (hitsPenalty > 0) {
      hitBadgeHtml = `<span class="lb-hit-badge danger" title="${hitsPenalty} pts hit penalty">-${hitsPenalty} hit</span>`;
    } else {
      hitBadgeHtml = `<span class="lb-hit-badge neutral" title="0 hit penalty">0 hit</span>`;
    }

    // Net transfer delta badge
    let netDeltaBadge = '';
    if (mgrRecord.transfers_detail && mgrRecord.transfers_detail.length > 0) {
      const gross = mgrRecord.transfers_detail.reduce((sum, t) => sum + (t.net_points || 0), 0);
      const net = gross - hitsPenalty;
      const netClass = net > 0 ? 'positive' : (net < 0 ? 'negative' : 'neutral');
      const netPrefix = net > 0 ? '+' : '';
      netDeltaBadge = `<span class="lb-net-delta-pill ${netClass}" title="Transfer ROI: ${netPrefix}${net} pts">${netPrefix}${net} net</span>`;
    }
    
    // Players Remaining Badge
    let playersLeftHtml = '';
    if (mgrRecord.players_left !== undefined) {
      playersLeftHtml = `<span class="lb-players-left-badge" title="${mgrRecord.players_left} players left to play (£${mgrRecord.value_left}m squad value)"><i class="fa-solid fa-user-clock"></i> ${mgrRecord.players_left} left <small>(£${mgrRecord.value_left}m)</small></span>`;
    }

    // Chip Active Badge (Wildcard, Free Hit, Bench Boost, 3x Captain)
    const chipInfo = getChipInfo(mgrRecord.chip);
    let chipBadgeHtml = '';
    if (chipInfo) {
      chipBadgeHtml = `<span class="lb-chip-badge chip-${chipInfo.cssClass}" title="Active Chip in GW ${currentGW}: ${chipInfo.name}"><i class="fa-solid ${chipInfo.icon}"></i> ${chipInfo.name}</span>`;
    }

    const row = document.createElement('div');
    row.className = `leaderboard-row ${isSelected ? 'active' : ''}`;
    row.style.borderLeft = `4px solid ${mgrMeta.color}`;
    
    row.innerHTML = `
      <div class="lb-row-bar-bg" style="width: ${barWidthPct}%; background: ${mgrMeta.color};"></div>
      <div class="lb-rank-badge ${isWinner ? 'winner' : ''}">
        ${isWinner ? '<i class="fa-solid fa-crown"></i>' : `#${rankNum}`}
      </div>
      <div class="lb-team-info">
        <div class="lb-team-title-row">
          <span class="lb-team-title" style="color: ${mgrMeta.color}">${mgrMeta.team}</span>
          ${chipBadgeHtml}
        </div>
        <div class="lb-sub-row">
          <span class="lb-mgr-sub">${mgrRecord.manager}</span>
          ${playersLeftHtml}
        </div>
      </div>
      <div class="lb-transfers-cell" title="Click to view ${mgrRecord.manager}'s transfers for GW ${currentGW}">
        <span class="lb-tx-badge"><i class="fa-solid fa-right-left"></i> ${transfersCount} tx</span>
        ${hitBadgeHtml}
        ${netDeltaBadge}
      </div>
      <div class="lb-points-cell">
        <span class="lb-gw-pts ${leaderboardSortMode === 'gw' ? 'highlight-sort' : ''}">+${mgrRecord.gw_points} <small>GW${currentGW}</small></span>
        <span class="lb-total-pts ${leaderboardSortMode === 'total' ? 'highlight-sort' : ''}">${mgrRecord.overall_points.toLocaleString()} <small>Total</small></span>
      </div>
    `;
    
    // Clicking anywhere on the row selects the manager
    row.addEventListener('click', () => {
      selectManager(mgrRecord.manager);
    });

    // Clicking specifically on the transfers cell navigates to the Transfers tab to see what the manager did
    const transfersCell = row.querySelector('.lb-transfers-cell');
    if (transfersCell) {
      transfersCell.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent row click double handling
        selectManager(mgrRecord.manager);
        showManagerTransfersView(mgrRecord.manager);
      });
    }
    
    elLeaderboardList.appendChild(row);
  });
}

function showManagerTransfersView(managerName) {
  // 1. Switch to Transfers tab
  switchTab('transfers');

  // 2. Default to GW Moves view for current gameweek
  switchTransfersSubView('gw');

  // 3. Find this manager's card in GW Moves
  requestAnimationFrame(() => {
    const card = document.querySelector(`.transfer-card[data-manager="${managerName}"]`);
    if (card) {
      // Expand card if collapsed
      card.classList.remove('collapsed');
      card.classList.add('expanded');

      // Add target highlight flash animation
      card.classList.remove('target-highlight');
      void card.offsetWidth; // trigger reflow for animation restart
      card.classList.add('target-highlight');

      // Scroll into view smoothly
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // Manager made no transfers in current GW, switch to Team History view to show full timeline
      switchTransfersSubView('team');
    }
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
  
  // Go through played gameweeks only
  const maxPlayedGW = finalGW || getLatestGWWithData(appData);
  Object.keys(appData.gameweeks).forEach(gw => {
    if (Number(gw) > maxPlayedGW) return;
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
  for (let gw = 1; gw <= finalGW; gw++) {
    const gwObj = appData.gameweeks?.[gw.toString()];
    if (!gwObj || !gwObj.standings) continue;
    gwObj.standings.forEach(s => {
      const r = s.overall_rank;
      if (r && r > 0) {
        if (r < globalRankMin) globalRankMin = r;
        if (r > globalRankMax) globalRankMax = r;
      }
    });
  }

  // If no global rank data found (e.g. pre-season), fallback to 1..100000
  if (globalRankMin === Infinity) globalRankMin = 1;
  if (globalRankMax === -Infinity) globalRankMax = 100000;

  // Add a 5% margin to min and max so values don't clip at top/bottom
  const diff = globalRankMax - globalRankMin;
  const pad = diff * 0.05 || 1000;
  globalRankYMinLimit = Math.max(1, globalRankMin - pad);
  globalRankYMaxLimit = globalRankMax + pad;

  const maxGW = getMaxChartGW();

  // 1. Draw SVG Background Grid Lines
  // Draw gameweek vertical lines
  for (let gw = 1; gw <= maxGW; gw++) {
    const x = getBumpX(gw);
    const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    gridLine.setAttribute("x1", x);
    gridLine.setAttribute("y1", BUMP_MARGIN.top);
    gridLine.setAttribute("x2", x);
    gridLine.setAttribute("y2", SVG_HEIGHT - BUMP_MARGIN.bottom);
    gridLine.setAttribute("stroke", "rgba(255,255,255,0.03)");
    gridLine.setAttribute("stroke-width", "1");
    elGlobalSvg.appendChild(gridLine);
    
    const showLabel = (maxGW <= 15) || (gw === 1 || gw % 5 === 0 || gw === maxGW);
    if (showLabel) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x);
      text.setAttribute("y", BUMP_MARGIN.top - 12);
      text.setAttribute("fill", "#64748b");
      text.setAttribute("font-size", "11px");
      text.setAttribute("font-weight", "600");
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
    for (let gw = 1; gw <= finalGW; gw++) {
      const gwObj = appData.gameweeks?.[gw.toString()];
      if (!gwObj || !gwObj.standings) continue;
      const record = gwObj.standings.find(s => s.manager === managerName);
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

      const cpX1 = xPrev + (xCurr - xPrev) / 2;
      const cpY1 = yPrev;
      const cpX2 = xCurr - (xCurr - xPrev) / 2;
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
    
    for (let gw = 1; gw <= finalGW; gw++) {
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

// ----------------------------------------------------
// GAMEWEEK WINNERS & TROPHY ROOM IMPLEMENTATION
// ----------------------------------------------------
function switchWinnersSubView(subView) {
  winnersSubView = subView;
  if (elBtnViewGwWinners) elBtnViewGwWinners.classList.toggle('active', subView === 'gw');
  if (elBtnViewWinsTable) elBtnViewWinsTable.classList.toggle('active', subView === 'table');
  if (elWinnersGwView) elWinnersGwView.classList.toggle('hidden', subView !== 'gw');
  if (elWinnersTableView) elWinnersTableView.classList.toggle('hidden', subView !== 'table');
  renderWinnersView();
}

function renderWinnersView() {
  if (!appData || !appData.gameweeks) return;
  
  const maxPlayedGW = finalGW || getLatestGWWithData(appData);
  const availableGWs = Object.keys(appData.gameweeks).map(Number).sort((a, b) => a - b);
  const playedGWs = availableGWs.filter(gw => gw <= maxPlayedGW);
  if (playedGWs.length === 0) return;

  // Compute GW winners for each played gameweek
  const gwWinnersList = [];
  const managerWinStats = {};

  Object.keys(appData.managers).forEach(mgr => {
    managerWinStats[mgr] = {
      manager: mgr,
      team: appData.managers[mgr].team,
      color: appData.managers[mgr].color,
      wins: 0,
      payout: 0,
      highScore: 0,
      wonGWs: []
    };
  });

  let totalPayout = 0;
  let seasonHighScore = { score: 0, manager: '', gw: 1 };
  let sumWinningScores = 0;

  playedGWs.forEach(gw => {
    const gwData = appData.gameweeks[gw.toString()];
    if (!gwData || !gwData.standings || gwData.standings.length === 0) return;
    const standings = gwData.standings;
    const maxPts = Math.max(...standings.map(s => s.gw_points));
    if (maxPts <= 0 && !standings.some(s => (s.transfers && s.transfers > 0) || (s.gw_hits && s.gw_hits !== 0))) return;
    const winners = standings.filter(s => s.gw_points === maxPts);
    const runnerUps = standings.filter(s => s.gw_points < maxPts);
    const secondPts = runnerUps.length > 0 ? Math.max(...runnerUps.map(s => s.gw_points)) : maxPts;
    const margin = maxPts - secondPts;

    sumWinningScores += maxPts;
    if (maxPts > seasonHighScore.score) {
      seasonHighScore = { score: maxPts, manager: winners[0].manager, gw: gw };
    }

    const gwPrize = (currentSeason === '2026_27' || !currentSeason) ? 10.0 : (currentSeason === '2025_26' ? 15.0 : 10.0);
    const payoutPerWinner = gwPrize / winners.length;

    winners.forEach(w => {
      const mgr = w.manager;
      if (!managerWinStats[mgr]) {
        managerWinStats[mgr] = {
          manager: mgr,
          team: w.team,
          color: appData.managers[mgr]?.color || '#1e90ff',
          wins: 0,
          payout: 0,
          highScore: 0,
          wonGWs: []
        };
      }
      managerWinStats[mgr].wins += 1;
      managerWinStats[mgr].payout += payoutPerWinner;
      managerWinStats[mgr].wonGWs.push(gw);
      if (maxPts > managerWinStats[mgr].highScore) {
        managerWinStats[mgr].highScore = maxPts;
      }
    });

    totalPayout += gwPrize;

    // Get winner captain from lineups
    const primaryWinner = winners[0];
    const lineup = gwData.lineups?.[primaryWinner.manager] || [];
    const captainPlayer = lineup.find(p => p.captain || p.is_captain);

    gwWinnersList.push({
      gw,
      winningPts: maxPts,
      margin,
      winners,
      payoutPerWinner,
      chip: primaryWinner.chip,
      captain: captainPlayer
    });
  });

  // Calculate Most Wins Leader
  const sortedManagers = Object.values(managerWinStats).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.payout !== a.payout) return b.payout - a.payout;
    return b.highScore - a.highScore;
  });

  const topLeader = sortedManagers[0];
  if (elMetricMostWins) {
    if (topLeader && topLeader.wins > 0) {
      elMetricMostWins.innerText = `${topLeader.manager} (${topLeader.wins} win${topLeader.wins === 1 ? '' : 's'})`;
    } else {
      elMetricMostWins.innerText = '-';
    }
  }

  if (elMetricHighScore) {
    elMetricHighScore.innerText = `${seasonHighScore.score} pts (${seasonHighScore.manager}, GW${seasonHighScore.gw})`;
  }

  if (elMetricTotalPayout) {
    elMetricTotalPayout.innerText = `$${Math.round(totalPayout)}`;
  }

  if (elMetricAvgWinningScore) {
    const avg = playedGWs.length > 0 ? Math.round(sumWinningScores / playedGWs.length) : 0;
    elMetricAvgWinningScore.innerText = `${avg} pts`;
  }

  // Render Subview 1: GW by GW Cards (Newest first)
  if (elWinnersCardsContainer) {
    elWinnersCardsContainer.innerHTML = '';
    const descendingWinners = [...gwWinnersList].sort((a, b) => b.gw - a.gw);

    descendingWinners.forEach(item => {
      const winner = item.winners[0];
      const winnerMeta = appData.managers[winner.manager] || { color: '#ffd700' };

      // Margin string
      const marginStr = item.margin > 0 ? `+${item.margin} pts ahead of #2` : 'Tied for 1st';

      // Captain badge
      let captainHtml = '';
      if (item.captain) {
        captainHtml = `<span class="winner-captain-badge" title="Captain played"><i class="fa-solid fa-copyright"></i> ${item.captain.name} (${item.captain.points} pts)</span>`;
      }

      // Chip badge
      let chipHtml = '';
      const chipInfo = getChipInfo(item.chip);
      if (chipInfo) {
        chipHtml = `<span class="lb-chip-badge chip-${chipInfo.cssClass}"><i class="fa-solid ${chipInfo.icon}"></i> ${chipInfo.name}</span>`;
      }

      // Payout string
      const singlePayout = Math.round(item.payoutPerWinner);
      const payoutStr = item.winners.length > 1 ? `$${item.payoutPerWinner.toFixed(1)} each` : `$${singlePayout}`;

      const card = document.createElement('div');
      card.className = 'winner-card';
      card.style.borderLeft = `4px solid ${winnerMeta.color}`;

      // Winners names (handles ties)
      const winnersTitleHtml = item.winners.map(w => {
        const m = appData.managers[w.manager] || { color: '#ffd700' };
        return `<span style="color:${m.color}">${w.team}</span> <small>(${w.manager})</small>`;
      }).join(' &amp; ');

      card.innerHTML = `
        <div class="winner-card-header">
          <div class="winner-gw-badge">
            <i class="fa-solid fa-trophy"></i> Gameweek ${item.gw} Winner
          </div>
          <div class="winner-score-pill">
            <span class="winner-pts">${item.winningPts} pts</span>
            <span class="winner-margin">${marginStr}</span>
          </div>
        </div>
        <div class="winner-card-body">
          <div class="winner-mgr-info">
            <div class="winner-avatar" style="background: ${winnerMeta.color}">
              ${winner.manager.charAt(0).toUpperCase()}
            </div>
            <div class="winner-text">
              <span class="winner-team-title">${winnersTitleHtml}</span>
            </div>
          </div>
          <div class="winner-details-badges">
            ${captainHtml}
            ${chipHtml}
            <span class="winner-payout-badge"><i class="fa-solid fa-sack-dollar"></i> ${payoutStr}</span>
            <button class="btn-goto-gw">View GW ${item.gw} <i class="fa-solid fa-arrow-right"></i></button>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        currentGW = item.gw;
        selectManager(winner.manager);
        updateDashboard();
        switchTab('field-roster');
      });

      elWinnersCardsContainer.appendChild(card);
    });
  }

  // Render Subview 2: Trophy Standings Table
  if (elWinnersTableBody) {
    elWinnersTableBody.innerHTML = '';
    sortedManagers.forEach((stat, idx) => {
      const rank = idx + 1;
      const isSelected = stat.manager === selectedManager;
      const row = document.createElement('tr');
      if (isSelected) row.className = 'active-row';

      const wonGwsStr = stat.wonGWs.length > 0 ? stat.wonGWs.map(gw => `GW${gw}`).join(', ') : 'None';
      const formattedPayout = stat.payout % 1 === 0 ? `$${stat.payout}` : `$${stat.payout.toFixed(1)}`;

      row.innerHTML = `
        <td class="font-mono"><strong>#${rank}</strong></td>
        <td>
          <div class="table-mgr-col">
            <span class="table-mgr-badge" style="background:${stat.color}"></span>
            <div class="table-mgr-text">
              <span class="table-mgr-team" style="color:${stat.color}">${stat.team}</span>
              <span class="table-mgr-name">${stat.manager}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="trophy-wins-badge"><i class="fa-solid fa-trophy"></i> ${stat.wins} win${stat.wins === 1 ? '' : 's'}</span>
        </td>
        <td style="font-size:0.8rem; color:var(--text-secondary);">${wonGwsStr}</td>
        <td class="font-mono" style="color:#2ed573; font-weight:700;">${formattedPayout}</td>
        <td class="font-mono" style="color:#ffd700; font-weight:700;">${stat.highScore > 0 ? stat.highScore + ' pts' : '-'}</td>
      `;

      row.addEventListener('click', () => {
        selectManager(stat.manager);
        renderWinnersView();
      });

      elWinnersTableBody.appendChild(row);
    });
  }
}

// ----------------------------------------------------
// TRANSFERS IN & OUT HUB IMPLEMENTATION
// ----------------------------------------------------
function switchTransfersSubView(subView) {
  transfersSubView = subView;

  if (elBtnViewTeamHistory) elBtnViewTeamHistory.classList.toggle('active', subView === 'team');
  if (elBtnViewGwTransfers) elBtnViewGwTransfers.classList.toggle('active', subView === 'gw');
  if (elBtnViewSeasonTransfers) elBtnViewSeasonTransfers.classList.toggle('active', subView === 'season');

  if (elTransfersTeamView) elTransfersTeamView.classList.toggle('hidden', subView !== 'team');
  if (elTransfersGwView) elTransfersGwView.classList.toggle('hidden', subView !== 'gw');
  if (elTransfersSeasonView) elTransfersSeasonView.classList.toggle('hidden', subView !== 'season');

  if (elTransfersTeamBanner) {
    elTransfersTeamBanner.style.display = subView === 'team' ? 'flex' : 'none';
  }

  renderTransfersView();
}

function renderTransfersView() {
  if (!appData || !appData.gameweeks) return;

  if (transfersSubView === 'team') {
    renderTeamTransfersHistory();
  } else if (transfersSubView === 'gw') {
    renderLeagueGwTransfers();
  } else if (transfersSubView === 'season') {
    renderSeasonTransfersLeaderboard();
  }
}

// 1. Team Transfer History: Gameweek by Gameweek for Selected Team
function renderTeamTransfersHistory() {
  if (!appData || !appData.gameweeks || !elTransfersTeamCardsContainer) return;
  elTransfersTeamCardsContainer.innerHTML = '';

  const managerNames = Object.keys(appData.managers);
  const targetManager = selectedManager || managerNames[0];
  const mgrMeta = appData.managers[targetManager] || { team: targetManager, color: '#1e90ff' };

  // Update Selected Team Banner
  if (elTransfersTeamAvatar) {
    elTransfersTeamAvatar.style.background = mgrMeta.color;
    elTransfersTeamAvatar.innerText = targetManager.charAt(0).toUpperCase();
  }
  if (elTransfersTeamName) elTransfersTeamName.innerText = mgrMeta.team;
  if (elTransfersTeamMgr) elTransfersTeamMgr.innerText = `${targetManager} · Transfer Timeline`;
  if (elTransfersHeaderTitleText) elTransfersHeaderTitleText.innerText = `${mgrMeta.team} Transfer History`;
  if (elSelectTransfersTeam) elSelectTransfersTeam.value = targetManager;

  // Set Metric Labels for Team View
  if (elMetricLabel1) elMetricLabel1.innerText = 'Total Transfers';
  if (elMetricLabel2) elMetricLabel2.innerText = 'Hits Penalty';
  if (elMetricLabel3) elMetricLabel3.innerText = 'Best Move';
  if (elMetricLabel4) elMetricLabel4.innerText = 'Pts In / Pts Out';

  // Gather stats across all played GWs for this manager
  const maxPlayedGW = finalGW || getLatestGWWithData(appData);
  const availableGWs = Object.keys(appData.gameweeks).map(Number).sort((a, b) => a - b);
  const playedGWs = availableGWs.filter(gw => gw <= maxPlayedGW);

  let totalMoves = 0;
  let totalHits = 0;
  let totalPtsIn = 0;
  let totalPtsOut = 0;
  let bestMove = null;

  playedGWs.forEach(gw => {
    const gwStandings = appData.gameweeks[gw.toString()]?.standings || [];
    const record = gwStandings.find(s => s.manager === targetManager);
    if (!record) return;

    const moves = record.transfers !== undefined ? record.transfers : (record.transfers_detail ? record.transfers_detail.length : 0);
    totalMoves += moves;
    const hitCost = Math.abs(record.gw_hits || 0);
    totalHits += hitCost;

    if (record.transfers_detail && record.transfers_detail.length > 0) {
      record.transfers_detail.forEach(t => {
        const inPts = t.in_points || 0;
        const outPts = t.out_points || 0;
        totalPtsIn += inPts;
        totalPtsOut += outPts;
        const delta = t.net_points !== undefined ? t.net_points : (inPts - outPts);
        if (!bestMove || delta > bestMove.delta) {
          bestMove = {
            in_name: t.in_name,
            out_name: t.out_name,
            delta: delta,
            gw: gw
          };
        }
      });
    }
  });

  const grossGain = totalPtsIn - totalPtsOut;
  const netRoi = grossGain - totalHits;

  // Update Top Metrics
  if (elMetricTotalTransfers) elMetricTotalTransfers.innerText = `${totalMoves} moves`;
  if (elMetricTotalHits) elMetricTotalHits.innerText = totalHits > 0 ? `-${totalHits} pts` : '0 pts';
  if (elMetricTransferKing) {
    if (bestMove && bestMove.delta > 0) {
      elMetricTransferKing.innerText = `${bestMove.in_name} (+${bestMove.delta} pts in GW${bestMove.gw})`;
    } else {
      elMetricTransferKing.innerText = totalMoves > 0 ? 'None' : '-';
    }
  }
  if (elMetricTransferFlop) {
    elMetricTransferFlop.innerText = `${totalPtsIn} in / ${totalPtsOut} out`;
  }

  // Update Team Banner ROI Badge
  if (elTransfersTeamRoiBadge) {
    const roiPrefix = netRoi > 0 ? '+' : '';
    elTransfersTeamRoiBadge.innerText = `${roiPrefix}${netRoi} pts net ROI`;
    elTransfersTeamRoiBadge.className = `pitch-stat-badge ${netRoi > 0 ? 'highlight' : (netRoi < 0 ? 'negative' : '')}`;
  }

  // Calculate Free Transfers Remaining across the timeline
  const seasonStr = (appData.season || '').toString();
  const maxFtCap = (seasonStr.includes('2024') || seasonStr.includes('2025') || seasonStr.includes('2026')) ? 5 : 2;

  const ftTimeline = {};
  let currentFt = 1;

  playedGWs.forEach(gw => {
    const gwStandings = appData.gameweeks[gw.toString()]?.standings || [];
    const record = gwStandings.find(s => s.manager === targetManager);
    if (!record) return;

    const details = record.transfers_detail || [];
    const moves = record.transfers !== undefined ? record.transfers : details.length;
    const chip = (record.chip || '').toLowerCase();

    let avail = 1;
    let used = 0;
    let remaining = 0;
    let nextAvail = 1;

    if (gw === 1) {
      avail = 1;
      used = 0;
      remaining = 0; // unlimited setup; 1 banked for GW2
      nextAvail = 1;
    } else {
      avail = currentFt;
      if (chip === 'wildcard' || chip === 'freehit') {
        used = 0;
        remaining = avail;
        nextAvail = Math.min(maxFtCap, remaining + 1);
      } else {
        used = Math.min(moves, avail);
        remaining = avail - used;
        nextAvail = Math.min(maxFtCap, remaining + 1);
      }
    }

    ftTimeline[gw] = {
      available: avail,
      used: used,
      remaining: remaining,
      nextAvailable: nextAvail
    };

    currentFt = nextAvail;
  });

  // Update Team Banner Free Transfers Available for upcoming gameweek
  if (elTransfersTeamFtBadge) {
    const latestFtInfo = ftTimeline[maxPlayedGW];
    const upcomingFt = latestFtInfo ? latestFtInfo.nextAvailable : 1;
    const ftWord = upcomingFt === 1 ? 'Free Transfer' : 'Free Transfers';
    elTransfersTeamFtBadge.innerHTML = `<i class="fa-solid fa-bolt"></i> ${upcomingFt} ${ftWord} Available`;
    elTransfersTeamFtBadge.title = `${upcomingFt} Free Transfer(s) available for Gameweek ${maxPlayedGW + 1} (Max cap: ${maxFtCap})`;
  }

  // Generate Gameweek Cards (Newest Gameweek first: finalGW down to 1)
  const gwsDescending = [...playedGWs].sort((a, b) => b - a);

  gwsDescending.forEach(gw => {
    const gwStandings = appData.gameweeks[gw.toString()]?.standings || [];
    const record = gwStandings.find(s => s.manager === targetManager);
    if (!record) return;

    const details = record.transfers_detail || [];
    const moves = record.transfers !== undefined ? record.transfers : details.length;
    const hitCost = Math.abs(record.gw_hits || 0);

    const grossDelta = details.reduce((acc, t) => acc + (t.net_points || 0), 0);
    const netDelta = grossDelta - hitCost;

    const deltaClass = netDelta > 0 ? 'positive' : (netDelta < 0 ? 'negative' : 'neutral');
    const deltaText = netDelta > 0 ? `+${netDelta} pts net` : (netDelta < 0 ? `${netDelta} pts net` : `0 pts net`);

    // Chip badge
    let chipBadgeHtml = '';
    if (record.chip && record.chip !== 'None') {
      const chipLower = record.chip.toLowerCase().replace(/\s+/g, '');
      chipBadgeHtml = `<span class="chip-badge chip-${chipLower}"><i class="fa-solid fa-bolt"></i> ${record.chip}</span>`;
    }

    // Hit badge
    let hitBadgeHtml = '';
    if (hitCost > 0) {
      hitBadgeHtml = `<span class="transfers-hit-pill">-${hitCost} pts hit</span>`;
    }

    // Free transfer remaining badge
    let ftBadgeHtml = '';
    const ftInfo = ftTimeline[gw];
    if (ftInfo) {
      if (gw === 1) {
        ftBadgeHtml = `<span class="transfers-ft-pill" title="Initial squad creation. 1 FT rolled into GW2"><i class="fa-solid fa-bolt"></i> 1 FT saved</span>`;
      } else {
        const ftRem = ftInfo.remaining;
        const ftClass = ftRem === 0 ? 'ft-empty' : '';
        const ftTitle = `${ftInfo.available} FT available at deadline, ${ftInfo.used} used. ${ftRem} FT saved (${ftInfo.nextAvailable} available in GW${gw + 1})`;
        ftBadgeHtml = `<span class="transfers-ft-pill ${ftClass}" title="${ftTitle}"><i class="fa-solid fa-bolt"></i> ${ftRem} FT left</span>`;
      }
    }

    // Transfers pairs
    let pairsHtml = '';
    if (details.length > 0) {
      pairsHtml = details.map(t => {
        const pairDelta = t.net_points !== undefined ? t.net_points : ((t.in_points || 0) - (t.out_points || 0));
        const pairClass = pairDelta > 0 ? 'positive' : (pairDelta < 0 ? 'negative' : 'neutral');
        const pairText = pairDelta > 0 ? `+${pairDelta} pts` : `${pairDelta} pts`;

        const outCostStr = t.out_cost ? ` · £${t.out_cost}m` : '';
        const inCostStr = t.in_cost ? ` · £${t.in_cost}m` : '';

        return `
          <div class="transfer-pair-row">
            <div class="player-tag out">
              <div class="player-tag-main">
                <span class="player-tag-name"><i class="fa-solid fa-arrow-left"></i> ${t.out_name}</span>
                <span class="player-tag-pts">${t.out_points || 0} pts</span>
              </div>
              <div class="player-tag-sub">${t.out_club || ''}${t.out_pos ? ' · ' + t.out_pos : ''}${outCostStr}</div>
            </div>
            <div class="transfer-arrow-divider"><i class="fa-solid fa-arrow-right"></i></div>
            <div class="player-tag in">
              <div class="player-tag-main">
                <span class="player-tag-name"><i class="fa-solid fa-arrow-right"></i> ${t.in_name}</span>
                <span class="player-tag-pts">${t.in_points || 0} pts</span>
              </div>
              <div class="player-tag-sub">${t.in_club || ''}${t.in_pos ? ' · ' + t.in_pos : ''}${inCostStr}</div>
            </div>
            <div class="pair-delta-badge ${pairClass}" title="In (${t.in_points || 0}) - Out (${t.out_points || 0})">${pairText}</div>
          </div>
        `;
      }).join('');
    } else if (moves > 0) {
      pairsHtml = `<div class="transfer-pair-row" style="color:var(--text-secondary); font-size:0.85rem;"><i class="fa-solid fa-info-circle"></i> ${moves} transfer(s) recorded.</div>`;
    } else {
      const msg = gw === 1 ? 'Initial Gameweek 1 squad selection (15 players)' : `No transfers made in Gameweek ${gw} (0 pts hit)`;
      pairsHtml = `<div class="gw-history-no-moves"><i class="fa-solid fa-check"></i> ${msg}</div>`;
    }

    const card = document.createElement('div');
    card.className = 'gw-history-card';
    card.style.borderLeft = `4px solid ${mgrMeta.color}`;

    const movesLabel = moves > 0 ? `${moves} transfer${moves > 1 ? 's' : ''}` : 'No transfers';

    card.innerHTML = `
      <div class="gw-history-header">
        <div class="gw-history-title-row">
          <span class="gw-pill-badge">GW ${gw}</span>
          <span class="gw-history-moves-count">${movesLabel}</span>
        </div>
        <div class="transfer-card-badges">
          ${ftBadgeHtml}
          ${chipBadgeHtml}
          ${hitBadgeHtml}
          ${moves > 0 || hitCost > 0 ? `<span class="transfer-delta-pill ${deltaClass}" title="Gameweek Net Transfer Delta">${deltaText}</span>` : ''}
        </div>
      </div>
      <div class="transfer-pairs-list">
        ${pairsHtml}
      </div>
    `;

    elTransfersTeamCardsContainer.appendChild(card);
  });
}

// 2. League Gameweek View: All Teams That Made Moves in Current GW
function renderLeagueGwTransfers() {
  if (!appData || !appData.gameweeks || !elTransfersCardsContainer) return;
  elTransfersCardsContainer.innerHTML = '';

  if (elTransfersHeaderTitleText) {
    elTransfersHeaderTitleText.innerText = `Gameweek ${currentGW} League Transfers`;
  }

  // Set Metric Labels for League GW View
  if (elMetricLabel1) elMetricLabel1.innerText = 'League Transfers';
  if (elMetricLabel2) elMetricLabel2.innerText = 'Total Hits Penalty';
  if (elMetricLabel3) elMetricLabel3.innerText = 'Transfer King';
  if (elMetricLabel4) elMetricLabel4.innerText = 'Transfer Flop';

  const gwData = appData.gameweeks[currentGW.toString()];
  if (!gwData || !gwData.standings) return;
  const allStandings = gwData.standings;

  let totalTransfers = 0;
  let totalHits = 0;
  let king = { manager: null, delta: -Infinity, team: '' };
  let flop = { manager: null, delta: Infinity, team: '' };

  allStandings.forEach(s => {
    const moves = s.transfers !== undefined ? s.transfers : (s.transfers_detail ? s.transfers_detail.length : 0);
    totalTransfers += moves;
    const hitCost = Math.abs(s.gw_hits || 0);
    totalHits += hitCost;

    if (s.transfers_detail && s.transfers_detail.length > 0) {
      const grossDelta = s.transfers_detail.reduce((acc, t) => acc + (t.net_points || 0), 0);
      const netDelta = grossDelta - hitCost;
      if (netDelta > king.delta) {
        king = { manager: s.manager, delta: netDelta, team: s.team };
      }
      if (netDelta < flop.delta) {
        flop = { manager: s.manager, delta: netDelta, team: s.team };
      }
    }
  });

  if (elMetricTotalTransfers) elMetricTotalTransfers.innerText = `${totalTransfers} moves`;
  if (elMetricTotalHits) elMetricTotalHits.innerText = totalHits > 0 ? `-${totalHits} pts` : '0 pts';

  if (elMetricTransferKing) {
    if (king.manager && king.delta > 0) {
      elMetricTransferKing.innerText = `${king.manager} (+${king.delta} pts)`;
    } else if (king.manager && king.delta === 0) {
      elMetricTransferKing.innerText = `${king.manager} (0 pts)`;
    } else {
      elMetricTransferKing.innerText = totalTransfers > 0 ? 'None' : '-';
    }
  }

  if (elMetricTransferFlop) {
    if (flop.manager && flop.delta < 0) {
      elMetricTransferFlop.innerText = `${flop.manager} (${flop.delta} pts)`;
    } else {
      elMetricTransferFlop.innerText = totalTransfers > 0 ? 'None' : '-';
    }
  }

  // Show all managers who made transfers in this GW
  const managersWithMoves = allStandings.filter(s => {
    const hasDetails = s.transfers_detail && s.transfers_detail.length > 0;
    const hasTransfers = s.transfers && s.transfers > 0;
    return hasDetails || hasTransfers;
  });

  if (managersWithMoves.length === 0) {
    elTransfersCardsContainer.innerHTML = `
      <div class="transfers-empty-state">
        <i class="fa-solid fa-mug-hot"></i>
        <p>No transfers made across the league in Gameweek ${currentGW}.</p>
      </div>
    `;
    return;
  }

  // Sort managers by highest net delta first
  managersWithMoves.sort((a, b) => {
    const deltaA = ((a.transfers_detail || []).reduce((acc, t) => acc + (t.net_points || 0), 0)) - Math.abs(a.gw_hits || 0);
    const deltaB = ((b.transfers_detail || []).reduce((acc, t) => acc + (t.net_points || 0), 0)) - Math.abs(b.gw_hits || 0);
    return deltaB - deltaA;
  });

  managersWithMoves.forEach(mgrRecord => {
    const mgrMeta = appData.managers[mgrRecord.manager] || { team: mgrRecord.team || mgrRecord.manager, color: '#1e90ff' };
    const hitCost = Math.abs(mgrRecord.gw_hits || 0);
    const details = mgrRecord.transfers_detail || [];
    const grossDelta = details.reduce((acc, t) => acc + (t.net_points || 0), 0);
    const netDelta = grossDelta - hitCost;

    const deltaClass = netDelta > 0 ? 'positive' : (netDelta < 0 ? 'negative' : 'neutral');
    const deltaText = netDelta > 0 ? `+${netDelta} pts net` : (netDelta < 0 ? `${netDelta} pts net` : `0 pts net`);

    // Chip badge
    let chipBadgeHtml = '';
    if (mgrRecord.chip && mgrRecord.chip !== 'None') {
      const chipLower = mgrRecord.chip.toLowerCase().replace(/\s+/g, '');
      chipBadgeHtml = `<span class="chip-badge chip-${chipLower}"><i class="fa-solid fa-bolt"></i> ${mgrRecord.chip}</span>`;
    }

    // Hit badge
    let hitBadgeHtml = '';
    if (hitCost > 0) {
      hitBadgeHtml = `<span class="transfers-hit-pill">-${hitCost} pts hit</span>`;
    }

    let pairsHtml = '';
    if (details.length > 0) {
      pairsHtml = details.map(t => {
        const pairDelta = t.net_points !== undefined ? t.net_points : (t.in_points - t.out_points);
        const pairClass = pairDelta > 0 ? 'positive' : (pairDelta < 0 ? 'negative' : 'neutral');
        const pairText = pairDelta > 0 ? `+${pairDelta} pts` : `${pairDelta} pts`;

        const outCostStr = t.out_cost ? ` · £${t.out_cost}m` : '';
        const inCostStr = t.in_cost ? ` · £${t.in_cost}m` : '';

        return `
          <div class="transfer-pair-row">
            <div class="player-tag out">
              <div class="player-tag-main">
                <span class="player-tag-name"><i class="fa-solid fa-arrow-left"></i> ${t.out_name}</span>
                <span class="player-tag-pts">${t.out_points} pts</span>
              </div>
              <div class="player-tag-sub">${t.out_club || ''}${t.out_pos ? ' · ' + t.out_pos : ''}${outCostStr}</div>
            </div>
            <div class="transfer-arrow-divider"><i class="fa-solid fa-arrow-right"></i></div>
            <div class="player-tag in">
              <div class="player-tag-main">
                <span class="player-tag-name"><i class="fa-solid fa-arrow-right"></i> ${t.in_name}</span>
                <span class="player-tag-pts">${t.in_points} pts</span>
              </div>
              <div class="player-tag-sub">${t.in_club || ''}${t.in_pos ? ' · ' + t.in_pos : ''}${inCostStr}</div>
            </div>
            <div class="pair-delta-badge ${pairClass}" title="In (${t.in_points}) - Out (${t.out_points})">${pairText}</div>
          </div>
        `;
      }).join('');
    } else {
      pairsHtml = `<div class="transfer-pair-row" style="color:var(--text-secondary); font-size:0.85rem;"><i class="fa-solid fa-info-circle"></i> ${mgrRecord.transfers} transfer(s) recorded.</div>`;
    }

    const movesCount = (mgrRecord.transfers && mgrRecord.transfers > 0) ? mgrRecord.transfers : (details.length > 0 ? details.length : 0);
    const movesLabel = movesCount === 1 ? '1 transfer' : `${movesCount} transfers`;

    const card = document.createElement('div');
    card.className = 'transfer-card collapsible collapsed';
    card.setAttribute('data-manager', mgrRecord.manager);
    card.style.borderLeft = `4px solid ${mgrMeta.color}`;

    card.innerHTML = `
      <div class="transfer-card-header">
        <div class="transfer-mgr-info">
          <div class="transfer-mgr-avatar" style="background:${mgrMeta.color};">
            ${mgrRecord.manager.charAt(0).toUpperCase()}
          </div>
          <div class="transfer-mgr-text">
            <span class="transfer-mgr-team" style="color:${mgrMeta.color};">${mgrMeta.team}</span>
            <span class="transfer-mgr-name">${mgrRecord.manager}</span>
          </div>
        </div>
        <div class="transfer-card-badges">
          <span class="transfer-moves-count-badge" title="Total transfers made this Gameweek"><i class="fa-solid fa-arrow-right-arrow-left"></i> ${movesLabel}</span>
          ${chipBadgeHtml}
          ${hitBadgeHtml}
          <span class="transfer-delta-pill ${deltaClass}" title="Total GW Transfer Gain/Loss">${deltaText}</span>
          <button class="btn-subtle-history" title="View ${mgrMeta.team} season timeline">
            History <i class="fa-solid fa-clock-rotate-left"></i>
          </button>
          <span class="collapse-indicator" title="Click to view player transfers"><i class="fa-solid fa-chevron-down"></i></span>
        </div>
      </div>
      <div class="transfer-pairs-list">
        ${pairsHtml}
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-subtle-history')) {
        e.stopPropagation();
        selectManager(mgrRecord.manager);
        switchTransfersSubView('team');
        return;
      }
      selectManager(mgrRecord.manager);
      const isCollapsed = card.classList.contains('collapsed');
      card.classList.toggle('collapsed', !isCollapsed);
      card.classList.toggle('expanded', isCollapsed);
    });

    elTransfersCardsContainer.appendChild(card);
  });
}

// 3. Season View: Cumulative ROI Leaderboard
function renderSeasonTransfersLeaderboard() {
  if (!appData || !appData.managers || !elTransfersSeasonTableBody) return;
  elTransfersSeasonTableBody.innerHTML = '';

  if (elTransfersHeaderTitleText) {
    elTransfersHeaderTitleText.innerText = 'Season Transfer ROI Leaderboard';
  }

  const managerNames = Object.keys(appData.managers);
  const maxPlayedGW = finalGW || getLatestGWWithData(appData);
  const availableGWs = Object.keys(appData.gameweeks).map(Number).sort((a, b) => a - b);
  const playedGWs = availableGWs.filter(gw => gw <= maxPlayedGW);

  const seasonStats = managerNames.map(mgrName => {
    const meta = appData.managers[mgrName] || { team: mgrName, color: '#1e90ff' };
    let totalMoves = 0;
    let totalHitsCost = 0;
    let totalPtsIn = 0;
    let totalPtsOut = 0;

    playedGWs.forEach(gw => {
      const gwStandings = appData.gameweeks[gw.toString()]?.standings || [];
      const record = gwStandings.find(s => s.manager === mgrName);
      if (record) {
        totalMoves += (record.transfers || record.transfers_detail?.length || 0);
        totalHitsCost += Math.abs(record.gw_hits || 0);
        if (record.transfers_detail && record.transfers_detail.length > 0) {
          record.transfers_detail.forEach(t => {
            totalPtsIn += (t.in_points || 0);
            totalPtsOut += (t.out_points || 0);
          });
        }
      }
    });

    const grossGain = totalPtsIn - totalPtsOut;
    const netRoi = grossGain - totalHitsCost;

    return {
      manager: mgrName,
      team: meta.team,
      color: meta.color,
      totalMoves,
      totalHitsCost,
      totalPtsIn,
      totalPtsOut,
      grossGain,
      netRoi
    };
  });

  seasonStats.sort((a, b) => {
    if (b.netRoi !== a.netRoi) return b.netRoi - a.netRoi;
    if (b.grossGain !== a.grossGain) return b.grossGain - a.grossGain;
    return a.totalHitsCost - b.totalHitsCost;
  });

  seasonStats.forEach((stat, idx) => {
    const rank = idx + 1;
    const isSelected = stat.manager === selectedManager;
    const row = document.createElement('tr');
    if (isSelected) row.className = 'active-row';

    const roiClass = stat.netRoi > 0 ? 'roi-positive' : (stat.netRoi < 0 ? 'roi-negative' : '');
    const roiPrefix = stat.netRoi > 0 ? '+' : '';

    row.innerHTML = `
      <td class="font-mono"><strong>#${rank}</strong></td>
      <td>
        <div class="table-mgr-col">
          <span class="table-mgr-badge" style="background:${stat.color}"></span>
          <div class="table-mgr-text">
            <span class="table-mgr-team" style="color:${stat.color}">${stat.team}</span>
            <span class="table-mgr-name">${stat.manager}</span>
          </div>
        </div>
      </td>
      <td class="font-mono">${stat.totalMoves}</td>
      <td class="font-mono" style="color:${stat.totalHitsCost > 0 ? '#ff4757' : 'inherit'}">-${stat.totalHitsCost} pts</td>
      <td class="font-mono" style="color:#2ed573">${stat.totalPtsIn} pts</td>
      <td class="font-mono" style="color:#ff6b81">${stat.totalPtsOut} pts</td>
      <td class="font-mono ${roiClass}">${roiPrefix}${stat.netRoi} pts</td>
    `;

    row.addEventListener('click', () => {
      selectManager(stat.manager);
      switchTransfersSubView('team');
    });

    elTransfersSeasonTableBody.appendChild(row);
  });
}

