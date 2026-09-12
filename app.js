/**
 * 포모도로 타이머 로직 및 UI 인터랙션 관리
 */

(function () {
  // 모드 설정
  const MODES = {
    FOCUS: {
      name: 'focus',
      duration: 25 * 60, // 25분
      badgeText: 'FOCUS TIME',
      bubbleIdle: '오늘도 파이팅! ✨',
      bubbleRunning: '집중 중... 쉿! 🤫',
      bubbleCompleted: '와아! 집중 완주 성공! 🎉'
    },
    BREAK: {
      name: 'break',
      duration: 5 * 60, // 5분
      badgeText: 'REST & RECHARGE',
      bubbleIdle: '차 한 잔 마시며 쉬어요 ☕',
      bubbleRunning: '편안하게 숨을 쉬어요~ 🌿',
      bubbleCompleted: '휴식 끝! 다시 힘내봐요! 💪'
    }
  };

  // 상태 변수
  let currentMode = MODES.FOCUS;
  let totalDuration = currentMode.duration;
  let remainingSeconds = totalDuration;
  let isRunning = false;
  let timerInterval = null;
  let targetEndTime = null;

  // DOM 요소
  const timeDisplay = document.getElementById('timeDisplay');
  const modeBadge = document.getElementById('modeBadge');
  const mainToggleBtn = document.getElementById('mainToggleBtn');
  const mainBtnIcon = document.getElementById('mainBtnIcon');
  const mainBtnText = document.getElementById('mainBtnText');
  const resetBtn = document.getElementById('resetBtn');
  const skipBtn = document.getElementById('skipBtn');
  const focusModeBtn = document.getElementById('focusModeBtn');
  const breakModeBtn = document.getElementById('breakModeBtn');
  const progressRingBar = document.getElementById('progressRingBar');
  const mascot = document.getElementById('mascot');
  const mascotBubble = document.getElementById('mascotBubble');
  const mascotMouth = document.getElementById('mascotMouth');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundTestBtn = document.getElementById('soundTestBtn');
  const quickTestBtn = document.getElementById('quickTestBtn');
  const todayCountEl = document.getElementById('todayCount');
  const tomatoStampsEl = document.getElementById('tomatoStamps');
  const toastEl = document.getElementById('toast');

  // SVG 프로그레스 원 둘레 계산
  const RADIUS = 105;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  progressRingBar.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
  progressRingBar.style.strokeDashoffset = '0';

  // 로컬 스토리지 키 (오늘 날짜 기반)
  function getTodayKey() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `pomodoro_completed_${y}-${m}-${d}`;
  }

  function getTodayCount() {
    const key = getTodayKey();
    return parseInt(localStorage.getItem(key) || '0', 10);
  }

  function incrementTodayCount() {
    const key = getTodayKey();
    const newCount = getTodayCount() + 1;
    localStorage.setItem(key, newCount);
    renderTodayStats();
  }

  function renderTodayStats() {
    const count = getTodayCount();
    todayCountEl.textContent = count;

    tomatoStampsEl.innerHTML = '';
    if (count === 0) {
      tomatoStampsEl.innerHTML = '<span class="empty-stamps-msg">첫 집중을 완료하고 토마토를 수확해보세요!</span>';
    } else {
      // 최대 30개까지 스탬프 렌더링
      const displayCount = Math.min(count, 30);
      for (let i = 0; i < displayCount; i++) {
        const stamp = document.createElement('span');
        stamp.className = 'tomato-stamp';
        stamp.textContent = '🍅';
        stamp.title = `${i + 1}번째 집중 완료!`;
        tomatoStampsEl.appendChild(stamp);
      }
      if (count > 30) {
        const moreSpan = document.createElement('span');
        moreSpan.style.fontSize = '0.85rem';
        moreSpan.style.color = 'var(--text-secondary)';
        moreSpan.textContent = `+${count - 30}`;
        tomatoStampsEl.appendChild(moreSpan);
      }
    }
  }

  // 시간 문자열 포맷 (MM:SS)
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // 프로그레스 링 업데이트
  function updateProgressRing() {
    const progress = (totalDuration - remainingSeconds) / totalDuration;
    const offset = CIRCUMFERENCE - (progress * CIRCUMFERENCE);
    progressRingBar.style.strokeDashoffset = offset;
  }

  // 타이머 뷰 업데이트
  function updateTimerView() {
    timeDisplay.textContent = formatTime(remainingSeconds);
    updateProgressRing();

    // 탭 타이틀 업데이트
    const modeName = currentMode === MODES.FOCUS ? '집중' : '휴식';
    document.title = `(${formatTime(remainingSeconds)}) ${modeName} - 토마토 타임 🍅`;
  }

  // 마스코트 표정 및 상태 설정
  function setMascotState(state) {
    mascot.className = `mascot-container ${state}`;

    if (state === 'running') {
      mascotBubble.textContent = currentMode.bubbleRunning;
      mascotMouth.setAttribute('d', 'M74 105 Q80 110 86 105'); // 다부진 입
    } else if (state === 'break') {
      mascotBubble.textContent = currentMode.bubbleRunning;
      mascotMouth.setAttribute('d', 'M72 104 Q80 116 88 104'); // 활짝 웃음
    } else if (state === 'completed') {
      mascotBubble.textContent = currentMode.bubbleCompleted;
      mascotMouth.setAttribute('d', 'M70 102 Q80 120 90 102'); // 대만족 입
    } else {
      // idle
      mascotBubble.textContent = currentMode.bubbleIdle;
      mascotMouth.setAttribute('d', 'M72 104 Q80 114 88 104');
    }
  }

  // 모드 변경
  function setMode(mode, customDuration = null) {
    pauseTimer();
    currentMode = mode;
    totalDuration = customDuration !== null ? customDuration : mode.duration;
    remainingSeconds = totalDuration;

    if (mode === MODES.FOCUS) {
      document.body.className = 'mode-focus';
      focusModeBtn.classList.add('active');
      focusModeBtn.setAttribute('aria-selected', 'true');
      breakModeBtn.classList.remove('active');
      breakModeBtn.setAttribute('aria-selected', 'false');
      modeBadge.textContent = mode.badgeText;
      setMascotState('idle');
    } else {
      document.body.className = 'mode-break';
      breakModeBtn.classList.add('active');
      breakModeBtn.setAttribute('aria-selected', 'true');
      focusModeBtn.classList.remove('active');
      focusModeBtn.setAttribute('aria-selected', 'false');
      modeBadge.textContent = mode.badgeText;
      setMascotState('idle');
    }

    updateTimerView();
  }

  // 타이머 시작
  function startTimer() {
    if (isRunning) return;

    if (window.soundEffects) {
      window.soundEffects.init();
      window.soundEffects.playClick();
    }

    // 브라우저 알림 권한 사전 요청 (안내 팝업용)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    isRunning = true;
    mainBtnIcon.textContent = '⏸';
    mainBtnText.textContent = '일시정지';

    if (currentMode === MODES.FOCUS) {
      setMascotState('running');
    } else {
      setMascotState('break');
    }

    targetEndTime = Date.now() + remainingSeconds * 1000;

    timerInterval = setInterval(() => {
      const now = Date.now();
      const diff = Math.round((targetEndTime - now) / 1000);

      if (diff <= 0) {
        remainingSeconds = 0;
        updateTimerView();
        handleTimerComplete();
      } else {
        remainingSeconds = diff;
        updateTimerView();
      }
    }, 250);
  }

  // 타이머 일시정지
  function pauseTimer() {
    if (!isRunning) return;

    if (window.soundEffects) {
      window.soundEffects.playClick();
    }

    isRunning = false;
    clearInterval(timerInterval);
    timerInterval = null;

    mainBtnIcon.textContent = '▶';
    mainBtnText.textContent = '계속하기';
    setMascotState('idle');
  }

  // 타이머 토글
  function toggleTimer() {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }

  // 타이머 리셋
  function resetTimer() {
    if (window.soundEffects) {
      window.soundEffects.playClick();
    }
    pauseTimer();
    mainBtnText.textContent = '시작';
    remainingSeconds = totalDuration;
    setMascotState('idle');
    updateTimerView();
  }

  // 다음 세션으로 건너뛰기
  function skipSession() {
    pauseTimer();
    if (currentMode === MODES.FOCUS) {
      setMode(MODES.BREAK);
    } else {
      setMode(MODES.FOCUS);
    }
  }

  // 알림 토스트 표시
  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => {
      toastEl.classList.remove('show');
    }, 4000);
  }

  // 타이머 완료 처리
  function handleTimerComplete() {
    pauseTimer();
    mainBtnText.textContent = '시작';

    setMascotState('completed');

    if (currentMode === MODES.FOCUS) {
      // 1. 집중 완료 알림음 연주
      if (window.soundEffects) {
        window.soundEffects.playFocusComplete();
      }
      // 2. 오늘 집중 카운트 증가
      incrementTodayCount();
      showToast('🎉 집중 시간 완료! 토마토 1개를 수확했어요! 🍅');

      // 시스템 푸시 알림 (가능한 경우)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('집중 완료! 🍅', {
          body: '25분 동안 멋지게 집중하셨네요! 이제 5분간 푹 쉬세요.',
          icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍅</text></svg>'
        });
      }

      // 3초 후 휴식 모드로 자동 준비
      setTimeout(() => {
        setMode(MODES.BREAK);
      }, 3500);

    } else {
      // 휴식 완료
      if (window.soundEffects) {
        window.soundEffects.playBreakComplete();
      }
      showToast('☕ 휴식 완료! 새로운 집중을 시작해볼까요?');

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('휴식 끝! 🌿', {
          body: '충전이 끝나셨나요? 다음 집중 시간을 시작해보세요!',
          icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>☕</text></svg>'
        });
      }

      // 3초 후 집중 모드로 자동 준비
      setTimeout(() => {
        setMode(MODES.FOCUS);
      }, 3500);
    }
  }

  // 사운드 토글
  let isMuted = false;
  soundToggleBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    if (window.soundEffects) {
      window.soundEffects.setMuted(isMuted);
    }
    soundToggleBtn.textContent = isMuted ? '🔇' : '🔊';
    soundToggleBtn.classList.toggle('active', !isMuted);
    showToast(isMuted ? '소리를 껐습니다' : '소리를 켰습니다 🔔');
  });

  // 사운드 미리듣기
  soundTestBtn.addEventListener('click', () => {
    if (window.soundEffects) {
      window.soundEffects.playFocusComplete();
      showToast('🎵 집중 완료 차임벨 미리듣기');
    }
  });

  // 버튼 이벤트 바인딩
  mainToggleBtn.addEventListener('click', toggleTimer);
  resetBtn.addEventListener('click', resetTimer);
  skipBtn.addEventListener('click', skipSession);

  focusModeBtn.addEventListener('click', () => {
    if (currentMode !== MODES.FOCUS) {
      setMode(MODES.FOCUS);
    }
  });

  breakModeBtn.addEventListener('click', () => {
    if (currentMode !== MODES.BREAK) {
      setMode(MODES.BREAK);
    }
  });

  // 5초 빠른 테스트 기능
  quickTestBtn.addEventListener('click', () => {
    pauseTimer();
    totalDuration = 5;
    remainingSeconds = 5;
    updateTimerView();
    startTimer();
    showToast('⚡ 5초 후 완료 효과가 테스트됩니다!');
  });

  // 키보드 단축키
  window.addEventListener('keydown', (e) => {
    // 인풋 포커스 상태가 아닐 때만 반응
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      toggleTimer();
    } else if (e.key === 'r' || e.key === 'R' || e.key === 'ㄱ') {
      resetTimer();
    }
  });

  // 초기화 실행
  renderTodayStats();
  setMode(MODES.FOCUS);
})();
