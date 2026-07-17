class Component extends DCLogic {
  state = {
    mode: 'compare', stage: 'input', helpOpen: false, traceOpen: false,
    aUrl: '', aClaim: '', aUse: true, bUrl: '', bClaim: '', bUse: true,
    aResolving: false, bResolving: false, aSrc: null, bSrc: null,
    steps: [0,0,0,0,0], // 0 pending, 1 active, 2 done
    result: null, error: null,
    drawerKey: null, eqOpen: false, copied: false,
    chUrl: '', chSrc: null, chStage: 'input', scouts: [0,0,0], candidatesReady: false,
  };


  stepLabels = ['Fetching source passages', 'Extracting comparable fields — Paper A', 'Extracting comparable fields — Paper B', 'Aligning methods and scope', 'Verifying claim–evidence support'];


  rows = [];
  eqRows = [];
  candidatesData = [];

  async post(endpointName, payload) {
    return window.PaperDiffAPI.post(endpointName, payload);
  }

  normalizePaper(paper, fallback) {
    if (!paper || typeof paper !== 'object') throw new Error('Pipeline response is missing a paper record.');
    return {
      title: paper.title || fallback,
      venue: paper.venue || paper.journal || '',
      year: paper.year || '',
      authors: Array.isArray(paper.authors) ? paper.authors.join(', ') : (paper.authors || ''),
      passages: paper.passages ?? (Array.isArray(paper.evidence) ? paper.evidence.length : 0),
      short: paper.short || paper.title || fallback,
      metaLine: paper.meta_line || paper.metaLine || '',
      domain: paper.domain || '',
      sourceUrl: this.safeHttpsUrl(paper.source_url || paper.url),
    };
  }

  safeHttpsUrl(value) {
    if (typeof value !== 'string') return '';
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : '';
    } catch {
      return '';
    }
  }

  isDoi(value) {
    return /^(?:https?:\/\/(?:dx\.)?doi\.org\/)?10\.\d{4,9}\/\S+$/i.test(String(value || '').trim());
  }

  normalizeDimension(dimension, index) {
    const classification = dimension.classification || dimension.state || 'review';
    const state = classification === 'incompatible' ? 'x' :
      (classification === 'different' ? 'diff' :
        (classification === 'equivalent' ? 'eq' : 'review'));
    const status = dimension.evidence_status || dimension.ground || 'Needs review';
    const ground = status === 'grounded' ? 'Grounded' :
      (status === 'qualified' ? 'Qualified' :
        (status === 'Grounded' || status === 'Qualified' ? status : 'Needs review'));
    const left = dimension.left_value ?? dimension.a ?? '';
    const right = dimension.right_value ?? dimension.b ?? '';
    return {
      key: dimension.key || 'dimension-' + index,
      dim: dimension.label || dimension.dim || dimension.key || 'Dimension',
      state,
      expanded: Boolean(dimension.drives_verdict),
      ground,
      a: left,
      b: right,
      interp: dimension.rationale || dimension.interpretation || '',
      teaser: dimension.teaser || (String(left) + ' ↔ ' + String(right)),
      chain: dimension.evidence_chain || [],
      passA: dimension.left_passage || { pre: '', span: '', post: '' },
      passB: dimension.right_passage || { pre: '', span: '', post: '' },
      verifier: dimension.verifier_rationale || '',
      whyVerdict: dimension.verdict_impact || dimension.rationale || '',
    };
  }

  normalizeCandidate(candidate, index) {
    const relation = candidate.relationship_type || candidate.rel || 'Comparable evidence';
    const fit = String(candidate.fit || candidate.comparison_fit || 'REVIEW').toUpperCase();
    const url = this.safeHttpsUrl(candidate.url || candidate.source_url);
    const citationUrls = Array.isArray(candidate.citations)
      ? [...new Set(candidate.citations.map(value => this.safeHttpsUrl(value)).filter(Boolean))]
      : [];
    return {
      ...candidate,
      rel: relation,
      relColor: relation.toLowerCase().includes('contradict') ? '#A93F35' : '#1746B7',
      relBg: relation.toLowerCase().includes('contradict') ? '#FDE7E4' : '#E9F0FF',
      fit,
      fitColor: fit === 'HIGH' ? '#1746B7' : '#A65F00',
      title: candidate.title || 'Candidate ' + (index + 1),
      venue: candidate.venue || candidate.journal || '',
      year: candidate.year || '',
      why: candidate.why || candidate.explanation || '',
      dims: candidate.dimensions || [],
      url,
      citationLinks: citationUrls.map((citationUrl, citationIndex) => ({
        url: citationUrl,
        label: citationUrl === url ? 'Candidate source' : 'Source evidence ' + (citationIndex + 1),
      })),
    };
  }

  scheduleProgress() {
    const timers = [
      setTimeout(() => this.setState({ steps: [2,1,0,0,0] }), 600),
      setTimeout(() => this.setState({ steps: [2,2,1,0,0] }), 1400),
      setTimeout(() => this.setState({ steps: [2,2,2,1,0] }), 2200),
      setTimeout(() => this.setState({ steps: [2,2,2,2,1] }), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }

  async runAnalysis() {
    this.setState({ mode: 'compare', stage: 'analysis', steps: [1,0,0,0,0], traceOpen: false, error: null });
    const stopProgress = this.scheduleProgress();
    try {
      const data = await this.post('compareEndpoint', {
        left: { url: this.state.aUrl || null, claim: this.state.aClaim || null, use_detected_conclusion: this.state.aUse },
        right: { url: this.state.bUrl || null, claim: this.state.bClaim || null, use_detected_conclusion: this.state.bUse },
      });
      if (!data || !data.left || !data.right || !Array.isArray(data.dimensions) || !data.verdict) {
        throw new Error('The Compare response does not match the PaperDiff contract.');
      }
      const normalized = data.dimensions.map((item, index) => this.normalizeDimension(item, index));
      this.rows = normalized.filter(row => row.state !== 'eq');
      this.eqRows = normalized.filter(row => row.state === 'eq');
      this.setState({
        steps: [2,2,2,2,2],
        aSrc: this.normalizePaper(data.left, 'Paper A'),
        bSrc: this.normalizePaper(data.right, 'Paper B'),
        result: data,
      });
      setTimeout(() => this.setState({ stage: 'result', drawerKey: null, eqOpen: false, copied: false }), 250);
    } catch (error) {
      this.setState({ stage: 'input', steps: [0,0,0,0,0], error: error.message || String(error) });
    } finally {
      stopProgress();
    }
  }

  async runChallenge() {
    this.setState({ chStage: 'run', scouts: [1,1,1], candidatesReady: false, error: null });
    try {
      const data = await this.post('challengeEndpoint', { input: this.state.chUrl });
      const sourceUrl = this.safeHttpsUrl(data && data.source && data.source.source_url);
      const candidatesAreCited = data && Array.isArray(data.candidates) && data.candidates.every(candidate => {
        const candidateUrl = this.safeHttpsUrl(candidate && (candidate.url || candidate.source_url));
        const citations = Array.isArray(candidate && candidate.citations)
          ? candidate.citations.map(value => this.safeHttpsUrl(value))
          : [];
        return candidateUrl && citations.includes(sourceUrl) && citations.includes(candidateUrl);
      });
      if (!sourceUrl || !candidatesAreCited) {
        throw new Error('The Challenge response does not match the PaperDiff contract.');
      }
      this.candidatesData = data.candidates.map((item, index) => this.normalizeCandidate(item, index));
      this.setState({
        chSrc: data.source ? this.normalizePaper(data.source, this.state.chUrl) : null,
        scouts: [2,2,2],
        candidatesReady: true,
      });
    } catch (error) {
      this.setState({ chStage: 'input', scouts: [0,0,0], error: error.message || String(error) });
    }
  }

  stateStyle(st) {
    if (st === 'x') return { edge: '#A93F35', chipBg: '#FDE7E4', chipColor: '#A93F35', marker: '×', stateLabel: 'Materially incompatible', borderColor: '#DCE3EC', borderStyle: 'solid' };
    if (st === 'diff') return { edge: '#A65F00', chipBg: '#FFF1D6', chipColor: '#A65F00', marker: '↔', stateLabel: 'Different, comparable', borderColor: '#DCE3EC', borderStyle: 'solid' };
    if (st === 'review') return { edge: '#8A95A6', chipBg: '#EFF2F6', chipColor: '#566173', marker: '?', stateLabel: 'Needs review', borderColor: '#8A95A6', borderStyle: 'dashed' };
    return { edge: '#DCE3EC', chipBg: '#EFF2F6', chipColor: '#566173', marker: '=', stateLabel: 'Materially equivalent', borderColor: '#DCE3EC', borderStyle: 'solid' };
  }

  groundStyle(g) {
    if (g === 'Grounded') return { groundBg: '#E9F0FF', groundColor: '#1746B7' };
    if (g === 'Qualified') return { groundBg: '#FFF1D6', groundColor: '#A65F00' };
    return { groundBg: '#EFF2F6', groundColor: '#566173' };
  }

  makeRow(r) {
    const st = this.stateStyle(r.state || 'eq');
    const g = this.groundStyle(r.ground || 'Needs review');
    const expanded = this.state['exp_' + r.key] !== undefined ? this.state['exp_' + r.key] : !!r.expanded;
    return { ...r, ...st, ...g, ground: r.ground || 'Needs review', expanded,
      chev: expanded ? 'rotate(180deg)' : 'none',
      onToggle: () => this.setState({ ['exp_' + r.key]: !expanded }),
      onOpen: (e) => { e && e.preventDefault && e.preventDefault(); e && e.stopPropagation && e.stopPropagation(); this.setState({ drawerKey: r.key }); } };
  }

  makeStep(labels, states, i) {
    const s = states[i];
    return { label: labels[i], active: s === 1, detail: s === 2 ? 'done' : null,
      icon: s === 2 ? '✓' : String(i + 1),
      bg: s === 1 ? '#FFFFFF' : (s === 2 ? '#FFFFFF' : '#F7F9FC'),
      border: s === 1 ? '#2357D9' : '#DCE3EC',
      color: s === 0 ? '#8A95A6' : '#090D14',
      iconBg: s === 2 ? '#2357D9' : '#FFFFFF', iconColor: s === 2 ? '#FFFFFF' : (s === 1 ? '#2357D9' : '#8A95A6'),
      iconBorder: s === 2 ? '#2357D9' : (s === 1 ? '#2357D9' : '#DCE3EC') };
  }

  renderVals() {
    const s = this.state;
    const mode = s.mode, stage = s.stage;
    const result = s.result || {};
    const isCompare = mode === 'compare';
    const tabOn = { bg: '#FFFFFF', color: '#090D14', shadow: '0 1px 3px rgba(9,13,20,0.1)' };
    const tabOff = { bg: 'transparent', color: '#566173', shadow: 'none' };
    const canCompare = Boolean((s.aUrl || s.aClaim).trim() && (s.bUrl || s.bClaim).trim());
    const canChallenge = Boolean(s.chUrl.trim());
    const allRows = s.eqOpen ? [...this.rows, ...this.eqRows] : this.rows;
    const drawerRow = s.drawerKey ? [...this.rows, ...this.eqRows].find(r => r.key === s.drawerKey) : null;
    let drawer = null;
    if (drawerRow) {
      const d = this.makeRow(drawerRow);
      drawer = { ...d,
        chain: (drawerRow.chain || []).map((text, i, arr) => ({
          n: i + 1, label: ['Public claim', 'Paper conclusion', 'Exact passage', 'Definition'][i] || 'Evidence', text, line: i < arr.length - 1,
          bg: i === 2 ? '#E9F0FF' : '#FFFFFF', color: i === 2 ? '#1746B7' : '#566173', border: i === 2 ? '#2357D9' : '#DCE3EC' })),
        passA: drawerRow.passA || { pre: '', span: '', post: '' },
        passB: drawerRow.passB || { pre: '', span: '', post: '' },
        passAUrl: this.safeHttpsUrl((drawerRow.passA || {}).source_url),
        passBUrl: this.safeHttpsUrl((drawerRow.passB || {}).source_url),
        verifier: drawerRow.verifier || '',
        whyVerdict: drawerRow.whyVerdict || '' };
    }
    return {
      isCompareInput: isCompare && stage === 'input',
      isAnalysis: isCompare && stage === 'analysis',
      isResult: isCompare && stage === 'result',
      isChallengeInput: !isCompare && s.chStage === 'input',
      isChallengeRun: !isCompare && s.chStage === 'run',
      compareTabBg: isCompare ? tabOn.bg : tabOff.bg, compareTabColor: isCompare ? tabOn.color : tabOff.color, compareTabShadow: isCompare ? tabOn.shadow : tabOff.shadow,
      challengeTabBg: !isCompare ? tabOn.bg : tabOff.bg, challengeTabColor: !isCompare ? tabOn.color : tabOff.color, challengeTabShadow: !isCompare ? tabOn.shadow : tabOff.shadow,
      toCompare: () => this.setState({ mode: 'compare', error: null }),
      toChallenge: () => this.setState({ mode: 'challenge', error: null }),
      helpOpen: s.helpOpen, toggleHelp: (e) => { e.preventDefault(); this.setState({ helpOpen: !s.helpOpen }); },
      traceOpen: s.traceOpen, toggleTrace: (e) => { e.preventDefault(); this.setState({ traceOpen: !s.traceOpen }); },
      aUrl: s.aUrl, bUrl: s.bUrl, aClaim: s.aClaim, bClaim: s.bClaim, aUse: s.aUse, bUse: s.bUse,
      onAUrl: (e) => this.setState({ aUrl: e.target.value, aSrc: null, error: null }),
      onBUrl: (e) => this.setState({ bUrl: e.target.value, bSrc: null, error: null }),
      onAClaim: (e) => this.setState({ aClaim: e.target.value }),
      onBClaim: (e) => this.setState({ bClaim: e.target.value }),
      onAUse: (e) => this.setState({ aUse: e.target.checked }),
      onBUse: (e) => this.setState({ bUse: e.target.checked }),
      aResolving: s.aResolving, bResolving: s.bResolving, aSrc: s.aSrc, bSrc: s.bSrc,
      compareDisabled: !canCompare,
      compareCursor: canCompare ? 'pointer' : 'not-allowed',
      compareBtnBg: canCompare ? '#2357D9' : '#DCE3EC',
      compareBtnColor: canCompare ? '#FFFFFF' : '#8A95A6',
      startCompare: () => { if (canCompare) this.runAnalysis(); },
      srcA: s.aSrc || { title: s.aClaim || s.aUrl, short: s.aClaim || s.aUrl, venue: '', year: '' },
      srcB: s.bSrc || { title: s.bClaim || s.bUrl, short: s.bClaim || s.bUrl, venue: '', year: '' },
      stepRows: this.stepLabels.map((_, i) => this.makeStep(this.stepLabels, s.steps, i)),
      diffRows: allRows.map(r => this.makeRow(r)),
      eqLabel: s.eqOpen ? 'Equivalent dimensions shown above' : (this.eqRows.length + ' dimensions materially equivalent'),
      eqAction: s.eqOpen ? 'Collapse' : 'Show them',
      toggleEq: () => this.setState({ eqOpen: !s.eqOpen }),
      drawer, closeDrawer: () => this.setState({ drawerKey: null }),
      openPopulation: (e) => { e.preventDefault(); this.setState({ drawerKey: 'population' }); },
      openExposure: (e) => { e.preventDefault(); this.setState({ drawerKey: 'exposure' }); },
      openOutcome: (e) => { e.preventDefault(); this.setState({ drawerKey: 'outcome' }); },
      copyLabel: s.copied ? 'Copied' : 'Copy careful synthesis',
      shareLabel: s.copied ? 'Copied' : 'Share',
      copySynthesis: () => { navigator.clipboard && navigator.clipboard.writeText(result.synthesis || ''); this.setState({ copied: true }); setTimeout(() => this.setState({ copied: false }), 1600); },
      resetCompare: () => { this.rows = []; this.eqRows = []; this.setState({ stage: 'input', aUrl: '', bUrl: '', aClaim: '', bClaim: '', aSrc: null, bSrc: null, result: null, error: null, drawerKey: null, eqOpen: false }); },
      chUrl: s.chUrl, chSrc: s.chSrc,
      chDisplay: s.chSrc
        ? { title: s.chSrc.title, metaText: [s.chSrc.venue, s.chSrc.year].filter(Boolean).join(' · '), sourceUrl: s.chSrc.sourceUrl || '' }
        : { title: s.chUrl, metaText: 'Resolving source…', sourceUrl: '' },
      onChUrl: (e) => this.setState({ chUrl: e.target.value, chSrc: null, error: null }),
      challengeDisabled: !canChallenge,
      challengeCursor: canChallenge ? 'pointer' : 'not-allowed',
      challengeBtnBg: canChallenge ? '#2357D9' : '#DCE3EC',
      challengeBtnColor: canChallenge ? '#FFFFFF' : '#8A95A6',
      startChallenge: () => { if (canChallenge) this.runChallenge(); },
      scoutRows: ['Contradictory result', 'Direct replication', 'Later reassessment'].map((label, i) => {
        const st = s.scouts[i];
        return { label, active: st === 1, icon: st === 2 ? '✓' : String(i + 1),
          bg: '#FFFFFF', border: st === 1 ? '#2357D9' : '#DCE3EC', color: st === 0 ? '#8A95A6' : '#090D14',
          iconBg: st === 2 ? '#2357D9' : '#FFFFFF', iconColor: st === 2 ? '#FFFFFF' : (st === 1 ? '#2357D9' : '#8A95A6'), iconBorder: st === 2 ? '#2357D9' : (st === 1 ? '#2357D9' : '#DCE3EC') };
      }),
      error: s.error,
      verdictHeadline: result.verdict && result.verdict.headline ? result.verdict.headline : 'Comparison complete',
      verdictExplanation: result.verdict && result.verdict.explanation ? result.verdict.explanation : '',
      evidenceSummary: result.evidence_summary || '',
      synthesisText: result.synthesis || '',
      paperAHeading: s.aSrc ? (s.aSrc.short || s.aSrc.title) : 'Paper A',
      paperBHeading: s.bSrc ? (s.bSrc.short || s.bSrc.title) : 'Paper B',
      traceRows: Array.isArray(result.trace) && result.trace.length
        ? result.trace.map(item => ({ text: typeof item === 'string' ? item : ((item.stage || '') + ' · ' + (item.detail || item.status || '')) }))
        : [{ text: 'Waiting for the pipeline trace…' }],
      candidatesReady: s.candidatesReady,
      candidates: this.candidatesData.map(c => ({ ...c, onCompare: () => {
        const originalInput = String(s.chUrl || '').trim();
        const resolvedSourceUrl = this.safeHttpsUrl(s.chSrc && s.chSrc.sourceUrl);
        const originalIsSource = Boolean(this.safeHttpsUrl(originalInput) || this.isDoi(originalInput));
        this.setState({
          mode: 'compare',
          stage: 'input',
          aUrl: resolvedSourceUrl || (originalIsSource ? originalInput : ''),
          aClaim: originalIsSource ? '' : originalInput,
          bUrl: c.url || '',
          bClaim: '',
          aSrc: s.chSrc,
          bSrc: null,
          error: null,
        });
      } })),
    };
  }
}
