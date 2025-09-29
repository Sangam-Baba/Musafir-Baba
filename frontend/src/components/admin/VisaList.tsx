"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
interface Visa{
    id: string;
    country: string;
    cost: number;
    url:string;
    visaType: string;
}

interface AuthorsTableProps {
  visa: Visa[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function AuthorsList({ visa , onEdit, onDelete }: AuthorsTableProps ) {

  return (
    <div className="w-full">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table className="rounded-2xl shadow-md overflow-hidden">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[20%]">Country</TableHead>
              <TableHead className="w-[20%]">Fee</TableHead>
              <TableHead className="w-[20%]">Visa Type</TableHead>
              <TableHead className="w-[15%]">URL</TableHead>
              <TableHead className="w-[25%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visa.map((cat: Visa) => (
              <motion.tr
                key={cat.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-b"
              >
                <TableCell className="font-medium">{cat.country}</TableCell>       
                <TableCell className="font-medium">{cat.cost}</TableCell>     
                <TableCell className="font-medium">{cat.visaType}</TableCell>        
                <TableCell>
                  <a
                    href={cat.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink size={16} />
                    Visit
                  </a>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(cat.id)}
                  >
                    <Edit className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(cat.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {visa.map((cat: Visa) => (
          <Card key={cat.id} className="shadow-md">
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-lg">{cat.country}</h3>  
              <h3 className="font-semibold text-lg">{cat.cost}</h3>   
              <h3 className="font-semibold text-lg">{cat.visaType}</h3>           
              <a
                href={cat.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1 text-sm"
              >
                <ExternalLink size={16} />
                Visit
              </a>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onEdit(cat.id)}
                >
                  <Edit className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => onDelete(cat.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
