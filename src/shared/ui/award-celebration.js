const AWARDS = {
    bronze: {
        title: "کاپ برنزی",
        message: "شروع درخشانی داشتی! اولین افتخار تو مبارک.",
        cup: "🥉"
    },
    silver: {
        title: "کاپ نقره‌ای",
        message: "چه پیشرفت خوبی! یک قدم دیگر به قهرمانی نزدیک شدی.",
        cup: "🥈"
    },
    gold: {
        title: "کاپ طلایی",
        message: "قهرمان شدی! هر شش درس را با موفقیت به پایان رساندی.",
        cup: "🏆"
    }
};

function playCelebrationSound() {
    const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
        return;
    }

    let audioContext;

    try {
        audioContext = new AudioContextClass();
    } catch (error) {
        console.warn("صدای جشن در این مرورگر پشتیبانی نمی‌شود:", error);
        return;
    }

    const startSound = () => {
        const now = audioContext.currentTime;
        const master = audioContext.createGain();

        master.gain.setValueAtTime(0.0001, now);
        master.gain.exponentialRampToValueAtTime(0.16, now + 0.12);
        master.gain.exponentialRampToValueAtTime(0.0001, now + 2.7);
        master.connect(audioContext.destination);

        // یک صدای تشویق‌مانندِ ساخته‌شده با نویز فیلترشده
        const bufferSize = Math.floor(audioContext.sampleRate * 2.5);
        const noiseBuffer = audioContext.createBuffer(
            1,
            bufferSize,
            audioContext.sampleRate
        );
        const noiseData = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * 0.7;
        }

        const noise = audioContext.createBufferSource();
        const filter = audioContext.createBiquadFilter();
        const cheerGain = audioContext.createGain();

        noise.buffer = noiseBuffer;
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(850, now);
        filter.Q.setValueAtTime(0.7, now);

        cheerGain.gain.setValueAtTime(0.0001, now);
        cheerGain.gain.linearRampToValueAtTime(0.22, now + 0.35);
        cheerGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

        noise.connect(filter);
        filter.connect(cheerGain);
        cheerGain.connect(master);

        noise.start(now);
        noise.stop(now + 2.5);

        // مارش کوتاه و اصیل؛ بدون استفاده از موسیقی دارای حق نشر
        const notes = [
            { frequency: 523.25, start: 0.05, duration: 0.42 },
            { frequency: 659.25, start: 0.34, duration: 0.42 },
            { frequency: 783.99, start: 0.63, duration: 0.55 },
            { frequency: 1046.5, start: 1.05, duration: 0.9 }
        ];

        notes.forEach(note => {
            const oscillator = audioContext.createOscillator();
            const noteGain = audioContext.createGain();

            oscillator.type = "triangle";
            oscillator.frequency.setValueAtTime(
                note.frequency,
                now + note.start
            );

            noteGain.gain.setValueAtTime(0.0001, now + note.start);
            noteGain.gain.exponentialRampToValueAtTime(
                0.22,
                now + note.start + 0.035
            );
            noteGain.gain.exponentialRampToValueAtTime(
                0.0001,
                now + note.start + note.duration
            );

            oscillator.connect(noteGain);
            noteGain.connect(master);

            oscillator.start(now + note.start);
            oscillator.stop(now + note.start + note.duration + 0.03);
        });

        window.setTimeout(() => {
            audioContext.close().catch(() => {});
        }, 3200);
    };

    if (audioContext.state === "suspended") {
        audioContext.resume().then(startSound).catch(() => {
            audioContext.close().catch(() => {});
        });
    } else {
        startSound();
    }
}

function createConfetti(container) {
    const colors = [
        "#f7c948",
        "#e94f64",
        "#27ae91",
        "#4385d1",
        "#9b59b6",
        "#f08b36"
    ];

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < 90; i++) {
        const piece = document.createElement("span");

        piece.className = "award-confetti-piece";
        piece.style.setProperty("--confetti-left", `${Math.random() * 100}%`);
        piece.style.setProperty("--confetti-delay", `${Math.random() * 1.8}s`);
        piece.style.setProperty("--confetti-duration", `${3 + Math.random() * 3}s`);
        piece.style.setProperty(
            "--confetti-color",
            colors[Math.floor(Math.random() * colors.length)]
        );
        piece.style.setProperty(
            "--confetti-rotation",
            `${Math.floor(Math.random() * 360)}deg`
        );

        fragment.appendChild(piece);
    }

    container.appendChild(fragment);
}

let awardQueue = [];
let isShowingAward = false;
let onAwardQueueComplete = null;

function showNextAward() {
    if (isShowingAward) {
        return;
    }

    if (awardQueue.length === 0) {
        const callback = onAwardQueueComplete;
        onAwardQueueComplete = null;

        if (typeof callback === "function") {
            callback();
        }
        return;
    }

    const tier = awardQueue.shift();
    isShowingAward = true;
    showAwardCelebration(tier);
}

export function queueAwardCelebrations(tiers) {
    const validTiers = ["bronze", "silver", "gold"];

    tiers.forEach(tier => {
        if (validTiers.includes(tier) && !awardQueue.includes(tier)) {
            awardQueue.push(tier);
        }
    });
}

export function startAwardCelebrations(onComplete) {
    if (typeof onComplete === "function") {
        onAwardQueueComplete = onComplete;
    }
    showNextAward();
}

export function playAwardCelebration(tier) {
    queueAwardCelebrations([tier]);
    startAwardCelebrations();
}

function showAwardCelebration(tier) {
    const award = AWARDS[tier];

    if (!award) {
        isShowingAward = false;
        window.setTimeout(showNextAward, 0);
        return;
    }

    const overlay = document.createElement("div");
    overlay.className = `award-celebration award-${tier}`;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", award.title);

    const confettiLayer = document.createElement("div");
    confettiLayer.className = "award-confetti";
    confettiLayer.setAttribute("aria-hidden", "true");

    const content = document.createElement("div");
    content.className = "award-celebration-content";

    const cup = document.createElement("div");
    cup.className = "award-cup";
    cup.setAttribute("aria-hidden", "true");
    cup.textContent = award.cup;

    const heading = document.createElement("h2");
    heading.textContent = "تبریک، قهرمان!";

    const title = document.createElement("p");
    title.className = "award-title";
    title.textContent = award.title;

    const message = document.createElement("p");
    message.className = "award-message";
    message.textContent = award.message;

    const closeButton = document.createElement("button");
    closeButton.className = "award-close-button";
    closeButton.type = "button";
    closeButton.textContent = "ادامه می‌دهم";

    let isClosing = false;

    const closeCelebration = () => {
        if (isClosing) {
            return;
        }

        isClosing = true;
        overlay.classList.add("award-celebration-closing");

        window.setTimeout(() => {
            overlay.remove();
            isShowingAward = false;
            window.setTimeout(showNextAward, 300);
        }, 250);
    };

    closeButton.addEventListener("click", closeCelebration);

    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            closeCelebration();
        }
    });

    content.append(cup, heading, title, message, closeButton);
    overlay.append(confettiLayer, content);
    document.body.appendChild(overlay);

    createConfetti(confettiLayer);
    playCelebrationSound();

    closeButton.focus();

    window.setTimeout(() => {
        if (overlay.isConnected) {
            closeCelebration();
        }
    }, 9000);
}
