'use client';

import React from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, Heading3, Pilcrow // Added Heading and Paragraph icons
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (htmlContent: string) => void;
}

const Toolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="border border-input bg-transparent rounded-t-md p-1 flex flex-wrap items-center gap-1 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"> {/* Make Toolbar sticky */}
      <Toggle
        size="sm"
        pressed={editor.isActive('bold')}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().toggleBold()} // Disable if action not possible
        aria-label="Negrito"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('italic')}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
         disabled={!editor.can().toggleItalic()}
        aria-label="Itálico"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('underline')}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
         disabled={!editor.can().toggleUnderline()}
        aria-label="Sublinhado"
      >
        <UnderlineIcon className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive('heading', { level: 1 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
         disabled={!editor.can().toggleHeading({ level: 1 })}
         aria-label="Título 1"
      >
        <Heading1 className="h-4 w-4" />
      </Toggle>
       <Toggle
        size="sm"
        pressed={editor.isActive('heading', { level: 2 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
         disabled={!editor.can().toggleHeading({ level: 2 })}
         aria-label="Título 2"
      >
        <Heading2 className="h-4 w-4" />
      </Toggle>
       <Toggle
        size="sm"
        pressed={editor.isActive('heading', { level: 3 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
         disabled={!editor.can().toggleHeading({ level: 3 })}
         aria-label="Título 3"
      >
        <Heading3 className="h-4 w-4" />
      </Toggle>
        <Toggle
        size="sm"
        pressed={editor.isActive('paragraph')}
        onPressedChange={() => editor.chain().focus().setParagraph().run()}
         disabled={!editor.can().setParagraph()}
         aria-label="Parágrafo"
      >
        <Pilcrow className="h-4 w-4" />
      </Toggle>


      <Separator orientation="vertical" className="h-6 mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive('bulletList')}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
         disabled={!editor.can().toggleBulletList()}
        aria-label="Lista com Marcadores"
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive('orderedList')}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
         disabled={!editor.can().toggleOrderedList()}
        aria-label="Lista Numerada"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'left' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
         disabled={!editor.can().setTextAlign('left')}
         aria-label="Alinhar à Esquerda"
      >
        <AlignLeft className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'center' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
         disabled={!editor.can().setTextAlign('center')}
         aria-label="Centralizar"
      >
        <AlignCenter className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'right' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
         disabled={!editor.can().setTextAlign('right')}
         aria-label="Alinhar à Direita"
      >
        <AlignRight className="h-4 w-4" />
      </Toggle>
       <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: 'justify' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('justify').run()}
         disabled={!editor.can().setTextAlign('justify')}
         aria-label="Justificar"
      >
        <AlignJustify className="h-4 w-4" />
      </Toggle>
      {/* Add more toolbar buttons as needed (e.g., font size, color - requires more extensions) */}
    </div>
  );
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
         heading: {
            levels: [1, 2, 3], // Allow H1, H2, H3
          },
          // Keep default block elements like paragraph, list items, etc.
          // Disable extensions not explicitly needed if desired
          // blockquote: false,
          // codeBlock: false,
          // horizontalRule: false,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'], // Apply alignment to headings and paragraphs
      }),
    ],
    content: content, // Initial content passed as prop
    editorProps: {
      attributes: {
        // Apply Tailwind's typography plugin classes for basic styling
        // and add custom styles for height, border, focus, etc.
        class: 'prose dark:prose-invert prose-sm sm:prose-base max-w-none focus:outline-none border border-input border-t-0 rounded-b-md p-4 min-h-[400px] max-h-[65vh] overflow-y-auto bg-background',
      },
    },
    onUpdate({ editor }) {
      // When the editor content changes, call the onChange prop
      // with the latest HTML content.
      onChange(editor.getHTML());
    },
  });

  // This effect ensures that if the `content` prop changes externally
  // (e.g., after AI generation), the editor's content is updated.
  // It avoids unnecessary updates if the content is already the same.
  React.useEffect(() => {
    if (editor && !editor.isDestroyed && editor.getHTML() !== content) {
      // Use `setContent` to replace the editor's content.
      // The second argument `false` prevents triggering the `onUpdate` handler again,
      // avoiding potential infinite loops.
      editor.commands.setContent(content, false);
    }
     // Add `content` and `editor` to the dependency array.
     // This effect runs when either `content` or `editor` instance changes.
  }, [content, editor]);


  return (
    // Container for the editor and its toolbar
    <div className="flex flex-col flex-1 h-full border border-input rounded-md">
      <Toolbar editor={editor} />
      {/* EditorContent renders the actual editable area */}
      <EditorContent editor={editor} className="flex-1 overflow-hidden relative" /> {/* Added relative positioning */}
    </div>
  );
};

export default RichTextEditor;

    