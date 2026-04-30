"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

type Blog = {
  slug: string;
  id: string;
  title: string;
  description: string;
  url: string;
  previewUrl: string;
  status?: string;
};

interface BlogTableProps {
  blogs: Blog[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ListTable({ blogs, onEdit, onDelete }: BlogTableProps) {
  return (
    <div className="w-full">
      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <Table className="border-collapse w-full table-fixed">
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-100">
              <TableHead className="py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-[45%]">Title</TableHead>
              <TableHead className="py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center w-[15%]">Status</TableHead>
              <TableHead className="py-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center w-[10%]">Visit</TableHead>
              <TableHead className="py-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center w-[10%]">Preview</TableHead>
              <TableHead className="py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right w-[20%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blogs.map((blog) => (
              <TableRow
                key={blog.id}
                className="group hover:bg-slate-50/80 border-b border-slate-50 last:border-0 transition-colors"
              >
                <TableCell className="py-1 px-3 group-hover:translate-x-0.5 transition-transform duration-300">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-slate-700 leading-tight whitespace-normal break-words">
                      {blog.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono truncate mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {blog.url}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-1 px-3 text-center">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    blog.status === "Published" ? "bg-emerald-50 text-emerald-600" : 
                    blog.status === "Draft" ? "bg-slate-50 text-slate-400" :
                    "bg-amber-50 text-amber-600"
                  }`}>
                    {blog.status || "Draft"}
                  </span>
                </TableCell>
                <TableCell className="py-1 px-1 text-center">
                  <a
                    href={blog.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md text-slate-300 hover:text-[#FE5300] hover:bg-orange-50 transition-all group/icon"
                    title="Visit Live"
                  >
                    <ExternalLink size={16} className="opacity-40 group-hover/icon:opacity-100" />
                  </a>
                </TableCell>
                <TableCell className="py-1 px-1 text-center">
                  <a
                    href={blog.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md text-slate-300 hover:text-[#FE5300] hover:bg-orange-50 transition-all group/icon"
                    title="Preview"
                  >
                    <ExternalLink size={16} className="opacity-40 group-hover/icon:opacity-100" />
                  </a>
                </TableCell>
                <TableCell className="py-1 px-4 text-right space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 gap-1"
                    onClick={() => onEdit(blog.id)}
                  >
                    <Edit size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-slate-400 hover:text-red-600 hover:bg-red-50 gap-1"
                    onClick={() => onDelete(blog.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {blogs.map((blog) => (
          <Card key={blog.id} className="border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-[13px] font-semibold text-slate-700 leading-tight">{blog.title}</h3>
                  <p className="text-[10px] text-slate-400 font-mono italic">{blog.url}</p>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${
                  blog.status === "Published" ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                }`}>
                  {blog.status || "Draft"}
                </span>
              </div>
              
              <div className="flex gap-2 pt-2 border-t border-slate-50">
                <a
                  href={blog.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 h-8 rounded-lg bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-wider hover:bg-orange-50 hover:text-[#FE5300] transition-colors"
                >
                  <ExternalLink size={14} />
                  Visit
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-wider hover:bg-orange-50 hover:text-orange-600 gap-2"
                  onClick={() => onEdit(blog.id)}
                >
                  <Edit size={14} />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => onDelete(blog.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
