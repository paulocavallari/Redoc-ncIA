
/**
 * @fileOverview Utility for generating DOCX documents from saved lesson plans.
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ShadingType } from 'docx';
import { saveAs } from 'file-saver'; // Note: file-saver is common but might need installation if not present
import type { SavedPlan } from '@/services/saved-plans';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export async function generateDocx(plan: SavedPlan, filename: string = 'plano_de_aula.docx'): Promise<void> {
    const formatTextRun = (text: string, options: { bold?: boolean; italic?: boolean; size?: number; color?: string } = {}): TextRun => {
        return new TextRun({
            text: text,
            bold: options.bold ?? false,
            italics: options.italic ?? false,
            size: options.size ? options.size * 2 : undefined, // DOCX uses half-points
            // color: options.color ? options.color.replace('#', '') : undefined, // Basic color support
        });
    };

    const children: Paragraph[] = [];

    // --- Title ---
    children.push(
        new Paragraph({
            children: [formatTextRun(`Plano de Aula: ${plan.subject} - ${plan.yearSeries}`, { bold: true, size: 18 })],
            spacing: { after: 200 }, // Add space after title
        })
    );

    // --- Metadata ---
    const addMetadataLine = (label: string, value: string) => {
        children.push(
            new Paragraph({
                children: [
                    formatTextRun(`${label}: `, { bold: true }),
                    formatTextRun(value),
                ],
                 spacing: { after: 50 },
            })
        );
    };

    addMetadataLine('Nível', plan.level);
    addMetadataLine('Bimestre', `${plan.bimestre}º`);
    addMetadataLine('Objeto de Conhecimento', plan.knowledgeObject);
    addMetadataLine('Conteúdos', plan.contents.join(', '));
    addMetadataLine('Habilidades', plan.skills.join(', '));
    addMetadataLine('Duração', plan.duration);
    if (plan.additionalInstructions) {
        addMetadataLine('Orientações Adicionais', plan.additionalInstructions);
    }
    addMetadataLine('Salvo em', format(new Date(plan.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }));

     children.push(new Paragraph({ text: "", spacing: { after: 300 } })); // Add space before main content


    // --- Generated Plan Content ---
    const planLines = plan.generatedPlan.split('\n');

    planLines.forEach((line) => {
        line = line.trim();
        let paragraph: Paragraph | null = null;

         if ((line.startsWith('**') && line.endsWith('**')) || line.startsWith('## ')) {
             const headerText = line.replace(/^\*\*|^\## |\*\*$/g, '');
             if (!headerText.endsWith(':') && headerText.length > 0) {
                 // Section Header
                  paragraph = new Paragraph({
                     children: [formatTextRun(headerText, { bold: true, size: 14 })],
                     heading: HeadingLevel.HEADING_3, // Use heading styles if desired
                     spacing: { before: 200, after: 100 },
                      border: { bottom: { color: "auto", space: 1, style: "single", size: 6 } } // Add bottom border
                 });
             }
         } else if (line.startsWith('**') && line.endsWith('**:')) {
             // Sub-header
              const subHeaderText = line.slice(2, -2) + ':';
              paragraph = new Paragraph({
                  children: [formatTextRun(subHeaderText, { bold: true })],
                   spacing: { after: 50 },
              });
         } else if (line.startsWith('* ') || line.startsWith('- ')) {
             // Bullet point
              const bulletText = line.slice(2);
              paragraph = new Paragraph({
                  children: [formatTextRun(bulletText)],
                  bullet: { level: 0 },
                   indent: { left: 720 }, // Indent bullet points (adjust as needed)
                   spacing: { after: 50 },
              });
         } else if (/^\d+\.\s/.test(line)) {
             // Numbered list (basic implementation)
             const numberedText = line.replace(/^\d+\.\s/, '');
             paragraph = new Paragraph({
                 children: [formatTextRun(numberedText)],
                 numbering: { reference: "default-numbering", level: 0 }, // Use a numbering definition
                 indent: { left: 720 },
                 spacing: { after: 50 },
             });
         } else if (line.startsWith('(') && line.endsWith(')')) {
             // Estimated time
              paragraph = new Paragraph({
                 children: [formatTextRun(line, { italic: true, size: 10 })],
                  spacing: { after: 50 },
                  alignment: AlignmentType.RIGHT, // Align time to the right if desired
             });
         } else if (line) {
             // Regular paragraph
             paragraph = new Paragraph({
                 children: [formatTextRun(line)],
                 spacing: { after: 50 },
             });
         } else {
              // Empty line (add some space)
              paragraph = new Paragraph({ text: "", spacing: { after: 50 } });
         }


        if (paragraph) {
            children.push(paragraph);
        }
    });

    const doc = new Document({
        numbering: { // Define numbering style if using numbered lists
             config: [
                 {
                     reference: "default-numbering",
                     levels: [
                         {
                             level: 0,
                             format: "decimal",
                             text: "%1.",
                             alignment: AlignmentType.START,
                         },
                     ],
                 },
             ],
         },
        sections: [{
            properties: {},
            children: children,
        }],
    });

    // --- Generate and Save ---
    Packer.toBlob(doc).then(blob => {
        saveAs(blob, filename);
    }).catch(error => {
        console.error("Error generating DOCX file:", error);
        // Optionally show a toast notification for the error
        throw new Error("Failed to generate DOCX file.");
    });
}
