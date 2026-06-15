import { SeoData } from '../../core/seo/seo.service';

export interface FeatureSection {
    heading: string;
    body: string[];
}

export interface FeatureLink {
    label: string;
    routerLink: string;
    description: string;
}

export interface FeatureContent {
    /** Route path segment under /features. */
    slug: string;
    eyebrow: string;
    h1: string;
    intro: string;
    bullets: string[];
    sections: FeatureSection[];
    cta: { label: string; routerLink: string };
    related: FeatureLink[];
    seo: SeoData;
}

const BASE = '/features';

function breadcrumb(slug: string, name: string): Record<string, unknown> {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://logyourworkout.app/'
            },
            {
                '@type': 'ListItem',
                position: 2,
                name,
                item: `https://logyourworkout.app${BASE}/${slug}`
            }
        ]
    };
}

/**
 * Content for every public feature page. Add a new entry here (and a matching
 * route in features.routes.ts plus a sitemap.xml URL) to publish a new page.
 */
export const FEATURE_CONTENT: Record<string, FeatureContent> = {
    'workout-tracker': {
        slug: 'workout-tracker',
        eyebrow: 'Workout tracker',
        h1: 'A free workout tracker for strength and cardio',
        intro: 'Log Your Workout is a fast, free workout tracker that keeps every gym session in one place. '
            + 'Record sets, reps, weight, distance, and time for both strength and cardio exercises, then '
            + 'come back to a clean history you actually want to read.',
        bullets: [
            'Track strength exercises with sets, reps, and weight',
            'Track cardio with distance, time, and notes',
            'Works offline in guest mode — no account required to start',
            'Use it on your phone at the gym or on a desktop at home'
        ],
        sections: [
            {
                heading: 'Built for logging during your workout',
                body: [
                    'Adding an exercise takes a couple of taps, so you can log a set between rest periods '
                    + 'without breaking your rhythm. Strength and cardio entries each have the fields that '
                    + 'matter for that style of training, and nothing you don\'t need.',
                    'Because the tracker stores your data locally first, it keeps working even when the gym '
                    + 'WiFi does not. Sign in whenever you want and your logs sync to the cloud automatically.'
                ]
            },
            {
                heading: 'One log for every kind of training',
                body: [
                    'Whether you follow a structured strength program, mix in conditioning, or just want a '
                    + 'simple gym journal, the same log handles it. Free-form entries let you write down '
                    + 'exactly what you did instead of forcing your training into a rigid template.'
                ]
            }
        ],
        cta: { label: 'Start logging a workout', routerLink: '/log-entry/simple-log' },
        related: [
            {
                label: 'Strength training log',
                routerLink: '/features/strength-training-log',
                description: 'Track sets, reps, and weight for a dedicated strength journal.'
            },
            {
                label: 'Workout history & progress',
                routerLink: '/features/workout-history-progress',
                description: 'Review past sessions and see how your training is trending.'
            }
        ],
        seo: {
            title: 'Free Workout Tracker for Strength & Cardio',
            description: 'A free workout tracker for the gym. Log strength and cardio sets, reps, weight, '
                + 'distance, and time on mobile or desktop — with offline guest mode and cloud sync.',
            keywords: 'workout tracker, gym workout tracker, workout log app, fitness tracker',
            path: `${BASE}/workout-tracker`,
            jsonLd: breadcrumb('workout-tracker', 'Workout Tracker')
        }
    },

    'excel-workout-import': {
        slug: 'excel-workout-import',
        eyebrow: 'Excel program import',
        h1: 'Import an Excel workout program in seconds',
        intro: 'Already have a training program in a spreadsheet? Log Your Workout reads Excel workout '
            + 'programs directly, so you can turn a coach\'s plan or your own template into a trackable, '
            + 'week-by-week routine without retyping a thing.',
        bullets: [
            'Upload an .xlsx workout program straight from your device',
            'Browse the program by week and by training day',
            'Open any planned day as a ready-to-fill workout log',
            'Keep your original spreadsheet as the source of truth'
        ],
        sections: [
            {
                heading: 'From spreadsheet to trackable program',
                body: [
                    'Coaches and lifters love spreadsheets, but they are awkward to use mid-set. The Excel '
                    + 'workout importer parses your program into clean weeks and days you can navigate on a '
                    + 'phone, then launches the exact day you are training as a pre-filled log.',
                    'Nothing is locked in. Re-import an updated spreadsheet whenever your program changes and '
                    + 'pick up right where the plan expects you to be.'
                ]
            },
            {
                heading: 'Week and day program tracking',
                body: [
                    'Multi-week programs stay organized. Move between Week 1 and Week 12, jump to a specific '
                    + 'training day, and mark sessions complete as you go so you always know what is next.'
                ]
            }
        ],
        cta: { label: 'Import an Excel program', routerLink: '/log-entry/import-program' },
        related: [
            {
                label: 'Workout program tracker',
                routerLink: '/features/workout-history-progress',
                description: 'Follow week/day plans and track completion over time.'
            },
            {
                label: 'Workout tracker',
                routerLink: '/features/workout-tracker',
                description: 'Log the sessions your imported program schedules.'
            }
        ],
        seo: {
            title: 'Excel Workout Program Importer',
            description: 'Import an Excel (.xlsx) workout program and track it by week and day. Turn a '
                + 'spreadsheet training plan into a pre-filled, trackable workout log — free.',
            keywords: 'excel workout importer, import workout program, spreadsheet workout, workout program tracker',
            path: `${BASE}/excel-workout-import`,
            jsonLd: breadcrumb('excel-workout-import', 'Excel Workout Program Import')
        }
    },

    'workout-pdf-export': {
        slug: 'workout-pdf-export',
        eyebrow: 'PDF export',
        h1: 'Export and share your workouts as a PDF',
        intro: 'Turn any logged session into a clean PDF you can save, print, or email. Workout PDF export '
            + 'makes it easy to share a session with a coach or training partner and to keep an offline '
            + 'record of your training.',
        bullets: [
            'Export a single workout to a tidy, readable PDF',
            'Email a workout PDF directly from the app',
            'Great for sharing sessions with a coach or partner',
            'PDF labels follow the language you have selected'
        ],
        sections: [
            {
                heading: 'A shareable record of every session',
                body: [
                    'Sometimes you need your workout outside the app — to send to a coach, attach to a log '
                    + 'book, or simply print. The PDF export lays out your exercises, sets, and notes in a '
                    + 'format that reads well on screen and on paper.'
                ]
            },
            {
                heading: 'Email a workout without leaving the app',
                body: [
                    'Prefer to send rather than download? Enter an email address and the app delivers the '
                    + 'workout as a PDF attachment, so sharing your training is a single step.'
                ]
            }
        ],
        cta: { label: 'Log a workout to export', routerLink: '/log-entry/simple-log' },
        related: [
            {
                label: 'Workout tracker',
                routerLink: '/features/workout-tracker',
                description: 'Log the sessions you want to export and share.'
            },
            {
                label: 'Workout history & progress',
                routerLink: '/features/workout-history-progress',
                description: 'Keep a full record alongside your exported PDFs.'
            }
        ],
        seo: {
            title: 'Workout PDF Export & Email',
            description: 'Export any workout to a clean PDF or email it straight from the app. Share '
                + 'sessions with a coach, print them, or keep an offline record — free workout PDF export.',
            keywords: 'workout pdf export, export workout to pdf, email workout, share workout',
            path: `${BASE}/workout-pdf-export`,
            jsonLd: breadcrumb('workout-pdf-export', 'Workout PDF Export')
        }
    },

    'strength-training-log': {
        slug: 'strength-training-log',
        eyebrow: 'Strength training log',
        h1: 'A simple strength training log that stays out of your way',
        intro: 'Keep a focused strength training log of every lift. Record sets, reps, and weight for '
            + 'squats, deadlifts, presses, and accessories, then build a training journal you can look '
            + 'back on session after session.',
        bullets: [
            'Log sets, reps, and weight for any strength exercise',
            'Free-form entries fit any program or split',
            'Add notes for RPE, tempo, or how a set felt',
            'Review previous sessions to guide your next lift'
        ],
        sections: [
            {
                heading: 'Track the numbers that drive progress',
                body: [
                    'Progressive overload only works if you remember what you did last time. A dependable '
                    + 'strength training log captures your working weights so you can add reps or load with '
                    + 'confidence instead of guessing.',
                    'The log is free-form, so it suits 5x5, upper/lower, push-pull-legs, or whatever split '
                    + 'you run. Write down exactly what you lifted, not what a template assumes.'
                ]
            },
            {
                heading: 'A journal you will actually keep',
                body: [
                    'Quick entry and a clean history mean logging never feels like a chore. Add a short note '
                    + 'when a set was a grinder or a PR, and your strength journal becomes a record you can '
                    + 'learn from.'
                ]
            }
        ],
        cta: { label: 'Start your strength log', routerLink: '/log-entry/simple-log' },
        related: [
            {
                label: 'Workout tracker',
                routerLink: '/features/workout-tracker',
                description: 'Track cardio alongside your strength work in one log.'
            },
            {
                label: 'Workout history & progress',
                routerLink: '/features/workout-history-progress',
                description: 'See your lifting history and progress at a glance.'
            }
        ],
        seo: {
            title: 'Strength Training Log & Workout Journal',
            description: 'A free strength training log and workout journal. Track sets, reps, and weight '
                + 'for every lift, add notes, and review past sessions to keep progressing.',
            keywords: 'strength training log, workout journal, lifting log, gym log',
            path: `${BASE}/strength-training-log`,
            jsonLd: breadcrumb('strength-training-log', 'Strength Training Log')
        }
    },

    'workout-history-progress': {
        slug: 'workout-history-progress',
        eyebrow: 'History & progress',
        h1: 'Workout history and progress tracking that follows you',
        intro: 'Every session you log builds a workout history you can return to anywhere. Track your '
            + 'program week by week, mark days complete, and keep your records in sync across phone and '
            + 'desktop so your progress is always with you.',
        bullets: [
            'Keep a complete history of past workouts',
            'Track week/day programs and completion',
            'Sync across devices with an optional free account',
            'Start in guest mode and your data stays on your device'
        ],
        sections: [
            {
                heading: 'Your training history, in sync',
                body: [
                    'Log Your Workout saves to your device first, then syncs to the cloud when you sign in. '
                    + 'That means your history is available offline and follows you from the gym floor to '
                    + 'your laptop without missing an entry.',
                    'Guest mode keeps everything local until you choose to create a free account — no '
                    + 'sign-up wall between you and your first logged set.'
                ]
            },
            {
                heading: 'See where your program is going',
                body: [
                    'Move through your program by week and day and mark sessions complete as you finish '
                    + 'them. A clear record of what you have done makes it easy to stay consistent and plan '
                    + 'what comes next.'
                ]
            }
        ],
        cta: { label: 'Open your workout log', routerLink: '/log-entry/simple-log' },
        related: [
            {
                label: 'Excel workout import',
                routerLink: '/features/excel-workout-import',
                description: 'Load a multi-week program to track day by day.'
            },
            {
                label: 'Strength training log',
                routerLink: '/features/strength-training-log',
                description: 'Build the lifting history this page helps you review.'
            }
        ],
        seo: {
            title: 'Workout History & Progress Tracking',
            description: 'Track your workout history and progress across devices. Follow week/day programs, '
                + 'mark sessions complete, and sync your training with a free account or local guest mode.',
            keywords: 'workout history, progress tracking, workout program tracker, sync workouts',
            path: `${BASE}/workout-history-progress`,
            jsonLd: breadcrumb('workout-history-progress', 'Workout History & Progress')
        }
    }
};
