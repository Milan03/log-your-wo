import { Injectable } from '@angular/core';

import { FormValues } from '../common/common.constants';

@Injectable({
    providedIn: 'root'
})
export class ExerciseNameLocalizerService {
    private readonly localizedNameCache = new Map<string, string>();
    private readonly exactFrenchNames: Record<string, string> = {
        '3/4 Sit-Up': 'Redressement assis aux 3/4',
        '90/90 Hamstring': 'Étirement des ischio-jambiers 90/90',
        'Ab Crunch Machine': 'Flexion abdominale à la machine',
        'Ab Roller': 'Roue abdominale',
        'Air Bike': 'Vélo à bras',
        'Bicycling': 'Cyclisme',
        'Bicycling, Stationary': 'Vélo stationnaire',
        'Bodyweight Squat': 'Squat au poids du corps',
        'Burpees': 'Burpees',
        'Cycling': 'Cyclisme',
        'Dance Aerobics': 'Aérobie dansée',
        'Elliptical Training': 'Entraînement elliptique',
        'High Knees': 'Montées de genoux',
        'Jumping Jacks': 'Sauts avec écart',
        'Kickboxing': 'Kick-boxing',
        'Mountain Climbers': 'Grimpeurs',
        'Power Walking': 'Marche rapide',
        'Rope Jumping': 'Saut à la corde',
        'Rowing': 'Rameur',
        'Running or Jogging': 'Course ou jogging',
        'Skaters': 'Sauts du patineur',
        'Speed Skips': 'Sauts rapides à la corde',
        'Sprinting': 'Sprint',
        'Stair Climbing': 'Montée d’escaliers',
        'Step Aerobics': 'Aérobie sur marche',
        'Swimming': 'Natation',
        'Circuit Training': 'Entraînement en circuit',
        'Box Jumps': 'Sauts sur boîte'
    };

    private readonly frenchPhrases: Array<[RegExp, string]> = [
        [/\bBarbell Bench Press\b/gi, 'développé couché à la barre'],
        [/\bDumbbell Bench Press\b/gi, 'développé couché avec haltères'],
        [/\bBench Press\b/gi, 'développé couché'],
        [/\bShoulder Press\b/gi, 'développé épaules'],
        [/\bMilitary Press\b/gi, 'développé militaire'],
        [/\bLeg Press\b/gi, 'presse à cuisses'],
        [/\bPull-Up\b/gi, 'traction'],
        [/\bPull Ups\b/gi, 'tractions'],
        [/\bPush-Up\b/gi, 'pompe'],
        [/\bPush Ups\b/gi, 'pompes'],
        [/\bDeadlift\b/gi, 'soulevé de terre'],
        [/\bGood Morning\b/gi, 'good morning'],
        [/\bHip Thrust\b/gi, 'poussée de hanches'],
        [/\bGlute Bridge\b/gi, 'pont fessier'],
        [/\bCalf Raise\b/gi, 'élévation des mollets'],
        [/\bLeg Curl\b/gi, 'flexion des jambes'],
        [/\bLeg Extension\b/gi, 'extension des jambes'],
        [/\bTriceps Extension\b/gi, 'extension des triceps'],
        [/\bTricep Extension\b/gi, 'extension du triceps'],
        [/\bBiceps Curl\b/gi, 'flexion des biceps'],
        [/\bHammer Curl\b/gi, 'flexion marteau'],
        [/\bWrist Curl\b/gi, 'flexion des poignets'],
        [/\bLateral Raise\b/gi, 'élévation latérale'],
        [/\bFront Raise\b/gi, 'élévation frontale'],
        [/\bRear Delt Raise\b/gi, 'élévation des deltoïdes postérieurs'],
        [/\bUpright Row\b/gi, 'tirage vertical'],
        [/\bBent Over Row\b/gi, 'tirage penché'],
        [/\bSeated Row\b/gi, 'tirage assis'],
        [/\bLat Pulldown\b/gi, 'tirage vertical à la poulie'],
        [/\bPulldown\b/gi, 'tirage à la poulie'],
        [/\bPushdown\b/gi, 'extension à la poulie'],
        [/\bChest Press\b/gi, 'développé poitrine'],
        [/\bChest Fly\b/gi, 'écarté poitrine'],
        [/\bFlyes\b/gi, 'écartés'],
        [/\bFly\b/gi, 'écarté'],
        [/\bCrunch\b/gi, 'flexion abdominale'],
        [/\bSit-Up\b/gi, 'redressement assis'],
        [/\bRollout\b/gi, 'déploiement'],
        [/\bRussian Twist\b/gi, 'rotation russe'],
        [/\bSide Bend\b/gi, 'flexion latérale'],
        [/\bBack Extension\b/gi, 'extension du dos'],
        [/\bHyperextension\b/gi, 'hyperextension'],
        [/\bWalking Lunge\b/gi, 'fente marchée'],
        [/\bReverse Lunge\b/gi, 'fente arrière'],
        [/\bLunge\b/gi, 'fente'],
        [/\bSplit Squat\b/gi, 'squat bulgare'],
        [/\bSquat\b/gi, 'squat'],
        [/\bStep Ups\b/gi, 'montées sur banc'],
        [/\bStep-Up\b/gi, 'montée sur banc'],
        [/\bBox Jump\b/gi, 'saut sur boîte'],
        [/\bJump\b/gi, 'saut'],
        [/\bSled Drag\b/gi, 'traction de traîneau'],
        [/\bSled Push\b/gi, 'poussée de traîneau'],
        [/\bFarmer's Walk\b/gi, 'marche du fermier'],
        [/\bFarmer Walk\b/gi, 'marche du fermier'],
        [/\bShrug\b/gi, 'haussement d’épaules'],
        [/\bPullover\b/gi, 'pull-over'],
        [/\bClean and Jerk\b/gi, 'épaulé-jeté'],
        [/\bPower Clean\b/gi, 'épaulé en puissance'],
        [/\bHang Clean\b/gi, 'épaulé suspendu'],
        [/\bClean\b/gi, 'épaulé'],
        [/\bPower Snatch\b/gi, 'arraché en puissance'],
        [/\bHang Snatch\b/gi, 'arraché suspendu'],
        [/\bSnatch\b/gi, 'arraché'],
        [/\bKettlebell Swing\b/gi, 'balancement avec kettlebell'],
        [/\bMedicine Ball\b/gi, 'ballon médicinal'],
        [/\bFoam Roll\b/gi, 'rouleau de massage'],
        [/\bStretch\b/gi, 'étirement'],
        [/\bBarbell\b/gi, 'barre'],
        [/\bDumbbell\b/gi, 'haltère'],
        [/\bKettlebell\b/gi, 'kettlebell'],
        [/\bCable\b/gi, 'poulie'],
        [/\bMachine\b/gi, 'machine'],
        [/\bBand\b/gi, 'bande élastique'],
        [/\bBodyweight\b/gi, 'poids du corps'],
        [/\bIncline\b/gi, 'incliné'],
        [/\bDecline\b/gi, 'décliné'],
        [/\bSeated\b/gi, 'assis'],
        [/\bStanding\b/gi, 'debout'],
        [/\bLying\b/gi, 'couché'],
        [/\bOne-Arm\b/gi, 'à un bras'],
        [/\bSingle-Arm\b/gi, 'à un bras'],
        [/\bOne-Leg\b/gi, 'à une jambe'],
        [/\bSingle-Leg\b/gi, 'à une jambe'],
        [/\bAlternating\b/gi, 'alterné'],
        [/\bAlternate\b/gi, 'alterné'],
        [/\bBehind The Back\b/gi, 'derrière le dos'],
        [/\bOverhead\b/gi, 'au-dessus de la tête'],
        [/\bClose Grip\b/gi, 'prise serrée'],
        [/\bWide Grip\b/gi, 'prise large'],
        [/\bReverse Grip\b/gi, 'prise inversée'],
        [/\bWith Bands\b/gi, 'avec bandes élastiques'],
        [/\bWith Chains\b/gi, 'avec chaînes'],
        [/\bMedium Grip\b/gi, 'prise moyenne'],
        [/\bArm\b/gi, 'bras'],
        [/\bArms\b/gi, 'bras'],
        [/\bCurl\b/gi, 'flexion'],
        [/\bCurls\b/gi, 'flexions'],
        [/\bPress\b/gi, 'développé'],
        [/\bRaise\b/gi, 'élévation'],
        [/\bRaises\b/gi, 'élévations'],
        [/\bRow\b/gi, 'tirage'],
        [/\bRows\b/gi, 'tirages'],
        [/\bBench\b/gi, 'banc'],
        [/\bLeg\b/gi, 'jambe'],
        [/\bLegs\b/gi, 'jambes'],
        [/\bTriceps\b/gi, 'triceps'],
        [/\bBiceps\b/gi, 'biceps'],
        [/\bShoulder\b/gi, 'épaule'],
        [/\bShoulders\b/gi, 'épaules'],
        [/\bChest\b/gi, 'poitrine'],
        [/\bBack\b/gi, 'dos'],
        [/\bHip\b/gi, 'hanche'],
        [/\bHips\b/gi, 'hanches'],
        [/\bGlute\b/gi, 'fessier'],
        [/\bHamstring\b/gi, 'ischio-jambier'],
        [/\bHamstrings\b/gi, 'ischio-jambiers'],
        [/\bCalf\b/gi, 'mollet'],
        [/\bQuads?\b/gi, 'quadriceps'],
        [/\bAdductor\b/gi, 'adducteur'],
        [/\bGroin\b/gi, 'aine'],
        [/\bAbdominals?\b/gi, 'abdominaux'],
        [/\bAbs?\b/gi, 'abdominaux'],
        [/\bNeck\b/gi, 'cou'],
        [/\bWrist\b/gi, 'poignet'],
        [/\bKnee\b/gi, 'genou'],
        [/\bKnees\b/gi, 'genoux'],
        [/\bHead\b/gi, 'tête'],
        [/\bFront\b/gi, 'avant'],
        [/\bRear\b/gi, 'arrière'],
        [/\bSide\b/gi, 'latéral'],
        [/\bBent Over\b/gi, 'penché'],
        [/\bStraight\b/gi, 'tendu'],
        [/\bHigh\b/gi, 'haut'],
        [/\bLow\b/gi, 'bas'],
        [/\bFloor\b/gi, 'au sol'],
        [/\bKneeling\b/gi, 'à genoux'],
        [/\bWeighted\b/gi, 'lesté'],
        [/\bAssisted\b/gi, 'assisté'],
        [/\bReverse\b/gi, 'inversé'],
        [/\bClose\b/gi, 'serré'],
        [/\bWide\b/gi, 'large'],
        [/\bTwo-Arm\b/gi, 'à deux bras'],
        [/\bTwo\b/gi, 'deux'],
        [/\bSingle\b/gi, 'unilatéral'],
        [/\bPower\b/gi, 'en puissance'],
        [/\bHang\b/gi, 'suspendu'],
        [/\bThrow\b/gi, 'lancer'],
        [/\bRotation\b/gi, 'rotation'],
        [/\bCircles\b/gi, 'cercles'],
        [/\bCrossover\b/gi, 'croisé'],
        [/\bRope\b/gi, 'corde'],
        [/\bBall\b/gi, 'ballon'],
        [/\bPlate\b/gi, 'disque'],
        [/\bBlocks\b/gi, 'blocs'],
        [/\bWalking\b/gi, 'marché'],
        [/\bWalk\b/gi, 'marche'],
        [/\bSprint\b/gi, 'sprint'],
        [/\bDips?\b/gi, 'dips'],
        [/\bChin-Up\b/gi, 'traction en supination'],
        [/\bExtension\b/gi, 'extension'],
        [/\bTwist\b/gi, 'rotation'],
        [/\bSumo\b/gi, 'sumo'],
        [/\bFlat\b/gi, 'à plat'],
        [/\bElevated\b/gi, 'surélevé']
    ];

    public localize(name: string, language: string): string {
        if (!name || language !== FormValues.FRCode) {
            return name;
        }

        const cachedName = this.localizedNameCache.get(name);
        if (cachedName) {
            return cachedName;
        }

        const exactName = this.exactFrenchNames[name];
        if (exactName) {
            this.localizedNameCache.set(name, exactName);
            return exactName;
        }

        const translated = this.frenchPhrases.reduce(
            (current, [pattern, replacement]) => current.replace(pattern, replacement),
            name
        );
        const localizedName = translated.charAt(0).toLocaleUpperCase(FormValues.FRCode) + translated.slice(1);
        this.localizedNameCache.set(name, localizedName);
        return localizedName;
    }

    public normalize(value: string): string {
        return (value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase();
    }
}
