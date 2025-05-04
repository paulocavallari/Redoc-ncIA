
/**
 * @fileOverview Utility for generating PDF documents from saved lesson plans, parsing basic HTML.
 */

import jsPDF from 'jspdf';
import type { SavedPlan } from '@/services/saved-plans';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PdfContext {
    doc: jsPDF;
    y: number;
    pageHeight: number;
    pageWidth: number;
    margin: number;
    maxWidth: number;
    listDepth: number;
    isOrderedList: boolean[]; // Stack to track if current list level is ordered
}

// Check for page overflow and add a new page if needed
const checkAndAddPage = (ctx: PdfContext, neededHeight: number): void => {
    if (ctx.y + neededHeight > ctx.pageHeight - ctx.margin) {
        ctx.doc.addPage();
        ctx.y = ctx.margin;
    }
};

// Renders a DOM node and its children recursively
const renderNode = (node: Node, ctx: PdfContext, currentStyle: { bold?: boolean; italic?: boolean } = {}): void => {
    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
            checkAndAddPage(ctx, 5); // Estimate height for a line

            // Apply styles
            let fontStyle = 'normal';
            if (currentStyle.bold && currentStyle.italic) fontStyle = 'bolditalic';
            else if (currentStyle.bold) fontStyle = 'bold';
            else if (currentStyle.italic) fontStyle = 'italic';
            ctx.doc.setFont(undefined, fontStyle);

            const indent = ctx.listDepth * 5; // Indentation for lists
            const lines = ctx.doc.splitTextToSize(text, ctx.maxWidth - indent);

            // Handle list bullets/numbers
            if (ctx.listDepth > 0 && lines.length > 0) {
                const listPrefix = ctx.isOrderedList[ctx.listDepth - 1] ? `${(node.parentElement as HTMLLIElement & { listCounter?: number }).listCounter}. ` : '• ';
                 // Basic counter for ordered lists (needs improvement for nested complex lists)
                 if (ctx.isOrderedList[ctx.listDepth-1]) {
                    const parent = node.parentElement?.parentElement;
                    if (parent) {
                       let counter = 1;
                       for (let i = 0; i < parent.children.length; i++) {
                          if (parent.children[i] === node.parentElement) {
                             (node.parentElement as HTMLLIElement & { listCounter?: number }).listCounter = counter;
                             break;
                          }
                          if (parent.children[i].nodeName === 'LI') counter++;
                       }
                    }
                 }
                ctx.doc.text(listPrefix, ctx.margin + indent - 5, ctx.y); // Add bullet/number before the first line
                 lines[0] = lines[0]; // Text starts after bullet
            }


            lines.forEach((line: string) => {
                checkAndAddPage(ctx, 5);
                ctx.doc.text(line, ctx.margin + indent, ctx.y);
                ctx.y += 5; // Line height
            });
             // ctx.y += 2; // Small gap after text block? Only if not in list?
        }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        let newStyle = { ...currentStyle };
        let blockSpacing = 0;
        let fontSize = 10; // Default content font size

        switch (tagName) {
            case 'p':
                blockSpacing = 4; // Space after paragraph
                fontSize = 10;
                break;
            case 'strong':
            case 'b':
                newStyle.bold = true;
                break;
            case 'em':
            case 'i':
                newStyle.italic = true;
                break;
            case 'h1':
                fontSize = 16; newStyle.bold = true; blockSpacing = 6; break;
            case 'h2':
                fontSize = 14; newStyle.bold = true; blockSpacing = 5; break;
            case 'h3':
                 fontSize = 12; newStyle.bold = true; blockSpacing = 4; break;
             case 'h4':
                 fontSize = 11; newStyle.bold = true; blockSpacing = 3; break;
            case 'ul':
            case 'ol':
                blockSpacing = 2;
                ctx.listDepth++;
                ctx.isOrderedList.push(tagName === 'ol');
                break;
            case 'li':
                blockSpacing = 1; // Small space between list items
                break;
             case 'br':
                 checkAndAddPage(ctx, 5);
                 ctx.y += 5; // Line break
                 return; // No children to process
            // Ignore other tags for now or handle them as needed
        }

         // Apply font size before processing children
         ctx.doc.setFontSize(fontSize);

         // Add spacing before block elements (except lists/items handled by indent)
         if (['p', 'h1', 'h2', 'h3', 'h4'].includes(tagName)) {
             checkAndAddPage(ctx, blockSpacing);
             ctx.y += blockSpacing;
         }


        // Recursively render children with updated style
        element.childNodes.forEach(child => renderNode(child, ctx, newStyle));

        // Reset list depth and type after processing list element
        if (tagName === 'ul' || tagName === 'ol') {
            ctx.listDepth--;
            ctx.isOrderedList.pop();
             // Add spacing after list
             checkAndAddPage(ctx, blockSpacing);
             ctx.y += blockSpacing;
        }
         // Add spacing after other block elements
         else if (['p', 'h1', 'h2', 'h3', 'h4', 'li'].includes(tagName)) {
             checkAndAddPage(ctx, blockSpacing);
             ctx.y += blockSpacing;
         }

         // Reset font size after processing block/heading
         ctx.doc.setFontSize(10); // Reset to default content size

    }
};


export function generatePdf(plan: SavedPlan, filename: string = 'plano_de_aula.pdf'): void {
    if (typeof window === 'undefined') {
        console.error("PDF generation can only occur in the browser.");
        // Handle error appropriately, maybe show a toast
        throw new Error("PDF generation is client-side only.");
    }

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    const addMetadataLine = (label: string, value: string | undefined): void => {
        if (!value) return;
        checkAndAddPage(ctx, 5);
        doc.setFont(undefined, 'bold');
        doc.text(`${label}: `, margin, ctx.y);
        const labelWidth = doc.getTextWidth(`${label}: `);
        doc.setFont(undefined, 'normal');
        const valueLines = doc.splitTextToSize(value, maxWidth - labelWidth);
        doc.text(valueLines, margin + labelWidth, ctx.y);
        ctx.y += valueLines.length * 5; // Adjust y based on number of lines
        ctx.y += 1; // Small gap
    };


    const ctx: PdfContext = {
        doc, y, pageHeight, pageWidth, margin, maxWidth, listDepth: 0, isOrderedList: []
    };


    // --- Title ---
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    checkAndAddPage(ctx, 10);
    const titleLines = doc.splitTextToSize(`Plano de Aula: ${plan.subject} - ${plan.yearSeries}`, maxWidth);
    doc.text(titleLines, margin, ctx.y);
    ctx.y += titleLines.length * 7 + 5; // Adjust spacing based on lines
    doc.setFontSize(10); // Reset size
    doc.setFont(undefined, 'normal');


    // --- Metadata ---
    addMetadataLine('Nível', plan.level);
    addMetadataLine('Bimestre', `${plan.bimestre}º`);
    addMetadataLine('Objeto de Conhecimento', plan.knowledgeObject);
    addMetadataLine('Conteúdos', plan.contents.join(', '));
    addMetadataLine('Habilidades', plan.skills.join(', '));
    addMetadataLine('Duração', plan.duration);
    addMetadataLine('Orientações Adicionais', plan.additionalInstructions);
    addMetadataLine('Salvo em', format(new Date(plan.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }));
    if (plan.updatedAt) {
       addMetadataLine('Atualizado em', format(new Date(plan.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }));
    }
    ctx.y += 8; // Space before main content


    // --- Parse and Render Generated Plan Content ---
    try {
        const parser = new DOMParser();
        const docFragment = parser.parseFromString(plan.generatedPlan, 'text/html'); // Use text/html to get full DOM parsing
        const bodyElement = docFragment.body; // Process children of the body

        checkAndAddPage(ctx, 5); // Ensure some space before content starts

        // Render the parsed HTML body content
        bodyElement.childNodes.forEach(node => renderNode(node, ctx));

    } catch (error) {
        console.error("Error parsing or rendering HTML for PDF:", error);
        // Fallback: print raw text if parsing fails
        checkAndAddPage(ctx, 10);
        ctx.doc.setFont(undefined, 'italic');
        ctx.doc.text("[Erro ao processar conteúdo HTML - exibindo texto bruto]", ctx.margin, ctx.y);
        ctx.y += 5;
        ctx.doc.setFont(undefined, 'normal');
        const fallbackLines = ctx.doc.splitTextToSize(plan.generatedPlan.replace(/<[^>]+>/g, ' '), ctx.maxWidth); // Strip HTML tags for fallback
        fallbackLines.forEach((line: string) => {
            checkAndAddPage(ctx, 5);
            ctx.doc.text(line, ctx.margin, ctx.y);
            ctx.y += 5;
        });
    }

    // --- Save the PDF ---
    doc.save(filename);
}
