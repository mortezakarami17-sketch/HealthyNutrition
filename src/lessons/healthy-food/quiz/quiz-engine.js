
/**
 * Healthy Nutrition
 * Quiz Engine
 *
 * Independent quiz logic for educational activities.
 * No DOM or browser UI dependencies.
 */

function validateActivities(activities) {
    if (!Array.isArray(activities) || activities.length === 0) {
        throw new TypeError("Activities must be a non-empty array.");
    }

    const activityIds = new Set();

    for (const activity of activities) {
        if (
            !activity ||
            typeof activity !== "object" ||
            typeof activity.id !== "string" ||
            activity.id.trim().length === 0
        ) {
            throw new TypeError("Every activity must have a valid ID.");
        }

        if (activityIds.has(activity.id)) {
            throw new Error("Activity IDs must be unique.");
        }

        activityIds.add(activity.id);

        if (!Array.isArray(activity.options) || activity.options.length === 0) {
            throw new TypeError(
                `Activity "${activity.id}" must have at least one option.`
            );
        }

        const optionIds = new Set();

        for (const option of activity.options) {
            if (
                !option ||
                typeof option !== "object" ||
                typeof option.id !== "string" ||
                option.id.trim().length === 0
            ) {
                throw new TypeError(
                    `Every option in activity "${activity.id}" must have a valid ID.`
                );
            }

            if (optionIds.has(option.id)) {
                throw new Error(
                    `Option IDs must be unique in activity "${activity.id}".`
                );
            }

            optionIds.add(option.id);

            if (typeof option.correct !== "boolean") {
                throw new TypeError(
                    `Option "${option.id}" must define a boolean correct value.`
                );
            }

            if (typeof option.feedback !== "string") {
                throw new TypeError(
                    `Option "${option.id}" must define feedback text.`
                );
            }
        }

        const correctCount = activity.options.filter(
            option => option.correct === true
        ).length;

        if (correctCount !== 1) {
            throw new Error(
                `Activity "${activity.id}" must have exactly one correct option.`
            );
        }
    }

    return activities.map(activity => activity.id);
}

function validateSession(session) {
    if (
        !session ||
        typeof session !== "object" ||
        !Array.isArray(session.activityIds) ||
        session.activityIds.length === 0 ||
        !session.answers ||
        typeof session.answers !== "object" ||
        Array.isArray(session.answers) ||
        typeof session.score !== "number" ||
        !Number.isInteger(session.score) ||
        session.score < 0 ||
        typeof session.completed !== "boolean"
    ) {
        throw new TypeError("Invalid quiz session.");
    }

    const ids = session.activityIds;

    if (
        ids.some(id => typeof id !== "string" || id.trim().length === 0) ||
        new Set(ids).size !== ids.length
    ) {
        throw new Error("Invalid activity IDs in session.");
    }

    const answeredIds = Object.keys(session.answers);

    if (answeredIds.some(id => !ids.includes(id))) {
        throw new Error("Session contains answers for unknown activities.");
    }

    let correctCount = 0;

    for (const id of answeredIds) {
        const answer = session.answers[id];

        if (
            !answer ||
            typeof answer !== "object" ||
            typeof answer.optionId !== "string" ||
            answer.optionId.trim().length === 0 ||
            typeof answer.isCorrect !== "boolean" ||
            typeof answer.feedback !== "string"
        ) {
            throw new Error(`Invalid answer record for activity "${id}".`);
        }

        if (answer.isCorrect) {
            correctCount++;
        }
    }

    if (correctCount !== session.score) {
        throw new Error("Session score does not match recorded answers.");
    }

    const nextActivityId = ids.find(id =>
        !Object.prototype.hasOwnProperty.call(session.answers, id)
    ) ?? null;

    if (session.currentActivityId !== nextActivityId) {
        throw new Error("Session current activity is inconsistent.");
    }

    if (session.completed !== (nextActivityId === null)) {
        throw new Error("Session completion state is inconsistent.");
    }

    return true;
}

export function createQuizSession(activities) {
    const activityIds = validateActivities(activities);

    return {
        activityIds,
        currentActivityId: activityIds[0],
        answers: {},
        score: 0,
        completed: false
    };
}

export function submitQuizAnswer(
    session,
    activities,
    activityId,
    optionId
) {
    validateSession(session);

    const activityIds = validateActivities(activities);

    if (
        activityIds.length !== session.activityIds.length ||
        activityIds.some((id, index) => id !== session.activityIds[index])
    ) {
        throw new Error("Activities do not match this session.");
    }

    if (session.completed) {
        return session;
    }

    if (activityId !== session.currentActivityId) {
        throw new Error("Only the current activity can be answered.");
    }

    const activity = activities.find(
        item => item.id === activityId
    );

    const option = activity.options.find(
        item => item.id === optionId
    );

    if (!option) {
        throw new Error("Option not found.");
    }

    const isCorrect = option.correct === true;

    const answers = {
        ...session.answers,
        [activityId]: {
            optionId: option.id,
            isCorrect,
            feedback: option.feedback
        }
    };

    const score = session.score + (isCorrect ? 1 : 0);

    const nextActivityId = session.activityIds.find(
        id => !Object.prototype.hasOwnProperty.call(answers, id)
    ) ?? null;

    return {
        ...session,
        answers,
        score,
        currentActivityId: nextActivityId,
        completed: nextActivityId === null
    };
}

export function getQuizProgress(session) {
    validateSession(session);

    const total = session.activityIds.length;
    const answered = Object.keys(session.answers).length;

    return {
        total,
        answered,
        correct: session.score,
        remaining: total - answered,
        percentage: Math.round((answered / total) * 100),
        completed: session.completed
    };
}

export function getCurrentActivity(activities, session) {
    validateSession(session);

    const activityIds = validateActivities(activities);

    if (
        activityIds.length !== session.activityIds.length ||
        activityIds.some((id, index) => id !== session.activityIds[index])
    ) {
        throw new Error("Activities do not match this session.");
    }

    if (!session.currentActivityId) {
        return null;
    }

    return activities.find(
        activity => activity.id === session.currentActivityId
    ) ?? null;
}
