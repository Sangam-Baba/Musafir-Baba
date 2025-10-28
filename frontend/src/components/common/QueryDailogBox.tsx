import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import QueryForm from "../custom/QueryForm";

export function QueryDailogBox() {
  return (
    <div className="fixed top-100 -right-10 z-50 flex items-center gap-2 rotate-270">
      <Dialog>
        <form>
          <DialogTrigger asChild>
            <Button
              className="bg-[#FE5300] hover:bg-[#FE5300] text-white hover:text-white"
              variant="outline"
            >
              Enquire Now
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <QueryForm />
          </DialogContent>
        </form>
      </Dialog>
    </div>
  );
}
