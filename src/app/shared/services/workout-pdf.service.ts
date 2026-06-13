import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { jsPDF, jsPDFOptions } from 'jspdf';

import { Exercise, Intensity } from '../models/exercise.model';
import { DistanceMeasure, SimpleLog, WeightMeasure } from '../models/simple-log.model';

export interface WorkoutPdfLabels {
    workoutLog: string;
    simpleWorkoutLog: string;
    importedWorkout: string;
    strength: string;
    cardio: string;
    exercise: string;
    prescription: string;
    weight: string;
    reps: string;
    sets: string;
    distance: string;
    duration: string;
    intensity: string;
    status: string;
    workoutDate: string;
    elapsedTime: string;
    units: string;
    programWeek: string;
    programDay: string;
    complete: string;
    incomplete: string;
    completed: string;
    paused: string;
    inProgress: string;
    notStarted: string;
    notAvailable: string;
    generatedBy: string;
    page: string;
    of: string;
    intensityNames: Partial<Record<Intensity, string>>;
}

export interface WorkoutPdfData {
    log: SimpleLog;
    weightMeasure: WeightMeasure;
    distanceMeasure: DistanceMeasure;
    elapsedTimeLabel: string;
    locale: string;
    labels: WorkoutPdfLabels;
    startedAt?: string;
    completedAt?: string;
    pausedAt?: string;
    importedWorkout?: {
        weekName: string;
        dayName: string;
    };
}

interface NormalizedWorkoutPdfData extends Omit<WorkoutPdfData, 'log'> {
    log: {
        title: string;
        startDatim: Date;
        exercises: Exercise[];
        cardioExercises: Exercise[];
    };
}

@Injectable({
    providedIn: 'root'
})
export class WorkoutPdfService {
    private readonly fontAssetPath = 'assets/fonts/NotoSans-Regular.ttf';
    private readonly fontFileName = 'NotoSans-Regular.ttf';
    private readonly fontFamily = 'NotoSans';
    private fontBase64Promise: Promise<string> | undefined;

    constructor(private http: HttpClient) { }

    public async create(input: WorkoutPdfData): Promise<jsPDF> {
        const data = this.normalizeData(input);
        const options: jsPDFOptions = {
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
            compress: true
        };
        const doc = new jsPDF(options);
        await this.registerFont(doc);
        doc.setProperties({
            title: data.log.title || data.labels.workoutLog,
            subject: data.importedWorkout ? data.labels.importedWorkout : data.labels.workoutLog,
            creator: 'Log Your Workout'
        });

        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (margin * 2);
        let y = this.addDocumentHeader(doc, data, margin, contentWidth);
        y = this.addSummary(doc, data, margin, y, contentWidth);

        if (data.log.exercises.length) {
            const includePrescription = data.log.exercises.some(exercise => Boolean(exercise.prescription));
            const headers = includePrescription
                ? [
                    data.labels.exercise,
                    data.labels.prescription,
                    data.labels.weight,
                    data.labels.reps,
                    data.labels.sets,
                    data.labels.status
                ]
                : [
                    data.labels.exercise,
                    data.labels.weight,
                    data.labels.reps,
                    data.labels.sets,
                    data.labels.status
                ];
            const widths = includePrescription
                ? [42, 43, 29, 17, 17, 22]
                : [62, 35, 20, 20, 33];

            y = this.addSection(
                doc,
                data.labels.strength,
                headers,
                data.log.exercises.map(exercise => {
                    const row = [exercise.exerciseName || '-'];
                    if (includePrescription) {
                        row.push(exercise.prescription || '-');
                    }
                    row.push(
                        this.getWeightDisplay(exercise, data.weightMeasure) || '-',
                        this.value(exercise.reps),
                        this.value(exercise.sets),
                        exercise.completed ? data.labels.complete : data.labels.incomplete
                    );
                    return row;
                }),
                widths,
                margin,
                y
            );
        }

        if (data.log.cardioExercises.length) {
            this.addSection(
                doc,
                data.labels.cardio,
                [
                    data.labels.exercise,
                    data.labels.distance,
                    data.labels.duration,
                    data.labels.intensity,
                    data.labels.status
                ],
                data.log.cardioExercises.map(exercise => [
                    exercise.exerciseName || '-',
                    this.getDistanceDisplay(exercise, data.distanceMeasure) || '-',
                    this.getDurationDisplay(exercise, data.labels.notAvailable),
                    exercise.intensity
                        ? data.labels.intensityNames[exercise.intensity] || Intensity[exercise.intensity]
                        : '-',
                    exercise.completed ? data.labels.complete : data.labels.incomplete
                ]),
                [50, 30, 30, 28, 32],
                margin,
                y
            );
        }

        this.addFooters(doc, data.labels);
        return doc;
    }

    public getFileName(log: SimpleLog): string {
        const title = (log.title || 'workout-log')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'workout-log';
        const date = this.toDateValue(this.validDate(log.startDatim) || new Date());
        return `${title}-${date}.pdf`;
    }

    private async registerFont(doc: jsPDF): Promise<void> {
        const fontBase64 = await this.loadFontBase64();
        doc.addFileToVFS(this.fontFileName, fontBase64);
        doc.addFont(this.fontFileName, this.fontFamily, 'normal');
        doc.addFont(this.fontFileName, this.fontFamily, 'bold');
        doc.setFont(this.fontFamily, 'normal');
    }

    private loadFontBase64(): Promise<string> {
        if (!this.fontBase64Promise) {
            this.fontBase64Promise = firstValueFrom(
                this.http.get(this.fontAssetPath, { responseType: 'arraybuffer' })
            )
                .then(buffer => this.arrayBufferToBase64(buffer))
                .catch(error => {
                    this.fontBase64Promise = undefined;
                    throw error;
                });
        }

        return this.fontBase64Promise;
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        const chunkSize = 0x8000;
        let binary = '';

        for (let index = 0; index < bytes.length; index += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
        }

        return btoa(binary);
    }

    private addDocumentHeader(
        doc: jsPDF,
        data: NormalizedWorkoutPdfData,
        margin: number,
        contentWidth: number
    ): number {
        doc.setFont(this.fontFamily, 'bold');
        doc.setFontSize(18);
        const titleLines = this.limitLines(
            doc.splitTextToSize(data.log.title || data.labels.workoutLog, contentWidth),
            6
        );
        doc.setFont(this.fontFamily, 'normal');
        doc.setFontSize(9);
        const typeLines = this.limitLines(
            doc.splitTextToSize(this.getWorkoutTypeLabel(data), contentWidth),
            4
        );
        const headerHeight = Math.max(34, 10 + (titleLines.length * 7) + (typeLines.length * 4));

        doc.setFillColor(31, 41, 51);
        doc.rect(0, 0, doc.internal.pageSize.getWidth(), headerHeight, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont(this.fontFamily, 'bold');
        doc.setFontSize(18);
        doc.text(titleLines, margin, 16);
        doc.setFont(this.fontFamily, 'normal');
        doc.setFontSize(9);
        doc.text(typeLines, margin, 16 + (titleLines.length * 7) + 2);

        return headerHeight + 9;
    }

    private addSummary(
        doc: jsPDF,
        data: NormalizedWorkoutPdfData,
        x: number,
        y: number,
        width: number
    ): number {
        const summaryRows = [
            [data.labels.workoutDate, this.formatDate(data.log.startDatim, data.locale)],
            [data.labels.status, this.getStatusLabel(data)],
            [data.labels.elapsedTime, data.elapsedTimeLabel],
            [data.labels.units, `${data.weightMeasure} / ${data.distanceMeasure}`]
        ];

        if (data.importedWorkout) {
            summaryRows.unshift(
                [data.labels.programWeek, data.importedWorkout.weekName || '-'],
                [data.labels.programDay, data.importedWorkout.dayName || '-']
            );
        }

        const pageHeight = doc.internal.pageSize.getHeight();
        const bottomMargin = 18;
        const labelWidth = 38;
        const valueWidth = width - labelWidth - 4;
        doc.setDrawColor(220, 225, 230);
        doc.setLineWidth(0.25);

        summaryRows.forEach(([label, value], index) => {
            doc.setFont(this.fontFamily, 'normal');
            doc.setFontSize(9);
            const valueLines = doc.splitTextToSize(String(value), valueWidth);
            let lineOffset = 0;

            while (lineOffset < valueLines.length) {
                let availableLines = Math.floor((pageHeight - bottomMargin - y - 3) / 4);
                if (availableLines < 1) {
                    doc.addPage();
                    y = 18;
                    availableLines = Math.floor((pageHeight - bottomMargin - y - 3) / 4);
                }

                const chunk = valueLines.slice(lineOffset, lineOffset + availableLines);
                const rowHeight = Math.max(7, (chunk.length * 4) + 3);
                if (index % 2 === 0) {
                    doc.setFillColor(247, 249, 251);
                    doc.rect(x, y, width, rowHeight, 'F');
                }
                doc.setTextColor(95, 107, 118);
                doc.setFont(this.fontFamily, 'bold');
                doc.setFontSize(8);
                doc.text(label.toUpperCase(), x + 2, y + 5);
                doc.setTextColor(31, 41, 51);
                doc.setFont(this.fontFamily, 'normal');
                doc.setFontSize(9);
                doc.text(chunk, x + labelWidth, y + 5);
                y += rowHeight;
                lineOffset += chunk.length;

                if (lineOffset < valueLines.length) {
                    doc.addPage();
                    y = 18;
                }
            }
        });

        return y + 7;
    }

    private addSection(
        doc: jsPDF,
        title: string,
        headers: string[],
        rows: string[][],
        columnWidths: number[],
        x: number,
        y: number
    ): number {
        const pageHeight = doc.internal.pageSize.getHeight();
        const bottomMargin = 18;
        const cellPadding = 2;
        const lineHeight = 3.6;
        const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);

        const addSectionHeader = (sectionY: number): number => {
            doc.setTextColor(31, 41, 51);
            doc.setFont(this.fontFamily, 'bold');
            doc.setFontSize(13);
            doc.text(title, x, sectionY);
            sectionY += 5;

            doc.setFontSize(8);
            const wrappedHeaders: string[][] = headers.map((header, index) =>
                doc.splitTextToSize(header, columnWidths[index] - (cellPadding * 2))
            );
            const headerLineCount = Math.max(...wrappedHeaders.map(header => header.length));
            const headerHeight = Math.max(8, (headerLineCount * 3.4) + 4);
            doc.setFillColor(43, 108, 176);
            doc.rect(x, sectionY, tableWidth, headerHeight, 'F');
            doc.setTextColor(255, 255, 255);
            let cellX = x;
            wrappedHeaders.forEach((header, index) => {
                doc.text(header, cellX + cellPadding, sectionY + 4.5);
                cellX += columnWidths[index];
            });
            return sectionY + headerHeight;
        };

        if (y + 18 > pageHeight - bottomMargin) {
            doc.addPage();
            y = 18;
        }
        y = addSectionHeader(y);

        rows.forEach((row, rowIndex) => {
            doc.setFont(this.fontFamily, 'normal');
            doc.setFontSize(8);
            const wrappedCells: string[][] = row.map((cell, index) =>
                doc.splitTextToSize(String(cell), columnWidths[index] - (cellPadding * 2))
            );
            let lineOffset = 0;
            const totalLines = Math.max(...wrappedCells.map(cell => cell.length));

            while (lineOffset < totalLines) {
                let availableHeight = pageHeight - bottomMargin - y;
                let availableLines = Math.floor((availableHeight - (cellPadding * 2)) / lineHeight);

                if (availableLines < 1) {
                    doc.addPage();
                    y = addSectionHeader(18);
                    availableHeight = pageHeight - bottomMargin - y;
                    availableLines = Math.max(
                        1,
                        Math.floor((availableHeight - (cellPadding * 2)) / lineHeight)
                    );
                }

                const chunkLineCount = Math.min(totalLines - lineOffset, availableLines);
                const rowHeight = Math.max(8, (chunkLineCount * lineHeight) + (cellPadding * 2));
                const isContinuation = lineOffset > 0;

                if (rowIndex % 2 === 0) {
                    doc.setFillColor(247, 249, 251);
                    doc.rect(x, y, tableWidth, rowHeight, 'F');
                }

                doc.setDrawColor(225, 229, 233);
                doc.line(x, y + rowHeight, x + tableWidth, y + rowHeight);
                doc.setTextColor(31, 41, 51);
                let cellX = x;
                wrappedCells.forEach((cell, index) => {
                    const lines = cell.slice(lineOffset, lineOffset + chunkLineCount);
                    if (lines.length) {
                        doc.text(lines, cellX + cellPadding, y + 5);
                    } else if (isContinuation && index === 0) {
                        doc.text('...', cellX + cellPadding, y + 5);
                    }
                    cellX += columnWidths[index];
                });
                y += rowHeight;
                lineOffset += chunkLineCount;

                if (lineOffset < totalLines) {
                    doc.addPage();
                    y = addSectionHeader(18);
                }
            }
        });

        return y + 9;
    }

    private addFooters(doc: jsPDF, labels: WorkoutPdfLabels): void {
        const pageCount = doc.getNumberOfPages();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        for (let page = 1; page <= pageCount; page++) {
            doc.setPage(page);
            doc.setTextColor(108, 117, 125);
            doc.setFont(this.fontFamily, 'normal');
            doc.setFontSize(8);
            doc.text(labels.generatedBy, 15, pageHeight - 8);
            doc.text(
                `${labels.page} ${page} ${labels.of} ${pageCount}`,
                pageWidth - 15,
                pageHeight - 8,
                { align: 'right' }
            );
        }
    }

    private getStatusLabel(data: NormalizedWorkoutPdfData): string {
        if (data.completedAt) {
            const completedAt = this.validDate(data.completedAt);
            return completedAt
                ? `${data.labels.completed} ${this.formatDate(completedAt, data.locale)}`
                : data.labels.completed;
        }
        if (data.pausedAt) {
            return data.labels.paused;
        }
        return data.startedAt ? data.labels.inProgress : data.labels.notStarted;
    }

    private getWorkoutTypeLabel(data: NormalizedWorkoutPdfData): string {
        return data.importedWorkout
            ? `${data.labels.importedWorkout}: ${data.importedWorkout.weekName} ${data.importedWorkout.dayName}`.trim()
            : data.labels.simpleWorkoutLog;
    }

    private getWeightDisplay(exercise: Exercise, measure: WeightMeasure): string {
        const weight = exercise.weight === undefined || exercise.weight === null
            ? ''
            : String(exercise.weight).trim();

        if (!weight || weight.toLowerCase() === 'x') {
            return '';
        }

        return this.isConvertibleMeasurement(weight) ? `${weight} ${measure}` : weight;
    }

    private getDistanceDisplay(exercise: Exercise, measure: DistanceMeasure): string {
        const distance = exercise.distance === undefined || exercise.distance === null
            ? ''
            : String(exercise.distance).trim();
        return distance && this.isConvertibleMeasurement(distance) ? `${distance} ${measure}` : distance;
    }

    private getDurationDisplay(exercise: Exercise, notAvailableLabel: string): string {
        if (!exercise.duration || exercise.duration.toMillis() <= 0) {
            return notAvailableLabel;
        }

        const durationParts = exercise.duration.shiftTo('hours', 'minutes', 'seconds');
        const hours = Math.floor(durationParts.hours);
        const minutes = Math.floor(durationParts.minutes);
        const seconds = Math.floor(durationParts.seconds);
        const parts = [];

        if (hours) {
            parts.push(`${hours}h`);
        }
        if (minutes) {
            parts.push(`${minutes}m`);
        }
        if (seconds || !parts.length) {
            parts.push(`${seconds}s`);
        }

        return parts.join(' ');
    }

    private normalizeData(data: WorkoutPdfData): NormalizedWorkoutPdfData {
        return {
            ...data,
            locale: data.locale || 'en-CA',
            log: {
                title: data.log?.title || data.labels.workoutLog,
                startDatim: this.validDate(data.log?.startDatim) || new Date(),
                exercises: Array.isArray(data.log?.exercises) ? data.log.exercises : [],
                cardioExercises: Array.isArray(data.log?.cardioExercises) ? data.log.cardioExercises : []
            }
        };
    }

    private formatDate(date: Date, locale: string): string {
        try {
            return date.toLocaleString(locale);
        } catch {
            return date.toLocaleString();
        }
    }

    private limitLines(lines: string[], maximumLines: number): string[] {
        if (lines.length <= maximumLines) {
            return lines;
        }

        const limited = lines.slice(0, maximumLines);
        limited[maximumLines - 1] = `${limited[maximumLines - 1]}...`;
        return limited;
    }

    private validDate(value: Date | string | undefined): Date | undefined {
        if (!value) {
            return undefined;
        }

        const date = value instanceof Date ? value : new Date(value);
        return Number.isFinite(date.getTime()) ? date : undefined;
    }

    private isConvertibleMeasurement(value: string): boolean {
        return /^-?\d+(?:\.\d+)?$/.test(value)
            || /^-?\d+(?:\.\d+)?\s*[-–]\s*-?\d+(?:\.\d+)?$/.test(value);
    }

    private value(value: number | string | undefined): string {
        return value === undefined || value === null || String(value).trim() === ''
            ? '-'
            : String(value);
    }

    private toDateValue(date: Date): string {
        const pad = (value: number) => String(value).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }
}
