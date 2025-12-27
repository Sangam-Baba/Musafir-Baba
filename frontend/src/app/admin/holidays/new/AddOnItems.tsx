import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFieldArray } from "react-hook-form";

export function AddOnItems({
  index,
  form,
  removeAddOn,
}: {
  index: number;
  form: any;
  removeAddOn: () => void;
}) {
  const itemsArray = useFieldArray({
    control: form.control,
    name: `addOns.${index}.items`,
  });

  return (
    <div className="grid grid-cols-2 gap-2 mb-4 border p-3">
      <div className="flex gap-2">
        <Button type="button" className="w-[70px]" onClick={removeAddOn}>
          Remove
        </Button>
        <Input
          {...form.register(`addOns.${index}.title`)}
          placeholder="By Helicopter"
        />
      </div>

      <div>
        {itemsArray.fields.map((item, itemIndex) => (
          <div key={item.id} className="flex gap-2 mb-2">
            <Input
              {...form.register(`addOns.${index}.items.${itemIndex}.title`)}
              placeholder="Item Title"
            />

            <Input
              type="number"
              {...form.register(`addOns.${index}.items.${itemIndex}.price`, {
                valueAsNumber: true,
              })}
              placeholder="Item Price"
            />

            <Button
              type="button"
              variant="destructive"
              onClick={() => itemsArray.remove(itemIndex)}
            >
              X
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => itemsArray.append({ title: "", price: 0 })}
        >
          + Add Item
        </Button>
      </div>
    </div>
  );
}
