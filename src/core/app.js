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

let deferredInstallPrompt = null;

function showMessage(message) {
    appMessage.textContent = message;
    appMessage.classList.add("visible");

    window.setTimeout(() => {
        appMessage.classList.remove("visible");
    }, 3000);
}

function renderLessons() {
    lessonList.replaceChildren();

    lessons.forEach((lesson, index) => {
        const card = document.createElement("article");
        card.className = `lesson-card ${lesson.color}`;

        const number = document.createElement("span");
        number.className = "lesson-number";
        number.textContent = `درس ${index + 1}`;

        const icon = document.createElement("span");
        icon.className = "lesson-icon";
        icon.textContent = lesson.icon;
        icon.setAttribute("aria-hidden", "true");

        const title = document.createElement("h3");
        title.textContent = lesson.title;

        const description = document.createElement("p");
        description.textContent = lesson.description;

        const status = document.createElement("span");
        status.className = "lesson-status";
        status.textContent = "در حال آماده‌سازی";

        card.append(number, icon, title, description, status);
        lessonList.append(card);
    });
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

window.addEventListener("beforeinstallprompt", (event) => {
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

renderLessons();
registerServiceWorker();

console.info("برنامه تغذیه سالم راه‌اندازی شد.");
