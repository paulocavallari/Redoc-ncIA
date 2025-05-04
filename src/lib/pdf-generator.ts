
/**
 * @fileOverview Utility for generating PDF documents from saved lesson plans.
 */

import jsPDF from 'jspdf';
import type { SavedPlan } from '@/services/saved-plans';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Simple text wrapping function
const wrapText = (doc: jsPDF, text: string, x: number, maxWidth: number): string[] => {
    if (!text) return [''];
    return doc.splitTextToSize(text, maxWidth);
};

export function generatePdf(plan: SavedPlan, filename: string = 'plano_de_aula.pdf'): void {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    let y = margin; // Start position for text

    const addWrappedText = (text: string | string[] | undefined, x: number, currentY: number, options: any = {}): number => {
        if (!text) return currentY;
        const lines = Array.isArray(text) ? text : wrapText(doc, text, x, maxWidth);
        lines.forEach((line, index) => {
             if (currentY + 5 > pageHeight - margin) { // Check if new page needed
                doc.addPage();
                currentY = margin;
            }
            doc.text(line, x, currentY, options);
            currentY += 5; // Move down for next line (adjust spacing as needed)
        });
        return currentY + 2; // Add a little extra space after the block
    };

    // --- Title ---
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    y = addWrappedText(`Plano de Aula: ${plan.subject} - ${plan.yearSeries}`, margin, y);
    y += 5; // Space after title

    // --- Metadata ---
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    y = addWrappedText(`Nível: ${plan.level}`, margin, y);
    y = addWrappedText(`Bimestre: ${plan.bimestre}º`, margin, y);
    y = addWrappedText(`Objeto de Conhecimento: ${plan.knowledgeObject}`, margin, y);
    y = addWrappedText(`Conteúdos: ${plan.contents.join(', ')}`, margin, y);
    y = addWrappedText(`Habilidades: ${plan.skills.join(', ')}`, margin, y);
    y = addWrappedText(`Duração: ${plan.duration}`, margin, y);
    if (plan.additionalInstructions) {
        y = addWrappedText(`Orientações Adicionais: ${plan.additionalInstructions}`, margin, y);
    }
     y = addWrappedText(`Salvo em: ${format(new Date(plan.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, margin, y);
    y += 8; // Space before main content

    // --- Generated Plan Content ---
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');

    const planLines = plan.generatedPlan.split('\n');

    planLines.forEach((line) => {
        line = line.trim();
        let isHeader = false;
        let isSubHeader = false;
        let isBullet = false;
        let isNumbered = false;
        let isTime = false;

        if ((line.startsWith('**') && line.endsWith('**')) || line.startsWith('## ')) {
            const headerText = line.replace(/^\*\*|^\## |\*\*$/g, '');
            if (!headerText.endsWith(':') && headerText.length > 0) {
                line = headerText;
                isHeader = true;
            }
        } else if (line.startsWith('**') && line.endsWith('**:')) {
             line = line.slice(2, -2) + ':';
             isSubHeader = true;
        } else if (line.startsWith('* ') || line.startsWith('- ')) {
            line = line.slice(2);
            isBullet = true;
        } else if (/^\d+\.\s/.test(line)) {
            line = line.replace(/^\d+\.\s/, '');
            isNumbered = true; // We'll just treat it as a bullet point for simplicity here
            isBullet = true; // Treat as bullet point
        } else if (line.startsWith('(') && line.endsWith(')')) {
            isTime = true;
        }

        if (line) { // Only process non-empty lines
            if (y + (isHeader ? 10 : 5) > pageHeight - margin) { // Check space before adding
                doc.addPage();
                y = margin;
            }

            if (isHeader) {
                 y += 4; // Extra space before section header
                 doc.setFont(undefined, 'bold');
                 doc.setFontSize(14);
                 y = addWrappedText(line, margin, y);
                 doc.setFont(undefined, 'normal');
                 doc.setFontSize(12);
                 // Add a line separator
                 doc.setDrawColor(200); // Light gray
                 doc.line(margin, y -2 , pageWidth - margin, y - 2);
                 y += 2;
            } else if (isSubHeader) {
                doc.setFont(undefined, 'bold');
                y = addWrappedText(line, margin, y);
                doc.setFont(undefined, 'normal');
            } else if (isBullet) {
                y = addWrappedText(`• ${line}`, margin + 5, y); // Indent bullets
            } else if (isTime) {
                doc.setFont(undefined, 'italic');
                doc.setFontSize(10);
                y = addWrappedText(line, margin, y);
                doc.setFont(undefined, 'normal');
                doc.setFontSize(12);
            } else {
                y = addWrappedText(line, margin, y);
            }
        } else {
            // Add a small space for empty lines if desired
             if (y + 3 <= pageHeight - margin) {
                 y += 3;
             }
        }
    });

    // --- Save the PDF ---
    doc.save(filename);
}
