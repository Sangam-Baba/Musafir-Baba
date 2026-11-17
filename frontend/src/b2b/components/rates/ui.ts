// The listing field style without "full width", for small inputs placed in a row (toolbars, rule rows).
import { inputCls } from "../listing/ui";

export const fieldCls = inputCls.replace("mt-1 block w-full ", "inline-block ");
