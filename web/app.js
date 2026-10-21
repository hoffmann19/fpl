/**
 * FPL: BLUE SQUARE - UNIFIED 1-VIEW DASHBOARD
 * Modern, high-density, single-screen visualizer for FPL Gameweek Totals, Transfers, and FDR Matrix.
 */

// Global Application State
let appData = null;
let activeSeason = '2026_27';
let currentGW = 7;
let latestGW = 7;
let selectedManager = null;
let totalsSortMetric = 'rank';  // 'rank', 'manager', 'gw_net', 'overall', 'saved_ft', 'fdr_3w', 'fdr_5w', 'captain', 'chip', 'value'
let totalsSortAsc = true;
let totalsSearchFilter = '';
let fdrHorizon = 5;            // 5, 8, or 38
let fdrSortMode = 'easiest';    // 'easiest', 'hardest', 'alpha'
let fdrMetricMode = 'overall';  // 'overall', 'defense', 'attack'
let fdrSearchQuery = '';
let fdrSquadFilterOnly = false;
let allTransfersExpanded = false;

// Constant for User Manager Identification
const USER_MANAGER_NAME = "Michael Hoffmann";

// Premier League Club Mapping (Short Code -> Full Display Name)
const PL_TEAM_NAMES = {
  'ARS': 'Arsenal',
  'AVL': 'Aston Villa',
  'BHA': 'Brighton',
  'BOU': 'Bournemouth',
  'BRE': 'Brentford',
  'CHE': 'Chelsea',
  'COV': 'Coventry City',
  'CRY': 'Crystal Palace',
  'EVE': 'Everton',
  'FUL': 'Fulham',
  'HUL': 'Hull City',
  'IPS': 'Ipswich Town',
  'LEE': 'Leeds',
  'LIV': 'Liverpool',
  'MCI': 'Man City',
  'MUN': 'Man Utd',
  'NEW': 'Newcastle',
  'NFO': "Nott'm Forest",
  'SUN': 'Sunderland',
  'TOT': 'Spurs'
};

// DOM Element References
let elSelectSeason, elSelectGw, elBtnPrevGw, elBtnNextGw, elBtnCurrentGw, elLblCurrentGwNum;
let elStatLeader, elStatGwTop, elStatGwAvg, elStatGwTransfers;
let elSelectionBar, elSelectedMgrName, elSelectedTeamName, elBtnClearSelection;
let elTotalsTableBody, elTotalsTableHeadRow, elInputTotalsSearch, elBtnResetTotalsSort;
let elTransfersCardsContainer, elTransfersTotalMoves, elTransfersTotalHits, elTransfersBestMove, elTransfersSubtitle;
let elBtnToggleAllTx, elLblToggleAllTx, elIconToggleAllTx;
let elFdrHorizonGroup, elFdrMetricGroup, elSelectFdrSort, elInputFdrSearch, elBtnFdrSquadOnly, elLblFdrSquadBtn;
let elFdrTableHeadRow, elFdrMatrixBody, elTooltip, elFdrLegendTitle, elFdrLegendItems;

// Initialize Application on Page Load
document.addEventListener('DOMContentLoaded', () => {
  cacheDomElements();
  bindEventListeners();
  loadSeasonData(activeSeason);
});

/**
 * Cache references to DOM elements
 */
function cacheDomElements() {
  elSelectSeason = document.getElementById('select-season');
  elSelectGw = document.getElementById('select-gw');
  elBtnPrevGw = document.getElementById('btn-prev-gw');
  elBtnNextGw = document.getElementById('btn-next-gw');
  elBtnCurrentGw = document.getElementById('btn-current-gw');
  elLblCurrentGwNum = document.getElementById('lbl-current-gw-num');

  elStatLeader = document.getElementById('stat-leader-val');
  elStatGwTop = document.getElementById('stat-gw-top-val');
  elStatGwAvg = document.getElementById('stat-gw-avg-val');
  elStatGwTransfers = document.getElementById('stat-gw-transfers-val');

  elSelectionBar = document.getElementById('selection-bar');
  elSelectedMgrName = document.getElementById('selected-manager-name');
  elSelectedTeamName = document.getElementById('selected-team-name');
  elBtnClearSelection = document.getElementById('btn-clear-selection');

  elTotalsTableBody = document.getElementById('totals-table-body');
  elTotalsTableHeadRow = document.getElementById('totals-table-head-row');
  elInputTotalsSearch = document.getElementById('input-totals-search');
  elBtnResetTotalsSort = document.getElementById('btn-reset-totals-sort');

  elTransfersCardsContainer = document.getElementById('transfers-cards-container');
  elTransfersTotalMoves = document.getElementById('transfers-total-moves');
  elTransfersTotalHits = document.getElementById('transfers-total-hits');
  elTransfersBestMove = document.getElementById('transfers-best-move');
  elTransfersSubtitle = document.getElementById('transfers-subtitle');
  elBtnToggleAllTx = document.getElementById('btn-toggle-all-transfers');
  elLblToggleAllTx = document.getElementById('lbl-toggle-all-tx');
  elIconToggleAllTx = document.getElementById('icon-toggle-all-tx');

  elFdrHorizonGroup = document.getElementById('fdr-horizon-group');
  elFdrMetricGroup = document.getElementById('fdr-metric-group');
  elSelectFdrSort = document.getElementById('select-fdr-sort');
  elInputFdrSearch = document.getElementById('input-fdr-search');
  elBtnFdrSquadOnly = document.getElementById('btn-fdr-squad-only');
  elLblFdrSquadBtn = document.getElementById('lbl-fdr-squad-btn');
  elFdrTableHeadRow = document.getElementById('fdr-table-head-row');
  elFdrMatrixBody = document.getElementById('fdr-matrix-body');
  elTooltip = document.getElementById('fdr-tooltip');
  elFdrLegendTitle = document.getElementById('fdr-legend-title');
  elFdrLegendItems = document.getElementById('fdr-legend-items');
}

/**
 * Bind interactive UI events
 */
function bindEventListeners() {
  // Season change
  if (elSelectSeason) {
    elSelectSeason.addEventListener('change', (e) => {
      activeSeason = e.target.value;
      loadSeasonData(activeSeason);
    });
  }

  // GW Stepper & Dropdown
  if (elSelectGw) {
    elSelectGw.addEventListener('change', (e) => {
      setGameweek(parseInt(e.target.value, 10));
    });
  }

  if (elBtnPrevGw) {
    elBtnPrevGw.addEventListener('click', () => {
      if (currentGW > 1) setGameweek(currentGW - 1);
    });
  }

  if (elBtnNextGw) {
    elBtnNextGw.addEventListener('click', () => {
      if (currentGW < 38) setGameweek(currentGW + 1);
    });
  }

  if (elBtnCurrentGw) {
    elBtnCurrentGw.addEventListener('click', () => {
      setGameweek(latestGW);
    });
  }

  // Clear Selection Bar
  if (elBtnClearSelection) {
    elBtnClearSelection.addEventListener('click', () => {
      clearManagerSelection();
    });
  }

  // Sortable Totals Table Headers
  if (elTotalsTableHeadRow) {
    elTotalsTableHeadRow.addEventListener('click', (e) => {
      const th = e.target.closest('.sortable-th');
      if (!th) return;
      const metric = th.dataset.metric;
      if (!metric) return;

      if (totalsSortMetric === metric) {
        totalsSortAsc = !totalsSortAsc;
      } else {
        totalsSortMetric = metric;
        // Default direction based on metric:
        // Rank, Manager name default to ascending (Rank #1 first / A-Z first)
        // Opponent rankings (fdr_3w, fdr_5w), GW points, Overall total, Saved FT, Captain points, Value default to descending (higher first = easiest/most points)
        if (['rank', 'manager'].includes(metric)) {
          totalsSortAsc = true;
        } else {
          totalsSortAsc = false;
        }
      }
      renderGameweekTotals();
      renderTransfers();
    });
  }

  // Totals Filter Search Input
  if (elInputTotalsSearch) {
    elInputTotalsSearch.addEventListener('input', (e) => {
      totalsSearchFilter = e.target.value.trim().toLowerCase();
      renderGameweekTotals();
    });
  }

  // Reset Totals Sort Button
  if (elBtnResetTotalsSort) {
    elBtnResetTotalsSort.addEventListener('click', () => {
      totalsSortMetric = 'rank';
      totalsSortAsc = true;
      totalsSearchFilter = '';
      if (elInputTotalsSearch) elInputTotalsSearch.value = '';
      renderGameweekTotals();
      renderTransfers();
    });
  }

  // Toggle All Transfers (Expand / Collapse)
  if (elBtnToggleAllTx) {
    elBtnToggleAllTx.addEventListener('click', () => {
      allTransfersExpanded = !allTransfersExpanded;
      updateAllTransfersToggleBtn();
      const accordions = document.querySelectorAll('.tx-team-accordion[data-has-moves="true"]');
      accordions.forEach(acc => {
        acc.classList.toggle('expanded', allTransfersExpanded);
      });
    });
  }

  // FDR Metric View Controls (Overall / vs Defense / vs Attack)
  if (elFdrMetricGroup) {
    elFdrMetricGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.toggle-btn');
      if (!btn) return;
      elFdrMetricGroup.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      fdrMetricMode = btn.dataset.mode;
      updateFdrSortOptions();
      updateFdrLegend();
      renderFdrGrid();
    });
  }

  // FDR Horizon Controls
  if (elFdrHorizonGroup) {
    elFdrHorizonGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.toggle-btn');
      if (!btn) return;
      elFdrHorizonGroup.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      fdrHorizon = parseInt(btn.dataset.horizon, 10);
      renderFdrGrid();
    });
  }

  // FDR Sort
  if (elSelectFdrSort) {
    elSelectFdrSort.addEventListener('change', (e) => {
      fdrSortMode = e.target.value;
      renderFdrGrid();
    });
  }

  // FDR Search
  if (elInputFdrSearch) {
    elInputFdrSearch.addEventListener('input', (e) => {
      fdrSearchQuery = e.target.value.trim().toLowerCase();
      renderFdrGrid();
    });
  }

  // FDR Squad Filter Toggle
  if (elBtnFdrSquadOnly) {
    elBtnFdrSquadOnly.addEventListener('click', () => {
      if (!selectedManager) {
        // If no manager selected, default to User Manager
        selectManager(USER_MANAGER_NAME);
      }
      fdrSquadFilterOnly = !fdrSquadFilterOnly;
      elBtnFdrSquadOnly.classList.toggle('active', fdrSquadFilterOnly);
      renderFdrGrid();
    });
  }

  // Tooltip tracking
  document.addEventListener('mousemove', (e) => {
    if (elTooltip && !elTooltip.classList.contains('hidden')) {
      const xOffset = 15;
      const yOffset = 15;
      let left = e.clientX + xOffset;
      let top = e.clientY + yOffset;

      if (left + 220 > window.innerWidth) {
        left = e.clientX - 230;
      }
      if (top + 60 > window.innerHeight) {
        top = e.clientY - 60;
      }

      elTooltip.style.left = `${left}px`;
      elTooltip.style.top = `${top}px`;
    }
  });
}

/**
 * Load visualizer data JSON file
 */
async function loadSeasonData(seasonKey) {
  const filename = seasonKey === '2025_26' 
    ? 'visualizer_data_2025_26.json' 
    : 'visualizer_data.json';

  try {
    const res = await fetch(`${filename}?t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    appData = await res.json();

    // Determine Latest Available Gameweek
    if (appData.current_gw) {
      latestGW = parseInt(appData.current_gw, 10);
    } else {
      latestGW = 1;
      if (appData.gameweeks) {
        for (let i = 1; i <= 38; i++) {
          const gw = appData.gameweeks[i.toString()];
          if (gw && gw.standings && gw.standings.some(s => s.gw_points > 0)) {
            latestGW = i;
          }
        }
      }
    }

    currentGW = latestGW;
    if (elLblCurrentGwNum) elLblCurrentGwNum.innerText = latestGW;

    populateGwDropdown();
    renderAll();
  } catch (err) {
    console.error('Failed to load season data:', err);
  }
}

/**
 * Populate Gameweek Dropdown
 */
function populateGwDropdown() {
  if (!elSelectGw) return;
  elSelectGw.innerHTML = '';

  for (let i = 1; i <= 38; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.innerText = i === latestGW ? `GW ${i} (Live)` : `GW ${i}`;
    if (i === currentGW) opt.selected = true;
    elSelectGw.appendChild(opt);
  }
}

/**
 * Change Active Gameweek
 */
function setGameweek(gw) {
  if (gw < 1 || gw > 38) return;
  currentGW = gw;
  if (elSelectGw) elSelectGw.value = currentGW;

  document.querySelectorAll('.active-gw-num').forEach(el => {
    el.innerText = currentGW;
  });

  renderAll();
}

/**
 * Select a Manager across all 3 panels
 */
function selectManager(managerName) {
  if (selectedManager === managerName) {
    clearManagerSelection();
    return;
  }
  selectedManager = managerName;
  updateSelectionBar();
  renderGameweekTotals();
  renderTransfers();
  renderFdrGrid();
}

/**
 * Clear Manager Selection
 */
function clearManagerSelection() {
  selectedManager = null;
  fdrSquadFilterOnly = false;
  if (elBtnFdrSquadOnly) elBtnFdrSquadOnly.classList.remove('active');
  updateSelectionBar();
  renderGameweekTotals();
  renderTransfers();
  renderFdrGrid();
}

/**
 * Update Selection Status Banner
 */
function updateSelectionBar() {
  if (!elSelectionBar) return;
  if (selectedManager && appData && appData.managers && appData.managers[selectedManager]) {
    elSelectionBar.classList.remove('hidden');
    elSelectedMgrName.innerText = selectedManager;
    elSelectedTeamName.innerText = appData.managers[selectedManager].team || '—';
    if (elLblFdrSquadBtn) elLblFdrSquadBtn.innerText = `Filter to ${selectedManager}'s Clubs`;
  } else {
    elSelectionBar.classList.add('hidden');
    if (elLblFdrSquadBtn) elLblFdrSquadBtn.innerText = 'Filter to Squad Clubs';
  }
}

/**
 * Master Render Loop
 */
function renderAll() {
  // Synchronize all heading and UI indicators to the active gameweek
  document.querySelectorAll('.active-gw-num').forEach(el => {
    el.innerText = currentGW;
  });
  if (elSelectGw && elSelectGw.value != currentGW) {
    elSelectGw.value = currentGW;
  }
  if (elLblCurrentGwNum) {
    elLblCurrentGwNum.innerText = latestGW;
  }

  updateLeagueRibbon();
  updateSelectionBar();
  renderGameweekTotals();
  renderTransfers();
  renderFdrGrid();
}

/**
 * Update League Quick Stats Ribbon
 */
function updateLeagueRibbon() {
  if (!appData || !appData.gameweeks) return;
  const gwData = appData.gameweeks[currentGW.toString()];
  if (!gwData || !gwData.standings || gwData.standings.length === 0) {
    if (elStatLeader) elStatLeader.innerText = '—';
    if (elStatGwTop) elStatGwTop.innerText = '—';
    if (elStatGwAvg) elStatGwAvg.innerText = '—';
    if (elStatGwTransfers) elStatGwTransfers.innerText = '—';
    return;
  }

  const standings = gwData.standings;

  // 1. Overall Leader
  const overallSorted = [...standings].sort((a, b) => b.overall_points - a.overall_points);
  const leader = overallSorted[0];
  if (elStatLeader && leader) {
    elStatLeader.innerText = `${leader.manager} (${leader.overall_points})`;
  }

  // 2. Highest GW Scorer
  const gwSorted = [...standings].sort((a, b) => b.gw_net_points - a.gw_net_points);
  const gwWinner = gwSorted[0];
  if (elStatGwTop && gwWinner) {
    elStatGwTop.innerText = `${gwWinner.manager} (${gwWinner.gw_net_points} pts)`;
  }

  // 3. GW Average
  const totalGwPoints = standings.reduce((sum, s) => sum + s.gw_net_points, 0);
  const avgGw = (totalGwPoints / standings.length).toFixed(1);
  if (elStatGwAvg) {
    elStatGwAvg.innerText = `${avgGw} pts`;
  }

  // 4. Total League Transfers & Hits
  let totalMoves = 0;
  let totalHits = 0;
  standings.forEach(s => {
    const moves = (s.transfers_detail && s.transfers_detail.length > 0)
      ? s.transfers_detail.length
      : (s.transfers || 0);
    totalMoves += moves;
    totalHits += Math.abs(s.gw_hits || 0);
  });
  if (elStatGwTransfers) {
    elStatGwTransfers.innerText = totalHits > 0 ? `${totalMoves} (-${totalHits})` : `${totalMoves}`;
  }
}

/**
 * Calculate upcoming 3-week and 5-week fixture difficulty ratings and ranks for all managers
 */
function calculateManagerFdrRatings(gwNum) {
  const result = {
    scoresGw: {},
    ranksGw: {},
    scores3: {},
    ranks3: {},
    scores5: {},
    ranks5: {},
    startGw: 1,
    endGw3: 3,
    endGw5: 5
  };

  if (!appData || !appData.team_fixtures_fdr || !appData.gameweeks) {
    return result;
  }

  const gwData = appData.gameweeks[gwNum.toString()];
  if (!gwData || !gwData.lineups) return result;

  const fdr = appData.team_fixtures_fdr;
  const startGw = gwNum < 38 ? gwNum + 1 : gwNum;
  const endGw3 = Math.min(38, startGw + 2);
  const endGw5 = Math.min(38, startGw + 4);

  result.startGw = startGw;
  result.endGw3 = endGw3;
  result.endGw5 = endGw5;

  const gws3 = [];
  for (let g = startGw; g <= endGw3; g++) gws3.push(g.toString());

  const gws5 = [];
  for (let g = startGw; g <= endGw5; g++) gws5.push(g.toString());

  const pls = appData.premier_league_standings;
  const standingsMap = (pls && pls.ranks_by_gw?.[gwNum.toString()]) 
    || (pls && pls.latest_ranks) 
    || {};

  // Compute average opponent Premier League standing for each manager:
  // 1. Current Gameweek (gwNum)
  // 2. Upcoming 3 Weeks
  // 3. Upcoming 5 Weeks
  Object.keys(gwData.lineups).forEach(mgr => {
    const lineup = gwData.lineups[mgr] || [];
    let sumGw = 0, countGw = 0;
    let sum3 = 0, count3 = 0;
    let sum5 = 0, count5 = 0;

    lineup.forEach(p => {
      const club = p.club;
      if (club && fdr[club]) {
        // Current Gameweek Matchup
        const fixGw = fdr[club][gwNum.toString()];
        if (fixGw && fixGw.opponent_short && standingsMap[fixGw.opponent_short] !== undefined) {
          sumGw += standingsMap[fixGw.opponent_short];
          countGw++;
        }
        // Upcoming 3 GWs
        gws3.forEach(g => {
          const fix = fdr[club][g];
          if (fix && fix.opponent_short && standingsMap[fix.opponent_short] !== undefined) {
            sum3 += standingsMap[fix.opponent_short];
            count3++;
          }
        });
        // Upcoming 5 GWs
        gws5.forEach(g => {
          const fix = fdr[club][g];
          if (fix && fix.opponent_short && standingsMap[fix.opponent_short] !== undefined) {
            sum5 += standingsMap[fix.opponent_short];
            count5++;
          }
        });
      }
    });

    result.scoresGw[mgr] = countGw > 0 ? Number((sumGw / countGw).toFixed(2)) : 10.0;
    result.scores3[mgr] = count3 > 0 ? Number((sum3 / count3).toFixed(2)) : 10.0;
    result.scores5[mgr] = count5 > 0 ? Number((sum5 / count5).toFixed(2)) : 10.0;
  });

  // Assign Current GW ranks (Higher standing = facing worse teams = easier matchup = Rank #1)
  const sortedGw = Object.keys(result.scoresGw).sort((a, b) => result.scoresGw[b] - result.scoresGw[a]);
  sortedGw.forEach((mgr, i) => {
    if (i > 0 && result.scoresGw[mgr] === result.scoresGw[sortedGw[i - 1]]) {
      result.ranksGw[mgr] = result.ranksGw[sortedGw[i - 1]];
    } else {
      result.ranksGw[mgr] = i + 1;
    }
  });

  // Assign 3W ranks (Higher opponent standing = facing worse teams = easier schedule = Rank #1)
  const sorted3 = Object.keys(result.scores3).sort((a, b) => result.scores3[b] - result.scores3[a]);
  sorted3.forEach((mgr, i) => {
    if (i > 0 && result.scores3[mgr] === result.scores3[sorted3[i - 1]]) {
      result.ranks3[mgr] = result.ranks3[sorted3[i - 1]];
    } else {
      result.ranks3[mgr] = i + 1;
    }
  });

  // Assign 5W ranks (Higher opponent standing = facing worse teams = easier schedule = Rank #1)
  const sorted5 = Object.keys(result.scores5).sort((a, b) => result.scores5[b] - result.scores5[a]);
  sorted5.forEach((mgr, i) => {
    if (i > 0 && result.scores5[mgr] === result.scores5[sorted5[i - 1]]) {
      result.ranks5[mgr] = result.ranks5[sorted5[i - 1]];
    } else {
      result.ranks5[mgr] = i + 1;
    }
  });

  return result;
}

/**
 * Calculate the number of stacked/saved free transfers each manager has for a given target gameweek
 */
function calculateStackedTransfers(targetGW) {
  const stacked = {};
  if (!appData || !appData.gameweeks || !appData.managers) return stacked;

  const managers = Object.keys(appData.managers);
  managers.forEach(m => {
    let ft = 1; // Enter GW 2 with 1 FT

    for (let g = 2; g <= targetGW; g++) {
      const gwData = appData.gameweeks[g.toString()];
      if (!gwData || !gwData.standings) continue;

      const s = gwData.standings.find(x => x.manager === m);
      if (!s) continue;

      const chip = (s.chip || 'None').toLowerCase();
      if (chip === 'wildcard' || chip === 'freehit') {
        // In 2024+ FPL rules, FTs are preserved on Wildcard/Free Hit and +1 for next week (max 5)
        ft = Math.min(5, ft + 1);
      } else {
        const moves = s.transfers !== undefined ? s.transfers : 0;
        const used = Math.min(ft, moves);
        const leftover = ft - used;
        ft = Math.min(5, leftover + 1);
      }
    }

    stacked[m] = ft;
  });

  return stacked;
}

/**
 * Sort standings dynamically by whichever table column metric is selected
 */
function sortStandingsByActiveMetric(standingsList, fdrMetrics, stackedTransfers) {
  return [...standingsList].sort((a, b) => {
    let cmp = 0;
    switch (totalsSortMetric) {
      case 'rank':
        cmp = (a.rank || 0) - (b.rank || 0);
        break;
      case 'manager':
        cmp = (a.manager || '').localeCompare(b.manager || '');
        break;
      case 'gw_net':
        cmp = (a.gw_net_points || 0) - (b.gw_net_points || 0);
        break;
      case 'overall':
        cmp = (a.overall_points || 0) - (b.overall_points || 0);
        break;
      case 'saved_ft':
        cmp = (stackedTransfers[a.manager] || 1) - (stackedTransfers[b.manager] || 1);
        break;
      case 'fdr_gw':
        cmp = (fdrMetrics.scoresGw[a.manager] ?? 10.0) - (fdrMetrics.scoresGw[b.manager] ?? 10.0);
        break;
      case 'fdr_3w':
        cmp = (fdrMetrics.scores3[a.manager] ?? 10.0) - (fdrMetrics.scores3[b.manager] ?? 10.0);
        break;
      case 'fdr_5w':
        cmp = (fdrMetrics.scores5[a.manager] ?? 10.0) - (fdrMetrics.scores5[b.manager] ?? 10.0);
        break;
      case 'captain':
        cmp = (a.captain_points || 0) - (b.captain_points || 0);
        break;
      case 'chip':
        const chipA = a.chip && a.chip !== 'None' ? 1 : 0;
        const chipB = b.chip && b.chip !== 'None' ? 1 : 0;
        cmp = chipA - chipB;
        break;
      case 'value':
        cmp = (a.team_value || 0) - (b.team_value || 0);
        break;
      default:
        cmp = (a.rank || 0) - (b.rank || 0);
    }

    if (cmp !== 0) {
      return totalsSortAsc ? cmp : -cmp;
    }
    // Tiebreaker: overall points descending
    return (b.overall_points || 0) - (a.overall_points || 0);
  });
}

/**
 * --------------------------------------------------------------------------
 * PANEL 1: GAMEWEEK TOTALS & STANDINGS TABLE
 * --------------------------------------------------------------------------
 */
function renderGameweekTotals() {
  if (!elTotalsTableBody || !appData || !appData.gameweeks) return;
  elTotalsTableBody.innerHTML = '';

  const gwData = appData.gameweeks[currentGW.toString()];
  if (!gwData || !gwData.standings || gwData.standings.length === 0) {
    elTotalsTableBody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align: center; padding: 30px; color: var(--text-secondary);">
          <i class="fa-solid fa-clock-rotate-left" style="font-size: 1.5rem; margin-bottom: 6px;"></i>
          <p>Gameweek ${currentGW} fixtures have not yet concluded.</p>
        </td>
      </tr>
    `;
    return;
  }

  // Update Header Sort Icons & Active State
  if (elTotalsTableHeadRow) {
    elTotalsTableHeadRow.querySelectorAll('.sortable-th').forEach(th => {
      const metric = th.dataset.metric;
      const iconSpan = th.querySelector('.sort-icon');
      if (metric === totalsSortMetric) {
        th.classList.add('active-sort');
        if (iconSpan) {
          iconSpan.innerHTML = totalsSortAsc 
            ? '<i class="fa-solid fa-arrow-up-wide-short"></i>' 
            : '<i class="fa-solid fa-arrow-down-wide-short"></i>';
        }
      } else {
        th.classList.remove('active-sort');
        if (iconSpan) {
          iconSpan.innerHTML = '<i class="fa-solid fa-sort"></i>';
        }
      }
    });
  }

  // Calculate upcoming FDR ratings & ranks for each manager
  const fdrMetrics = calculateManagerFdrRatings(currentGW);
  // Calculate stacked free transfers for each manager
  const stackedTransfers = calculateStackedTransfers(currentGW);

  // Filter standings if search query is active
  let standings = [...gwData.standings];
  if (totalsSearchFilter) {
    standings = standings.filter(s => {
      const mName = (s.manager || '').toLowerCase();
      const tName = (s.team || '').toLowerCase();
      const capName = (s.captain || '').toLowerCase();
      return mName.includes(totalsSearchFilter) || tName.includes(totalsSearchFilter) || capName.includes(totalsSearchFilter);
    });
  }

  if (standings.length === 0) {
    elTotalsTableBody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 30px; color: var(--text-secondary);">
          No teams found matching "${totalsSearchFilter}".
        </td>
      </tr>
    `;
    return;
  }

  // Sort standings dynamically by active metric
  standings = sortStandingsByActiveMetric(standings, fdrMetrics, stackedTransfers);

  standings.forEach((mgr, idx) => {
    const isSelected = selectedManager === mgr.manager;
    const isUser = mgr.manager === USER_MANAGER_NAME;
    const rankNum = idx + 1;
    const mgrMeta = appData.managers[mgr.manager] || { team: mgr.team, color: '#38bdf8' };

    const tr = document.createElement('tr');
    if (isSelected) tr.classList.add('selected-row');

    // Rank Medal / Badge
    let rankBadgeClass = 'rank-badge';
    let rankContent = rankNum;
    if (rankNum === 1) {
      rankBadgeClass += ' rank-1';
      rankContent = '<i class="fa-solid fa-crown"></i>';
    } else if (rankNum === 2) {
      rankBadgeClass += ' rank-2';
    } else if (rankNum === 3) {
      rankBadgeClass += ' rank-3';
    }

    // Hits count
    const hitsCount = Math.abs(mgr.gw_hits || 0);

    // Stacked Free Transfers
    const ftCount = stackedTransfers[mgr.manager] ?? 1;
    let ftBadgeClass = 'ft-min';
    if (ftCount >= 5) ftBadgeClass = 'ft-max';
    else if (ftCount === 4) ftBadgeClass = 'ft-high';
    else if (ftCount === 3) ftBadgeClass = 'ft-med';
    else if (ftCount === 2) ftBadgeClass = 'ft-low';

    // Current GW FDR Metric & Rank (Premier League Opponent Standing: Higher is easiest)
    const fdrGwRank = fdrMetrics.ranksGw[mgr.manager] ?? '-';
    const fdrGwScore = fdrMetrics.scoresGw[mgr.manager] ?? 10.0;
    let rankGwBadgeClass = 'rank-mid';
    if (fdrGwRank === 1) rankGwBadgeClass = 'rank-top';
    else if (fdrGwRank <= 3) rankGwBadgeClass = 'rank-good';
    else if (fdrGwRank >= 9) rankGwBadgeClass = 'rank-tough';

    // 3W FDR Metric & Rank (Premier League Opponent Standing: Higher is easiest)
    const fdr3Rank = fdrMetrics.ranks3[mgr.manager] ?? '-';
    const fdr3Score = fdrMetrics.scores3[mgr.manager] ?? 10.0;
    let rank3BadgeClass = 'rank-mid';
    if (fdr3Rank === 1) rank3BadgeClass = 'rank-top';
    else if (fdr3Rank <= 3) rank3BadgeClass = 'rank-good';
    else if (fdr3Rank >= 9) rank3BadgeClass = 'rank-tough';

    // 5W FDR Metric & Rank (Premier League Opponent Standing: Higher is easiest)
    const fdr5Rank = fdrMetrics.ranks5[mgr.manager] ?? '-';
    const fdr5Score = fdrMetrics.scores5[mgr.manager] ?? 10.0;
    let rank5BadgeClass = 'rank-mid';
    if (fdr5Rank === 1) rank5BadgeClass = 'rank-top';
    else if (fdr5Rank <= 3) rank5BadgeClass = 'rank-good';
    else if (fdr5Rank >= 9) rank5BadgeClass = 'rank-tough';

    // Chip badge
    let chipBadge = '<span class="chip-none">—</span>';
    if (mgr.chip && mgr.chip !== 'None') {
      const chipLower = mgr.chip.toLowerCase();
      let label = mgr.chip.toUpperCase();
      if (chipLower === 'wildcard') label = 'WC';
      else if (chipLower === 'freehit') label = 'FH';
      else if (chipLower === 'bboost') label = 'BB';
      else if (chipLower === '3xc') label = 'TC';

      chipBadge = `<span class="chip-pill chip-${chipLower}" title="${mgr.chip}">${label}</span>`;
    }

    // Captain details
    const capName = mgr.captain || '—';
    const capPts = mgr.captain_points !== undefined ? `${mgr.captain_points} pts` : '';
    const captainHtml = mgr.captain ? `
      <div class="captain-tag">
        <strong>${capName}</strong>
        <span class="c-pts">${capPts}</span>
      </div>
    ` : '—';

    // Squad Value
    const teamVal = mgr.team_value ? `£${mgr.team_value.toFixed(1)}m` : '—';
    const bankVal = mgr.bank ? `£${mgr.bank.toFixed(1)}m` : '£0.0m';

    tr.innerHTML = `
      <td class="col-rank">
        <span class="${rankBadgeClass}">${rankContent}</span>
      </td>
      <td class="col-manager">
        <div class="mgr-cell">
          <span class="mgr-color-dot" style="background-color: ${mgrMeta.color};"></span>
          <div class="mgr-details">
            <span class="mgr-name">
              ${mgr.manager}
              ${isUser ? '<span class="badge-you">YOU</span>' : ''}
            </span>
            <span class="mgr-team">${mgr.team || mgrMeta.team}</span>
          </div>
        </div>
      </td>
      <td class="col-gw-pts text-right">
        <span class="num-bold num-highlight">${mgr.gw_net_points}</span>
        ${hitsCount > 0 ? `<small class="num-muted"> (-${hitsCount})</small>` : ''}
      </td>
      <td class="col-overall text-right">
        <span class="num-bold">${mgr.overall_points}</span>
      </td>
      <td class="col-ft text-center" title="${mgr.manager} has ${ftCount} free transfer${ftCount > 1 ? 's' : ''} stacked up for upcoming deadline (max 5)">
        <span class="ft-stacked-badge ${ftBadgeClass}">${ftCount} FT</span>
      </td>
      <td class="col-fdr-gw text-center" title="Gameweek ${currentGW} Schedule · Avg Opponent Standing: ${fdrGwScore.toFixed(2)} (Higher is easiest matchup · #${fdrGwRank} in league)">
        <div class="fdr-mgr-cell">
          <span class="fdr-rank-badge ${rankGwBadgeClass}">#${fdrGwRank}</span>
          <span class="fdr-sub-num">${fdrGwScore.toFixed(2)}</span>
        </div>
      </td>
      <td class="col-fdr-3w text-center" title="Upcoming 3-GW Schedule (GW ${fdrMetrics.startGw}–${fdrMetrics.endGw3}) · Avg Opponent Standing: ${fdr3Score.toFixed(2)} (Higher is easiest schedule · #${fdr3Rank} in league)">
        <div class="fdr-mgr-cell">
          <span class="fdr-rank-badge ${rank3BadgeClass}">#${fdr3Rank}</span>
          <span class="fdr-sub-num">${fdr3Score.toFixed(2)}</span>
        </div>
      </td>
      <td class="col-fdr-5w text-center" title="Upcoming 5-GW Schedule (GW ${fdrMetrics.startGw}–${fdrMetrics.endGw5}) · Avg Opponent Standing: ${fdr5Score.toFixed(2)} (Higher is easiest schedule · #${fdr5Rank} in league)">
        <div class="fdr-mgr-cell">
          <span class="fdr-rank-badge ${rank5BadgeClass}">#${fdr5Rank}</span>
          <span class="fdr-sub-num">${fdr5Score.toFixed(2)}</span>
        </div>
      </td>
      <td class="col-captain">
        ${captainHtml}
      </td>
      <td class="col-chip text-center">
        ${chipBadge}
      </td>
      <td class="col-value text-right" title="Bank: ${bankVal}">
        <span class="num-bold">${teamVal}</span>
      </td>
    `;

    // Click row to toggle cross-filter selection
    tr.addEventListener('click', () => {
      selectManager(mgr.manager);
    });

    elTotalsTableBody.appendChild(tr);
  });
}

/**
 * Update the Expand / Collapse All Transfers Toggle Button UI
 */
function updateAllTransfersToggleBtn() {
  if (elLblToggleAllTx) {
    elLblToggleAllTx.innerText = allTransfersExpanded ? 'Collapse All' : 'Expand All';
  }
  if (elIconToggleAllTx) {
    elIconToggleAllTx.className = allTransfersExpanded ? 'fa-solid fa-angles-up' : 'fa-solid fa-angles-down';
  }
}

/**
 * --------------------------------------------------------------------------
 * PANEL 2: GAMEWEEK TRANSFERS (ALL 11 TEAMS WITH EXPANDABLE DETAILS)
 * --------------------------------------------------------------------------
 */
function renderTransfers() {
  if (!elTransfersCardsContainer || !appData || !appData.gameweeks) return;
  elTransfersCardsContainer.innerHTML = '';
  updateAllTransfersToggleBtn();

  const gwData = appData.gameweeks[currentGW.toString()];
  if (!gwData || !gwData.standings || gwData.standings.length === 0) {
    elTransfersCardsContainer.innerHTML = `
      <div class="empty-transfers-state">
        <i class="fa-solid fa-arrows-spin"></i>
        <p>No transfer data available for Gameweek ${currentGW}.</p>
      </div>
    `;
    return;
  }

  // Calculate League-wide Transfer Summary Metrics
  let totalMoves = 0;
  let totalHits = 0;
  let bestMove = { manager: null, delta: -Infinity, inPlayer: '', outPlayer: '' };

  gwData.standings.forEach(s => {
    const moves = (s.transfers_detail && s.transfers_detail.length > 0) 
      ? s.transfers_detail.length 
      : (s.transfers || 0);
    const hitCost = Math.abs(s.gw_hits || 0);
    totalMoves += moves;
    totalHits += hitCost;

    if (s.transfers_detail && s.transfers_detail.length > 0) {
      s.transfers_detail.forEach(t => {
        const netDelta = t.net_points || 0;
        if (netDelta > bestMove.delta) {
          bestMove = {
            manager: s.manager,
            delta: netDelta,
            inPlayer: t.in_name,
            outPlayer: t.out_name
          };
        }
      });
    }
  });

  // Update Summary Header Bar
  if (elTransfersTotalMoves) elTransfersTotalMoves.innerText = `${totalMoves} moves`;
  if (elTransfersTotalHits) elTransfersTotalHits.innerText = `-${totalHits} pts`;
  if (elTransfersBestMove) {
    if (bestMove.manager && bestMove.delta !== -Infinity) {
      const sign = bestMove.delta > 0 ? '+' : '';
      elTransfersBestMove.innerText = `${bestMove.inPlayer} (${sign}${bestMove.delta} pts)`;
    } else {
      elTransfersBestMove.innerText = '—';
    }
  }

  if (elTransfersSubtitle) {
    elTransfersSubtitle.innerText = `All 11 teams · Click any team to view move details`;
  }

  // Sort teams matching active standings order
  const fdrMetrics = calculateManagerFdrRatings(currentGW);
  const stackedTransfers = calculateStackedTransfers(currentGW);
  const orderedStandings = sortStandingsByActiveMetric(gwData.standings, fdrMetrics, stackedTransfers);

  // Render All 11 Teams in Compact Accordions
  orderedStandings.forEach(s => {
    const mgrMeta = appData.managers[s.manager] || { team: s.team, color: '#38bdf8' };
    const moves = (s.transfers_detail && s.transfers_detail.length > 0) 
      ? s.transfers_detail.length 
      : (s.transfers || 0);
    const hitDeduction = Math.abs(s.gw_hits || 0);
    const chipActive = (s.chip && s.chip !== 'None') ? s.chip.toUpperCase() : null;

    // Calculate total net delta for this manager
    let netDelta = 0;
    if (s.transfers_detail && s.transfers_detail.length > 0) {
      netDelta = s.transfers_detail.reduce((sum, t) => sum + (t.net_points || 0), 0);
    }

    const hasMoves = moves > 0;
    const isSelected = selectedManager === s.manager;
    const isExpanded = hasMoves && (allTransfersExpanded || isSelected);

    const card = document.createElement('div');
    card.className = `tx-team-accordion${isExpanded ? ' expanded' : ''}${isSelected ? ' selected-tx-team' : ''}`;
    card.dataset.manager = s.manager;
    card.dataset.hasMoves = hasMoves ? 'true' : 'false';

    // Move Count Pill
    const countPillHtml = hasMoves
      ? `<span class="tx-count-pill active-moves"><strong>${moves}</strong> move${moves > 1 ? 's' : ''}</span>`
      : `<span class="tx-count-pill zero-moves">0 moves</span>`;

    // Chip Pill
    let chipPillHtml = '';
    if (chipActive) {
      chipPillHtml = `<span class="tx-chip-badge">${chipActive}</span>`;
    }

    // Hit Penalty Pill
    let hitPillHtml = '';
    if (hitDeduction > 0) {
      hitPillHtml = `<span class="hit-badge">-${hitDeduction} pts</span>`;
    }

    // Net Delta Pill
    let deltaPillHtml = '';
    if (hasMoves && netDelta !== 0) {
      const deltaClass = netDelta > 0 ? 'tx-delta-positive' : 'tx-delta-negative';
      const deltaSign = netDelta > 0 ? '+' : '';
      deltaPillHtml = `<span class="tx-delta-badge ${deltaClass}">${deltaSign}${netDelta} pts</span>`;
    }

    // Chevron / Action Indicator
    const chevronHtml = hasMoves
      ? `<i class="fa-solid fa-chevron-down tx-chevron"></i>`
      : `<span class="tx-chevron chevron-disabled">•</span>`;

    // Build Detail Rows if moves exist
    let movesDetailHtml = '';
    if (hasMoves && s.transfers_detail && s.transfers_detail.length > 0) {
      s.transfers_detail.forEach(t => {
        const delta = t.net_points || 0;
        let deltaClass = 'tx-delta-neutral';
        let deltaSign = '';
        let borderClass = 'border-neutral';

        if (delta > 0) {
          deltaClass = 'tx-delta-positive';
          deltaSign = '+';
          borderClass = 'border-positive';
        } else if (delta < 0) {
          deltaClass = 'tx-delta-negative';
          borderClass = 'border-negative';
        }

        movesDetailHtml += `
          <div class="tx-pair-row ${borderClass}">
            <!-- OUT SUBROW -->
            <div class="tx-subrow tx-subrow-out">
              <div class="tx-subrow-left">
                <span class="tx-dir-badge tx-badge-out">OUT</span>
                <span class="tx-pname">${t.out_name}</span>
                <span class="tx-pmeta-tag">${t.out_club} · ${t.out_pos}</span>
                <span class="tx-cost-tag">£${t.out_cost}m</span>
              </div>
              <div class="tx-subrow-right">
                <span class="tx-pts-tag" title="Points scored by outgoing player in GW ${currentGW}">${t.out_points} pts</span>
              </div>
            </div>

            <!-- IN SUBROW -->
            <div class="tx-subrow tx-subrow-in">
              <div class="tx-subrow-left">
                <span class="tx-dir-badge tx-badge-in">IN</span>
                <span class="tx-pname">${t.in_name}</span>
                <span class="tx-pmeta-tag">${t.in_club} · ${t.in_pos}</span>
                <span class="tx-cost-tag">£${t.in_cost}m</span>
              </div>
              <div class="tx-subrow-right">
                <span class="tx-pts-tag tx-pts-in" title="Points scored by incoming player in GW ${currentGW}">${t.in_points} pts</span>
                <span class="tx-delta-badge ${deltaClass}" title="Net points delta from this transfer">
                  ${deltaSign}${delta} pts
                </span>
              </div>
            </div>
          </div>
        `;
      });
    } else if (hasMoves) {
      const inList = (s.transfers_in || []).join(', ') || '—';
      const outList = (s.transfers_out || []).join(', ') || '—';
      movesDetailHtml = `
        <div class="tx-pair-row border-neutral">
          <div class="tx-subrow tx-subrow-out">
            <div class="tx-subrow-left">
              <span class="tx-dir-badge tx-badge-out">OUT</span>
              <span class="tx-pname">${outList}</span>
            </div>
          </div>
          <div class="tx-subrow tx-subrow-in">
            <div class="tx-subrow-left">
              <span class="tx-dir-badge tx-badge-in">IN</span>
              <span class="tx-pname">${inList}</span>
            </div>
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="tx-team-header">
        <div class="tx-team-title">
          <span class="mgr-color-dot" style="background-color: ${mgrMeta.color};"></span>
          <span class="tx-team-name">${s.manager}</span>
          <span class="tx-team-sub">${s.team || mgrMeta.team}</span>
        </div>
        <div class="tx-team-right">
          ${chipPillHtml}
          ${hitPillHtml}
          ${deltaPillHtml}
          ${countPillHtml}
          ${chevronHtml}
        </div>
      </div>
      ${hasMoves ? `<div class="tx-team-details">${movesDetailHtml}</div>` : ''}
    `;

    // Click handler: expand details & cross-filter manager
    const headerEl = card.querySelector('.tx-team-header');
    headerEl.addEventListener('click', () => {
      if (hasMoves) {
        card.classList.toggle('expanded');
      }
      selectManager(s.manager);
    });

    elTransfersCardsContainer.appendChild(card);
  });
}

/**
 * --------------------------------------------------------------------------
 * PANEL 3: FIXTURE DIFFICULTY RATING (FDR) GRID
 * --------------------------------------------------------------------------
 */

/**
 * Update FDR Sort Dropdown labels based on metric mode
 */
function updateFdrSortOptions() {
  if (!elSelectFdrSort) return;
  const currentVal = elSelectFdrSort.value;
  if (fdrMetricMode === 'defense') {
    elSelectFdrSort.innerHTML = `
      <option value="easiest">Easiest Defense First (Weakest Defenses)</option>
      <option value="hardest">Hardest Defense First (Stout Defenses)</option>
      <option value="alpha">Alphabetical (A-Z)</option>
    `;
  } else if (fdrMetricMode === 'attack') {
    elSelectFdrSort.innerHTML = `
      <option value="easiest">Easiest Attack First (Best Clean Sheet Odds)</option>
      <option value="hardest">Hardest Attack First (Most Lethal Attacks)</option>
      <option value="alpha">Alphabetical (A-Z)</option>
    `;
  } else {
    elSelectFdrSort.innerHTML = `
      <option value="easiest">Easiest Run First (Highest Avg Standing)</option>
      <option value="hardest">Hardest Run First (Lowest Avg Standing)</option>
      <option value="alpha">Alphabetical (A-Z)</option>
    `;
  }
  elSelectFdrSort.value = currentVal;
}

/**
 * Update FDR Legend Bar based on metric mode
 */
function updateFdrLegend() {
  if (!elFdrLegendTitle || !elFdrLegendItems) return;
  if (fdrMetricMode === 'defense') {
    elFdrLegendTitle.innerText = 'Opponent Defense (Higher = Weaker Defense / Easier to Score):';
    elFdrLegendItems.innerHTML = `
      <span class="legend-chip fdr-2">#17–20 Leakiest (Easiest)</span>
      <span class="legend-chip fdr-1">#12–16 Favorable</span>
      <span class="legend-chip fdr-3">#7–11 Moderate</span>
      <span class="legend-chip fdr-4">#4–6 Tough</span>
      <span class="legend-chip fdr-5">#1–3 Elite Def (Hardest)</span>
    `;
  } else if (fdrMetricMode === 'attack') {
    elFdrLegendTitle.innerText = 'Opponent Attack (Higher = Weaker Attack / Best Clean Sheet Odds):';
    elFdrLegendItems.innerHTML = `
      <span class="legend-chip fdr-2">#17–20 Weakest (Best CS)</span>
      <span class="legend-chip fdr-1">#12–16 Low Threat</span>
      <span class="legend-chip fdr-3">#7–11 Moderate</span>
      <span class="legend-chip fdr-4">#4–6 High Threat</span>
      <span class="legend-chip fdr-5">#1–3 Lethal (Hardest)</span>
    `;
  } else {
    elFdrLegendTitle.innerText = 'Opponent Table Standing (Higher = Easier):';
    elFdrLegendItems.innerHTML = `
      <span class="legend-chip fdr-2">#17–20 Easiest</span>
      <span class="legend-chip fdr-1">#12–16 Favorable</span>
      <span class="legend-chip fdr-3">#7–11 Moderate</span>
      <span class="legend-chip fdr-4">#4–6 Tough</span>
      <span class="legend-chip fdr-5">#1–3 Hardest</span>
    `;
  }
}

function renderFdrGrid() {
  if (!elFdrMatrixBody || !appData) return;
  elFdrMatrixBody.innerHTML = '';

  const fdrData = appData.team_fixtures_fdr;
  if (!fdrData) {
    elFdrMatrixBody.innerHTML = `
      <tr>
        <td colspan="12" style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.5rem; color: var(--accent-gold); margin-bottom: 8px;"></i>
          <p>Official Fixture Difficulty Rating matrix is available for active 2026/27 season data.</p>
        </td>
      </tr>
    `;
    return;
  }

  // Determine horizon gameweeks: start at currentGW up to min(38, currentGW + horizon - 1)
  const startGW = currentGW;
  const endGW = Math.min(38, currentGW + fdrHorizon - 1);
  const horizonGWs = [];
  for (let g = startGW; g <= endGW; g++) {
    horizonGWs.push(g);
  }

  // Header Run Avg tooltip based on active metric mode
  let avgTooltip = `Average opponent Premier League standing over GW ${startGW}–${endGW} (Higher = Easiest run)`;
  if (fdrMetricMode === 'defense') {
    avgTooltip = `Average opponent defense rank over GW ${startGW}–${endGW} (Higher = Weaker defenses / Best for attackers to score)`;
  } else if (fdrMetricMode === 'attack') {
    avgTooltip = `Average opponent attack rank over GW ${startGW}–${endGW} (Higher = Weaker attacks / Best for defenders to keep clean sheets)`;
  }

  // Render Table Header with Horizon GWs
  if (elFdrTableHeadRow) {
    elFdrTableHeadRow.innerHTML = `
      <th class="col-fdr-team sticky-col">Team</th>
      <th class="col-fdr-avg sticky-col-2" title="${avgTooltip}">Run Avg</th>
    `;
    horizonGWs.forEach(gw => {
      const th = document.createElement('th');
      th.innerText = `GW ${gw}`;
      if (gw === latestGW) th.classList.add('gw-current-header');
      elFdrTableHeadRow.appendChild(th);
    });
  }

  // Standings map and team records for opponent defense/attack/table ranking
  const pls = appData.premier_league_standings;
  const standingsMap = (pls && pls.ranks_by_gw?.[currentGW.toString()]) 
    || (pls && pls.latest_ranks) 
    || {};
  const teamRecords = (pls && pls.team_records_by_gw?.[currentGW.toString()]) 
    || (pls && pls.latest_records) 
    || {};

  // Helper to evaluate a fixture's opponent metric
  function getOpponentFixtureMetric(oppCode) {
    if (!oppCode) return { rank: 10, label: 'Moderate', detail: '', tag: '—', fdrClass: 'fdr-3' };
    const rec = teamRecords[oppCode];
    let rank = 10;
    let label = 'Moderate';
    let detail = '';
    let tag = `#10`;

    if (fdrMetricMode === 'defense') {
      rank = rec ? rec.def_rank : (standingsMap[oppCode] || 10);
      detail = rec ? `${rec.goals_against} GA in ${rec.played} matches` : '';
      tag = `Def #${rank}`;
      if (rank >= 17) label = 'Leakiest Defense (Easiest to score)';
      else if (rank >= 12) label = 'Favorable Defense';
      else if (rank <= 3) label = 'Elite Defense (Toughest to score)';
      else if (rank <= 6) label = 'Solid Defense';
      else label = 'Moderate Defense';
    } else if (fdrMetricMode === 'attack') {
      rank = rec ? rec.att_rank : (standingsMap[oppCode] || 10);
      detail = rec ? `${rec.goals_for} GF in ${rec.played} matches` : '';
      tag = `Att #${rank}`;
      if (rank >= 17) label = 'Weak Attack (Best clean sheet odds)';
      else if (rank >= 12) label = 'Low Goal Threat';
      else if (rank <= 3) label = 'Lethal Attack (Hardest for CS)';
      else if (rank <= 6) label = 'High Goal Threat';
      else label = 'Moderate Attack';
    } else {
      rank = standingsMap[oppCode] !== undefined ? standingsMap[oppCode] : 10;
      tag = `#${rank}`;
      if (rank >= 17) label = 'Easiest (#17–20)';
      else if (rank >= 12) label = 'Favorable (#12–16)';
      else if (rank <= 3) label = 'Hardest (#1–3)';
      else if (rank <= 6) label = 'Tough (#4–6)';
      else label = 'Moderate (#7–11)';
    }

    let fdrClass = 'fdr-3';
    if (rank >= 17) fdrClass = 'fdr-2';
    else if (rank >= 12) fdrClass = 'fdr-1';
    else if (rank <= 3) fdrClass = 'fdr-5';
    else if (rank <= 6) fdrClass = 'fdr-4';
    else fdrClass = 'fdr-3';

    return { rank, label, detail, tag, fdrClass };
  }

  // Identify Selected Manager's Squad Clubs
  const squadClubsCount = {};
  if (selectedManager && appData.gameweeks && appData.gameweeks[currentGW.toString()]) {
    const lineup = appData.gameweeks[currentGW.toString()].lineups?.[selectedManager] || [];
    lineup.forEach(p => {
      if (p.club) {
        squadClubsCount[p.club] = (squadClubsCount[p.club] || 0) + 1;
      }
    });
  }

  // Prepare Team Rows with Average Calculation
  const teamRows = [];
  Object.keys(fdrData).forEach(teamCode => {
    const fixtures = fdrData[teamCode] || {};
    let diffSum = 0;
    let count = 0;

    horizonGWs.forEach(gw => {
      const fix = fixtures[gw.toString()];
      if (fix && fix.opponent_short) {
        const m = getOpponentFixtureMetric(fix.opponent_short);
        diffSum += m.rank;
        count++;
      }
    });

    const avgDiff = count > 0 ? (diffSum / count) : 10.0;
    const fullName = PL_TEAM_NAMES[teamCode] || teamCode;
    const squadCount = squadClubsCount[teamCode] || 0;

    teamRows.push({
      teamCode,
      fullName,
      avgDiff,
      squadCount,
      fixtures
    });
  });

  // Filter Teams
  let filteredTeams = teamRows;

  // Search filter
  if (fdrSearchQuery) {
    filteredTeams = filteredTeams.filter(t => 
      t.teamCode.toLowerCase().includes(fdrSearchQuery) || 
      t.fullName.toLowerCase().includes(fdrSearchQuery)
    );
  }

  // Squad Clubs only filter
  if (fdrSquadFilterOnly && selectedManager) {
    filteredTeams = filteredTeams.filter(t => t.squadCount > 0);
  }

  // Sort Teams (Higher average = facing weaker opponents/defenses/attacks = easiest run)
  filteredTeams.sort((a, b) => {
    if (fdrSortMode === 'easiest') {
      return b.avgDiff - a.avgDiff || a.teamCode.localeCompare(b.teamCode);
    } else if (fdrSortMode === 'hardest') {
      return a.avgDiff - b.avgDiff || a.teamCode.localeCompare(b.teamCode);
    } else {
      // 'alpha'
      return a.teamCode.localeCompare(b.teamCode);
    }
  });

  if (filteredTeams.length === 0) {
    elFdrMatrixBody.innerHTML = `
      <tr>
        <td colspan="${horizonGWs.length + 2}" style="text-align: center; padding: 30px; color: var(--text-secondary);">
          No teams found matching your search criteria.
        </td>
      </tr>
    `;
    return;
  }

  // Render Table Body
  filteredTeams.forEach(t => {
    const tr = document.createElement('tr');
    if (t.squadCount > 0) tr.classList.add('squad-owned-row');

    // Run Avg color styling (Higher = easier run)
    const roundedAvg = t.avgDiff.toFixed(1);
    let avgColorClass = 'fdr-3';
    if (t.avgDiff >= 13.0) avgColorClass = 'fdr-2';
    else if (t.avgDiff >= 10.5) avgColorClass = 'fdr-1';
    else if (t.avgDiff >= 8.5) avgColorClass = 'fdr-3';
    else if (t.avgDiff >= 6.5) avgColorClass = 'fdr-4';
    else avgColorClass = 'fdr-5';

    // Squad badge html
    const squadBadgeHtml = t.squadCount > 0 
      ? `<span class="squad-count-badge" title="${selectedManager} owns ${t.squadCount} players from ${t.fullName}"><i class="fa-solid fa-user"></i> ${t.squadCount}</span>`
      : '';

    let rowHtml = `
      <td class="sticky-col">
        <div class="fdr-team-cell">
          <div class="fdr-team-title">
            <span class="fdr-team-code">${t.teamCode}</span>
            <span class="fdr-team-fullname">${t.fullName}</span>
          </div>
          ${squadBadgeHtml}
        </div>
      </td>
      <td class="sticky-col-2">
        <span class="fdr-avg-pill ${avgColorClass}">${roundedAvg}</span>
      </td>
    `;

    // Gameweek Fixture Matchup Cells
    horizonGWs.forEach(gw => {
      const fix = t.fixtures[gw.toString()];
      if (!fix) {
        rowHtml += `<td><span class="fdr-cell">—</span></td>`;
        return;
      }

      const oppCode = fix.opponent_short;
      const m = getOpponentFixtureMetric(oppCode);

      rowHtml += `
        <td>
          <div class="fdr-cell ${m.fdrClass}" 
               data-gw="${gw}"
               data-team="${t.fullName}"
               data-opp="${fix.opponent_name || fix.opponent_short}"
               data-venue="${fix.venue === 'H' ? 'Home' : 'Away'}"
               data-rank="${m.rank}"
               data-label="${m.label}"
               data-detail="${m.detail}">
            <span class="opp-text">${oppCode} <small class="opp-standing-num">${m.tag}</small></span>
            <span class="venue-tag">(${fix.venue || '?'})</span>
          </div>
        </td>
      `;
    });

    tr.innerHTML = rowHtml;
    elFdrMatrixBody.appendChild(tr);
  });

  // Attach Tooltip Listeners to Cells
  attachFdrTooltipListeners();
}

/**
 * Attach Hover Tooltip Listeners for FDR Cells
 */
function attachFdrTooltipListeners() {
  const cells = elFdrMatrixBody.querySelectorAll('.fdr-cell[data-gw]');
  cells.forEach(cell => {
    cell.addEventListener('mouseenter', () => {
      if (!elTooltip) return;
      const gw = cell.dataset.gw;
      const team = cell.dataset.team;
      const opp = cell.dataset.opp;
      const venue = cell.dataset.venue;
      const rank = cell.dataset.rank;
      const label = cell.dataset.label;
      const detail = cell.dataset.detail;

      const metricTypeTitle = fdrMetricMode === 'defense' 
        ? 'Opponent Defense' 
        : (fdrMetricMode === 'attack' ? 'Opponent Attack' : 'Opponent Standing');

      const detailHtml = detail 
        ? `<br><span style="font-size: 0.70rem; color: var(--text-secondary);">${detail}</span>` 
        : '';

      elTooltip.innerHTML = `
        <strong>GW ${gw} Matchup</strong><br>
        <span>${team} vs ${opp} (${venue})</span><br>
        <span style="font-size: 0.72rem; color: var(--accent-gold); font-weight: 700;">${metricTypeTitle}: #${rank} (${label})</span>
        ${detailHtml}
      `;
      elTooltip.classList.remove('hidden');
    });

    cell.addEventListener('mouseleave', () => {
      if (elTooltip) elTooltip.classList.add('hidden');
    });
  });
}
