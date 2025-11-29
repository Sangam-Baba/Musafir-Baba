"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { useEffect } from "react";
import { TableKit } from "@tiptap/extension-table";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";

interface BlogEditorProps {
  value?: string;
  onChange: (content: string) => void;
}

export default function BlogEditor({ value = "", onChange }: BlogEditorProps) {
  const editor = useEditor({
    extensions: [
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      StarterKit.configure({
        codeBlock: {},
      }),
      Link.configure({ openOnClick: false }),
      Image,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-md xl:prose-lg focus:outline-none max-w-none",
      },
    },
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  if (!editor) return null;

  const addImage = () => {
    const url = prompt("Enter image URL");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };
  return (
    <div className="w-full border rounded-lg p-3 bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 border-b p-2 mt-0 mb-2 sticky top-1 bg-gray-800 dark:bg-gray-900 z-50 rounded-lg">
        {/* Text formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 py-1 rounded ${
            editor.isActive("bold") ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          Bold
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 rounded ${
            editor.isActive("italic") ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          Italic
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`px-2 py-1 rounded ${
            editor.isActive("underline")
              ? "bg-blue-500 text-white"
              : "bg-gray-200"
          }`}
        >
          U
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`px-2 py-1 rounded ${
            editor.isActive("strike") ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          Strike
        </button>

        {/* Headings */}
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={`px-2 py-1 rounded ${
            editor.isActive("heading", { level: 1 })
              ? "bg-blue-500 text-white"
              : "bg-gray-200"
          }`}
        >
          H1
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={`px-2 py-1 rounded ${
            editor.isActive("heading", { level: 2 })
              ? "bg-blue-500 text-white"
              : "bg-gray-200"
          }`}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={`px-2 py-1 rounded ${
            editor.isActive("heading", { level: 3 })
              ? "bg-blue-500 text-white"
              : "bg-gray-200"
          }`}
        >
          H3
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 4 }).run()
          }
          className={`px-2 py-1 rounded ${
            editor.isActive("heading", { level: 4 })
              ? "bg-blue-500 text-white"
              : "bg-gray-200"
          }`}
        >
          H4
        </button>

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 rounded ${
            editor.isActive("bulletList")
              ? "bg-blue-500 text-white"
              : "bg-gray-200"
          }`}
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 rounded ${
            editor.isActive("orderedList")
              ? "bg-blue-500 text-white"
              : "bg-gray-200"
          }`}
        >
          1. List
        </button>

        {/* Quote & code */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-2 py-1 rounded ${
            editor.isActive("blockquote")
              ? "bg-blue-500 text-white"
              : "bg-gray-200"
          }`}
        >
          ❝ Quote
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`px-2 py-1 rounded ${
            editor.isActive("codeBlock")
              ? "bg-blue-500 text-white"
              : "bg-gray-200"
          }`}
        >
          {"</> Code"}
        </button>

        {/* Image */}
        <button
          type="button"
          onClick={addImage}
          className="px-2 py-1 rounded bg-gray-200"
        >
          🖼 Image
        </button>

        {/* Links */}
        <button
          type="button"
          onClick={() => {
            const url = prompt("Enter link URL");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          className="px-2 py-1 rounded bg-gray-200"
        >
          🔗 Link
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetLink().run()}
          className="px-2 py-1 rounded bg-gray-200"
        >
          ❌ Unlink
        </button>

        {/* Undo/Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          className="px-2 py-1 rounded bg-gray-200"
        >
          ↩ Undo
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          className="px-2 py-1 rounded bg-gray-200"
        >
          ↪ Redo
        </button>
        {/* /* Table */}
        <div className="relative group">
          <button type="button" className="btn px-2 py-1 rounded bg-gray-200">
            📊 Table
          </button>

          <div className="hidden group-hover:flex flex-col gap-2 flex-nowrap min-w-[200px] absolute bg-white dark:bg-gray-700 p-2 shadow rounded  z-50">
            <button
              type="button"
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()
              }
              className="dropdown-btn"
            >
              Insert Table
            </button>
            <button
              className="dropdown-btn"
              type="button"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
            >
              Add column before
            </button>
            <button
              className="dropdown-btn"
              type="button"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              Add column after
            </button>
            <button
              className="dropdown-btn"
              type="button"
              onClick={() => editor.chain().focus().deleteColumn().run()}
            >
              Delete column
            </button>
            <button
              className="dropdown-btn"
              type="button"
              onClick={() => editor.chain().focus().addRowBefore().run()}
            >
              Add row before
            </button>
            <button
              className="dropdown-btn"
              type="button"
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              Add row after
            </button>
            <button
              className="dropdown-btn"
              type="button"
              onClick={() => editor.chain().focus().deleteRow().run()}
            >
              Delete row
            </button>
            <button
              className="dropdown-btn"
              type="button"
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              Delete table
            </button>
            <button
              className="dropdown-btn"
              type="button"
              onClick={() => editor.chain().focus().mergeCells().run()}
            >
              Merge cells
            </button>
            <button
              className="dropdown-btn"
              type="button"
              onClick={() => editor.chain().focus().splitCell().run()}
            >
              Split cell
            </button>
            <button
              className="dropdown-btn"
              type="button"
              onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
            >
              Toggle header column
            </button>
            <button
              className="dropdown-btn"
              type="button"
              onClick={() => editor.chain().focus().toggleHeaderRow().run()}
            >
              Toggle header row
            </button>
            <button
              className="dropdown-btn"
              type="button"
              onClick={() => editor.chain().focus().toggleHeaderCell().run()}
            >
              Toggle header cell
            </button>
            <button
              className="dropdown-btn"
              type="button"
              onClick={() => editor.chain().focus().mergeOrSplit().run()}
            >
              Merge or split
            </button>
            <button
              className="dropdown-btn"
              type="button"
              onClick={() =>
                editor.chain().focus().setCellAttribute("colspan", 2).run()
              }
            >
              Set cell attribute
            </button>
            <button
              className="dropdown-btn"
              type="button"
              onClick={() => editor.chain().focus().fixTables().run()}
            >
              Fix tables
            </button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className=" max-w-none min-h-[200px] p-2 w-full"
      />
    </div>
  );
}
