/**
 * FPL MISSION CONTROL - UNIFIED 1-VIEW DASHBOARD
 * Modern, high-density, single-screen visualizer for FPL Gameweek Totals, Transfers, and FDR Matrix.
 */

// Global Application State
let appData = null;
let activeSeason = '2026_27';
let currentGW = 6;
let latestGW = 6;
let selectedManager = null;
let totalsSortMode = 'overall'; // 'overall' or 'gw'
let fdrHorizon = 5;            // 5, 8, or 38
let fdrSortMode = 'easiest';    // 'easiest', 'hardest', 'alpha'
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
let elTotalsTableBody, elSortToggleGroup;
let elTransfersCardsContainer, elTransfersTotalMoves, elTransfersTotalHits, elTransfersBestMove, elTransfersSubtitle;
let elBtnToggleAllTx, elLblToggleAllTx, elIconToggleAllTx;
let elFdrHorizonGroup, elSelectFdrSort, elInputFdrSearch, elBtnFdrSquadOnly, elLblFdrSquadBtn;
let elFdrTableHeadRow, elFdrMatrixBody, elTooltip;

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
  elSortToggleGroup = document.getElementById('sort-toggle-group');

  elTransfersCardsContainer = document.getElementById('transfers-cards-container');
  elTransfersTotalMoves = document.getElementById('transfers-total-moves');
  elTransfersTotalHits = document.getElementById('transfers-total-hits');
  elTransfersBestMove = document.getElementById('transfers-best-move');
  elTransfersSubtitle = document.getElementById('transfers-subtitle');
  elBtnToggleAllTx = document.getElementById('btn-toggle-all-transfers');
  elLblToggleAllTx = document.getElementById('lbl-toggle-all-tx');
  elIconToggleAllTx = document.getElementById('icon-toggle-all-tx');

  elFdrHorizonGroup = document.getElementById('fdr-horizon-group');
  elSelectFdrSort = document.getElementById('select-fdr-sort');
  elInputFdrSearch = document.getElementById('input-fdr-search');
  elBtnFdrSquadOnly = document.getElementById('btn-fdr-squad-only');
  elLblFdrSquadBtn = document.getElementById('lbl-fdr-squad-btn');
  elFdrTableHeadRow = document.getElementById('fdr-table-head-row');
  elFdrMatrixBody = document.getElementById('fdr-matrix-body');
  elTooltip = document.getElementById('fdr-tooltip');
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

  // Totals Sort Buttons
  if (elSortToggleGroup) {
    elSortToggleGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.toggle-btn');
      if (!btn) return;
      elSortToggleGroup.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      totalsSortMode = btn.dataset.sort;
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

  // Compute average difficulty for each manager
  Object.keys(gwData.lineups).forEach(mgr => {
    const lineup = gwData.lineups[mgr] || [];
    let sum3 = 0, count3 = 0;
    let sum5 = 0, count5 = 0;

    lineup.forEach(p => {
      const club = p.club;
      if (club && fdr[club]) {
        gws3.forEach(g => {
          if (fdr[club][g] && fdr[club][g].difficulty !== undefined) {
            sum3 += fdr[club][g].difficulty;
            count3++;
          }
        });
        gws5.forEach(g => {
          if (fdr[club][g] && fdr[club][g].difficulty !== undefined) {
            sum5 += fdr[club][g].difficulty;
            count5++;
          }
        });
      }
    });

    result.scores3[mgr] = count3 > 0 ? Number((sum3 / count3).toFixed(2)) : 3.0;
    result.scores5[mgr] = count5 > 0 ? Number((sum5 / count5).toFixed(2)) : 3.0;
  });

  // Assign 3W ranks (lower difficulty = better rank)
  const sorted3 = Object.keys(result.scores3).sort((a, b) => result.scores3[a] - result.scores3[b]);
  sorted3.forEach((mgr, i) => {
    if (i > 0 && result.scores3[mgr] === result.scores3[sorted3[i - 1]]) {
      result.ranks3[mgr] = result.ranks3[sorted3[i - 1]];
    } else {
      result.ranks3[mgr] = i + 1;
    }
  });

  // Assign 5W ranks (lower difficulty = better rank)
  const sorted5 = Object.keys(result.scores5).sort((a, b) => result.scores5[a] - result.scores5[b]);
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
        <td colspan="9" style="text-align: center; padding: 30px; color: var(--text-secondary);">
          <i class="fa-solid fa-clock-rotate-left" style="font-size: 1.5rem; margin-bottom: 6px;"></i>
          <p>Gameweek ${currentGW} fixtures have not yet concluded.</p>
        </td>
      </tr>
    `;
    return;
  }

  // Calculate upcoming FDR ratings & ranks for each manager
  const fdrMetrics = calculateManagerFdrRatings(currentGW);

  // Sort standings based on user selection
  const standings = [...gwData.standings].sort((a, b) => {
    if (totalsSortMode === 'gw') {
      if (b.gw_net_points !== a.gw_net_points) return b.gw_net_points - a.gw_net_points;
      return b.overall_points - a.overall_points;
    }
    if (totalsSortMode === 'fdr3') {
      const fdrA = fdrMetrics.scores3[a.manager] ?? 3.0;
      const fdrB = fdrMetrics.scores3[b.manager] ?? 3.0;
      if (fdrA !== fdrB) return fdrA - fdrB;
      return b.overall_points - a.overall_points;
    }
    if (totalsSortMode === 'fdr5') {
      const fdrA = fdrMetrics.scores5[a.manager] ?? 3.0;
      const fdrB = fdrMetrics.scores5[b.manager] ?? 3.0;
      if (fdrA !== fdrB) return fdrA - fdrB;
      return b.overall_points - a.overall_points;
    }
    // Default 'overall'
    if (b.overall_points !== a.overall_points) return b.overall_points - a.overall_points;
    return b.gw_net_points - a.gw_net_points;
  });

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

    // 3W FDR Metric & Rank
    const fdr3Rank = fdrMetrics.ranks3[mgr.manager] ?? '-';
    const fdr3Score = fdrMetrics.scores3[mgr.manager] ?? 3.0;
    let rank3BadgeClass = 'rank-mid';
    if (fdr3Rank === 1) rank3BadgeClass = 'rank-top';
    else if (fdr3Rank <= 3) rank3BadgeClass = 'rank-good';
    else if (fdr3Rank >= 9) rank3BadgeClass = 'rank-tough';

    // 5W FDR Metric & Rating Pill
    const fdr5Rank = fdrMetrics.ranks5[mgr.manager] ?? '-';
    const fdr5Score = fdrMetrics.scores5[mgr.manager] ?? 3.0;
    let fdr5PillClass = 'fdr-med';
    if (fdr5Score <= 3.01) fdr5PillClass = 'fdr-easy';
    else if (fdr5Score >= 3.11) fdr5PillClass = 'fdr-hard';

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
      <td class="col-fdr-3w text-center" title="Upcoming 3-GW Schedule (GW ${fdrMetrics.startGw}–${fdrMetrics.endGw3}) · Avg FDR: ${fdr3Score.toFixed(2)} (Lower = Easiest/Best)">
        <div class="fdr-mgr-cell">
          <span class="fdr-rank-badge ${rank3BadgeClass}">#${fdr3Rank}</span>
          <span class="fdr-sub-num">${fdr3Score.toFixed(2)}</span>
        </div>
      </td>
      <td class="col-fdr-5w text-center" title="Upcoming 5-GW Schedule (GW ${fdrMetrics.startGw}–${fdrMetrics.endGw5}) · League Rank: #${fdr5Rank} (Lower = Easiest/Best)">
        <div class="fdr-mgr-cell">
          <span class="fdr-score-pill ${fdr5PillClass}">${fdr5Score.toFixed(2)}</span>
          <span class="fdr-sub-num">#${fdr5Rank}</span>
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
  const orderedStandings = [...gwData.standings].sort((a, b) => {
    if (totalsSortMode === 'gw') {
      if (b.gw_net_points !== a.gw_net_points) return b.gw_net_points - a.gw_net_points;
      return b.overall_points - a.overall_points;
    }
    if (b.overall_points !== a.overall_points) return b.overall_points - a.overall_points;
    return b.gw_net_points - a.gw_net_points;
  });

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
        if (delta > 0) {
          deltaClass = 'tx-delta-positive';
          deltaSign = '+';
        } else if (delta < 0) {
          deltaClass = 'tx-delta-negative';
        }

        movesDetailHtml += `
          <div class="tx-pair-row">
            <!-- OUT PLAYER -->
            <div class="tx-player-box tx-out">
              <span class="tx-dir-badge">OUT</span>
              <div class="tx-player-info">
                <span class="tx-pname">${t.out_name}</span>
                <span class="tx-pmeta">${t.out_club} · ${t.out_pos} · £${t.out_cost}m</span>
              </div>
              <span class="tx-pts-tag" title="GW Points scored by outgoing player">${t.out_points} pts</span>
            </div>

            <i class="fa-solid fa-arrow-right tx-arrow-icon"></i>

            <!-- IN PLAYER -->
            <div class="tx-player-box tx-in">
              <span class="tx-dir-badge">IN</span>
              <div class="tx-player-info">
                <span class="tx-pname">${t.in_name}</span>
                <span class="tx-pmeta">${t.in_club} · ${t.in_pos} · £${t.in_cost}m</span>
              </div>
              <span class="tx-pts-tag" title="GW Points scored by incoming player">${t.in_points} pts</span>
            </div>

            <!-- NET DELTA -->
            <span class="tx-delta-badge ${deltaClass}" title="Net GW points gain from transfer">
              ${deltaSign}${delta} pts
            </span>
          </div>
        `;
      });
    } else if (hasMoves) {
      const inList = (s.transfers_in || []).join(', ') || '—';
      const outList = (s.transfers_out || []).join(', ') || '—';
      movesDetailHtml = `
        <div class="tx-pair-row">
          <div class="tx-player-box tx-out"><span class="tx-pname">OUT: ${outList}</span></div>
          <i class="fa-solid fa-arrow-right tx-arrow-icon"></i>
          <div class="tx-player-box tx-in"><span class="tx-pname">IN: ${inList}</span></div>
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

  // Render Table Header with Horizon GWs
  if (elFdrTableHeadRow) {
    elFdrTableHeadRow.innerHTML = `
      <th class="col-fdr-team sticky-col">Team</th>
      <th class="col-fdr-avg sticky-col-2" title="Average difficulty score over GW ${startGW}–${endGW}">Run Avg</th>
    `;
    horizonGWs.forEach(gw => {
      const th = document.createElement('th');
      th.innerText = `GW ${gw}`;
      if (gw === latestGW) th.classList.add('gw-current-header');
      elFdrTableHeadRow.appendChild(th);
    });
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

  // Prepare Team Rows with Average FDR Calculation
  const teamRows = [];
  Object.keys(fdrData).forEach(teamCode => {
    const fixtures = fdrData[teamCode] || {};
    let diffSum = 0;
    let count = 0;

    horizonGWs.forEach(gw => {
      const fix = fixtures[gw.toString()];
      if (fix && fix.difficulty !== undefined) {
        diffSum += fix.difficulty;
        count++;
      }
    });

    const avgDiff = count > 0 ? (diffSum / count) : 3.0;
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

  // Sort Teams
  filteredTeams.sort((a, b) => {
    if (fdrSortMode === 'easiest') {
      return a.avgDiff - b.avgDiff || a.teamCode.localeCompare(b.teamCode);
    } else if (fdrSortMode === 'hardest') {
      return b.avgDiff - a.avgDiff || a.teamCode.localeCompare(b.teamCode);
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

    // Run Avg color styling
    const roundedAvg = t.avgDiff.toFixed(1);
    let avgColorClass = 'fdr-3';
    if (t.avgDiff <= 2.4) avgColorClass = 'fdr-2';
    else if (t.avgDiff >= 3.6) avgColorClass = 'fdr-4';

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

      const diff = fix.difficulty || 3;
      const opp = fix.opponent || `${fix.opponent_short} (${fix.venue})`;
      const fdrClass = `fdr-${diff}`;

      rowHtml += `
        <td>
          <div class="fdr-cell ${fdrClass}" 
               data-gw="${gw}"
               data-team="${t.fullName}"
               data-opp="${fix.opponent_name || fix.opponent_short}"
               data-venue="${fix.venue === 'H' ? 'Home' : 'Away'}"
               data-diff="${diff}">
            <span class="opp-text">${fix.opponent_short || opp}</span>
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
      const diff = cell.dataset.diff;

      let diffLabel = 'Moderate';
      if (diff === '1') diffLabel = 'Very Easy';
      else if (diff === '2') diffLabel = 'Easy';
      else if (diff === '4') diffLabel = 'Difficult';
      else if (diff === '5') diffLabel = 'Extreme';

      elTooltip.innerHTML = `
        <strong>GW ${gw} Matchup</strong><br>
        <span>${team} vs ${opp} (${venue})</span><br>
        <span style="font-size: 0.72rem; color: var(--text-secondary);">Difficulty: ${diff} (${diffLabel})</span>
      `;
      elTooltip.classList.remove('hidden');
    });

    cell.addEventListener('mouseleave', () => {
      if (elTooltip) elTooltip.classList.add('hidden');
    });
  });
}
