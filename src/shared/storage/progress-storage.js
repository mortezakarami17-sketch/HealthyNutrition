
/**
 * Healthy Nutrition
 * Progress Storage Module
 *
 * Versioned student progress storage.
 * Supports persistent storage with an in-memory fallback.
 */

export const STORAGE_KEY = "healthy-nutrition-progress";

const STORAGE_VERSION = 1;

const RESERVED_IDS = new Set([
    "__proto__",
    "prototype",
    "constructor"
]);

function createEmptyState() {
    return {
        version: STORAGE_VERSION,
        lessons: {}
    };
}

function cloneState(state) {
    return {
        version: state.version,
        lessons: Object.fromEntries(
            Object.entries(state.lessons).map(
                ([id, record]) => [id, { ...record }]
            )
        )
    };
}

function isValidDate(value) {
    return (
        typeof value === "string" &&
        value.length > 0 &&
        !Number.isNaN(Date.parse(value))
    );
}

function validateLessonId(lessonId) {
    if (
        typeof lessonId !== "string" ||
        lessonId.trim().length === 0 ||
        RESERVED_IDS.has(lessonId)
    ) {
        throw new TypeError("A valid lesson ID is required.");
    }
}

function validateResult(result) {
    if (
        !result ||
        typeof result !== "object" ||
        Array.isArray(result)
    ) {
        throw new TypeError("A valid result object is required.");
    }

    const { score, total, completed } = result;

    if (!Number.isInteger(score) || score < 0) {
        throw new TypeError("Score must be a non-negative integer.");
    }

    if (!Number.isInteger(total) || total <= 0) {
        throw new TypeError("Total must be a positive integer.");
    }

    if (score > total) {
        throw new RangeError("Score cannot exceed total.");
    }

    if (typeof completed !== "boolean") {
        throw new TypeError("Completed must be a boolean.");
    }
}

function validateRecord(record) {
    if (
        !record ||
        typeof record !== "object" ||
        Array.isArray(record)
    ) {
        throw new Error("Invalid lesson progress record.");
    }

    const {
        lastScore,
        total,
        bestScore,
        bestTotal,
        bestPercentage,
        completed,
        completedAt,
        updatedAt
    } = record;

    if (
        !Number.isInteger(lastScore) ||
        !Number.isInteger(total) ||
        total <= 0 ||
        lastScore < 0 ||
        lastScore > total
    ) {
        throw new Error("Invalid last score in stored progress.");
    }

    if (
        !Number.isInteger(bestScore) ||
        !Number.isInteger(bestTotal) ||
        bestTotal <= 0 ||
        bestScore < 0 ||
        bestScore > bestTotal
    ) {
        throw new Error("Invalid best score in stored progress.");
    }

    const expectedPercentage = Math.round(
        (bestScore / bestTotal) * 100
    );

    if (
        !Number.isInteger(bestPercentage) ||
        bestPercentage !== expectedPercentage
    ) {
        throw new Error("Invalid best percentage in stored progress.");
    }

    if (typeof completed !== "boolean") {
        throw new Error("Invalid completion status.");
    }

    if (
        completedAt !== null &&
        !isValidDate(completedAt)
    ) {
        throw new Error("Invalid completion date.");
    }

    if (completed && completedAt === null) {
        throw new Error("Completed lesson must have a completion date.");
    }

    if (!isValidDate(updatedAt)) {
        throw new Error("Invalid update date.");
    }
}

function validateState(state) {
    if (
        !state ||
        typeof state !== "object" ||
        Array.isArray(state) ||
        state.version !== STORAGE_VERSION ||
        !state.lessons ||
        typeof state.lessons !== "object" ||
        Array.isArray(state.lessons)
    ) {
        throw new Error(
            "Stored progress has an invalid structure or version."
        );
    }

    for (const [lessonId, record] of Object.entries(state.lessons)) {
        validateLessonId(lessonId);
        validateRecord(record);
    }

    return state;
}

export function createProgressStorage(storage = null) {
    let memoryState = createEmptyState();

    let persistent = Boolean(
        storage &&
        typeof storage.getItem === "function" &&
        typeof storage.setItem === "function"
    );

    let failureReason = persistent
        ? null
        : "Persistent storage is unavailable.";

    function switchToMemory(error) {
        persistent = false;

        failureReason = error instanceof Error
            ? error.message
            : "Persistent storage failed.";
    }

    function load() {
        if (!persistent) {
            return cloneState(memoryState);
        }

        let raw;

        try {
            raw = storage.getItem(STORAGE_KEY);
        } catch (error) {
            switchToMemory(error);
            return cloneState(memoryState);
        }

        if (raw === null) {
            memoryState = createEmptyState();
            return cloneState(memoryState);
        }

        let parsed;

        try {
            parsed = JSON.parse(raw);
        } catch {
            throw new Error(
                "Stored progress contains invalid JSON."
            );
        }

        validateState(parsed);

        memoryState = cloneState(parsed);

        return cloneState(memoryState);
    }

    function saveLessonResult(lessonId, result) {
        validateLessonId(lessonId);
        validateResult(result);

        const state = load();

        const previous = Object.hasOwn(
            state.lessons,
            lessonId
        )
            ? state.lessons[lessonId]
            : null;

        const currentPercentage = Math.round(
            (result.score / result.total) * 100
        );

        const previousBestPercentage =
            previous?.bestPercentage ?? -1;

        const isNewBest =
            currentPercentage > previousBestPercentage;

        const bestScore = isNewBest
            ? result.score
            : previous.bestScore;

        const bestTotal = isNewBest
            ? result.total
            : previous.bestTotal;

        const bestPercentage = isNewBest
            ? currentPercentage
            : previous.bestPercentage;

        const completed = Boolean(
            previous?.completed || result.completed
        );

        const now = new Date().toISOString();

        const record = {
            lastScore: result.score,
            total: result.total,
            bestScore,
            bestTotal,
            bestPercentage,
            completed,
            completedAt: previous?.completedAt ?? (
                completed ? now : null
            ),
            updatedAt: now
        };

        const nextState = cloneState(state);

        nextState.lessons[lessonId] = record;

        validateState(nextState);

        if (persistent) {
            try {
                storage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(nextState)
                );
            } catch (error) {
                switchToMemory(error);
            }
        }

        memoryState = cloneState(nextState);

        return { ...record };
    }

    function getLessonProgress(lessonId) {
        validateLessonId(lessonId);

        const state = load();

        const record = state.lessons[lessonId];

        return record ? { ...record } : null;
    }

    function getAllProgress() {
        return load();
    }

    function getStorageStatus() {
        return {
            persistent,
            mode: persistent ? "persistent" : "memory",
            reason: failureReason
        };
    }

    return {
        load,
        saveLessonResult,
        getLessonProgress,
        getAllProgress,
        getStorageStatus
    };
}
