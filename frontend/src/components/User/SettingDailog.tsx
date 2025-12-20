import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BlogContent } from "../custom/BlogContent";
import { ChevronRight } from "lucide-react";

export function SettingDialog({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <div className="flex mx-auto w-full justify-between border-1 hover:bg-gray-100 rounded-lg px-4 py-3 max-w-md ">
            <p> {title}</p>
            <ChevronRight />
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] md:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            <BlogContent html={description} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
