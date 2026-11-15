import { lessonContent as healthyFoodContent } from "../lessons/healthy-food/content/content.js";
import { lessonContent as schoolBreakfastContent } from "../lessons/school-breakfast/content/content.js";
import { lessonContent as healthySnacksContent } from "../lessons/healthy-snacks/content/content.js";
import { lessonContent as drinkingWaterContent } from "../lessons/drinking-water/content/content.js";
import { lessonContent as handwashingContent } from "../lessons/handwashing/content/content.js";
import { lessonContent as sleepAndLearningContent } from "../lessons/sleep-and-learning/content/content.js";

import {
    createQuizSession,
    submitQuizAnswer,
    getQuizProgress,
    getCurrentActivity
} from "../lessons/healthy-food/quiz/quiz-engine.js";

import {
    createProgressStorage
} from "../shared/storage/progress-storage.js";

import {
    queueAwardCelebrations,
    startAwardCelebrations
} from "../shared/ui/award-celebration.js";

const lessonContents = {
    "healthy-food": healthyFoodContent,
    "school-breakfast": schoolBreakfastContent,
    "healthy-snacks": healthySnacksContent,
    "drinking-water": drinkingWaterContent,
    "handwashing": handwashingContent,
    "sleep-and-learning": sleepAndLearningContent
};

const lessons = [
    {
        id: "healthy-food",
        title: "غذاهای سالم و ناسالم",
        description: "با خوراکی‌های مفید و انتخاب‌های بهتر آشنا شو.",
        icon: "🥗",
        color: "green"
    },
    {
        id: "school-breakfast",
        title: "صبحانه مفید برای مدرسه",
        description: "یاد بگیر چرا صبحانه به یادگیری کمک می‌کند.",
        icon: "🍳",
        color: "orange"
    },
    {
        id: "healthy-snacks",
        title: "میان‌وعده سالم مدرسه",
        description: "برای زنگ تفریح انتخاب‌های هوشمندانه داشته باش.",
        icon: "🍎",
        color: "red"
    },
    {
        id: "drinking-water",
        title: "آب و سلامتی",
        description: "با اهمیت نوشیدن آب برای بدن آشنا شو.",
        icon: "💧",
        color: "blue"
    },
    {
        id: "handwashing",
        title: "شست‌وشوی صحیح دست‌ها",
        description: "روش درست شستن دست‌ها را یاد بگیر.",
        icon: "🧼",
        color: "purple"
    },
    {
        id: "sleep-and-learning",
        title: "خواب و یادگیری",
        description: "بفهم خواب کافی چه تأثیری بر سلامت و یادگیری دارد.",
        icon: "🌙",
        color: "indigo"
    }
];

const lessonList = document.getElementById("lessonList");
const installButton = document.getElementById("installButton");
const appMessage = document.getElementById("appMessage");

const scoreValue = document.getElementById("scoreValue");
const completedValue = document.getElementById("completedValue");
const trophyCount = document.getElementById("trophyCount");
const awardClaimButton = document.getElementById("awardClaimButton");
const trophyElements = {
    bronze: { medal: document.getElementById("bronzeTrophy"), item: document.getElementById("bronzeTrophyItem"), symbol: String.fromCodePoint(0x1F949) },
    silver: { medal: document.getElementById("silverTrophy"), item: document.getElementById("silverTrophyItem"), symbol: String.fromCodePoint(0x1F948) },
    gold: { medal: document.getElementById("goldTrophy"), item: document.getElementById("goldTrophyItem"), symbol: String.fromCodePoint(0x1F3C6) }
};
const progressFill = document.getElementById("progressFill");
const progressCaption = document.getElementById("progressCaption");

let deferredInstallPrompt = null;
let quizSession = null;
let pendingFeedback = null;
let progressStorage = null;
let activeLesson = null;
let activeLessonContent = null;

const lessonViewer = document.createElement("section");
lessonViewer.className = "lesson-viewer";
lessonViewer.hidden = true;

lessonList.parentElement.insertBefore(lessonViewer, lessonList);

function createElement(tag, className = "", text = "") {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== "" && text !== null && text !== undefined) {
        element.textContent = String(text);
    }

    return element;
}

function showMessage(message) {
    appMessage.textContent = message;
    appMessage.classList.add("visible");

    window.setTimeout(() => {
        appMessage.classList.remove("visible");
    }, 3000);
}

function formatNumber(value) {
    return Number(value).toLocaleString("fa-IR");
}

function initializeStorage() {
    let browserStorage = null;

    try {
        browserStorage = window.localStorage;
    } catch (error) {
        console.error("دسترسی به localStorage ممکن نیست:", error);
    }

    progressStorage = createProgressStorage(browserStorage);

    if (!progressStorage.getStorageStatus().persistent) {
        showMessage("ذخیره‌سازی موقت فعال است؛ پیشرفت فعلاً ماندگار نیست.");
    }
}

const AWARD_STATE_KEY = "healthy-nutrition-awards";
const AWARD_THRESHOLDS = [
    { tier: "bronze", threshold: 2 },
    { tier: "silver", threshold: 4 },
    { tier: "gold", threshold: 6 }
];

function readAwardState() {
    try {
        const raw = window.localStorage.getItem(AWARD_STATE_KEY);
        if (!raw) return { claimed: [] };

        const parsed = JSON.parse(raw);
        const validTiers = ["bronze", "silver", "gold"];

        return {
            claimed: Array.isArray(parsed.claimed)
                ? [...new Set(parsed.claimed.filter(tier => validTiers.includes(tier)))]
                : []
        };
    } catch (error) {
        console.warn("Could not read award state:", error);
        return { claimed: [] };
    }
}

function saveAwardState(claimed) {
    try {
        window.localStorage.setItem(
            AWARD_STATE_KEY,
            JSON.stringify({ version: 1, claimed })
        );
        return true;
    } catch (error) {
        console.warn("Could not save award state:", error);
        return false;
    }
}

function updateProgress() {
    try {
        const state = progressStorage.getAllProgress();
        const records = Object.values(state.lessons);

        const completed = lessons.filter(lesson => {
            return Boolean(state.lessons[lesson.id]?.completed);
        }).length;

        const totalScore = records.reduce(
            (sum, record) => sum + record.bestScore,
            0
        );

        const percentage = Math.round(
            (completed / lessons.length) * 100
        );

        scoreValue.textContent = formatNumber(totalScore);

        completedValue.textContent =
            `${formatNumber(completed)} از ${formatNumber(lessons.length)}`;

        const trophyThresholds = [["bronze", 2], ["silver", 4], ["gold", 6]];
        let earnedTrophyCount = 0;
        trophyThresholds.forEach(([tier, threshold]) => {
            const trophy = trophyElements[tier];
            const earned = completed >= threshold;
            if (earned) earnedTrophyCount += 1;
            trophy.medal.textContent = earned ? trophy.symbol : String.fromCodePoint(0x1F512);
            trophy.item.classList.toggle("is-earned", earned);
            trophy.item.setAttribute("aria-label", earned ? "\u06a9\u0627\u067e \u06a9\u0633\u0628 \u0634\u062f\u0647 \u0627\u0633\u062a" : "\u0642\u0641\u0644 \u0627\u0633\u062a\u061b \u062a\u06a9\u0645\u06cc\u0644 " + formatNumber(threshold) + " \u062f\u0631\u0633 \u0644\u0627\u0632\u0645 \u0627\u0633\u062a");
        });
        trophyCount.textContent = formatNumber(earnedTrophyCount) + " \u0627\u0632 " + formatNumber(3);

        const earnedTiers = AWARD_THRESHOLDS
            .filter(award => completed >= award.threshold)
            .map(award => award.tier);

        const claimedTiers = readAwardState().claimed;
        const pendingTiers = earnedTiers.filter(tier => !claimedTiers.includes(tier));

        awardClaimButton.hidden = pendingTiers.length === 0;
        awardClaimButton.disabled = false;
        awardClaimButton.textContent =
            "\u062f\u0631\u06cc\u0627\u0641\u062a \u06a9\u0627\u067e\u200c\u0647\u0627\u06cc \u06a9\u0633\u0628\u200c\u0634\u062f\u0647"
            + " (" + formatNumber(pendingTiers.length) + ")";

        progressFill.style.width = `${percentage}%`;

        progressCaption.textContent = completed === 0
            ? "هنوز سفرت را شروع نکرده‌ای؛ آماده‌ای؟"
            : completed === lessons.length
                ? "آفرین! همه درس‌ها را تکمیل کرده‌ای."
                : `${formatNumber(completed)} درس را با موفقیت به پایان رسانده‌ای.`;

    } catch (error) {
        console.error("خطا در خواندن پیشرفت:", error);
        showMessage("خواندن اطلاعات پیشرفت با مشکل مواجه شد.");
    }
}

function getLessonRecord(lessonId) {
    try {
        return progressStorage.getLessonProgress(lessonId);
    } catch (error) {
        console.error("خطا در خواندن وضعیت درس:", error);
        return null;
    }
}

function renderLessons() {
    lessonList.replaceChildren();

    lessons.forEach((lesson, index) => {
        const card = createElement(
            "article",
            `lesson-card ${lesson.color}`
        );

        const number = createElement(
            "span",
            "lesson-number",
            `درس ${formatNumber(index + 1)}`
        );

        const icon = createElement(
            "span",
            "lesson-icon",
            lesson.icon
        );

        icon.setAttribute("aria-hidden", "true");

        const title = createElement("h3", "", lesson.title);
        const description = createElement("p", "", lesson.description);

        const record = getLessonRecord(lesson.id);

        let statusText = "آماده شروع";

        if (record?.completed) {
            statusText = "تکمیل‌شده";
            card.classList.add("completed");
        } else if (record) {
            statusText = "در حال یادگیری";
        }

        const status = createElement(
            "span",
            "lesson-status",
            statusText
        );

        const button = createElement(
            "button",
            "lesson-start-button",
            record?.completed ? "مرور درس" : "شروع درس"
        );

        button.type = "button";
        button.addEventListener("click", () => {
            openLesson(lesson.id);
        });

        card.append(number, icon, title, description, status, button);
        lessonList.append(card);
    });
}

function addSection(parent, title, className = "") {
    const section = createElement("section", className);
    const heading = createElement("h3", "", title);

    section.append(heading);
    parent.append(section);

    return section;
}

function renderList(parent, items) {
    if (!Array.isArray(items) || items.length === 0) {
        return;
    }

    const list = createElement("ul");

    items.forEach(item => {
        if (item === null || item === undefined) {
            return;
        }

        list.append(createElement("li", "", item));
    });

    parent.append(list);
}

function addBackButton() {
    const backButton = createElement(
        "button",
        "lesson-back-button",
        "بازگشت به درس‌ها"
    );

    backButton.type = "button";
    backButton.addEventListener("click", closeLesson);

    lessonViewer.append(backButton);
}

function addQuizStartButton() {
    const startButton = createElement(
        "button",
        "quiz-start-button",
        "شروع فعالیت‌های آموزشی"
    );

    startButton.type = "button";
    startButton.addEventListener("click", startQuiz);

    lessonViewer.append(startButton);
}

function renderLessonHeader(content) {
    lessonViewer.append(
        createElement("h2", "", content.title),
        createElement("p", "lesson-subtitle", content.subtitle),
        createElement("p", "lesson-introduction", content.introduction)
    );
}

/*
 * درس اول از ساختار اختصاصی قدیمی استفاده می‌کند.
 * این بخش عمداً با همان ساختار قبلی حفظ شده است.
 */
function renderHealthyFoodOverview() {
    const content = activeLessonContent;

    renderLessonHeader(content);

    const objectives = addSection(
        lessonViewer,
        "در این درس چه یاد می‌گیریم؟"
    );

    renderList(objectives, content.learningObjectives);

    const groupsSection = addSection(
        lessonViewer,
        "پنج گروه اصلی مواد غذایی",
        "food-groups"
    );

    content.foodGroups.forEach(group => {
        const article = createElement("article", "food-group-card");

        article.append(
            createElement("h4", "", `${group.icon} ${group.title}`),
            createElement("p", "", group.explanation)
        );

        const examples = addSection(article, "نمونه خوراکی‌ها");
        renderList(examples, group.examples);

        const nutrients = addSection(article, "مواد مغذی");
        renderList(nutrients, group.nutrients);

        groupsSection.append(article);
    });

    const plateSection = addSection(
        lessonViewer,
        content.healthyPlate.title
    );

    plateSection.append(
        createElement("p", "", content.healthyPlate.description)
    );

    content.healthyPlate.sections.forEach(section => {
        const item = createElement("article", "plate-section");

        item.append(
            createElement(
                "h4",
                "",
                `${section.icon} ${section.title} (${formatNumber(section.proportion)}٪)`
            ),
            createElement("p", "", section.foods)
        );

        plateSection.append(item);
    });

    plateSection.append(
        createElement(
            "h4",
            "",
            `${content.healthyPlate.drink.icon} ${content.healthyPlate.drink.title}`
        ),
        createElement(
            "p",
            "",
            content.healthyPlate.drink.description
        ),
        createElement(
            "p",
            "important-note",
            content.healthyPlate.importantNote
        )
    );

    const smartSection = addSection(
        lessonViewer,
        content.smartChoices.title
    );

    content.smartChoices.items.forEach(item => {
        const article = createElement("article", "smart-choice-card");

        article.append(
            createElement("h4", "", `${item.icon} ${item.title}`),
            createElement("p", "", item.reason)
        );

        smartSection.append(article);
    });

    smartSection.append(
        createElement(
            "p",
            "positive-message",
            content.smartChoices.positiveMessage
        )
    );
}

function renderCallout(parent, callout) {
    if (!callout) {
        return;
    }

    const box = createElement("p", "important-note");

    if (typeof callout === "string") {
        box.textContent = callout;
    } else if (typeof callout === "object") {
        const title = callout.title || callout.heading || "";
        const text = callout.text
            || callout.content
            || callout.description
            || callout.message
            || "";

        if (title) {
            box.append(createElement("strong", "", `${title} `));
        }

        if (text) {
            box.append(document.createTextNode(String(text)));
        }
    }

    if (box.textContent.trim()) {
        parent.append(box);
    }
}

function renderGenericSections(content) {
    if (
        !Array.isArray(content.sections) ||
        content.sections.length === 0
    ) {
        return;
    }

    content.sections.forEach((item, index) => {
        const section = addSection(
            lessonViewer,
            item.title || `بخش ${formatNumber(index + 1)}`
        );

        if (Array.isArray(item.paragraphs)) {
            item.paragraphs.forEach(paragraph => {
                section.append(
                    createElement("p", "", paragraph)
                );
            });
        }

        if (Array.isArray(item.bullets)) {
            renderList(section, item.bullets);
        }

        renderCallout(section, item.callout);
    });
}

function renderSources(content) {
    if (!Array.isArray(content.sources) || content.sources.length === 0) {
        return;
    }

    const sourcesSection = addSection(
        lessonViewer,
        "منابع علمی و آموزشی"
    );

    const list = createElement("ul");

    content.sources.forEach(source => {
        const item = createElement("li");
        const label = [
            source.title,
            source.organization
        ].filter(Boolean).join(" — ");

        if (source.url) {
            try {
                const url = new URL(source.url);

                if (url.protocol === "https:" || url.protocol === "http:") {
                    const link = createElement(
                        "a",
                        "",
                        label || source.url
                    );

                    link.href = url.href;
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                    item.append(link);
                } else {
                    item.textContent = label || source.url;
                }
            } catch {
                item.textContent = label || source.url;
            }
        } else {
            item.textContent = label || "منبع آموزشی";
        }

        list.append(item);
    });

    sourcesSection.append(list);
}

function renderGenericOverview() {
    const content = activeLessonContent;

    renderLessonHeader(content);

    const objectives = addSection(
        lessonViewer,
        "در این درس چه یاد می‌گیریم؟"
    );

    renderList(objectives, content.learningObjectives);

    renderGenericSections(content);

    if (content.conclusion) {
        const conclusion = addSection(
            lessonViewer,
            "جمع‌بندی درس"
        );

        conclusion.append(
            createElement("p", "positive-message", content.conclusion)
        );
    }

    renderSources(content);
}

function renderLessonOverview() {
    if (!activeLessonContent || !activeLesson) {
        return;
    }

    lessonViewer.replaceChildren();
    addBackButton();

    if (activeLesson.id === "healthy-food") {
        renderHealthyFoodOverview();
    } else {
        renderGenericOverview();
    }

    addQuizStartButton();
}

function openLesson(lessonId) {
    const lesson = lessons.find(item => item.id === lessonId);
    const content = lessonContents[lessonId];

    if (!lesson || !content) {
        showMessage("محتوای این درس پیدا نشد.");
        console.error("Lesson content not found:", lessonId);
        return;
    }

    activeLesson = lesson;
    activeLessonContent = content;
    quizSession = null;
    pendingFeedback = null;

    renderLessonOverview();

    lessonList.hidden = true;
    lessonViewer.hidden = false;

    lessonViewer.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function closeLesson() {
    lessonViewer.hidden = true;
    lessonList.hidden = false;

    quizSession = null;
    pendingFeedback = null;
    activeLesson = null;
    activeLessonContent = null;

    lessonList.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function startQuiz() {
    if (!activeLessonContent) {
        showMessage("ابتدا یک درس را انتخاب کن.");
        return;
    }

    try {
        quizSession = createQuizSession(
            activeLessonContent.interactiveActivities
        );

        pendingFeedback = null;
        renderActivity();
    } catch (error) {
        console.error("خطا در شروع آزمون:", error);
        showMessage("شروع فعالیت‌ها با مشکل مواجه شد.");
    }
}

function renderActivity() {
    if (!quizSession || !activeLessonContent) {
        return;
    }

    lessonViewer.replaceChildren();

    const activities = activeLessonContent.interactiveActivities;
    const progress = getQuizProgress(quizSession);
    const activity = getCurrentActivity(activities, quizSession);

    const heading = createElement(
        "h2",
        "",
        "فعالیت‌های آموزشی"
    );

    const counter = createElement(
        "p",
        "quiz-counter",
        `فعالیت ${formatNumber(progress.answered + 1)} از ${formatNumber(progress.total)}`
    );

    const progressText = createElement(
        "p",
        "quiz-progress",
        `${formatNumber(progress.percentage)}٪ پیشرفت`
    );

    lessonViewer.append(heading, counter, progressText);

    if (!activity) {
        renderQuizCompletion();
        return;
    }

    lessonViewer.append(
        createElement("h3", "activity-title", activity.title),
        createElement("p", "activity-question", activity.question)
    );

    const optionsContainer = createElement("div", "quiz-options");

    activity.options.forEach(option => {
        const button = createElement(
            "button",
            "quiz-option",
            option.text
        );

        button.type = "button";

        button.addEventListener("click", () => {
            if (pendingFeedback || !quizSession) {
                return;
            }

            try {
                quizSession = submitQuizAnswer(
                    quizSession,
                    activities,
                    activity.id,
                    option.id
                );

                pendingFeedback = {
                    isCorrect: option.correct,
                    feedback: option.feedback
                };

                renderActivityFeedback();
            } catch (error) {
                console.error("خطا در ثبت پاسخ:", error);
                showMessage("ثبت پاسخ با مشکل مواجه شد.");
            }
        });

        optionsContainer.append(button);
    });

    lessonViewer.append(optionsContainer);
}

function renderActivityFeedback() {
    if (!pendingFeedback || !quizSession || !activeLessonContent) {
        return;
    }

    const feedbackBox = createElement(
        "div",
        pendingFeedback.isCorrect
            ? "quiz-feedback correct"
            : "quiz-feedback incorrect"
    );

    feedbackBox.setAttribute("role", "status");

    feedbackBox.append(
        createElement(
            "h3",
            "",
            pendingFeedback.isCorrect
                ? "آفرین! پاسخ درست بود."
                : "این پاسخ درست نبود."
        ),
        createElement("p", "", pendingFeedback.feedback)
    );

    const progress = getQuizProgress(quizSession);

    const activity = activeLessonContent.interactiveActivities.find(
        item => item.id === quizSession.activityIds[progress.answered - 1]
    );

    if (activity?.note) {
        feedbackBox.append(
            createElement("p", "activity-note", activity.note)
        );
    }

    const continueButton = createElement(
        "button",
        "quiz-continue-button",
        "ادامه"
    );

    continueButton.type = "button";

    continueButton.addEventListener("click", () => {
        pendingFeedback = null;

        if (quizSession.completed) {
            renderQuizCompletion();
        } else {
            renderActivity();
        }
    });

    lessonViewer.append(feedbackBox, continueButton);
}

function renderQuizCompletion() {
    if (!quizSession || !activeLessonContent) {
        return;
    }

    const progress = getQuizProgress(quizSession);

    lessonViewer.replaceChildren(
        createElement("h2", "", activeLessonContent.conclusion),
        createElement(
            "p",
            "quiz-result",
            `امتیاز تو: ${formatNumber(progress.correct)} از ${formatNumber(progress.total)}`
        )
    );

    const resultPercentage = Math.round(
        (progress.correct / progress.total) * 100
    );

    const resultText = resultPercentage === 100
        ? "عالی بود! به همه پرسش‌ها درست پاسخ دادی."
        : resultPercentage >= 60
            ? "آفرین! نتیجه خوبی گرفتی. می‌توانی درس را دوباره مرور کنی."
            : "خوب تلاش کردی! مرور دوباره درس به یادگیری بیشتر کمک می‌کند.";

    lessonViewer.append(
        createElement("p", "quiz-result-message", resultText)
    );

    try {
        progressStorage.saveLessonResult(
            activeLessonContent.id,
            {
                score: progress.correct,
                total: progress.total,
                completed: true
            }
        );

        updateProgress();
        renderLessons();

        const storageStatus = progressStorage.getStorageStatus();

        if (!storageStatus.persistent) {
            showMessage("نتیجه فقط در حافظه موقت ذخیره شد.");
        } else {
            showMessage("نتیجه درس با موفقیت ذخیره شد.");
        }
    } catch (error) {
        console.error("خطا در ذخیره نتیجه:", error);
        showMessage("ذخیره نتیجه با مشکل مواجه شد.");
    }

    const reviewButton = createElement(
        "button",
        "quiz-review-button",
        "مرور دوباره درس"
    );

    reviewButton.type = "button";
    reviewButton.addEventListener("click", renderLessonOverview);

    const backButton = createElement(
        "button",
        "lesson-back-button",
        "بازگشت به درس‌ها"
    );

    backButton.type = "button";
    backButton.addEventListener("click", closeLesson);

    lessonViewer.append(reviewButton, backButton);
}

function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
        showMessage("مرورگر شما از Service Worker پشتیبانی نمی‌کند.");
        return;
    }

    window.addEventListener("load", async () => {
        try {
            await navigator.serviceWorker.register("./service-worker.js");
            console.info("Service Worker با موفقیت ثبت شد.");
        } catch (error) {
            console.error("خطا در ثبت Service Worker:", error);
            showMessage("ثبت قابلیت آفلاین با خطا مواجه شد.");
        }
    });
}

window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
        return;
    }

    deferredInstallPrompt.prompt();

    const result = await deferredInstallPrompt.userChoice;

    if (result.outcome === "accepted") {
        showMessage("درخواست نصب برنامه پذیرفته شد.");
    }

    deferredInstallPrompt = null;
    installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
    showMessage("برنامه با موفقیت نصب شد.");
    installButton.hidden = true;
});

awardClaimButton.addEventListener("click", () => {
    try {
        const state = progressStorage.getAllProgress();

        const completed = lessons.filter(lesson => {
            return Boolean(state.lessons[lesson.id]?.completed);
        }).length;

        const claimedTiers = readAwardState().claimed;
        const pendingTiers = AWARD_THRESHOLDS
            .filter(award => completed >= award.threshold)
            .map(award => award.tier)
            .filter(tier => !claimedTiers.includes(tier));

        if (pendingTiers.length === 0) {
            updateProgress();
            return;
        }

        awardClaimButton.disabled = true;
        queueAwardCelebrations(pendingTiers);

        startAwardCelebrations(() => {
            const latestClaimed = readAwardState().claimed;
            const allClaimed = [...new Set([...latestClaimed, ...pendingTiers])];
            const saved = saveAwardState(allClaimed);

            awardClaimButton.disabled = false;
            updateProgress();

            if (!saved) {
                showMessage("\u0630\u062e\u06cc\u0631\u0647 \u0648\u0636\u0639\u06cc\u062a \u06a9\u0627\u067e\u200c\u0647\u0627 \u0645\u0645\u06a9\u0646 \u0646\u0634\u062f.");
            }
        });
    } catch (error) {
        console.error("Award claim failed:", error);
        awardClaimButton.disabled = false;
        showMessage("\u062f\u0631\u06cc\u0627\u0641\u062a \u06a9\u0627\u067e \u0628\u0627 \u062e\u0637\u0627 \u0645\u0648\u0627\u062c\u0647 \u0634\u062f.");
    }
});

initializeStorage();
renderLessons();
updateProgress();
registerServiceWorker();

console.info("برنامه تغذیه سالم با شش درس راه‌اندازی شد.");
